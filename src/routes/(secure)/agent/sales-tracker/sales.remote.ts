import { form } from '$app/server';
import { firestore, uploadFileWithLink } from '$lib/server/firebase';
import { error, redirect } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

// Define the schema for the sale form using Zod
const buyerSchema = z.object({
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.email('Valid email is required'),
	phone: z.string().min(10, 'Valid phone number is required'),
	passportFile: z.custom<File>((file) => file instanceof File && file.size > 0, {
		message: 'Passport upload is required'
	}),
	nationalIdFile: z.custom<File>((file) => file instanceof File && file.size > 0, {
		message: 'National ID upload is required'
	})
});

const dealOwnerSchema = z.object({
	userId: z.string().min(1, 'Owner is required'),
	email: z.email('Owner email is required'),
	split: z.number().min(0, 'Split must be at least 0').max(100, 'Split cannot exceed 100')
});

const saleSchema = z
	.object({
		// Primary Buyer (marked as primary)
		firstName: buyerSchema.shape.firstName,
		lastName: buyerSchema.shape.lastName,
		email: buyerSchema.shape.email,
		phone: buyerSchema.shape.phone,
		passportFile: buyerSchema.shape.passportFile,
		nationalIdFile: buyerSchema.shape.nationalIdFile,

		// Deal Owners
		dealOwners: z
			.array(dealOwnerSchema)
			.min(1, 'At least one deal owner is required')
			.superRefine((owners, ctx) => {
				const total = owners.reduce((sum, owner) => sum + owner.split, 0);

				if (Math.round(total * 100) / 100 !== 100) {
					ctx.addIssue({
						code: 'custom',
						message: 'Deal owner split must total 100%'
					});
				}
			}),

		// Joint Buyers (unlimited)
		jointBuyers: z.array(buyerSchema).default([]),
		// Deal Status
		dealStage: z.enum(['eoi', 'booking'], 'Deal stage is required'),
		paymentValue: z
			.number()
			.min(0, 'Payment value must be at least 0')
			.max(100, 'Payment value cannot exceed 100'),
		bookingFormFile: z.custom<File>((file) => file instanceof File && file.size > 0, {
			message: 'EOI/Booking form upload is required'
		}),
		paymentReceiptFile: z.custom<File>((file) => file instanceof File && file.size > 0, {
			message: 'Payment receipt upload is required'
		}),

		// Optional files (can be generated or uploaded)
		amlFormFile: z.custom<File>((file) => !file || file instanceof File).optional(),
		refferalAgreementFile: z.custom<File>((file) => !file || file instanceof File).optional(),

		// Project Details
		invoiceStage: z
			.array(z.enum(['first-half', 'second-half', 'full', 'not-yet-eligible']))
			.min(1, 'At least one invoice stage must be selected')
			.refine(
				(stages) => {
					// Mutual exclusivity validation
					if (stages.includes('full') && stages.length > 1) {
						return false; // 'full' cannot be combined with other options
					}
					if (stages.includes('not-yet-eligible') && stages.length > 1) {
						return false; // 'not-yet-eligible' cannot be combined with other options
					}
					return true;
				},
				{
					message:
						'Invalid combination: "Full" and "Not Yet Eligible" must be selected alone. "First Half" and "Second Half" can be selected together.'
				}
			),
		tentativeEligibilityDate: z.string().optional(),
		saleType: z.enum(['off-plan', 'secondary'], 'Deal type is required'),
		developer: z.string().min(1, 'Developer is required'),
		project: z.string().min(1, 'Project is required'),
		community: z.string().optional(),
		propertyType: z.enum(
			['apartment', 'townhouse', 'villa', 'commercial', 'plot'],
			'Property type is required'
		),
		bedroomType: z
			.enum([
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
			])
			.optional(),
		commercialSubType: z.enum(['office', 'warehouse']).optional(),
		propertySize: z.number().optional(),
		plotArea: z.number().optional(),
		builtUpArea: z.number().optional(),
		grossFloorArea: z.number().optional(),
		unitNo: z.string().min(1, 'Unit number is required'),
		unitValue: z.string().min(1, 'Unit value is required'),
		referralAmountType: z.enum(['percentage', 'amount']).optional(),
		referralAmount: z.number().optional(),
		relationshipManagerName: z.string().optional(),
		relationshipManagerEmail: z
			.string()
			.email('Valid email is required')
			.optional()
			.or(z.literal(''))
	})
	.superRefine((data, ctx) => {
		// Apartment validation
		if (data.propertyType === 'apartment') {
			if (!data.bedroomType) {
				ctx.addIssue({
					code: 'custom',
					path: ['bedroomType'],
					message: 'Number of bedrooms is required for apartments'
				});
			}
			if (!data.propertySize) {
				ctx.addIssue({
					code: 'custom',
					path: ['propertySize'],
					message: 'Property size is required for apartments'
				});
			}
		}

		// Townhouse/Villa validation
		if (data.propertyType === 'townhouse' || data.propertyType === 'villa') {
			if (!data.bedroomType) {
				ctx.addIssue({
					code: 'custom',
					path: ['bedroomType'],
					message: 'Number of bedrooms is required for townhouse/villa'
				});
			}
			if (!data.plotArea) {
				ctx.addIssue({
					code: 'custom',
					path: ['plotArea'],
					message: 'Plot area is required for townhouse/villa'
				});
			}
			if (!data.builtUpArea) {
				ctx.addIssue({
					code: 'custom',
					path: ['builtUpArea'],
					message: 'Built up area is required for townhouse/villa'
				});
			}
		}

		// Commercial validation
		if (data.propertyType === 'commercial') {
			if (!data.commercialSubType) {
				ctx.addIssue({
					code: 'custom',
					path: ['commercialSubType'],
					message: 'Commercial type is required'
				});
			}
			if (!data.propertySize) {
				ctx.addIssue({
					code: 'custom',
					path: ['propertySize'],
					message: 'Property size is required for commercial properties'
				});
			}
			if (data.commercialSubType === 'warehouse' && !data.grossFloorArea) {
				ctx.addIssue({
					code: 'custom',
					path: ['grossFloorArea'],
					message: 'Gross floor area is required for warehouses'
				});
			}
		}

		// Plot validation
		if (data.propertyType === 'plot') {
			if (!data.propertySize) {
				ctx.addIssue({
					code: 'custom',
					path: ['propertySize'],
					message: 'Property size is required for plots'
				});
			}
		}
	});

const toUploadedFile = async (file: File | null | undefined, path: string) => {
	if (!file || file.size <= 0) return null;
	const uploaded = await uploadFileWithLink(file, path);
	if (!uploaded) return null;

	return {
		...uploaded,
		financeStatus: 'pending',
		complianceStatus: 'pending',
		// Keep original file metadata for reference
		original: {
			name: file.name,
			size: file.size,
			type: file.type,
			lastModified: file.lastModified
		}
	};
};

// Generate unique predictable sale ID
async function generateSaleId(): Promise<string> {
	const today = new Date();
	const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
	const counterDocRef = firestore.collection('counters').doc(`sale-${dateStr}`);

	// Use transaction to ensure atomicity
	const saleId = await firestore.runTransaction(async (transaction) => {
		const counterDoc = await transaction.get(counterDocRef);
		let nextNumber = 1;

		if (counterDoc.exists) {
			const currentCount = counterDoc.data()?.count ?? 0;
			nextNumber = currentCount + 1;
		}

		// Update counter
		transaction.set(
			counterDocRef,
			{
				count: nextNumber,
				lastUpdated: FieldValue.serverTimestamp()
			},
			{ merge: true }
		);

		// Generate sale ID: IND-YYYYMMDD-XXXX
		const paddedNumber = String(nextNumber).padStart(4, '0');
		return `IND-${dateStr}-${paddedNumber}`;
	});

	return saleId;
}

export const createSale = form(saleSchema, async (data) => {
	const timestamp = FieldValue.serverTimestamp();
	const createdByUid = data.dealOwners[0]?.userId ?? 'unknown';

	// Generate predictable sale ID
	const saleId = await generateSaleId();
	const basePath = `sales/${createdByUid}/${saleId}`;

	// Upload primary buyer documents
	const [primaryPassportFile, primaryNationalIdFile, primaryAmlFormFile] = await Promise.all([
		toUploadedFile(data.passportFile, `${basePath}/primary/passport`),
		toUploadedFile(data.nationalIdFile, `${basePath}/primary/national-id`),
		toUploadedFile(data.amlFormFile, `${basePath}/primary/aml-form`)
	]);

	// Upload joint buyer documents
	const jointBuyers = await Promise.all(
		data.jointBuyers.map(async (buyer, index) => {
			const [passportFile, nationalIdFile] = await Promise.all([
				toUploadedFile(buyer.passportFile, `${basePath}/joint/${index}/passport`),
				toUploadedFile(buyer.nationalIdFile, `${basePath}/joint/${index}/national-id`)
			]);

			return {
				firstName: buyer.firstName,
				lastName: buyer.lastName,
				email: buyer.email,
				phone: buyer.phone,
				passportFile,
				nationalIdFile
			};
		})
	);

	// Upload booking and payment documents
	const [bookingFormFile, paymentReceiptFile, refferalAgreementFile] = await Promise.all([
		toUploadedFile(data.bookingFormFile, `${basePath}/booking-form`),
		toUploadedFile(data.paymentReceiptFile, `${basePath}/payment-receipt`),
		toUploadedFile(data.refferalAgreementFile, `${basePath}/referral-agreement`)
	]);

	// Calculate final referral amount
	let finalReferralAmount: number | undefined;
	if (data.referralAmountType && data.referralAmount) {
		if (data.referralAmountType === 'percentage') {
			// Parse unitValue (remove commas and convert to number)
			const unitValue = parseFloat(data.unitValue.replace(/,/g, ''));
			if (!isNaN(unitValue)) {
				finalReferralAmount = (unitValue * data.referralAmount) / 100;
			}
		} else {
			// Direct amount
			finalReferralAmount = data.referralAmount;
		}
	}

	const saleRecord = {
		status: 'pending',
		financeStatus: 'pending',
		complianceStatus: 'pending',
		commissionStatus: 'pending',
		invoiceFile: { status: 'pending' },
		invoiceStage: data.invoiceStage,
		tentativeEligibilityDate: data.tentativeEligibilityDate || null,
		clientDetails: {
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			phone: data.phone,
			passportFile: primaryPassportFile,
			nationalIdFile: primaryNationalIdFile,
			amlFormFile: primaryAmlFormFile
		},
		jointBuyers,
		dealOwners: data.dealOwners,
		dealOwnerIds: data.dealOwners.map((owner) => owner.userId),
		dealStage: data.dealStage,
		paymentValue: data.paymentValue,
		bookingFormFile,
		paymentReceiptFile,
		refferalAgreementFile,
		saleType: data.saleType,
		developer: data.developer,
		project: data.project,
		...(data.community && { community: data.community }),
		propertyType: data.propertyType,
		...(data.bedroomType && { bedroomType: data.bedroomType }),
		...(data.commercialSubType && { commercialSubType: data.commercialSubType }),
		...(data.propertySize && { propertySize: data.propertySize }),
		...(data.plotArea && { plotArea: data.plotArea }),
		...(data.builtUpArea && { builtUpArea: data.builtUpArea }),
		...(data.grossFloorArea && { grossFloorArea: data.grossFloorArea }),
		unitNo: data.unitNo,
		unitValue: data.unitValue,
		...(finalReferralAmount && { referralAmount: finalReferralAmount }),
		...(data.relationshipManagerName && { relationshipManagerName: data.relationshipManagerName }),
		...(data.relationshipManagerEmail && {
			relationshipManagerEmail: data.relationshipManagerEmail
		}),
		createdByUid,
		createdByEmail: data.dealOwners[0]?.email ?? null,
		createdAt: timestamp,
		updatedAt: timestamp
	};

	try {
		await firestore.collection('sales').doc(saleId).set(saleRecord);
	} catch (err) {
		console.error('Failed to save sale to Firestore', err);
		throw error(500, 'Unable to save sale right now. Please try again.');
	}

	redirect(303, '/agent/sales-tracker');
});
