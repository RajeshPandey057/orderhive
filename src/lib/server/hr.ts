import type { AccessType } from '$lib/constants';
import { firestore } from '$lib/server/firebase';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';

export const employeeCollection = firestore.collection('employees');
export const rolesCollection = firestore.collection('roles');
export const holidaysCollection = firestore.collection('holidays');
export const leaveRequestsCollection = firestore.collection('leaveRequests');
export const attendanceLogsCollection = firestore.collection('attendanceLogs');

export const SICK_LEAVE_TYPE = 'Sick Leave';
export const PROBATION_MONTHS = 3;

// Short-lived in-process cache so rapid navigations that call listEmployeesWithAccess()
// within the same Node process don't trigger duplicate full-collection Firestore reads.
const EMPLOYEE_ACCESS_CACHE_TTL_MS = 30_000;
let _employeeAccessCacheExpiresAt = 0;
let _employeeAccessCacheValue: Employee[] | null = null;
let _employeeAccessCachePending: Promise<Employee[]> | null = null;

export function invalidateEmployeeAccessCache() {
	_employeeAccessCacheExpiresAt = 0;
	_employeeAccessCacheValue = null;
	_employeeAccessCachePending = null;
}

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

export async function listEmployeesWithAccess(options?: {
	forceRefresh?: boolean;
}): Promise<Employee[]> {
	const forceRefresh = options?.forceRefresh ?? false;

	// Return cached result if still fresh.
	if (!forceRefresh && _employeeAccessCacheValue && Date.now() < _employeeAccessCacheExpiresAt) {
		return _employeeAccessCacheValue;
	}

	// Deduplicate concurrent callers: reuse in-flight fetch.
	if (_employeeAccessCachePending) {
		return _employeeAccessCachePending;
	}

	const fetchPromise = (async (): Promise<Employee[]> => {
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

		_employeeAccessCacheValue = employees;
		_employeeAccessCacheExpiresAt = Date.now() + EMPLOYEE_ACCESS_CACHE_TTL_MS;
		return employees;
	})();

	_employeeAccessCachePending = fetchPromise;
	try {
		return await fetchPromise;
	} finally {
		_employeeAccessCachePending = null;
	}
}

export const EMPLOYEE_DIRECTORY_PAGE_SIZE = 20;

export type EmployeeDirectoryFilter =
	| 'all'
	| 'active'
	| 'archived'
	| 'admin'
	| 'agent'
	| 'finance'
	| 'compliance'
	| 'manager'
	| 'senior-manager'
	| 'access-only';

export type EmployeeDirectoryPage = {
	employees: Employee[];
	page: number;
	pageSize: number;
	totalCount: number;
	totalPages: number;
	filter: EmployeeDirectoryFilter;
};

const EMPLOYEE_DIRECTORY_FILTERS = new Set<EmployeeDirectoryFilter>([
	'all',
	'active',
	'archived',
	'admin',
	'agent',
	'finance',
	'compliance',
	'manager',
	'senior-manager',
	'access-only'
]);

export function parseEmployeeDirectoryFilter(value: string | null): EmployeeDirectoryFilter {
	return EMPLOYEE_DIRECTORY_FILTERS.has(value as EmployeeDirectoryFilter)
		? (value as EmployeeDirectoryFilter)
		: 'all';
}

function employeeDirectoryQuery(filter: EmployeeDirectoryFilter): FirebaseFirestore.Query {
	const query = employeeCollection.orderBy(FieldPath.documentId());

	if (filter === 'active' || filter === 'archived') {
		return employeeCollection.where('status', '==', filter).orderBy(FieldPath.documentId());
	}

	if (filter === 'access-only') {
		return employeeCollection.where('code', '==', '').orderBy(FieldPath.documentId());
	}

	if (filter !== 'all') {
		return employeeCollection.where('accessType', '==', filter).orderBy(FieldPath.documentId());
	}

	return query;
}

async function mergeEmployeePageWithAccess(
	docs: FirebaseFirestore.QueryDocumentSnapshot[]
): Promise<Employee[]> {
	const employees = docs.map((doc) => serializeEmployeeDoc(doc.id, doc.data()));
	if (employees.length === 0) return [];

	const roleDocs = await firestore.getAll(
		...employees.map((employee) => rolesCollection.doc(employee.email))
	);
	const rolesByEmail = new Map<string, FirebaseFirestore.DocumentData>();
	for (const roleDoc of roleDocs) {
		if (!roleDoc.exists) continue;
		rolesByEmail.set(normalizeEmail(roleDoc.id), roleDoc.data() ?? {});
	}

	return employees.map((employee) => ({
		...employee,
		...roleToEmployeeAccess(rolesByEmail.get(employee.email))
	}));
}

export async function listEmployeesWithAccessPage(options?: {
	page?: number;
	pageSize?: number;
	filter?: EmployeeDirectoryFilter;
}): Promise<EmployeeDirectoryPage> {
	const pageSize = options?.pageSize ?? EMPLOYEE_DIRECTORY_PAGE_SIZE;
	const filter = options?.filter ?? 'all';
	const requestedPage = Math.max(1, Math.floor(options?.page ?? 1));
	const query = employeeDirectoryQuery(filter);

	const countSnap = await query.count().get();
	const totalCount = countSnap.data().count;
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
	const page = Math.min(requestedPage, totalPages);
	const employeesSnap = await query
		.offset((page - 1) * pageSize)
		.limit(pageSize)
		.get();

	return {
		employees: await mergeEmployeePageWithAccess(employeesSnap.docs),
		page,
		pageSize,
		totalCount,
		totalPages,
		filter
	};
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

	invalidateEmployeeAccessCache();
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

	invalidateEmployeeAccessCache();
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
		type: data.type ?? SICK_LEAVE_TYPE,
		startDate: data.startDate ?? '',
		endDate: data.endDate ?? '',
		reason: data.reason ?? '',
		status: data.status ?? 'pending',
		days: Number(data.days ?? 0),
		paidSickDays: typeof data.paidSickDays === 'number' ? data.paidSickDays : undefined,
		lopDays: typeof data.lopDays === 'number' ? data.lopDays : undefined,
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

function parseDateInput(date: string) {
	const parsed = new Date(`${date}T00:00:00`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateInput(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function calculateProbationEndingDate(doj: string) {
	const start = parseDateInput(doj);
	if (!start) return '';
	const end = new Date(start);
	end.setMonth(end.getMonth() + PROBATION_MONTHS);
	end.setDate(end.getDate() - 1);
	return formatDateInput(end);
}

export function getEmployeeProbationEndingDate(
	employee?: Pick<Employee, 'doj' | 'probationEndingDate'> | null
) {
	return (
		employee?.probationEndingDate ||
		(employee?.doj ? calculateProbationEndingDate(employee.doj) : '')
	);
}

export function isEmployeeOnProbation(
	employee?: Pick<Employee, 'doj' | 'probationEndingDate'> | null,
	today = new Date()
) {
	const probationEndingDate = getEmployeeProbationEndingDate(employee);
	const end = probationEndingDate ? parseDateInput(probationEndingDate) : null;
	return Boolean(end && end >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
}

export function getSickLeaveAccruedDays(
	employee?: Pick<Employee, 'doj' | 'probationEndingDate'> | null,
	today = new Date()
) {
	const probationEndingDate = getEmployeeProbationEndingDate(employee);
	const end = probationEndingDate ? parseDateInput(probationEndingDate) : null;
	if (!end) return 0;

	const year = today.getFullYear();
	const firstAccrual = new Date(end.getFullYear(), end.getMonth() + 1, 1);
	const currentMonth = new Date(year, today.getMonth(), 1);
	if (firstAccrual > currentMonth) return 0;
	if (firstAccrual.getFullYear() < year) return today.getMonth() + 1;
	if (firstAccrual.getFullYear() > year) return 0;
	return today.getMonth() - firstAccrual.getMonth() + 1;
}

export function isLeaveRequestInYear(request: Pick<LeaveRequest, 'startDate'>, year: number) {
	const start = parseDateInput(request.startDate);
	return Boolean(start && start.getFullYear() === year);
}

export function getPaidSickDaysForRequest(request: Pick<LeaveRequest, 'days' | 'paidSickDays'>) {
	return typeof request.paidSickDays === 'number' ? request.paidSickDays : request.days;
}

export function getLopDaysForRequest(request: Pick<LeaveRequest, 'lopDays'>) {
	return typeof request.lopDays === 'number' ? request.lopDays : 0;
}

export function calculateLeaveStats(
	employee: Pick<Employee, 'doj' | 'probationEndingDate'> | null,
	requests: LeaveRequest[],
	today = new Date()
) {
	const year = today.getFullYear();
	const approvedThisYear = requests.filter(
		(request) => request.status === 'approved' && isLeaveRequestInYear(request, year)
	);
	const used = approvedThisYear.reduce(
		(sum, request) => sum + getPaidSickDaysForRequest(request),
		0
	);
	const lopUsed = approvedThisYear.reduce((sum, request) => sum + getLopDaysForRequest(request), 0);
	const accrued = getSickLeaveAccruedDays(employee, today);

	return {
		accrued,
		used,
		lopUsed,
		balance: Math.max(0, accrued - used),
		onProbation: isEmployeeOnProbation(employee, today),
		probationEndingDate: getEmployeeProbationEndingDate(employee)
	};
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
