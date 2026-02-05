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

const saleSchema = z.object({
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
		message: 'Booking form upload is required'
	}),
	paymentReceiptFile: z.custom<File>((file) => file instanceof File && file.size > 0, {
		message: 'Payment receipt upload is required'
	}),

	// Project Details
	invoiceStage: z.enum(
		['eligible-first-half', 'eligible-second-half', 'eligible-full'],
		'Invoice stage is required'
	),
	dealType: z.enum(['off-plan', 'secondary'], 'Deal type is required'),
	developer: z.string().min(1, 'Developer is required'),
	property: z.string().min(1, 'Property is required'),
	propertyType: z.enum(['commercial', 'residential', 'plot'], 'Property type is required'),
	unitType: z.enum(
		['studio', '1br', '2br', '3br', '4br', '5br', 'villa', 'townhouse', 'office'],
		'Unit type is required'
	),
	unitNo: z.string().min(1, 'Unit number is required'),
	unitValue: z.string().min(1, 'Unit value is required')
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
	const [primaryPassportFile, primaryNationalIdFile] = await Promise.all([
		toUploadedFile(data.passportFile, `${basePath}/primary/passport`),
		toUploadedFile(data.nationalIdFile, `${basePath}/primary/national-id`)
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
	const [bookingFormFile, paymentReceiptFile] = await Promise.all([
		toUploadedFile(data.bookingFormFile, `${basePath}/booking-form`),
		toUploadedFile(data.paymentReceiptFile, `${basePath}/payment-receipt`)
	]);

	const saleRecord = {
		status: 'pending',
		financeStatus: 'pending',
		complianceStatus: 'pending',
		commissionStatus: 'pending',
		invoiceFile: { status: 'pending' },
		invoiceStage: data.invoiceStage,
		clientDetails: {
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			phone: data.phone,
			passportFile: primaryPassportFile,
			nationalIdFile: primaryNationalIdFile
		},
		jointBuyers,
		dealOwners: data.dealOwners,
		dealOwnerIds: data.dealOwners.map((owner) => owner.userId),
		dealStage: data.dealStage,
		paymentValue: data.paymentValue,
		bookingFormFile,
		paymentReceiptFile,
		dealType: data.dealType,
		developer: data.developer,
		property: data.property,
		propertyType: data.propertyType,
		unitType: data.unitType,
		unitNo: data.unitNo,
		unitValue: data.unitValue,
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
