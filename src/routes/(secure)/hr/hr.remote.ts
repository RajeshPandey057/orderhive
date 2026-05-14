import { command, form, getRequestEvent } from '$app/server';
import type { AccessType } from '$lib/constants';
import { uploadFileWithLink } from '$lib/server/firebase';
import {
	attendanceLogId,
	attendanceLogsCollection,
	countLeaveDays,
	disableEmployeeAccess as disableAccess,
	employeeCollection,
	employeeIdForEmail,
	holidaysCollection,
	leaveRequestsCollection,
	normalizeEmail,
	upsertEmployeeAccess
} from '$lib/server/hr';
import { error } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const accessTypeSchema = z.enum([
	'admin',
	'agent',
	'finance',
	'compliance',
	'manager',
	'senior-manager'
]);

const optionalString = z.string().trim().optional().default('');
const emailSchema = z.email().transform((email) => normalizeEmail(email));

const employeeAccessSchema = z.object({
	accessType: accessTypeSchema,
	agentRole: optionalString,
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
	if (user.role !== 'admin' && user.role !== 'super-admin') {
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
		type: z.string().trim().min(1).default('Casual'),
		startDate: z.string().min(1),
		endDate: z.string().min(1),
		reason: z.string().trim().min(1, 'Reason is required')
	}),
	async (data) => {
		const user = requireUser();
		const days = countLeaveDays(data.startDate, data.endDate);
		if (days <= 0) throw error(400, 'Invalid leave date range');
		const employee = await employeeCollection.doc(employeeIdForEmail(user.email)).get();
		const employeeName = employee.data()?.name ?? user.email.split('@')[0];
		await leaveRequestsCollection.add({
			employeeEmail: normalizeEmail(user.email),
			employeeName,
			type: data.type,
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
		await leaveRequestsCollection.doc(id).update({
			status,
			reviewerEmail: user.email,
			reviewedAt: FieldValue.serverTimestamp(),
			updatedAt: FieldValue.serverTimestamp()
		});
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
