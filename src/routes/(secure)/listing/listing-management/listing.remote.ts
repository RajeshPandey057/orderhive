import { command, form, getRequestEvent } from '$app/server';
import { firestore, uploadFileWithLink } from '$lib/server/firebase';
import { error } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const toUploadedFile = async (file: File | null | undefined, path: string) => {
	if (!file || file.size <= 0) return null;
	try {
		const uploaded = await uploadFileWithLink(file, path);
		if (!uploaded) return null;

		return {
			...uploaded,
			original: {
				name: file.name,
				size: file.size,
				type: file.type,
				lastModified: file.lastModified
			}
		};
	} catch (err) {
		console.error(`File upload failed for ${path}:`, err);
		return null;
	}
};

async function generateListingId(): Promise<string> {
	const today = new Date();
	const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
	const counterDocRef = firestore.collection('counters').doc(`listing-${dateStr}`);

	return await firestore.runTransaction(async (transaction) => {
		const counterDoc = await transaction.get(counterDocRef);
		let nextNumber = 1;

		if (counterDoc.exists) {
			nextNumber = (counterDoc.data()?.count ?? 0) + 1;
		}

		transaction.set(
			counterDocRef,
			{ count: nextNumber, lastUpdated: FieldValue.serverTimestamp() },
			{ merge: true }
		);

		return `LST-${dateStr}-${String(nextNumber).padStart(4, '0')}`;
	});
}

// Shared shape (all fields except createdByUid/createdByEmail)
// Extracted so both listingSchema and updateListingSchema can be built without .omit()
// (Zod v4 forbids .omit() on schemas containing refinements)
const listingShape = {
	listingType: z.enum(['internal', 'portal']),

	// Client details
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	clientPhone: z.string().min(1, 'Phone number is required'),
	clientEmail: z.string().email('Valid email is required'),

	// Property details
	developer: z.string().min(1, 'Developer is required'),
	community: z.string().optional(),
	project: z.string().min(1, 'Project is required'),
	unitNo: z.string().min(1, 'Unit number is required'),
	propertyType: z.enum(['apartment', 'townhouse', 'villa', 'commercial', 'plot']),
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
	propertySize: z.coerce.number().optional(),
	plotArea: z.coerce.number().optional(),
	builtUpArea: z.coerce.number().optional(),
	grossFloorArea: z.coerce.number().optional(),

	// Address (all optional)
	addressLine1: z.string().optional(),
	addressLine2: z.string().optional(),
	buildingName: z.string().optional(),
	street: z.string().optional(),
	area: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	postalCode: z.string().optional(),
	landmark: z.string().optional(),

	// File attachments
	titleDeedFile: z.custom<File>((f) => !f || f instanceof File).optional(),
	passportFile: z.custom<File>((f) => !f || f instanceof File).optional(),
	emiratesIdFile: z.custom<File>((f) => !f || f instanceof File).optional(),

	// Media (multiple files — set programmatically before submit)
	pictureFiles: z
		.union([
			z.array(z.custom<File>((f) => f instanceof File)),
			z.custom<File>((f) => f instanceof File).transform((f) => [f])
		])
		.optional()
		.default([]),
	videoFiles: z
		.union([
			z.array(z.custom<File>((f) => f instanceof File)),
			z.custom<File>((f) => f instanceof File).transform((f) => [f])
		])
		.optional()
		.default([]),

	// Pricing
	buyingPrice: z.coerce.number().min(0, 'Buying price is required'),
	liquidityInvested: z.coerce.number().min(0, 'Liquidity invested is required'),
	sellingPrice: z.coerce.number().min(0, 'Selling price is required'),

	// Listed by agents
	listedByEmails: z.union([
		z
			.string()
			.min(1)
			.transform((s): string[] => [s]),
		z.array(z.string().min(1)).min(1, 'At least one agent is required')
	])
};

const listingSchema = z
	.object({
		createdByUid: z.string().min(1, 'User ID is required'),
		createdByEmail: z.string().email('Valid user email is required'),
		...listingShape
	})
	.superRefine((data, ctx) => {
		if (data.propertyType === 'apartment') {
			if (!data.bedroomType) {
				ctx.addIssue({
					code: 'custom',
					path: ['bedroomType'],
					message: 'Bedroom type is required for apartments'
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

		if (data.propertyType === 'townhouse' || data.propertyType === 'villa') {
			if (!data.bedroomType) {
				ctx.addIssue({
					code: 'custom',
					path: ['bedroomType'],
					message: 'Bedroom type is required'
				});
			}
			if (!data.plotArea) {
				ctx.addIssue({
					code: 'custom',
					path: ['plotArea'],
					message: 'Plot area is required'
				});
			}
			if (!data.builtUpArea) {
				ctx.addIssue({
					code: 'custom',
					path: ['builtUpArea'],
					message: 'Built up area is required'
				});
			}
		}

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

		if (data.propertyType === 'plot') {
			if (!data.plotArea) {
				ctx.addIssue({
					code: 'custom',
					path: ['plotArea'],
					message: 'Plot area is required for plots'
				});
			}
		}

		if (data.listingType === 'portal') {
			if (!data.titleDeedFile || (data.titleDeedFile as File).size <= 0) {
				ctx.addIssue({
					code: 'custom',
					path: ['titleDeedFile'],
					message: 'Title deed / Qood is required for portal listings'
				});
			}
			if (!data.passportFile || (data.passportFile as File).size <= 0) {
				ctx.addIssue({
					code: 'custom',
					path: ['passportFile'],
					message: 'Passport is required for portal listings'
				});
			}
			if (!data.emiratesIdFile || (data.emiratesIdFile as File).size <= 0) {
				ctx.addIssue({
					code: 'custom',
					path: ['emiratesIdFile'],
					message: 'Emirates ID is required for portal listings'
				});
			}
		}
	});

export const createListing = form('unchecked', async (rawData, issue) => {
	const result = listingSchema.safeParse(rawData);
	if (!result.success) {
		for (const err of result.error.issues) {
			const key = err.path.join('.') || '_form';
			issue[key] = err.message;
		}
		return;
	}
	const data = result.data;

	const timestamp = FieldValue.serverTimestamp();
	const listingId = await generateListingId();
	const basePath = `listings/${data.createdByUid}/${listingId}`;

	// Upload single file attachments in parallel
	const [titleDeedFile, passportFile, emiratesIdFile] = await Promise.all([
		toUploadedFile(data.titleDeedFile as File | null, `${basePath}/title-deed`),
		toUploadedFile(data.passportFile as File | null, `${basePath}/passport`),
		toUploadedFile(data.emiratesIdFile as File | null, `${basePath}/emirates-id`)
	]);

	// Upload media files in parallel
	const pictureFileInputs = Array.isArray(data.pictureFiles) ? data.pictureFiles : [];
	const videoFileInputs = Array.isArray(data.videoFiles) ? data.videoFiles : [];

	const [uploadedPictures, uploadedVideos] = await Promise.all([
		Promise.all(
			pictureFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/pictures`))
		),
		Promise.all(videoFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/video`)))
	]);

	const mediaAssets = [
		...uploadedPictures
			.filter(Boolean)
			.map((f) => ({ type: 'photo' as const, fileName: f!.name, url: f!.downloadURL })),
		...uploadedVideos
			.filter(Boolean)
			.map((f) => ({ type: 'video' as const, fileName: f!.name, url: f!.downloadURL }))
	];

	const listingRecord = {
		id: listingId,
		listingType: data.listingType,
		clientName: `${data.firstName} ${data.lastName}`.trim(),
		clientPhone: data.clientPhone,
		clientEmail: data.clientEmail,
		developer: data.developer,
		...(data.community && { community: data.community }),
		project: data.project,
		unitNo: data.unitNo,
		propertyType: data.propertyType,
		...(data.bedroomType && { bedroomType: data.bedroomType }),
		...(data.commercialSubType && { commercialSubType: data.commercialSubType }),
		...(data.propertySize && { propertySize: data.propertySize }),
		...(data.plotArea && { plotArea: data.plotArea }),
		...(data.builtUpArea && { builtUpArea: data.builtUpArea }),
		...(data.grossFloorArea && { grossFloorArea: data.grossFloorArea }),
		propertyAddress: {
			...(data.addressLine1 && { addressLine1: data.addressLine1 }),
			...(data.addressLine2 && { addressLine2: data.addressLine2 }),
			...(data.buildingName && { buildingName: data.buildingName }),
			...(data.street && { street: data.street }),
			...(data.area && { area: data.area }),
			...(data.city && { city: data.city }),
			...(data.country && { country: data.country }),
			...(data.postalCode && { postalCode: data.postalCode }),
			...(data.landmark && { landmark: data.landmark })
		},
		// Listing-type compatible file name fields
		titleDeedFileName: titleDeedFile?.name ?? null,
		passportFileName: passportFile?.name ?? null,
		emiratesIdFileName: emiratesIdFile?.name ?? null,
		mediaAssets,
		buyingPrice: data.buyingPrice,
		liquidityInvested: data.liquidityInvested,
		sellingPrice: data.sellingPrice,
		listedByEmails: Array.isArray(data.listedByEmails)
			? data.listedByEmails
			: [data.listedByEmails],
		// Full file metadata for downloads / compliance
		attachments: {
			titleDeed: titleDeedFile ?? null,
			passport: passportFile ?? null,
			emiratesId: emiratesIdFile ?? null,
			pictures: uploadedPictures.filter(Boolean),
			videos: uploadedVideos.filter(Boolean)
		},
		createdByUid: data.createdByUid,
		createdByEmail: data.createdByEmail,
		createdAt: timestamp,
		updatedAt: timestamp
	};

	try {
		await firestore.collection('listings').doc(listingId).set(listingRecord);
	} catch (err) {
		console.error('Failed to save listing to Firestore', err);
		throw error(500, 'Unable to save listing right now. Please try again.');
	}
});

// ─── UPDATE LISTING ───────────────────────────────────────────────────────────

const updateListingSchema = z.object({
	listingId: z.string().min(1, 'Listing ID is required'),
	...listingShape
});

export const updateListing = form('unchecked', async (rawData, issue) => {
	const result = updateListingSchema.safeParse(rawData);
	if (!result.success) {
		for (const err of result.error.issues) {
			const key = err.path.join('.') || '_form';
			issue[key] = err.message;
		}
		return;
	}
	const data = result.data;

	const { locals } = getRequestEvent();
	if (!locals.user) throw error(401, 'Unauthorized');
	const { uid: userUid, role: userRole, email: userEmail } = locals.user;

	const docRef = firestore.collection('listings').doc(data.listingId);
	const existingDoc = await docRef.get();
	if (!existingDoc.exists) throw error(404, 'Listing not found');

	const existing = existingDoc.data()!;
	const isOwner = existing.createdByUid === userUid;
	const isAdmin = userRole === 'admin' || userRole === 'super-admin';
	if (!isOwner && !isAdmin) throw error(403, 'You do not have permission to edit this listing');

	const timestamp = FieldValue.serverTimestamp();
	const basePath = `listings/${existing.createdByUid}/${data.listingId}`;

	// Upload only if a real new file was provided
	const [newTitleDeed, newPassport, newEmiratesId] = await Promise.all([
		toUploadedFile(data.titleDeedFile as File | null, `${basePath}/title-deed`),
		toUploadedFile(data.passportFile as File | null, `${basePath}/passport`),
		toUploadedFile(data.emiratesIdFile as File | null, `${basePath}/emirates-id`)
	]);

	const pictureFileInputs = Array.isArray(data.pictureFiles) ? data.pictureFiles : [];
	const videoFileInputs = Array.isArray(data.videoFiles) ? data.videoFiles : [];

	const [uploadedPictures, uploadedVideos] = await Promise.all([
		Promise.all(
			pictureFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/pictures`))
		),
		Promise.all(videoFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/video`)))
	]);

	// Resolve final attachment metadata: prefer new upload, fall back to existing Firestore record
	const finalTitleDeed = newTitleDeed ?? existing.attachments?.titleDeed ?? null;
	const finalPassport = newPassport ?? existing.attachments?.passport ?? null;
	const finalEmiratesId = newEmiratesId ?? existing.attachments?.emiratesId ?? null;

	// For portal listings: each required document must exist (new or pre-existing)
	if (data.listingType === 'portal') {
		if (!finalTitleDeed) issue.titleDeedFile = 'Title deed / Qood is required for portal listings';
		if (!finalPassport) issue.passportFile = 'Passport is required for portal listings';
		if (!finalEmiratesId) issue.emiratesIdFile = 'Emirates ID is required for portal listings';
		if (Object.keys(issue).length > 0) return;
	}

	const newMediaAssets = [
		...uploadedPictures
			.filter(Boolean)
			.map((f) => ({ type: 'photo' as const, fileName: f!.name, url: f!.downloadURL })),
		...uploadedVideos
			.filter(Boolean)
			.map((f) => ({ type: 'video' as const, fileName: f!.name, url: f!.downloadURL }))
	];

	const mergedMediaAssets = [...(existing.mediaAssets ?? []), ...newMediaAssets];

	const updateRecord = {
		listingType: data.listingType,
		clientName: `${data.firstName} ${data.lastName}`.trim(),
		clientPhone: data.clientPhone,
		clientEmail: data.clientEmail,
		developer: data.developer,
		community: data.community ?? null,
		project: data.project,
		unitNo: data.unitNo,
		propertyType: data.propertyType,
		bedroomType: data.bedroomType ?? null,
		commercialSubType: data.commercialSubType ?? null,
		propertySize: data.propertySize ?? null,
		plotArea: data.plotArea ?? null,
		builtUpArea: data.builtUpArea ?? null,
		grossFloorArea: data.grossFloorArea ?? null,
		propertyAddress: {
			...(data.addressLine1 && { addressLine1: data.addressLine1 }),
			...(data.addressLine2 && { addressLine2: data.addressLine2 }),
			...(data.buildingName && { buildingName: data.buildingName }),
			...(data.street && { street: data.street }),
			...(data.area && { area: data.area }),
			...(data.city && { city: data.city }),
			...(data.country && { country: data.country }),
			...(data.postalCode && { postalCode: data.postalCode }),
			...(data.landmark && { landmark: data.landmark })
		},
		titleDeedFileName: finalTitleDeed?.name ?? existing.titleDeedFileName ?? null,
		passportFileName: finalPassport?.name ?? existing.passportFileName ?? null,
		emiratesIdFileName: finalEmiratesId?.name ?? existing.emiratesIdFileName ?? null,
		mediaAssets: mergedMediaAssets,
		buyingPrice: data.buyingPrice,
		liquidityInvested: data.liquidityInvested,
		sellingPrice: data.sellingPrice,
		listedByEmails: Array.isArray(data.listedByEmails)
			? data.listedByEmails
			: [data.listedByEmails],
		attachments: {
			titleDeed: finalTitleDeed,
			passport: finalPassport,
			emiratesId: finalEmiratesId,
			pictures: [...(existing.attachments?.pictures ?? []), ...uploadedPictures.filter(Boolean)],
			videos: [...(existing.attachments?.videos ?? []), ...uploadedVideos.filter(Boolean)]
		},
		updatedAt: timestamp,
		updatedByUid: userUid,
		updatedByEmail: userEmail
	};

	try {
		await docRef.update(updateRecord);
	} catch (err) {
		console.error('Failed to update listing', err);
		throw error(500, 'Unable to update listing right now. Please try again.');
	}
});

// ─── SOFT DELETE LISTING ──────────────────────────────────────────────────────

const deleteListingSchema = z.object({
	listingId: z.string().min(1, 'Listing ID is required')
});

export const softDeleteListing = command(deleteListingSchema, async (data) => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw error(401, 'Unauthorized');
	const { uid: userUid, role: userRole, email: userEmail } = locals.user;

	const docRef = firestore.collection('listings').doc(data.listingId);
	const existingDoc = await docRef.get();
	if (!existingDoc.exists) throw error(404, 'Listing not found');

	const existing = existingDoc.data()!;
	const isOwner = existing.createdByUid === userUid;
	const isAdmin = userRole === 'admin' || userRole === 'super-admin';
	if (!isOwner && !isAdmin) throw error(403, 'You do not have permission to delete this listing');

	try {
		await docRef.update({
			isDeleted: true,
			deletedAt: FieldValue.serverTimestamp(),
			deletedByUid: userUid,
			deletedByEmail: userEmail
		});
	} catch (err) {
		console.error('Failed to soft-delete listing', err);
		throw error(500, 'Unable to delete listing right now. Please try again.');
	}

	return { success: true };
});
