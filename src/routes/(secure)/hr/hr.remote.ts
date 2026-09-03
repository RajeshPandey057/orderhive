import { command, form, getRequestEvent } from '$app/server';
import type { AccessType } from '$lib/constants';
import { biometricPunchesCollection, reconcileAttendanceForDay } from '$lib/server/biometric';
import { firestore, uploadFileWithLink } from '$lib/server/firebase';
import {
	attendanceLogId,
	attendanceLogsCollection,
	calculateLeaveStats,
	countLeaveDays,
	disableEmployeeAccess as disableAccess,
	employeeCollection,
	employeeIdForEmail,
	getEmployeeByCode,
	getEmployeeByEmail,
	holidaysCollection,
	isEmployeeOnProbation,
	leaveRequestsCollection,
	listEmployeesWithAccess,
	normalizeEmail,
	serializeLeaveRequest,
	SICK_LEAVE_TYPE,
	upsertEmployeeAccess
} from '$lib/server/hr';
import { error } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import Papa from 'papaparse';
import { z } from 'zod';

const accessTypeSchema = z.enum([
	'admin',
	'agent',
	'finance',
	'compliance',
	'hr-assignee',
	'manager',
	'senior-manager',
	'general'
]);

const optionalString = z.string().trim().optional().default('');
const emailSchema = z.email().transform((email) => normalizeEmail(email));
const attendanceDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

function assertValidAttendanceDate(date: string) {
	const parsed = new Date(`${date}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
		throw error(400, 'Invalid attendance date');
	}
}

function dateOffset(date: string, days: number) {
	const parsed = new Date(`${date}T00:00:00Z`);
	parsed.setUTCDate(parsed.getUTCDate() + days);
	return parsed.toISOString().slice(0, 10);
}

function isInLeaveRange(data: FirebaseFirestore.DocumentData, date: string) {
	return data.startDate <= date && data.endDate >= date;
}

const employeeAccessSchema = z.object({
	accessType: accessTypeSchema,
	managedTeamIds: z.array(z.string()).optional().default([])
});

const documentKindSchema = z.enum([
	'offerLetter',
	'passport',
	'visitOrResidenceVisa',
	'nationalId',
	'educationalCertificates',
	'passportSizePhoto',
	'lastThreeMonthsSalarySlips',
	'relievingLetter',
	'experienceLetter',
	'signedNdaFile'
]);

const employeeSchema = z.object({
	name: z.string().trim().min(1, 'Employee name is required'),
	code: z.string().trim().min(1, 'Employee code is required'),
	email: emailSchema,
	department: optionalString,
	designation: optionalString,
	location: optionalString,
	status: z.enum(['active', 'inactive', 'archived']).default('active'),
	reportingManagerEmail: optionalString,
	seniorManagerEmail: optionalString,
	doj: optionalString,
	probationEndingDate: optionalString,
	lastWorkingDay: optionalString,
	compensationAED: z.number().optional(),
	compensationINR: z.number().optional(),
	access: employeeAccessSchema
});

const updateEmployeeSchema = employeeSchema.extend({
	id: z.string().min(1)
});

function requireUser() {
	const { locals } = getRequestEvent();
	if (!locals.user) throw error(401, 'Unauthorized');
	return locals.user;
}

function requireHrAdmin() {
	const user = requireUser();
	if (user.role !== 'admin' && user.role !== 'super-admin' && user.role !== 'hr-assignee') {
		throw error(403, 'You do not have permission to manage HR');
	}
	return user;
}

function assertValidAccess(accessType: AccessType, email: string, currentUserEmail: string) {
	if (accessType === 'super-admin') {
		throw error(400, 'Super admin access cannot be assigned from employee management');
	}
	if (normalizeEmail(email) === normalizeEmail(currentUserEmail) && accessType !== 'admin') {
		throw error(400, 'You cannot reduce your own admin access here');
	}
}

export const createEmployee = command(employeeSchema, async (data) => {
	const user = requireHrAdmin();
	assertValidAccess(data.access.accessType, data.email, user.email);
	const now = FieldValue.serverTimestamp();
	const employeeRef = employeeCollection.doc(employeeIdForEmail(data.email));
	const existing = await employeeRef.get();

	if (existing.exists && existing.data()?.code) {
		throw error(400, 'An employee profile already exists for this email');
	}

	await employeeRef.set(
		{
			email: data.email,
			name: data.name,
			code: data.code,
			department: data.department,
			designation: data.designation,
			location: data.location,
			status: data.status,
			reportingManagerEmail: data.reportingManagerEmail,
			seniorManagerEmail: data.seniorManagerEmail,
			doj: data.doj,
			probationEndingDate: data.probationEndingDate,
			lastWorkingDay: data.lastWorkingDay,
			compensationAED: data.compensationAED ?? null,
			compensationINR: data.compensationINR ?? null,
			createdAt: now,
			updatedAt: now,
			createdByEmail: user.email,
			updatedByEmail: user.email
		},
		{ merge: true }
	);

	await upsertEmployeeAccess(data.email, data.access, user.email);
	return { success: true };
});

export const updateEmployee = command(updateEmployeeSchema, async (data) => {
	const user = requireHrAdmin();
	assertValidAccess(data.access.accessType, data.email, user.email);
	const email = normalizeEmail(data.email);

	await employeeCollection.doc(data.id).set(
		{
			email,
			name: data.name,
			code: data.code,
			department: data.department,
			designation: data.designation,
			location: data.location,
			status: data.status,
			reportingManagerEmail: data.reportingManagerEmail,
			seniorManagerEmail: data.seniorManagerEmail,
			doj: data.doj,
			probationEndingDate: data.probationEndingDate,
			lastWorkingDay: data.lastWorkingDay,
			compensationAED: data.compensationAED ?? null,
			compensationINR: data.compensationINR ?? null,
			updatedAt: FieldValue.serverTimestamp(),
			updatedByEmail: user.email
		},
		{ merge: true }
	);

	await upsertEmployeeAccess(email, data.access, user.email);
	return { success: true };
});

export const updateEmployeeAccess = command(
	z.object({
		email: emailSchema,
		access: employeeAccessSchema
	}),
	async ({ email, access }) => {
		const user = requireHrAdmin();
		assertValidAccess(access.accessType, email, user.email);
		await upsertEmployeeAccess(email, access, user.email);
		return { success: true };
	}
);

export const archiveEmployee = command(
	z.object({
		email: emailSchema,
		lastWorkingDay: optionalString
	}),
	async ({ email, lastWorkingDay }) => {
		const user = requireHrAdmin();
		await employeeCollection.doc(employeeIdForEmail(email)).set(
			{
				email,
				status: 'archived',
				lastWorkingDay,
				archivedAt: FieldValue.serverTimestamp(),
				archivedByEmail: user.email,
				updatedAt: FieldValue.serverTimestamp(),
				updatedByEmail: user.email
			},
			{ merge: true }
		);
		return { success: true };
	}
);

export const disableEmployeeAccess = command(
	z.object({
		email: emailSchema
	}),
	async ({ email }) => {
		const user = requireHrAdmin();
		if (normalizeEmail(email) === normalizeEmail(user.email)) {
			throw error(400, 'You cannot disable your own access');
		}
		await disableAccess(email, user.email);
		return { success: true };
	}
);

export const createHoliday = command(
	z.object({
		name: z.string().trim().min(1, 'Holiday name is required'),
		date: z.string().min(1, 'Holiday date is required'),
		type: z.enum(['mandatory', 'optional']).default('mandatory')
	}),
	async (data) => {
		const user = requireHrAdmin();
		const year = new Date(`${data.date}T00:00:00`).getFullYear();
		if (!Number.isFinite(year)) throw error(400, 'Invalid holiday date');
		const ref = holidaysCollection.doc(
			`${year}-${data.date}-${data.name.toLowerCase().replaceAll(' ', '-')}`
		);
		await ref.set({
			name: data.name,
			date: data.date,
			type: data.type,
			year,
			createdAt: FieldValue.serverTimestamp(),
			createdByEmail: user.email
		});
		return { success: true };
	}
);

export const deleteHoliday = command(
	z.object({
		id: z.string().min(1)
	}),
	async ({ id }) => {
		requireHrAdmin();
		await holidaysCollection.doc(id).delete();
		return { success: true };
	}
);

export const createLeaveRequest = command(
	z.object({
		startDate: z.string().min(1),
		endDate: z.string().min(1),
		reason: z.string().trim().min(1, 'Reason is required')
	}),
	async (data) => {
		const user = requireUser();
		const days = countLeaveDays(data.startDate, data.endDate);
		if (days <= 0) throw error(400, 'Invalid leave date range');
		const employee = await getEmployeeByEmail(user.email);
		if (!employee) throw error(400, 'Employee profile is required to request leave');
		if (isEmployeeOnProbation(employee)) {
			throw error(400, 'Leave requests are not available during probation');
		}

		await leaveRequestsCollection.add({
			employeeEmail: normalizeEmail(user.email),
			employeeName: employee.name,
			type: SICK_LEAVE_TYPE,
			startDate: data.startDate,
			endDate: data.endDate,
			reason: data.reason,
			status: 'pending',
			days,
			createdAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp()
		});
		return { success: true };
	}
);

export const reviewLeaveRequest = command(
	z.object({
		id: z.string().min(1),
		status: z.enum(['approved', 'rejected'])
	}),
	async ({ id, status }) => {
		const user = requireHrAdmin();
		const requestRef = leaveRequestsCollection.doc(id);
		const requestSnap = await requestRef.get();
		if (!requestSnap.exists) throw error(404, 'Leave request not found');
		const request = serializeLeaveRequest(requestSnap.id, requestSnap.data() ?? {});
		const update: Record<string, unknown> = {
			status,
			reviewerEmail: user.email,
			reviewedAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp()
		};

		if (status === 'approved') {
			const employee = await getEmployeeByEmail(request.employeeEmail);
			if (!employee) throw error(400, 'Employee profile is required to approve leave');
			const employeeRequestsSnap = await leaveRequestsCollection
				.where('employeeEmail', '==', normalizeEmail(request.employeeEmail))
				.get();
			const otherRequests = employeeRequestsSnap.docs
				.filter((doc) => doc.id !== id)
				.map((doc) => serializeLeaveRequest(doc.id, doc.data()));
			const stats = calculateLeaveStats(employee, otherRequests);
			const paidSickDays = Math.min(request.days, stats.balance);
			update.paidSickDays = paidSickDays;
			update.lopDays = request.days - paidSickDays;
			update.type = SICK_LEAVE_TYPE;
		} else {
			update.paidSickDays = 0;
			update.lopDays = 0;
		}

		await requestRef.update(update);
		return { success: true };
	}
);

export const correctAttendance = command(
	z.object({
		id: z.string().min(1),
		employeeEmail: emailSchema,
		date: z.string().min(1),
		punchIn: optionalString,
		punchOut: optionalString,
		reason: z.string().trim().min(1, 'Reason is required')
	}),
	async (data) => {
		const user = requireHrAdmin();
		const id = data.id || attendanceLogId(data.employeeEmail, data.date);
		await attendanceLogsCollection.doc(id).set(
			{
				employeeEmail: data.employeeEmail,
				date: data.date,
				punchIn: data.punchIn,
				punchOut: data.punchOut,
				status: 'present',
				source: 'manual',
				corrected: true,
				updatedAt: FieldValue.serverTimestamp()
			},
			{ merge: true }
		);
		await attendanceLogsCollection.doc(id).collection('corrections').add({
			attendanceLogId: id,
			employeeEmail: data.employeeEmail,
			correctedPunchIn: data.punchIn,
			correctedPunchOut: data.punchOut,
			reason: data.reason,
			createdAt: FieldValue.serverTimestamp(),
			createdByEmail: user.email
		});
		return { success: true };
	}
);

export const syncAttendance = command(
	z.object({
		rows: z
			.array(
				z.object({
					employeeEmail: emailSchema,
					employeeName: optionalString,
					employeeCode: optionalString,
					date: z.string().min(1),
					branch: optionalString,
					punchIn: optionalString,
					punchOut: optionalString,
					workingMinutes: z.number().optional(),
					overtimeMinutes: z.number().optional(),
					shortByMinutes: z.number().optional(),
					status: z.enum(['present', 'late', 'absent', 'on-leave', 'holiday']).default('present')
				})
			)
			.default([])
	}),
	async ({ rows }) => {
		requireHrAdmin();
		const batch = attendanceLogsCollection.firestore.batch();
		for (const row of rows) {
			const ref = attendanceLogsCollection.doc(attendanceLogId(row.employeeEmail, row.date));
			batch.set(
				ref,
				{
					...row,
					source: 'import',
					updatedAt: FieldValue.serverTimestamp()
				},
				{ merge: true }
			);
		}
		await batch.commit();
		return { success: true, imported: rows.length };
	}
);

const attendanceCsvStatusSchema = z.enum(['present', 'late', 'absent', 'on-leave', 'holiday']);

function parseOptionalNumber(value: string | undefined, field: string, rowNumber: number) {
	if (!value?.trim()) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw error(400, `Invalid ${field} on CSV row ${rowNumber}`);
	}
	return parsed;
}

export const uploadAttendanceCsv = command(
	z.object({
		date: attendanceDateSchema,
		csvText: z.string().trim().min(1, 'Attendance CSV file is required')
	}),
	async ({ date, csvText }) => {
		requireHrAdmin();
		assertValidAttendanceDate(date);

		const parsed = Papa.parse<Record<string, string>>(csvText, {
			header: true,
			skipEmptyLines: true,
			transformHeader: (header) => header.trim()
		});
		if (parsed.errors.length > 0) {
			throw error(400, `CSV parse error: ${parsed.errors[0].message}`);
		}
		if (parsed.data.length === 0) throw error(400, 'CSV contains no attendance rows');

		const rows = parsed.data.map((row, index) => {
			const rowNumber = index + 2;
			const employeeEmail = row.employeeEmail?.trim();
			if (!employeeEmail) throw error(400, `employeeEmail is required on CSV row ${rowNumber}`);
			const parsedEmail = emailSchema.safeParse(employeeEmail);
			if (!parsedEmail.success) throw error(400, `Invalid employeeEmail on CSV row ${rowNumber}`);
			if (row.date?.trim() !== date) {
				throw error(400, `CSV row ${rowNumber} date must match the selected date ${date}`);
			}
			const status = row.status?.trim() || 'present';
			const parsedStatus = attendanceCsvStatusSchema.safeParse(status);
			if (!parsedStatus.success) throw error(400, `Invalid status on CSV row ${rowNumber}`);

			return {
				employeeEmail: parsedEmail.data,
				employeeName: row.employeeName?.trim() ?? '',
				employeeCode: row.employeeCode?.trim() ?? '',
				date,
				branch: row.branch?.trim() ?? '',
				punchIn: row.punchIn?.trim() ?? '',
				punchOut: row.punchOut?.trim() ?? '',
				workingMinutes: parseOptionalNumber(row.workingMinutes, 'workingMinutes', rowNumber),
				overtimeMinutes: parseOptionalNumber(row.overtimeMinutes, 'overtimeMinutes', rowNumber),
				shortByMinutes: parseOptionalNumber(row.shortByMinutes, 'shortByMinutes', rowNumber),
				status: parsedStatus.data
			};
		});

		for (let index = 0; index < rows.length; index += 400) {
			const batch = firestore.batch();
			for (const row of rows.slice(index, index + 400)) {
				batch.set(
					attendanceLogsCollection.doc(attendanceLogId(row.employeeEmail, date)),
					{ ...row, source: 'import', updatedAt: FieldValue.serverTimestamp() },
					{ merge: true }
				);
			}
			await batch.commit();
		}
		return { success: true, imported: rows.length };
	}
);

export const processAttendanceForDate = command(
	z.object({ date: attendanceDateSchema }),
	async ({ date }) => {
		requireHrAdmin();
		assertValidAttendanceDate(date);

		const [employees, holidaysSnap, leaveSnap, punchesSnap] = await Promise.all([
			listEmployeesWithAccess({ forceRefresh: true }),
			holidaysCollection.where('date', '==', date).limit(1).get(),
			leaveRequestsCollection.where('status', '==', 'approved').get(),
			biometricPunchesCollection.where('date', '==', date).get()
		]);
		const activeEmployees = employees.filter((employee) => employee.status === 'active');
		const isHoliday = !holidaysSnap.empty;
		const onLeaveEmails = new Set(
			leaveSnap.docs
				.filter((doc) => isInLeaveRange(doc.data(), date))
				.map((doc) => normalizeEmail(doc.data().employeeEmail as string))
		);
		const punchedEmails = new Set(
			punchesSnap.docs
				.map((doc) => doc.data().employeeEmail as string | null)
				.filter((email): email is string => Boolean(email))
				.map(normalizeEmail)
		);

		for (const email of punchedEmails) await reconcileAttendanceForDay(email, date);

		let present = 0;
		let absent = 0;
		let onLeave = 0;
		let holiday = 0;
		for (const employee of activeEmployees) {
			const email = normalizeEmail(employee.email);
			const logRef = attendanceLogsCollection.doc(attendanceLogId(email, date));
			const existing = await logRef.get();
			if (existing.exists && existing.data()?.corrected) continue;

			const status = isHoliday
				? 'holiday'
				: onLeaveEmails.has(email)
					? 'on-leave'
					: punchedEmails.has(email)
						? (existing.data()?.status ?? 'present')
						: new Date(`${date}T00:00:00Z`).getUTCDay() === 0
							? 'present'
							: 'absent';
			await logRef.set(
				{
					employeeEmail: email,
					employeeName: employee.name || email,
					employeeCode: employee.code || '',
					date,
					branch: employee.location || '',
					punchIn: existing.data()?.punchIn ?? null,
					punchOut: existing.data()?.punchOut ?? null,
					workingMinutes: existing.data()?.workingMinutes ?? 0,
					overtimeMinutes: existing.data()?.overtimeMinutes ?? 0,
					shortByMinutes: existing.data()?.shortByMinutes ?? 480,
					status,
					source: 'biometric',
					updatedAt: FieldValue.serverTimestamp()
				},
				{ merge: true }
			);
			if (status === 'on-leave') onLeave++;
			else if (status === 'holiday') holiday++;
			else if (status === 'absent') absent++;
			else present++;
		}

		if (new Date(`${date}T00:00:00Z`).getUTCDay() === 1) {
			const saturday = dateOffset(date, -2);
			const sunday = dateOffset(date, -1);
			for (const employee of activeEmployees) {
				const email = normalizeEmail(employee.email);
				const [saturdaySnap, mondaySnap, sundaySnap, sundayHolidaySnap, sundayLeaveSnap] =
					await Promise.all([
						attendanceLogsCollection.doc(attendanceLogId(email, saturday)).get(),
						attendanceLogsCollection.doc(attendanceLogId(email, date)).get(),
						attendanceLogsCollection.doc(attendanceLogId(email, sunday)).get(),
						holidaysCollection.where('date', '==', sunday).limit(1).get(),
						leaveRequestsCollection.where('status', '==', 'approved').get()
					]);
				const sundayLeave = sundayLeaveSnap.docs.some(
					(doc) =>
						normalizeEmail(doc.data().employeeEmail as string) === email &&
						isInLeaveRange(doc.data(), sunday)
				);
				if (
					saturdaySnap.data()?.status !== 'absent' ||
					mondaySnap.data()?.status !== 'absent' ||
					sundayHolidaySnap.size > 0 ||
					sundayLeave ||
					sundaySnap.data()?.corrected
				)
					continue;
				await sundaySnap.ref.set(
					{ status: 'absent', source: 'biometric', updatedAt: FieldValue.serverTimestamp() },
					{ merge: true }
				);
			}
		}

		return {
			success: true,
			date,
			processed: activeEmployees.length,
			present,
			absent,
			onLeave,
			holiday
		};
	}
);

export const deleteAttendanceForDate = command(
	z.object({ date: attendanceDateSchema }),
	async ({ date }) => {
		requireHrAdmin();
		assertValidAttendanceDate(date);
		const logsSnap = await attendanceLogsCollection.where('date', '==', date).get();
		for (let index = 0; index < logsSnap.docs.length; index += 400) {
			const batch = firestore.batch();
			for (const doc of logsSnap.docs.slice(index, index + 400)) batch.delete(doc.ref);
			await batch.commit();
		}
		return { success: true, deleted: logsSnap.size };
	}
);

/**
 * Re-run attendance reconciliation for all employees that have biometric punches
 * on the given date (defaults to today). Idempotent — safe to call multiple times.
 * Manually-corrected records are never overwritten.
 */
export const reconcileAttendance = command(
	z.object({
		date: z.string().optional()
	}),
	async ({ date: inputDate }) => {
		requireHrAdmin();
		const date = inputDate ?? new Date().toISOString().substring(0, 10);

		const punchesSnap = await biometricPunchesCollection.where('date', '==', date).get();

		// Re-resolve any unlinked punches by employee code
		const unresolvedDocs = punchesSnap.docs.filter((d) => !d.data().employeeEmail);
		for (const doc of unresolvedDocs) {
			const userId = doc.data().deviceUserId as string;
			const emp = await getEmployeeByCode(userId);
			if (!emp) continue;
			await doc.ref.update({ employeeEmail: emp.email, employeeName: emp.name });
		}

		// Re-fetch after resolution
		const refreshedSnap = await biometricPunchesCollection.where('date', '==', date).get();
		const emails = new Set<string>();
		for (const doc of refreshedSnap.docs) {
			const emp = doc.data().employeeEmail as string | null;
			if (emp) emails.add(emp);
		}

		await Promise.all([...emails].map((email) => reconcileAttendanceForDay(email, date)));

		return { success: true, reconciled: emails.size };
	}
);

/**
 * Sync all biometricPunches docs where processed=false.
 * Resolves unlinked punches by employee code, reconciles attendance, marks processed.
 * Use the "Sync Unprocessed" button to catch punches that failed to process live.
 *
 * Strategy:
 *  1. Query where('employeeEmail', '==', null) — Firestore can find explicit nulls,
 *     and ALL unresolved punches store employeeEmail as null (not missing).
 *     This reliably catches old punches that never had a `processed` field set.
 *  2. Resolve each unresolved punch by employee code (now that employees are seeded).
 *  3. Query where('processed', '==', false) for any remaining un-reconciled punches
 *     (includes the ones just resolved above, now with processed:false).
 *  4. Group by email+date, reconcile, mark processed:true.
 */
export const syncUnprocessed = command(z.object({}), async () => {
	requireHrAdmin();

	// Step 1: find all unresolved punches (employeeEmail stored as explicit null)
	const unresolvedSnap = await biometricPunchesCollection.where('employeeEmail', '==', null).get();

	// Step 2: resolve each by employee code and stamp processed:false
	let resolvedCount = 0;
	for (const doc of unresolvedSnap.docs) {
		const userId = doc.data().deviceUserId as string;
		const emp = await getEmployeeByCode(userId);
		if (!emp) continue;
		await doc.ref.update({
			employeeEmail: emp.email,
			employeeName: emp.name,
			branch: emp.location ?? '',
			processed: false
		});
		resolvedCount++;
	}
	console.log(
		`[syncUnprocessed] resolved ${resolvedCount} / ${unresolvedSnap.size} unlinked punches`
	);

	// Step 3: fetch all punches with processed:false (includes newly-resolved ones above)
	const pendingSnap = await biometricPunchesCollection.where('processed', '==', false).get();
	if (pendingSnap.empty) return { success: true, synced: 0 };

	// Step 4: group by employee+date and reconcile
	const groups = new Map<
		string,
		{ email: string; date: string; refs: FirebaseFirestore.DocumentReference[] }
	>();
	for (const doc of pendingSnap.docs) {
		const email = doc.data().employeeEmail as string | null;
		const date = doc.data().date as string;
		if (!email || !date) continue;
		const key = `${email}__${date}`;
		if (!groups.has(key)) groups.set(key, { email, date, refs: [] });
		groups.get(key)!.refs.push(doc.ref);
	}

	let synced = 0;
	for (const { email, date, refs } of groups.values()) {
		try {
			await reconcileAttendanceForDay(email, date);
			const batch = firestore.batch();
			for (const ref of refs) batch.update(ref, { processed: true });
			await batch.commit();
			synced += refs.length;
		} catch (err) {
			console.error('[ZKTeco] syncUnprocessed failed for', email, date, err);
		}
	}
	return { success: true, synced };
});

export const updateMyProfile = command(
	z.object({
		mobileNumber: optionalString,
		countryCode: optionalString,
		personalEmail: optionalString,
		maritalStatus: optionalString,
		spouseName: optionalString,
		fatherName: optionalString,
		motherName: optionalString,
		addressUAE: optionalString,
		homeCountryAddress: optionalString,
		emergencyContactName: optionalString,
		emergencyContactNumber: optionalString,
		emergencyRelationship: optionalString,
		nationality: optionalString,
		gender: optionalString,
		dateOfBirth: optionalString,
		visaType: optionalString,
		visaEndingDate: optionalString,
		fresherOrExperienced: optionalString
	}),
	async (data) => {
		const user = requireUser();
		await employeeCollection.doc(employeeIdForEmail(user.email)).set(
			{
				email: normalizeEmail(user.email),
				...data,
				updatedAt: FieldValue.serverTimestamp(),
				updatedByEmail: user.email
			},
			{ merge: true }
		);
		return { success: true };
	}
);

export const uploadMyDocument = form(
	z.object({
		kind: documentKindSchema,
		file: z.custom<File>((file) => file instanceof File && file.size > 0, {
			message: 'Document file is required'
		})
	}),
	async ({ kind, file }) => {
		const user = requireUser();
		const email = normalizeEmail(user.email);
		const uploaded = await uploadFileWithLink(file, `employees/${email}/documents/${kind}`);
		if (!uploaded) throw error(400, 'Document file is required');

		await employeeCollection.doc(employeeIdForEmail(email)).set(
			{
				email,
				documents: {
					[kind]: {
						...uploaded,
						original: {
							name: file.name,
							size: file.size,
							type: file.type,
							lastModified: file.lastModified
						},
						uploadedAt: new Date().toISOString(),
						uploadedByEmail: user.email
					}
				},
				updatedAt: FieldValue.serverTimestamp(),
				updatedByEmail: user.email
			},
			{ merge: true }
		);

		return { success: true };
	}
);
