import type { AccessType } from '$lib/constants';
import { firestore } from '$lib/server/firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const employeeCollection = firestore.collection('employees');
export const rolesCollection = firestore.collection('roles');
export const holidaysCollection = firestore.collection('holidays');
export const leaveRequestsCollection = firestore.collection('leaveRequests');
export const attendanceLogsCollection = firestore.collection('attendanceLogs');

export function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

export function employeeIdForEmail(email: string) {
	return normalizeEmail(email);
}

export function attendanceLogId(employeeEmail: string, date: string) {
	return `${normalizeEmail(employeeEmail)}_${date}`;
}

export function serializeDate(value: unknown): string | undefined {
	if (!value) return undefined;
	if (value instanceof Timestamp) return value.toDate().toISOString();
	if (typeof value === 'object' && value !== null && 'toDate' in value) {
		const date = (value as { toDate?: () => Date }).toDate?.();
		return date?.toISOString();
	}
	if (typeof value === 'string') return value;
	return undefined;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return undefined;
}

export function serializeEmployeeDoc(id: string, data: FirebaseFirestore.DocumentData): Employee {
	const email = normalizeEmail(data.email ?? id);
	return {
		id,
		email,
		name: data.name ?? data.displayName ?? email.split('@')[0],
		code: data.code ?? '',
		department: data.department ?? '',
		designation: data.designation ?? '',
		location: data.location ?? '',
		status: data.status ?? 'active',
		reportingManagerEmail: data.reportingManagerEmail ?? '',
		seniorManagerEmail: data.seniorManagerEmail ?? '',
		doj: data.doj ?? '',
		probationEndingDate: data.probationEndingDate ?? '',
		lastWorkingDay: data.lastWorkingDay ?? '',
		compensationAED: asNumber(data.compensationAED),
		compensationINR: asNumber(data.compensationINR),
		mobileNumber: data.mobileNumber ?? '',
		countryCode: data.countryCode ?? '+971',
		personalEmail: data.personalEmail ?? '',
		maritalStatus: data.maritalStatus ?? '',
		spouseName: data.spouseName ?? '',
		fatherName: data.fatherName ?? '',
		motherName: data.motherName ?? '',
		addressUAE: data.addressUAE ?? '',
		homeCountryAddress: data.homeCountryAddress ?? '',
		emergencyContactName: data.emergencyContactName ?? '',
		emergencyContactNumber: data.emergencyContactNumber ?? '',
		emergencyRelationship: data.emergencyRelationship ?? '',
		nationality: data.nationality ?? '',
		gender: data.gender ?? '',
		dateOfBirth: data.dateOfBirth ?? '',
		visaType: data.visaType ?? '',
		visaEndingDate: data.visaEndingDate ?? '',
		fresherOrExperienced: data.fresherOrExperienced ?? '',
		documents: data.documents ?? {},
		accessType: data.accessType,
		managedTeamIds: Array.isArray(data.managedTeamIds) ? data.managedTeamIds : [],
		accessStatus: data.accessStatus ?? 'missing',
		createdAt: serializeDate(data.createdAt),
		updatedAt: serializeDate(data.updatedAt),
		createdByEmail: data.createdByEmail ?? '',
		updatedByEmail: data.updatedByEmail ?? '',
		archivedAt: serializeDate(data.archivedAt),
		archivedByEmail: data.archivedByEmail ?? ''
	};
}

export function roleToEmployeeAccess(role?: FirebaseFirestore.DocumentData | null) {
	if (!role) {
		return {
			accessStatus: 'missing' as EmployeeAccessStatus,
			accessType: undefined,
			managedTeamIds: []
		};
	}

	return {
		accessStatus: 'enabled' as EmployeeAccessStatus,
		accessType: role.accessType as AccessType | undefined,
		managedTeamIds: Array.isArray(role.managedTeamIds) ? role.managedTeamIds : []
	};
}

export async function listEmployeesWithAccess(): Promise<Employee[]> {
	const [employeesSnap, rolesSnap] = await Promise.all([
		employeeCollection.get(),
		rolesCollection.get()
	]);

	const rolesByEmail = new Map<string, FirebaseFirestore.DocumentData>();
	for (const doc of rolesSnap.docs) {
		const data = doc.data();
		rolesByEmail.set(normalizeEmail(data.email ?? doc.id), data);
	}

	const seen = new Set<string>();
	const employees = employeesSnap.docs.map((doc) => {
		const employee = serializeEmployeeDoc(doc.id, doc.data());
		const role = rolesByEmail.get(employee.email);
		seen.add(employee.email);
		return {
			...employee,
			...roleToEmployeeAccess(role)
		};
	});

	for (const [email, role] of rolesByEmail.entries()) {
		if (seen.has(email)) continue;
		employees.push({
			id: email,
			email,
			name:
				role.displayName ??
				([role.firstName, role.lastName].filter(Boolean).join(' ') || email.split('@')[0]),
			code: '',
			department: '',
			designation: '',
			location: '',
			status: 'active',
			...roleToEmployeeAccess(role)
		});
	}

	return employees;
}

export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
	const normalised = normalizeEmail(email);
	const [employeeDoc, roleDoc] = await Promise.all([
		employeeCollection.doc(employeeIdForEmail(normalised)).get(),
		rolesCollection.doc(normalised).get()
	]);

	if (!employeeDoc.exists && !roleDoc.exists) return null;

	if (!employeeDoc.exists) {
		const role = roleDoc.data() ?? {};
		return {
			id: normalised,
			email: normalised,
			name:
				role.displayName ??
				([role.firstName, role.lastName].filter(Boolean).join(' ') || normalised.split('@')[0]),
			code: '',
			department: '',
			designation: '',
			location: '',
			status: 'active',
			...roleToEmployeeAccess(role)
		};
	}

	return {
		...serializeEmployeeDoc(employeeDoc.id, employeeDoc.data() ?? {}),
		...roleToEmployeeAccess(roleDoc.exists ? roleDoc.data() : null)
	};
}

export async function upsertEmployeeAccess(
	email: string,
	access: {
		accessType: AccessType;
		managedTeamIds?: string[];
	},
	actorEmail: string
) {
	const normalised = normalizeEmail(email);
	const now = FieldValue.serverTimestamp();
	const roleRecord: Partial<Role> = {
		email: normalised,
		accessType: access.accessType,
		updatedAt: now
	};

	if (access.accessType === 'manager' || access.accessType === 'senior-manager') {
		roleRecord.managedTeamIds = access.managedTeamIds ?? [];
	} else {
		roleRecord.managedTeamIds = [];
	}

	await rolesCollection.doc(normalised).set(
		{
			...roleRecord,
			createdAt: now,
			updatedByEmail: actorEmail
		},
		{ merge: true }
	);

	await employeeCollection.doc(employeeIdForEmail(normalised)).set(
		{
			email: normalised,
			accessStatus: 'enabled',
			accessType: access.accessType,
			managedTeamIds: roleRecord.managedTeamIds ?? [],
			updatedAt: now,
			updatedByEmail: actorEmail
		},
		{ merge: true }
	);
}

export async function disableEmployeeAccess(email: string, actorEmail: string) {
	const normalised = normalizeEmail(email);
	await rolesCollection.doc(normalised).delete();
	await employeeCollection.doc(employeeIdForEmail(normalised)).set(
		{
			email: normalised,
			accessStatus: 'disabled',
			accessType: FieldValue.delete(),
			managedTeamIds: [],
			updatedAt: FieldValue.serverTimestamp(),
			updatedByEmail: actorEmail
		},
		{ merge: true }
	);
}

export function serializeHoliday(id: string, data: FirebaseFirestore.DocumentData): Holiday {
	return {
		id,
		name: data.name ?? '',
		date: data.date ?? '',
		type: data.type ?? 'mandatory',
		year: Number(data.year ?? new Date(data.date ?? Date.now()).getFullYear()),
		createdAt: serializeDate(data.createdAt),
		createdByEmail: data.createdByEmail ?? ''
	};
}

export function serializeLeaveRequest(
	id: string,
	data: FirebaseFirestore.DocumentData
): LeaveRequest {
	return {
		id,
		employeeEmail: data.employeeEmail ?? '',
		employeeName: data.employeeName ?? '',
		type: data.type ?? 'Casual',
		startDate: data.startDate ?? '',
		endDate: data.endDate ?? '',
		reason: data.reason ?? '',
		status: data.status ?? 'pending',
		days: Number(data.days ?? 0),
		reviewerEmail: data.reviewerEmail ?? '',
		reviewedAt: serializeDate(data.reviewedAt),
		createdAt: serializeDate(data.createdAt),
		updatedAt: serializeDate(data.updatedAt)
	};
}

export function serializeAttendanceLog(
	id: string,
	data: FirebaseFirestore.DocumentData
): AttendanceLog {
	return {
		id,
		employeeEmail: data.employeeEmail ?? '',
		employeeName: data.employeeName ?? '',
		employeeCode: data.employeeCode ?? '',
		date: data.date ?? '',
		branch: data.branch ?? '',
		punchIn: data.punchIn ?? '',
		punchOut: data.punchOut ?? '',
		workingMinutes: Number(data.workingMinutes ?? 0),
		overtimeMinutes: Number(data.overtimeMinutes ?? 0),
		shortByMinutes: Number(data.shortByMinutes ?? 0),
		status: data.status ?? 'absent',
		source: data.source ?? 'manual',
		corrected: Boolean(data.corrected),
		updatedAt: serializeDate(data.updatedAt)
	};
}

export function countLeaveDays(startDate: string, endDate: string) {
	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T00:00:00`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
	return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function minutesToDuration(minutes?: number) {
	const safe = Math.max(0, Number(minutes ?? 0));
	const hours = Math.floor(safe / 60);
	const mins = safe % 60;
	return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Look up an employee by their code — matches the ZKTeco deviceUserId (e.g. "INDGO194").
 */
export async function getEmployeeByCode(code: string): Promise<Employee | null> {
	if (!code) return null;
	const snap = await employeeCollection.where('code', '==', code).limit(1).get();
	if (snap.empty) return null;
	const doc = snap.docs[0];
	return serializeEmployeeDoc(doc.id, doc.data());
}
