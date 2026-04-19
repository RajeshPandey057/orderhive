import { form, getRequestEvent } from '$app/server';
import { firestore } from '$lib/server/firebase';
import { error } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import Papa from 'papaparse';
import { z } from 'zod';

const invoiceStageValues = ['first-half', 'second-half', 'full', 'not-yet-eligible'] as const;
const propertyTypeValues = ['apartment', 'townhouse', 'villa', 'commercial', 'plot'] as const;

const ORDER_ID_RE = /^IND[A-Za-z0-9]+$/;

function buildPrimaryRowSchema(lenient: boolean) {
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
		split_preset: z.string().optional().or(z.literal('')),
		caller_split: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
		closer_split: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
		third_agent_email: z.string().optional().or(z.literal('')),
		third_agent_split: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
		deal_stage: z.string().optional().or(z.literal('')),
		payment_value: z.coerce.number().optional().or(z.literal('')),
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
		passback_amount: z.coerce.number().min(0).optional().or(z.literal(''))
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

		if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
			ctx.addIssue({ code: 'custom', path: ['email'], message: 'email must be valid' });
		if (data.caller_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.caller_email))
			ctx.addIssue({
				code: 'custom',
				path: ['caller_email'],
				message: 'caller_email must be a valid email'
			});
		if (!data.deal_stage || !['eoi', 'booking'].includes(data.deal_stage))
			ctx.addIssue({
				code: 'custom',
				path: ['deal_stage'],
				message: 'deal_stage must be eoi or booking'
			});
		if (typeof data.payment_value !== 'number')
			ctx.addIssue({
				code: 'custom',
				path: ['payment_value'],
				message: 'payment_value must be a number ≥ 0'
			});
		req(data.booking_form_url, 'booking_form_url', 'booking_form_url is required');
		req(data.payment_receipt_url, 'payment_receipt_url', 'payment_receipt_url is required');
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

const jointBuyerRowSchema = z.object({
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

const bulkImportSchema = z.object({
	csv: z.instanceof(File).refine((file) => file.size > 0, {
		message: 'No CSV file provided'
	}),
	lenient: z.string().optional().default('false')
});

export type ImportedSale = { id: string; client: string };
export type ImportError = { order_id: string; row: number; message: string };
export type BulkImportResult = { imported: ImportedSale[]; errors: ImportError[] };

function makeFileRecord(url: string | undefined | '') {
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

function parseDDMMYYYY(dateStr: string | undefined | ''): string | null {
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

function parseDDMmmYYYY(dateStr: string | undefined | ''): string | null {
	if (!dateStr || dateStr.trim() === '') return null;
	const parts = dateStr.trim().split('-');
	if (parts.length !== 3) return null;
	const [dd, mmm, yyyy] = parts;
	const mm = MONTH_MAP[mmm.toLowerCase()];
	if (!mm) return null;
	const iso = `${yyyy}-${mm}-${dd.padStart(2, '0')}`;
	if (isNaN(new Date(iso).getTime())) return null;
	return iso;
}

type UserRecord = { uid: string; displayName?: string; email: string; photoURL?: string };

async function resolveUserByEmail(email: string): Promise<UserRecord> {
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
			email: doc.data().email,
			displayName: doc.data().displayName,
			photoURL: doc.data().photoURL
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
			email: doc.data().email,
			displayName: doc.data().displayName,
			photoURL: doc.data().photoURL
		};
	}

	const now = FieldValue.serverTimestamp();
	const roleRef = firestore.collection('roles').doc(normalised);
	await roleRef.set({
		email: normalised,
		accessType: 'agent',
		createdAt: now,
		updatedAt: now
	});

	return { uid: normalised, email: normalised };
}

export const importBulkSales = form(bulkImportSchema, async ({ csv, lenient: lenientStr }) => {
	const { locals } = getRequestEvent();
	const lenient = lenientStr === 'true';

	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'super-admin')) {
		throw error(403, 'Forbidden');
	}

	const csvText = await csv.text();

	const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h) => h.trim()
	});

	if (parsed.errors.length > 0 && parsed.data.length === 0) {
		throw error(400, `CSV parse error: ${parsed.errors[0].message}`);
	}

	const rows = parsed.data;
	const importErrors: ImportError[] = [];
	const importedSales: ImportedSale[] = [];
	const primaryRowSchema = buildPrimaryRowSchema(lenient);

	const groups = new Map<
		string,
		{
			primaryRow: Record<string, string>;
			primaryIdx: number;
			jointRows: { row: Record<string, string>; idx: number }[];
		}
	>();

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const orderId = row['order_id']?.trim();

		if (!orderId) {
			importErrors.push({
				order_id: '',
				row: i + 2,
				message: 'order_id is missing or empty'
			});
			continue;
		}

		if (!groups.has(orderId)) {
			groups.set(orderId, {
				primaryRow: {} as Record<string, string>,
				primaryIdx: -1,
				jointRows: []
			});
		}
		const group = groups.get(orderId)!;

		const isJoint = row['is_joint_buyer']?.trim().toLowerCase();
		if (isJoint === 'false' || isJoint === '' || isJoint === undefined) {
			if (group.primaryIdx !== -1) {
				importErrors.push({
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
			importErrors.push({
				order_id: orderId,
				row: i + 2,
				message: `is_joint_buyer must be 'true' or 'false'`
			});
		}
	}

	for (const [orderId, group] of groups) {
		if (group.primaryIdx === -1) {
			importErrors.push({
				order_id: orderId,
				row: 0,
				message: `No primary row found for order_id ${orderId}`
			});
			continue;
		}

		const primaryResult = primaryRowSchema.safeParse(group.primaryRow);
		if (!primaryResult.success) {
			const messages = primaryResult.error.issues
				.map((i) => `${i.path.join('.')}: ${i.message}`)
				.join('; ');
			importErrors.push({ order_id: orderId, row: group.primaryIdx, message: messages });
			continue;
		}
		const primary = primaryResult.data;

		const jointBuyers: z.infer<typeof jointBuyerRowSchema>[] = [];
		let jointValid = true;
		for (const { row, idx } of group.jointRows) {
			const jointResult = jointBuyerRowSchema.safeParse(row);
			if (!jointResult.success) {
				const messages = jointResult.error.issues
					.map((i) => `${i.path.join('.')}: ${i.message}`)
					.join('; ');
				importErrors.push({ order_id: orderId, row: idx, message: `Joint buyer: ${messages}` });
				jointValid = false;
			} else {
				jointBuyers.push(jointResult.data);
			}
		}
		if (!jointValid) continue;

		const callerEmail = primary.caller_email ?? '';
		const callerUser = callerEmail ? await resolveUserByEmail(callerEmail) : null;

		// Build deal owners — support 3-agent splits
		const dealOwners: Sale['dealOwners'] = [];

		const hasThirdAgent = primary.third_agent_email && primary.third_agent_email.trim() !== '';

		if (hasThirdAgent) {
			// Explicit 3-agent splits
			const cs = typeof primary.caller_split === 'number' ? primary.caller_split : 0;
			const clos = typeof primary.closer_split === 'number' ? primary.closer_split : 0;
			const ts = typeof primary.third_agent_split === 'number' ? primary.third_agent_split : 0;

			if (!lenient && Math.round(cs + clos + ts) !== 100) {
				importErrors.push({
					order_id: orderId,
					row: group.primaryIdx,
					message: `caller_split + closer_split + third_agent_split must sum to 100 (got ${cs + clos + ts})`
				});
				continue;
			}

			if (callerUser) {
				dealOwners.push({
					userId: callerUser.uid,
					email: callerUser.email,
					name: callerUser.displayName ?? callerUser.email,
					photoURL: callerUser.photoURL ?? '',
					ownerRole: 'caller',
					split: cs
				});
			}
			if (primary.closer_email && primary.closer_email.trim() !== '') {
				const closerUser = await resolveUserByEmail(primary.closer_email);
				dealOwners.push({
					userId: closerUser.uid,
					email: closerUser.email,
					name: closerUser.displayName ?? closerUser.email,
					photoURL: closerUser.photoURL ?? '',
					ownerRole: 'closer',
					split: clos
				});
			}
			const thirdUser = await resolveUserByEmail(primary.third_agent_email!);
			dealOwners.push({
				userId: thirdUser.uid,
				email: thirdUser.email,
				name: thirdUser.displayName ?? thirdUser.email,
				photoURL: thirdUser.photoURL ?? '',
				ownerRole: 'closer',
				split: ts
			});
		} else {
			// 2-agent mode — use split_preset
			const rawPreset = (primary.split_preset ?? '').toString().trim();
			if (rawPreset === '100') {
				// Single owner — full split
				if (callerUser) {
					dealOwners.push({
						userId: callerUser.uid,
						email: callerUser.email,
						name: callerUser.displayName ?? callerUser.email,
						photoURL: callerUser.photoURL ?? '',
						ownerRole: 'caller',
						split: 100
					});
				}
			} else {
				const splitPreset = rawPreset === '55/45' ? '55/45' : '70/30';
				const callerSplit = splitPreset === '55/45' ? 55 : 70;
				const closerSplit = splitPreset === '55/45' ? 45 : 30;

				if (callerUser) {
					dealOwners.push({
						userId: callerUser.uid,
						email: callerUser.email,
						name: callerUser.displayName ?? callerUser.email,
						photoURL: callerUser.photoURL ?? '',
						ownerRole: 'caller',
						split: callerSplit
					});
				}
				if (primary.closer_email && primary.closer_email.trim() !== '') {
					const closerUser = await resolveUserByEmail(primary.closer_email);
					dealOwners.push({
						userId: closerUser.uid,
						email: closerUser.email,
						name: closerUser.displayName ?? closerUser.email,
						photoURL: closerUser.photoURL ?? '',
						ownerRole: 'closer',
						split: closerSplit
					});
				}
			}
		}

		// Calculate commission and passback derived values
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

		const now = FieldValue.serverTimestamp();
		const createdByUid = callerUser?.uid ?? orderId;

		// Use the order_id from the CSV directly as the Firestore document ID
		const saleId = orderId;

		// Prevent overwriting an existing sale
		const existing = await firestore.collection('sales').doc(saleId).get();
		if (existing.exists) {
			importErrors.push({
				order_id: orderId,
				row: group.primaryIdx,
				message: `Sale ${saleId} already exists — skipped to avoid overwrite`
			});
			continue;
		}

		const parsedSaleDate = parseDDMmmYYYY(primary.sale_date) ?? primary.sale_date ?? null;

		// Ensure role documents exist for any manager emails provided
		await Promise.all(
			[
				primary.caller_manager_email,
				primary.closer_manager_email,
				primary.caller_senior_manager_email,
				primary.closer_senior_manager_email
			]
				.filter((e): e is string => !!e && typeof e === 'string' && e.trim() !== '')
				.map((email) => resolveUserByEmail(email))
		);

		const saleRecord = {
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
			jointBuyers: jointBuyers.map((jb) => ({
				firstName: jb.first_name,
				lastName: jb.last_name,
				email: jb.email,
				phone: jb.phone,
				passportFile: makeFileRecord(jb.passport_url),
				nationalIdFile: makeFileRecord(jb.national_id_url),
				amlFormFile: makeFileRecord(jb.aml_form_url)
			})),
			dealOwners,
			dealOwnerIds: dealOwners.map((o) => o.userId),
			splits: dealOwners.map((o) => ({
				agentId: o.userId,
				agentName: o.name,
				agentEmail: o.email,
				agentPhotoURL: o.photoURL,
				ownerRole: (o.ownerRole === 'closer' && dealOwners.indexOf(o) >= 2
					? 'extra'
					: o.ownerRole) as 'caller' | 'closer' | 'extra',
				percentage: o.split
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
				typeof primary.property_size === 'number' && { propertySize: primary.property_size }),
			...(primary.plot_area &&
				typeof primary.plot_area === 'number' && { plotArea: primary.plot_area }),
			...(primary.built_up_area &&
				typeof primary.built_up_area === 'number' && { builtUpArea: primary.built_up_area }),
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
			...(primary.caller_manager_email && { callerManagerEmail: primary.caller_manager_email }),
			...(primary.closer_manager_email && { closerManagerEmail: primary.closer_manager_email }),
			...(primary.caller_senior_manager_email && {
				callerSeniorManagerEmail: primary.caller_senior_manager_email
			}),
			...(primary.closer_senior_manager_email && {
				closerSeniorManagerEmail: primary.closer_senior_manager_email
			}),
			commnets: [],
			createdByUid,
			createdByEmail: callerUser?.email ?? '',
			createdAt: now,
			updatedAt: now
		};

		try {
			await firestore.collection('sales').doc(saleId).set(saleRecord);
			importedSales.push({
				id: saleId,
				client: `${primary.first_name ?? ''} ${primary.last_name ?? ''}`.trim()
			});
		} catch (writeErr) {
			console.error(`Failed to write sale for order_id ${orderId}:`, writeErr);
			importErrors.push({
				order_id: orderId,
				row: group.primaryIdx,
				message: 'Failed to save sale to Firestore'
			});
		}
	}

	const result: BulkImportResult = { imported: importedSales, errors: importErrors };
	return result;
});
