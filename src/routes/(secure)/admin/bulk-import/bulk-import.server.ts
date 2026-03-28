import { firestore } from '$lib/server/firebase';
import { error, json } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import Papa from 'papaparse';
import { z } from 'zod';

// ─── Zod schemas ────────────────────────────────────────────────────────────

const invoiceStageValues = ['first-half', 'second-half', 'full', 'not-yet-eligible'] as const;
const propertyTypeValues = ['apartment', 'townhouse', 'villa', 'commercial', 'plot'] as const;
const bedroomTypeValues = [
	'studio',
	'1bed',
	'2bed',
	'2bed+maid',
	'3bed',
	'3bed+maid',
	'4bed',
	'5bed',
	'6-7bed',
	'duplex',
	'penthouse',
	'podium-townhouse'
] as const;

const primaryRowSchema = z
	.object({
		row_group: z.coerce.number().int().positive('row_group must be a positive integer'),
		is_joint_buyer: z.literal('false'),
		first_name: z.string().min(1, 'first_name is required'),
		last_name: z.string().min(1, 'last_name is required'),
		email: z.email('email must be valid'),
		phone: z.string().min(7, 'phone is required'),
		passport_url: z.string().url('passport_url must be a valid URL'),
		national_id_url: z.string().url('national_id_url must be a valid URL'),
		aml_form_url: z.string().url().optional().or(z.literal('')),
		caller_email: z.email('caller_email must be a valid email'),
		closer_email: z.email().optional().or(z.literal('')),
		split_preset: z.enum(['70/30', '55/45']).optional().or(z.literal('')),
		deal_stage: z.enum(['eoi', 'booking'], 'deal_stage must be eoi or booking'),
		payment_value: z.coerce.number().min(0, 'payment_value must be ≥ 0'),
		booking_form_url: z.string().url('booking_form_url must be a valid URL'),
		payment_receipt_url: z.string().url('payment_receipt_url must be a valid URL'),
		referral_agreement_url: z.string().url().optional().or(z.literal('')),
		sale_type: z.enum(['off-plan', 'secondary'], 'sale_type must be off-plan or secondary'),
		developer: z.string().min(1, 'developer is required'),
		project: z.string().min(1, 'project is required'),
		community: z.string().optional().or(z.literal('')),
		property_type: z.enum(propertyTypeValues, 'property_type is invalid'),
		bedroom_type: z.enum(bedroomTypeValues).optional().or(z.literal('')),
		commercial_sub_type: z.enum(['office', 'warehouse']).optional().or(z.literal('')),
		property_size: z.coerce.number().positive().optional().or(z.literal('')),
		plot_area: z.coerce.number().positive().optional().or(z.literal('')),
		built_up_area: z.coerce.number().positive().optional().or(z.literal('')),
		gross_floor_area: z.coerce.number().positive().optional().or(z.literal('')),
		unit_no: z.string().min(1, 'unit_no is required'),
		unit_value: z.string().min(1, 'unit_value is required'),
		invoice_stage: z.enum(invoiceStageValues, 'invoice_stage is invalid'),
		tentative_eligibility_date: z.string().optional().or(z.literal('')),
		referral_amount_type: z.enum(['percentage', 'amount']).optional().or(z.literal('')),
		referral_amount: z.coerce.number().positive().optional().or(z.literal('')),
		relationship_manager_name: z.string().optional().or(z.literal('')),
		relationship_manager_email: z.email().optional().or(z.literal(''))
	})
	.superRefine((data, ctx) => {
		if (data.property_type === 'apartment') {
			if (!data.bedroom_type) {
				ctx.addIssue({
					code: 'custom',
					path: ['bedroom_type'],
					message: 'bedroom_type is required for apartments'
				});
			}
			if (!data.property_size) {
				ctx.addIssue({
					code: 'custom',
					path: ['property_size'],
					message: 'property_size is required for apartments'
				});
			}
		}
		if (data.property_type === 'townhouse' || data.property_type === 'villa') {
			if (!data.bedroom_type) {
				ctx.addIssue({
					code: 'custom',
					path: ['bedroom_type'],
					message: 'bedroom_type is required for townhouse/villa'
				});
			}
			if (!data.plot_area) {
				ctx.addIssue({
					code: 'custom',
					path: ['plot_area'],
					message: 'plot_area is required for townhouse/villa'
				});
			}
			if (!data.built_up_area) {
				ctx.addIssue({
					code: 'custom',
					path: ['built_up_area'],
					message: 'built_up_area is required for townhouse/villa'
				});
			}
		}
		if (data.property_type === 'commercial') {
			if (!data.commercial_sub_type) {
				ctx.addIssue({
					code: 'custom',
					path: ['commercial_sub_type'],
					message: 'commercial_sub_type is required for commercial properties'
				});
			}
			if (!data.property_size) {
				ctx.addIssue({
					code: 'custom',
					path: ['property_size'],
					message: 'property_size is required for commercial properties'
				});
			}
			if (data.commercial_sub_type === 'warehouse' && !data.gross_floor_area) {
				ctx.addIssue({
					code: 'custom',
					path: ['gross_floor_area'],
					message: 'gross_floor_area is required for warehouses'
				});
			}
		}
		if (data.property_type === 'plot') {
			if (!data.property_size) {
				ctx.addIssue({
					code: 'custom',
					path: ['property_size'],
					message: 'property_size is required for plots'
				});
			}
		}
	});

const jointBuyerRowSchema = z.object({
	row_group: z.coerce.number().int().positive('row_group must be a positive integer'),
	is_joint_buyer: z.literal('true'),
	first_name: z.string().min(1, 'first_name is required'),
	last_name: z.string().min(1, 'last_name is required'),
	email: z.email('email must be valid'),
	phone: z.string().min(7, 'phone is required'),
	passport_url: z.string().url('passport_url must be a valid URL'),
	national_id_url: z.string().url('national_id_url must be a valid URL'),
	aml_form_url: z.string().url().optional().or(z.literal(''))
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type ImportedSale = { id: string; row_group: number; client: string };
export type ImportError = { row_group: number; row: number; message: string };
export type BulkImportResult = { imported: ImportedSale[]; errors: ImportError[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function generateSaleId(): Promise<string> {
	const today = new Date();
	const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
	const counterDocRef = firestore.collection('counters').doc(`sale-${dateStr}`);

	return firestore.runTransaction(async (transaction) => {
		const counterDoc = await transaction.get(counterDocRef);
		const nextNumber = counterDoc.exists ? (counterDoc.data()?.count ?? 0) + 1 : 1;

		transaction.set(
			counterDocRef,
			{ count: nextNumber, lastUpdated: FieldValue.serverTimestamp() },
			{ merge: true }
		);

		return `IND-${dateStr}-${String(nextNumber).padStart(4, '0')}`;
	});
}

type UserRecord = { uid: string; displayName?: string; email: string; photoURL?: string };

async function resolveUserByEmail(email: string): Promise<UserRecord> {
	const normalised = email.trim().toLowerCase();

	// 1. Check users collection (Firebase Auth synced records)
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

	// 2. Fall back to roles collection (invited but not yet signed in)
	const rolesSnap = await firestore
		.collection('roles')
		.where('email', '==', normalised)
		.limit(1)
		.get();

	if (!rolesSnap.empty) {
		const doc = rolesSnap.docs[0];
		return {
			uid: doc.id, // roles use email as doc ID
			email: doc.data().email,
			displayName: doc.data().displayName,
			photoURL: doc.data().photoURL
		};
	}

	// 3. Not found anywhere — auto-create as agent in roles collection
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

// ─── POST handler ───────────────────────────────────────────────────────────

export async function POST({ request, locals }: { request: Request; locals: App.Locals }) {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'super-admin')) {
		throw error(403, 'Forbidden');
	}

	const formData = await request.formData();
	const csvFile = formData.get('csv') as File | null;

	if (!csvFile || csvFile.size === 0) {
		throw error(400, 'No CSV file provided');
	}

	const csvText = await csvFile.text();

	// Parse CSV
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

	// Group rows by row_group
	const groups = new Map<
		number,
		{
			primaryRow: Record<string, string>;
			primaryIdx: number;
			jointRows: { row: Record<string, string>; idx: number }[];
		}
	>();

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rawGroup = row['row_group'];
		const groupNum = parseInt(rawGroup, 10);

		if (isNaN(groupNum) || groupNum <= 0) {
			importErrors.push({
				row_group: groupNum || 0,
				row: i + 2,
				message: 'row_group must be a positive integer'
			});
			continue;
		}

		if (!groups.has(groupNum)) {
			groups.set(groupNum, {
				primaryRow: {} as Record<string, string>,
				primaryIdx: -1,
				jointRows: []
			});
		}
		const group = groups.get(groupNum)!;

		const isJoint = row['is_joint_buyer']?.trim().toLowerCase();
		if (isJoint === 'false') {
			if (group.primaryIdx !== -1) {
				importErrors.push({
					row_group: groupNum,
					row: i + 2,
					message: `Duplicate primary row for row_group ${groupNum}`
				});
				continue;
			}
			group.primaryRow = row;
			group.primaryIdx = i + 2;
		} else if (isJoint === 'true') {
			group.jointRows.push({ row, idx: i + 2 });
		} else {
			importErrors.push({
				row_group: groupNum,
				row: i + 2,
				message: `is_joint_buyer must be 'true' or 'false'`
			});
		}
	}

	// Process each group
	for (const [groupNum, group] of groups) {
		if (group.primaryIdx === -1) {
			importErrors.push({
				row_group: groupNum,
				row: 0,
				message: `No primary row found for row_group ${groupNum}`
			});
			continue;
		}

		// Validate primary row
		const primaryResult = primaryRowSchema.safeParse(group.primaryRow);
		if (!primaryResult.success) {
			const messages = primaryResult.error.issues
				.map((i) => `${i.path.join('.')}: ${i.message}`)
				.join('; ');
			importErrors.push({ row_group: groupNum, row: group.primaryIdx, message: messages });
			continue;
		}
		const primary = primaryResult.data;

		// Validate joint buyer rows
		const jointBuyers: z.infer<typeof jointBuyerRowSchema>[] = [];
		let jointValid = true;
		for (const { row, idx } of group.jointRows) {
			const jointResult = jointBuyerRowSchema.safeParse(row);
			if (!jointResult.success) {
				const messages = jointResult.error.issues
					.map((i) => `${i.path.join('.')}: ${i.message}`)
					.join('; ');
				importErrors.push({ row_group: groupNum, row: idx, message: `Joint buyer: ${messages}` });
				jointValid = false;
			} else {
				jointBuyers.push(jointResult.data);
			}
		}
		if (!jointValid) continue;

		// Resolve deal owners
		const callerUser = await resolveUserByEmail(primary.caller_email);

		const splitPreset = (primary.split_preset as '70/30' | '55/45' | '' | undefined) || '70/30';
		const callerSplit = splitPreset === '55/45' ? 55 : 70;
		const closerSplit = splitPreset === '55/45' ? 45 : 30;

		const dealOwners: Sale['dealOwners'] = [
			{
				userId: callerUser.uid,
				email: callerUser.email,
				name: callerUser.displayName ?? callerUser.email,
				photoURL: callerUser.photoURL ?? '',
				ownerRole: 'caller',
				split: callerSplit
			}
		];

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

		// Calculate referral amount
		let finalReferralAmount: number | undefined;
		if (
			primary.referral_amount_type &&
			primary.referral_amount &&
			typeof primary.referral_amount === 'number'
		) {
			if (primary.referral_amount_type === 'percentage') {
				const unitValue = parseFloat(String(primary.unit_value).replace(/,/g, ''));
				if (!isNaN(unitValue)) {
					finalReferralAmount = (unitValue * primary.referral_amount) / 100;
				}
			} else {
				finalReferralAmount = primary.referral_amount;
			}
		}

		// Build sale record
		const now = FieldValue.serverTimestamp();
		const createdByUid = callerUser.uid;

		let saleId: string;
		try {
			saleId = await generateSaleId();
		} catch {
			importErrors.push({
				row_group: groupNum,
				row: group.primaryIdx,
				message: 'Failed to generate sale ID, please retry'
			});
			continue;
		}

		const saleRecord = {
			status: 'pending',
			financeStatus: 'pending',
			complianceStatus: 'pending',
			commissionStatus: 'pending',
			invoiceFile: { status: 'pending' },
			invoiceStage: [primary.invoice_stage],
			tentativeEligibilityDate: parseDDMMYYYY(primary.tentative_eligibility_date),
			clientDetails: {
				firstName: primary.first_name,
				lastName: primary.last_name,
				email: primary.email,
				phone: primary.phone,
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
			dealStage: primary.deal_stage,
			paymentValue: primary.payment_value,
			bookingFormFile: makeFileRecord(primary.booking_form_url),
			paymentReceiptFile: makeFileRecord(primary.payment_receipt_url),
			refferalAgreementFile: makeFileRecord(primary.referral_agreement_url),
			saleType: primary.sale_type,
			developer: primary.developer,
			project: primary.project,
			...(primary.community && primary.community !== '' && { community: primary.community }),
			propertyType: primary.property_type,
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
			unitNo: primary.unit_no,
			unitValue: primary.unit_value,
			...(finalReferralAmount !== undefined && { referralAmount: finalReferralAmount }),
			...(primary.relationship_manager_name &&
				primary.relationship_manager_name !== '' && {
					relationshipManagerName: primary.relationship_manager_name
				}),
			...(primary.relationship_manager_email &&
				primary.relationship_manager_email !== '' && {
					relationshipManagerEmail: primary.relationship_manager_email
				}),
			commnets: [],
			createdByUid,
			createdByEmail: callerUser.email,
			createdAt: now,
			updatedAt: now
		};

		try {
			await firestore.collection('sales').doc(saleId).set(saleRecord);
			importedSales.push({
				id: saleId,
				row_group: groupNum,
				client: `${primary.first_name} ${primary.last_name}`
			});
		} catch (writeErr) {
			console.error(`Failed to write sale for row_group ${groupNum}:`, writeErr);
			importErrors.push({
				row_group: groupNum,
				row: group.primaryIdx,
				message: 'Failed to save sale to Firestore'
			});
		}
	}

	const result: BulkImportResult = { imported: importedSales, errors: importErrors };
	return json(result);
}
