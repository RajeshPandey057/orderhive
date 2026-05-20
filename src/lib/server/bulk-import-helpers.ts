/**
 * Shared helpers for bulk import — used by both the legacy form action and the
 * new async API routes. All CSV parsing, Zod validation, and sale-record
 * building lives here so it can be imported from multiple server endpoints.
 */
import { FieldValue, firestore } from '$lib/server/firebase';
import Papa from 'papaparse';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

export const invoiceStageValues = [
	'first-half',
	'second-half',
	'full',
	'not-yet-eligible'
] as const;
export const propertyTypeValues = [
	'apartment',
	'townhouse',
	'villa',
	'commercial',
	'plot'
] as const;

const ORDER_ID_RE = /^IND[A-Za-z0-9]+$/;

export type UserRecord = {
	uid: string;
	displayName?: string;
	email: string;
	photoURL?: string;
};

export type ImportedSale = { id: string; client: string };
export type ImportError = { order_id: string; row: number; message: string };

export type GroupedOrder = {
	orderId: string;
	primaryRow: Record<string, string>;
	primaryIdx: number;
	jointRows: { row: Record<string, string>; idx: number }[];
};

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export function buildPrimaryRowSchema(lenient: boolean) {
	const base = z.object({
		order_id: z
			.string()
			.min(1, 'order_id is required')
			.regex(ORDER_ID_RE, 'order_id must follow the INDN001 format (e.g. INDN001, INDM042)'),
		is_joint_buyer: z.preprocess(
			(val) => (typeof val === 'string' ? val.trim().toLowerCase() || 'false' : val),
			z.literal('false')
		),
		first_name: z.string().optional().or(z.literal('')),
		last_name: z.string().optional().or(z.literal('')),
		email: z.string().optional().or(z.literal('')),
		phone: z.string().optional().or(z.literal('')),
		passport_url: z.string().optional().or(z.literal('')),
		national_id_url: z.string().optional().or(z.literal('')),
		aml_form_url: z.string().optional().or(z.literal('')),
		caller_email: z.string().optional().or(z.literal('')),
		closer_email: z.string().optional().or(z.literal('')),
		caller_split: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
		closer_split: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
		closer2_email: z.string().optional().or(z.literal('')),
		closer2_split: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
		closer2_manager_email: z.string().optional().or(z.literal('')),
		closer2_senior_manager_email: z.string().optional().or(z.literal('')),
		closer3_email: z.string().optional().or(z.literal('')),
		closer3_split: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
		closer3_manager_email: z.string().optional().or(z.literal('')),
		closer3_senior_manager_email: z.string().optional().or(z.literal('')),
		deal_stage: z.preprocess(
			(val) => {
				if (typeof val !== 'string') return val;
				const lower = val.trim().toLowerCase();
				if (lower === 'confirmed') return 'booking';
				return lower || undefined;
			},
			z.string().optional().or(z.literal(''))
		),
		payment_value: z
			.preprocess(
				(val) => (typeof val === 'string' ? val.replace(/,/g, '') : val),
				z.coerce.number().optional()
			)
			.or(z.literal('')),
		booking_form_url: z.string().optional().or(z.literal('')),
		payment_receipt_url: z.string().optional().or(z.literal('')),
		referral_agreement_url: z.string().optional().or(z.literal('')),
		sale_type: z.string().optional().or(z.literal('')),
		developer: z.string().optional().or(z.literal('')),
		project: z.string().optional().or(z.literal('')),
		community: z.string().optional().or(z.literal('')),
		property_type: z.string().optional().or(z.literal('')),
		bedroom_type: z.string().optional().or(z.literal('')),
		commercial_sub_type: z.string().optional().or(z.literal('')),
		property_size: z.coerce.number().positive().optional().or(z.literal('')),
		plot_area: z.coerce.number().positive().optional().or(z.literal('')),
		built_up_area: z.coerce.number().positive().optional().or(z.literal('')),
		gross_floor_area: z.coerce.number().positive().optional().or(z.literal('')),
		unit_no: z.string().optional().or(z.literal('')),
		unit_value: z.string().optional().or(z.literal('')),
		invoice_stage: z.string().optional().or(z.literal('')),
		tentative_eligibility_date: z.string().optional().or(z.literal('')),
		sale_date: z.string().optional().or(z.literal('')),
		nationality: z.string().optional().or(z.literal('')),
		resident_status: z.string().optional().or(z.literal('')),
		caller_manager_email: z.string().optional().or(z.literal('')),
		closer_manager_email: z.string().optional().or(z.literal('')),
		caller_senior_manager_email: z.string().optional().or(z.literal('')),
		closer_senior_manager_email: z.string().optional().or(z.literal('')),
		commission_percentage: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
		passback_amount: z
			.preprocess(
				(val) => (typeof val === 'string' ? val.replace(/,/g, '') : val),
				z.coerce.number().min(0).optional()
			)
			.or(z.literal(''))
	});

	if (lenient) return base;

	return base.superRefine((data, ctx) => {
		const req = (val: string | undefined, path: string, msg: string) => {
			if (!val || val.trim() === '') ctx.addIssue({ code: 'custom', path: [path], message: msg });
		};
		req(data.first_name, 'first_name', 'first_name is required');
		req(data.last_name, 'last_name', 'last_name is required');
		req(data.phone, 'phone', 'phone is required');
		req(data.passport_url, 'passport_url', 'passport_url is required');
		req(data.national_id_url, 'national_id_url', 'national_id_url is required');
		req(data.caller_email, 'caller_email', 'caller_email is required');
		req(data.unit_no, 'unit_no', 'unit_no is required');
		req(data.unit_value, 'unit_value', 'unit_value is required');
		req(data.developer, 'developer', 'developer is required');
		req(data.project, 'project', 'project is required');
		req(data.sale_date, 'sale_date', 'sale_date is required');
		req(data.caller_manager_email, 'caller_manager_email', 'caller_manager_email is required');
		req(
			data.caller_senior_manager_email,
			'caller_senior_manager_email',
			'caller_senior_manager_email is required'
		);
		if (data.closer_email && data.closer_email.trim() !== '') {
			req(
				data.closer_manager_email,
				'closer_manager_email',
				'closer_manager_email is required when closer_email is set'
			);
			req(
				data.closer_senior_manager_email,
				'closer_senior_manager_email',
				'closer_senior_manager_email is required when closer_email is set'
			);
		}
		if (data.closer2_email && data.closer2_email.trim() !== '') {
			req(
				data.closer2_manager_email,
				'closer2_manager_email',
				'closer2_manager_email is required when closer2_email is set'
			);
			req(
				data.closer2_senior_manager_email,
				'closer2_senior_manager_email',
				'closer2_senior_manager_email is required when closer2_email is set'
			);
		}
		if (data.closer3_email && data.closer3_email.trim() !== '') {
			req(
				data.closer3_manager_email,
				'closer3_manager_email',
				'closer3_manager_email is required when closer3_email is set'
			);
			req(
				data.closer3_senior_manager_email,
				'closer3_senior_manager_email',
				'closer3_senior_manager_email is required when closer3_email is set'
			);
		}

		if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
			ctx.addIssue({ code: 'custom', path: ['email'], message: 'email must be valid' });
		if (data.caller_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.caller_email))
			ctx.addIssue({
				code: 'custom',
				path: ['caller_email'],
				message: 'caller_email must be a valid email'
			});
		if (!data.deal_stage || !['eoi', 'booking', 'cancelled'].includes(data.deal_stage))
			ctx.addIssue({
				code: 'custom',
				path: ['deal_stage'],
				message: 'deal_stage must be eoi, booking, or cancelled'
			});
		if (typeof data.payment_value !== 'number')
			ctx.addIssue({
				code: 'custom',
				path: ['payment_value'],
				message: 'payment_value must be a number ≥ 0'
			});
		if (data.deal_stage !== 'cancelled') {
			req(data.booking_form_url, 'booking_form_url', 'booking_form_url is required');
			req(data.payment_receipt_url, 'payment_receipt_url', 'payment_receipt_url is required');
		}
		if (!data.sale_type || !['off-plan', 'secondary'].includes(data.sale_type))
			ctx.addIssue({
				code: 'custom',
				path: ['sale_type'],
				message: 'sale_type must be off-plan or secondary'
			});
		if (!data.property_type || !propertyTypeValues.includes(data.property_type as never))
			ctx.addIssue({
				code: 'custom',
				path: ['property_type'],
				message: 'property_type is invalid'
			});
		if (!data.invoice_stage || !invoiceStageValues.includes(data.invoice_stage as never))
			ctx.addIssue({
				code: 'custom',
				path: ['invoice_stage'],
				message: 'invoice_stage is invalid'
			});

		if (data.property_type === 'apartment') {
			if (!data.bedroom_type)
				ctx.addIssue({
					code: 'custom',
					path: ['bedroom_type'],
					message: 'bedroom_type is required for apartments'
				});
			if (!data.property_size)
				ctx.addIssue({
					code: 'custom',
					path: ['property_size'],
					message: 'property_size is required for apartments'
				});
		}
		if (data.property_type === 'townhouse' || data.property_type === 'villa') {
			if (!data.bedroom_type)
				ctx.addIssue({
					code: 'custom',
					path: ['bedroom_type'],
					message: 'bedroom_type is required for townhouse/villa'
				});
			if (!data.plot_area)
				ctx.addIssue({
					code: 'custom',
					path: ['plot_area'],
					message: 'plot_area is required for townhouse/villa'
				});
			if (!data.built_up_area)
				ctx.addIssue({
					code: 'custom',
					path: ['built_up_area'],
					message: 'built_up_area is required for townhouse/villa'
				});
		}
		if (data.property_type === 'commercial') {
			if (!data.commercial_sub_type)
				ctx.addIssue({
					code: 'custom',
					path: ['commercial_sub_type'],
					message: 'commercial_sub_type is required for commercial properties'
				});
			if (!data.property_size)
				ctx.addIssue({
					code: 'custom',
					path: ['property_size'],
					message: 'property_size is required for commercial properties'
				});
			if (data.commercial_sub_type === 'warehouse' && !data.gross_floor_area)
				ctx.addIssue({
					code: 'custom',
					path: ['gross_floor_area'],
					message: 'gross_floor_area is required for warehouses'
				});
		}
		if (data.property_type === 'plot') {
			if (!data.property_size)
				ctx.addIssue({
					code: 'custom',
					path: ['property_size'],
					message: 'property_size is required for plots'
				});
		}
	});
}

export const jointBuyerRowSchema = z.object({
	order_id: z.string().min(1, 'order_id is required'),
	is_joint_buyer: z.preprocess(
		(val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
		z.literal('true')
	),
	first_name: z.string().min(1, 'first_name is required'),
	last_name: z.string().min(1, 'last_name is required'),
	email: z.email('email must be valid'),
	phone: z.string().min(7, 'phone is required'),
	passport_url: z.string().url('passport_url must be a valid URL'),
	national_id_url: z.string().url('national_id_url must be a valid URL'),
	aml_form_url: z.string().url().optional().or(z.literal(''))
});

// ---------------------------------------------------------------------------
// File record helper
// ---------------------------------------------------------------------------

export function makeFileRecord(url: string | undefined | '') {
	if (!url || url.trim() === '') return null;
	return {
		path: '',
		downloadURL: url.trim(),
		token: '',
		contentType: 'application/octet-stream',
		size: 0,
		name: url.trim().split('/').pop() ?? 'file',
		lastModified: Date.now(),
		financeStatus: 'pending' as const,
		complianceStatus: 'pending' as const,
		original: {
			name: url.trim().split('/').pop() ?? 'file',
			size: 0,
			type: 'application/octet-stream',
			lastModified: Date.now()
		}
	};
}

// ---------------------------------------------------------------------------
// Date parsers
// ---------------------------------------------------------------------------

export function parseDDMMYYYY(dateStr: string | undefined | ''): string | null {
	if (!dateStr || dateStr.trim() === '') return null;
	const parts = dateStr.trim().split('/');
	if (parts.length !== 3) return null;
	const [dd, mm, yyyy] = parts;
	const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
	if (isNaN(new Date(iso).getTime())) return null;
	return iso;
}

const MONTH_MAP: Record<string, string> = {
	jan: '01',
	feb: '02',
	mar: '03',
	apr: '04',
	may: '05',
	jun: '06',
	jul: '07',
	aug: '08',
	sep: '09',
	oct: '10',
	nov: '11',
	dec: '12'
};

export function parseDDMmmYYYY(dateStr: string | undefined | ''): string | null {
	if (!dateStr || dateStr.trim() === '') return null;
	const parts = dateStr.trim().split('-');
	if (parts.length !== 3) return null;
	const [dd, mmm, rawYyyy] = parts;
	const mm = MONTH_MAP[mmm.toLowerCase()];
	if (!mm) return null;
	const yearNum = parseInt(rawYyyy, 10);
	if (isNaN(yearNum)) return null;
	const yyyy = yearNum < 100 ? String(2000 + yearNum) : rawYyyy;
	const iso = `${yyyy}-${mm}-${dd.padStart(2, '0')}`;
	if (isNaN(new Date(iso).getTime())) return null;
	return iso;
}

// ---------------------------------------------------------------------------
// CSV parsing & grouping (pure — no I/O)
// ---------------------------------------------------------------------------

export function parseAndGroupCSV(
	csvText: string,
	lenient: boolean
): { groups: GroupedOrder[]; errors: ImportError[] } {
	const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h) => h.trim()
	});

	const errors: ImportError[] = [];
	const primaryRowSchema = buildPrimaryRowSchema(lenient);
	const groupMap = new Map<
		string,
		{
			primaryRow: Record<string, string>;
			primaryIdx: number;
			jointRows: { row: Record<string, string>; idx: number }[];
		}
	>();

	for (let i = 0; i < parsed.data.length; i++) {
		const row = parsed.data[i];
		const orderId = row['order_id']?.trim();

		if (!orderId) {
			errors.push({ order_id: '', row: i + 2, message: 'order_id is missing or empty' });
			continue;
		}

		if (!groupMap.has(orderId)) {
			groupMap.set(orderId, {
				primaryRow: {} as Record<string, string>,
				primaryIdx: -1,
				jointRows: []
			});
		}
		const group = groupMap.get(orderId)!;
		const isJoint = row['is_joint_buyer']?.trim().toLowerCase();

		if (isJoint === 'false' || isJoint === '' || isJoint === undefined) {
			if (group.primaryIdx !== -1) {
				errors.push({
					order_id: orderId,
					row: i + 2,
					message: `Duplicate primary row for order_id ${orderId}`
				});
				continue;
			}
			group.primaryRow = row;
			group.primaryIdx = i + 2;
		} else if (isJoint === 'true') {
			group.jointRows.push({ row, idx: i + 2 });
		} else {
			errors.push({
				order_id: orderId,
				row: i + 2,
				message: `is_joint_buyer must be 'true' or 'false'`
			});
		}
	}

	const groups: GroupedOrder[] = [];

	for (const [orderId, group] of groupMap) {
		if (group.primaryIdx === -1) {
			errors.push({
				order_id: orderId,
				row: 0,
				message: `No primary row found for order_id ${orderId}`
			});
			continue;
		}

		// Validate primary row schema
		const primaryResult = primaryRowSchema.safeParse(group.primaryRow);
		if (!primaryResult.success) {
			const messages = primaryResult.error.issues
				.map((i) => `${i.path.join('.')}: ${i.message}`)
				.join('; ');
			errors.push({ order_id: orderId, row: group.primaryIdx, message: messages });
			continue;
		}

		// Validate joint buyer rows
		let jointValid = true;
		const validatedJoints: { row: Record<string, string>; idx: number }[] = [];
		for (const { row, idx } of group.jointRows) {
			const jointResult = jointBuyerRowSchema.safeParse(row);
			if (!jointResult.success) {
				const messages = jointResult.error.issues
					.map((i) => `${i.path.join('.')}: ${i.message}`)
					.join('; ');
				errors.push({ order_id: orderId, row: idx, message: `Joint buyer: ${messages}` });
				jointValid = false;
			} else {
				validatedJoints.push({ row, idx });
			}
		}
		if (!jointValid) continue;

		// Validate split totals
		if (!lenient) {
			const primary = primaryResult.data;
			const splitsDefined = [
				primary.caller_split,
				primary.closer_split,
				primary.closer2_split,
				primary.closer3_split
			].some((s) => typeof s === 'number');
			if (splitsDefined) {
				const total =
					(typeof primary.caller_split === 'number' ? primary.caller_split : 0) +
					(typeof primary.closer_split === 'number' ? primary.closer_split : 0) +
					(typeof primary.closer2_split === 'number' ? primary.closer2_split : 0) +
					(typeof primary.closer3_split === 'number' ? primary.closer3_split : 0);
				if (Math.round(total) !== 100) {
					errors.push({
						order_id: orderId,
						row: group.primaryIdx,
						message: `Split percentages must sum to 100 (got ${total})`
					});
					continue;
				}
			}
		}

		groups.push({
			orderId,
			primaryRow: group.primaryRow,
			primaryIdx: group.primaryIdx,
			jointRows: validatedJoints
		});
	}

	return { groups, errors };
}

// ---------------------------------------------------------------------------
// User resolution with Firestore + per-request email cache
// ---------------------------------------------------------------------------

export async function resolveUserByEmail(email: string): Promise<UserRecord> {
	const normalised = email.trim().toLowerCase();

	const usersSnap = await firestore
		.collection('users')
		.where('email', '==', normalised)
		.limit(1)
		.get();

	if (!usersSnap.empty) {
		const doc = usersSnap.docs[0];
		return {
			uid: doc.id,
			email: doc.data().email as string,
			displayName: doc.data().displayName as string | undefined,
			photoURL: doc.data().photoURL as string | undefined
		};
	}

	const rolesSnap = await firestore
		.collection('roles')
		.where('email', '==', normalised)
		.limit(1)
		.get();

	if (!rolesSnap.empty) {
		const doc = rolesSnap.docs[0];
		return {
			uid: doc.id,
			email: doc.data().email as string,
			displayName: doc.data().displayName as string | undefined,
			photoURL: doc.data().photoURL as string | undefined
		};
	}

	// Create a stub roles document so the user is known to the system
	const now = FieldValue.serverTimestamp();
	const roleRef = firestore.collection('roles').doc(normalised);
	await roleRef.set({ email: normalised, accessType: 'agent', createdAt: now, updatedAt: now });

	return { uid: normalised, email: normalised };
}

/** Returns a cached wrapper around resolveUserByEmail scoped to one request. */
export function makeEmailCache(): (email: string) => Promise<UserRecord> {
	const cache = new Map<string, UserRecord>();
	return async function resolveUserCached(email: string): Promise<UserRecord> {
		const key = email.trim().toLowerCase();
		if (cache.has(key)) return cache.get(key)!;
		const result = await resolveUserByEmail(key);
		cache.set(key, result);
		return result;
	};
}

// ---------------------------------------------------------------------------
// Sale record builder — resolves agents and constructs the Firestore document
// ---------------------------------------------------------------------------

type DealOwnerEntry = {
	userId: string;
	email: string;
	name: string;
	photoURL: string;
	ownerRole: 'caller' | 'closer' | 'closer2' | 'closer3';
	split: number;
	managerEmail?: string;
	seniorManagerEmail?: string;
};

export async function buildSaleRecord(
	group: GroupedOrder,
	resolveUser: (email: string) => Promise<UserRecord>,
	lenient: boolean
): Promise<Record<string, unknown>> {
	const primaryRowSchema = buildPrimaryRowSchema(lenient);
	const primaryResult = primaryRowSchema.parse(group.primaryRow);
	const primary = primaryResult;

	// Resolve all agent emails in parallel
	const [callerUser, closerUser, closer2User, closer3User] = await Promise.all([
		primary.caller_email && primary.caller_email.trim()
			? resolveUser(primary.caller_email)
			: Promise.resolve(null),
		primary.closer_email && primary.closer_email.trim()
			? resolveUser(primary.closer_email)
			: Promise.resolve(null),
		primary.closer2_email && primary.closer2_email.trim()
			? resolveUser(primary.closer2_email)
			: Promise.resolve(null),
		primary.closer3_email && primary.closer3_email.trim()
			? resolveUser(primary.closer3_email)
			: Promise.resolve(null)
	]);

	const dealOwners: DealOwnerEntry[] = [];

	if (callerUser) {
		dealOwners.push({
			userId: callerUser.uid,
			email: callerUser.email,
			name: callerUser.displayName ?? callerUser.email,
			photoURL: callerUser.photoURL ?? '',
			ownerRole: 'caller',
			split: typeof primary.caller_split === 'number' ? primary.caller_split : 100,
			...(primary.caller_manager_email && { managerEmail: primary.caller_manager_email }),
			...(primary.caller_senior_manager_email && {
				seniorManagerEmail: primary.caller_senior_manager_email
			})
		});
	}
	if (closerUser) {
		dealOwners.push({
			userId: closerUser.uid,
			email: closerUser.email,
			name: closerUser.displayName ?? closerUser.email,
			photoURL: closerUser.photoURL ?? '',
			ownerRole: 'closer',
			split: typeof primary.closer_split === 'number' ? primary.closer_split : 0,
			...(primary.closer_manager_email && { managerEmail: primary.closer_manager_email }),
			...(primary.closer_senior_manager_email && {
				seniorManagerEmail: primary.closer_senior_manager_email
			})
		});
	}
	if (closer2User) {
		dealOwners.push({
			userId: closer2User.uid,
			email: closer2User.email,
			name: closer2User.displayName ?? closer2User.email,
			photoURL: closer2User.photoURL ?? '',
			ownerRole: 'closer2',
			split: typeof primary.closer2_split === 'number' ? primary.closer2_split : 0,
			...(primary.closer2_manager_email && { managerEmail: primary.closer2_manager_email }),
			...(primary.closer2_senior_manager_email && {
				seniorManagerEmail: primary.closer2_senior_manager_email
			})
		});
	}
	if (closer3User) {
		dealOwners.push({
			userId: closer3User.uid,
			email: closer3User.email,
			name: closer3User.displayName ?? closer3User.email,
			photoURL: closer3User.photoURL ?? '',
			ownerRole: 'closer3',
			split: typeof primary.closer3_split === 'number' ? primary.closer3_split : 0,
			...(primary.closer3_manager_email && { managerEmail: primary.closer3_manager_email }),
			...(primary.closer3_senior_manager_email && {
				seniorManagerEmail: primary.closer3_senior_manager_email
			})
		});
	}

	// Ensure role documents exist for any manager/senior-manager emails
	const managerEmails = [
		...new Set(
			dealOwners
				.flatMap((o) => [o.managerEmail, o.seniorManagerEmail])
				.filter((e): e is string => !!e && e.trim() !== '')
		)
	];
	await Promise.all(managerEmails.map((email) => resolveUser(email)));

	// Build joint buyers
	const jointBuyers = group.jointRows.map(({ row }) => {
		const jb = jointBuyerRowSchema.parse(row);
		return {
			firstName: jb.first_name,
			lastName: jb.last_name,
			email: jb.email,
			phone: jb.phone,
			passportFile: makeFileRecord(jb.passport_url),
			nationalIdFile: makeFileRecord(jb.national_id_url),
			amlFormFile: makeFileRecord(jb.aml_form_url)
		};
	});

	// Revenue calculations
	let revenueAchieved: number | undefined;
	let revenueAfterPassback: number | undefined;
	if (primary.commission_percentage && typeof primary.commission_percentage === 'number') {
		const unitValueNum = parseFloat(String(primary.unit_value ?? '').replace(/,/g, ''));
		if (!isNaN(unitValueNum)) {
			revenueAchieved = Math.round((unitValueNum * primary.commission_percentage) / 100);
			const passback = typeof primary.passback_amount === 'number' ? primary.passback_amount : 0;
			revenueAfterPassback = Math.round(revenueAchieved - passback);
		}
	}
	if (primary.deal_stage === 'cancelled') {
		revenueAchieved = 0;
		revenueAfterPassback = 0;
	}

	const now = FieldValue.serverTimestamp();
	const createdByUid = callerUser?.uid ?? group.orderId;
	const parsedSaleDate = parseDDMmmYYYY(primary.sale_date) ?? primary.sale_date ?? null;

	return {
		status: 'pending',
		financeStatus: 'pending',
		complianceStatus: 'pending',
		commissionStatus: 'pending',
		invoiceFile: { status: 'pending' },
		invoiceStage: primary.invoice_stage ? [primary.invoice_stage] : [],
		tentativeEligibilityDate:
			parseDDMmmYYYY(primary.tentative_eligibility_date) ??
			parseDDMMYYYY(primary.tentative_eligibility_date),
		...(parsedSaleDate && { saleDate: parsedSaleDate }),
		clientDetails: {
			firstName: primary.first_name ?? '',
			lastName: primary.last_name ?? '',
			email: primary.email ?? '',
			phone: primary.phone ?? '',
			passportFile: makeFileRecord(primary.passport_url),
			nationalIdFile: makeFileRecord(primary.national_id_url),
			amlFormFile: makeFileRecord(primary.aml_form_url)
		},
		jointBuyers,
		dealOwners,
		dealOwnerIds: dealOwners.map((o) => o.userId),
		splits: dealOwners.map((o) => ({
			agentId: o.userId,
			agentName: o.name,
			agentEmail: o.email,
			agentPhotoURL: o.photoURL,
			ownerRole: o.ownerRole,
			percentage: o.split,
			...(o.managerEmail && { managerEmail: o.managerEmail }),
			...(o.seniorManagerEmail && { seniorManagerEmail: o.seniorManagerEmail })
		})),
		splitAgentIds: dealOwners.map((o) => o.userId),
		dealStage: primary.deal_stage ?? '',
		paymentValue: primary.payment_value ?? 0,
		bookingFormFile: makeFileRecord(primary.booking_form_url),
		paymentReceiptFile: makeFileRecord(primary.payment_receipt_url),
		refferalAgreementFile: makeFileRecord(primary.referral_agreement_url),
		saleType: primary.sale_type ?? '',
		developer: primary.developer ?? '',
		project: primary.project ?? '',
		...(primary.community && primary.community !== '' && { community: primary.community }),
		propertyType: primary.property_type ?? '',
		...(primary.bedroom_type && { bedroomType: primary.bedroom_type }),
		...(primary.commercial_sub_type && { commercialSubType: primary.commercial_sub_type }),
		...(primary.property_size &&
			typeof primary.property_size === 'number' && {
				propertySize: primary.property_size
			}),
		...(primary.plot_area &&
			typeof primary.plot_area === 'number' && {
				plotArea: primary.plot_area
			}),
		...(primary.built_up_area &&
			typeof primary.built_up_area === 'number' && {
				builtUpArea: primary.built_up_area
			}),
		...(primary.gross_floor_area &&
			typeof primary.gross_floor_area === 'number' && {
				grossFloorArea: primary.gross_floor_area
			}),
		unitNo: primary.unit_no ?? '',
		unitValue: (primary.unit_value ?? '').replace(/,/g, ''),
		...(primary.commission_percentage &&
			typeof primary.commission_percentage === 'number' && {
				commissionPercentage: primary.commission_percentage
			}),
		...(revenueAchieved !== undefined && { revenueAchieved }),
		...(primary.passback_amount &&
			typeof primary.passback_amount === 'number' && { passbackAmount: primary.passback_amount }),
		...(revenueAfterPassback !== undefined && { revenueAfterPassback }),
		...(primary.nationality && { nationality: primary.nationality }),
		...(primary.resident_status &&
			['resident', 'non-resident'].includes(primary.resident_status) && {
				residentStatus: primary.resident_status as 'resident' | 'non-resident'
			}),
		commnets: [],
		createdByUid,
		createdByEmail: callerUser?.email ?? '',
		createdAt: now,
		updatedAt: now
	};
}

// ---------------------------------------------------------------------------
// Fields that must NOT be overwritten when updating an existing sale
// ---------------------------------------------------------------------------

export const PRESERVED_ON_UPDATE = new Set([
	'status',
	'financeStatus',
	'complianceStatus',
	'commissionStatus',
	'invoiceFile',
	'commnets',
	'createdAt',
	'createdByUid',
	'createdByEmail'
]);

// ---------------------------------------------------------------------------
// processGroupChunk — shared by the process endpoint & processJobBackground
// ---------------------------------------------------------------------------

type WritePlan =
	| { kind: 'set'; orderId: string; client: string; record: Record<string, unknown> }
	| { kind: 'update'; orderId: string; client: string; payload: Record<string, unknown> }
	| { kind: 'error'; orderId: string; row: number; message: string };

export async function processGroupChunk(
	chunk: GroupedOrder[],
	existFlags: boolean[],
	resolveUser: (email: string) => Promise<UserRecord>,
	lenient: boolean
): Promise<{ imported: ImportedSale[]; updated: ImportedSale[]; errors: ImportError[] }> {
	const CONCURRENCY = 5;
	const writePlans: WritePlan[] = [];

	for (let batchStart = 0; batchStart < chunk.length; batchStart += CONCURRENCY) {
		const batchSlice = chunk.slice(batchStart, batchStart + CONCURRENCY);

		const settled = await Promise.allSettled(
			batchSlice.map(async (group, i) => {
				const isUpdate = existFlags[batchStart + i];
				const record = await buildSaleRecord(group, resolveUser, lenient);
				const client = [
					(group.primaryRow['first_name'] ?? '').trim(),
					(group.primaryRow['last_name'] ?? '').trim()
				]
					.join(' ')
					.trim();

				if (isUpdate) {
					const payload = Object.fromEntries(
						Object.entries(record).filter(([k]) => !PRESERVED_ON_UPDATE.has(k))
					);
					return { kind: 'update' as const, orderId: group.orderId, client, payload };
				}
				return { kind: 'set' as const, orderId: group.orderId, client, record };
			})
		);

		for (let i = 0; i < batchSlice.length; i++) {
			const result = settled[i];
			if (result.status === 'rejected') {
				writePlans.push({
					kind: 'error',
					orderId: batchSlice[i].orderId,
					row: batchSlice[i].primaryIdx,
					message: String((result.reason as Error)?.message ?? 'Failed to build sale record')
				});
			} else {
				writePlans.push(result.value);
			}
		}
	}

	const importedSales: ImportedSale[] = [];
	const updatedSales: ImportedSale[] = [];
	const errors: ImportError[] = [];

	const writeOps = writePlans.filter(
		(p): p is Exclude<WritePlan, { kind: 'error' }> => p.kind !== 'error'
	);
	const buildErrors = writePlans.filter(
		(p): p is Extract<WritePlan, { kind: 'error' }> => p.kind === 'error'
	);

	for (const e of buildErrors) {
		errors.push({ order_id: e.orderId, row: e.row, message: e.message });
	}

	const writeResults = await Promise.allSettled(
		writeOps.map((plan) => {
			const docRef = firestore.collection('sales').doc(plan.orderId);
			if (plan.kind === 'set') return docRef.set(plan.record);
			return docRef.update(plan.payload);
		})
	);

	for (let i = 0; i < writeOps.length; i++) {
		const plan = writeOps[i];
		const result = writeResults[i];
		if (result.status === 'fulfilled') {
			if (plan.kind === 'set') importedSales.push({ id: plan.orderId, client: plan.client });
			else updatedSales.push({ id: plan.orderId, client: plan.client });
		} else {
			errors.push({
				order_id: plan.orderId,
				row: chunk.find((g) => g.orderId === plan.orderId)?.primaryIdx ?? 0,
				message: `Firestore write failed: ${String((result.reason as Error)?.message ?? result.reason)}`
			});
		}
	}

	return { imported: importedSales, updated: updatedSales, errors };
}

// ---------------------------------------------------------------------------
// processJobBackground — runs entirely on the server, fire-and-forget safe
// ---------------------------------------------------------------------------

const BG_CHUNK_SIZE = 20;

export async function processJobBackground(jobId: string): Promise<void> {
	const jobRef = firestore.collection('bulkImportJobs').doc(jobId);

	try {
		const jobSnap = await jobRef.get();
		if (!jobSnap.exists) return;

		const job = jobSnap.data()!;
		await jobRef.update({ status: 'processing', updatedAt: FieldValue.serverTimestamp() });

		const { groups } = parseAndGroupCSV(job.csvText as string, job.lenient as boolean);

		// Single email cache reused across all chunks for max deduplication
		const resolveUser = makeEmailCache();

		for (let offset = 0; offset < groups.length; offset += BG_CHUNK_SIZE) {
			const chunk = groups.slice(offset, offset + BG_CHUNK_SIZE);

			const existingSnaps = await Promise.all(
				chunk.map((g) => firestore.collection('sales').doc(g.orderId).get())
			);
			const existFlags = existingSnaps.map((s) => s.exists);

			const { imported, updated, errors } = await processGroupChunk(
				chunk,
				existFlags,
				resolveUser,
				job.lenient as boolean
			);

			const newProcessedCount = offset + chunk.length;
			const isComplete = newProcessedCount >= groups.length;

			const progressUpdate: Record<string, unknown> = {
				processedCount: newProcessedCount,
				updatedAt: FieldValue.serverTimestamp(),
				...(isComplete && { status: 'completed' })
			};
			if (imported.length > 0) progressUpdate.imported = FieldValue.arrayUnion(...imported);
			if (updated.length > 0) progressUpdate.updated = FieldValue.arrayUnion(...updated);
			if (errors.length > 0) progressUpdate.errors = FieldValue.arrayUnion(...errors);

			await jobRef.update(progressUpdate);
		}

		// Ensure completed even if groups was empty
		const current = await jobRef.get();
		if (current.data()?.status !== 'completed') {
			await jobRef.update({ status: 'completed', updatedAt: FieldValue.serverTimestamp() });
		}
	} catch (err) {
		console.error(`[bulk-import] Background job ${jobId} failed:`, err);
		try {
			await jobRef.update({
				status: 'failed',
				failureReason: String((err as Error)?.message ?? err),
				updatedAt: FieldValue.serverTimestamp()
			});
		} catch {
			// ignore secondary failure
		}
	}
}
