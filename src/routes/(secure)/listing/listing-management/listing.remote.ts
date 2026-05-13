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
	const counterDocRef = firestore.collection('counters').doc('listing-ind');

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

		return `IND-${String(nextNumber).padStart(7, '0')}`;
	});
}

const optionalNumber = z.preprocess((value) => {
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'string' && value.trim() === '') return undefined;
	return value;
}, z.coerce.number().min(0).optional());

const optionalString = z.preprocess((value) => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}, z.string().optional());

const fileArray = z
	.union([
		z.array(z.custom<File>((f) => f instanceof File)),
		z.custom<File>((f) => f instanceof File).transform((f) => [f])
	])
	.optional()
	.default([]);

const stringArrayFromForm = z.preprocess(
	(v) => {
		if (Array.isArray(v)) return v;
		if (typeof v !== 'string') return v;
		const s = v.trim();
		if (!s) return [];
		if (s.startsWith('[')) {
			try {
				const parsed = JSON.parse(s);
				if (Array.isArray(parsed)) return parsed;
			} catch {
				return [];
			}
		}
		return [s];
	},
	z.array(z.string().min(1)).optional().default([])
);

// Shared shape (all fields except createdByUid/createdByEmail)
// Extracted so both listingSchema and updateListingSchema can be built without .omit()
// (Zod v4 forbids .omit() on schemas containing refinements)
const listingShape = {
	listingType: z.enum(['internal', 'portal']),

	// Sample-compatible listing overview
	availableFor: z.enum(['Sell', 'Rent', 'Both']),
	furnishing: z.enum(['Furnished', 'Unfurnished', 'Semi-Furnished']),
	city: z.string().min(1, 'City is required'),
	location: z.string().min(1, 'Community is required'),
	agentEmail: z.string().email('Valid agent email is required'),
	agentMobile: z.string().min(1, 'Agent mobile number is required'),
	reportingManager: z.string().min(1, 'Reporting manager is required'),
	seniorManager: z.string().min(1, 'Senior manager is required'),

	// Client details
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	clientPhone: z.string().min(1, 'Phone number is required'),
	clientEmail: z.string().email('Valid email is required'),

	// Property details
	developerName: z.string().min(1, 'Developer is required'),
	projectName: z.string().min(1, 'Project is required'),
	unitNo: z.string().min(1, 'Unit number is required'),
	projectType: z.enum(['Off-Plan Property', 'Ready Property']),
	unitType: z.string().min(1, 'Unit type is required'),
	unitTypeOther: optionalString,
	bedrooms: optionalString,
	unitArea: z.coerce.number().min(0, 'Unit area is required'),
	internalArea: optionalNumber,
	balconyArea: optionalNumber,
	plotSize: optionalNumber,
	builtUpArea: optionalNumber,
	unitStatus: optionalString,
	paymentType: z.string().min(1, 'Payment type is required'),
	rentAmount: optionalNumber,
	vacantDate: optionalString,
	handoverYear: optionalString,
	handoverQuarter: optionalString,
	paymentPlan: optionalString,
	originalPrice: optionalNumber,
	purchasePrice: optionalNumber,
	amountPaid: optionalNumber,

	// Address (all optional)
	addressLine1: z.string().optional(),
	addressLine2: z.string().optional(),
	buildingName: z.string().optional(),
	street: z.string().optional(),
	area: z.string().optional(),
	country: z.string().optional(),
	postalCode: z.string().optional(),
	landmark: z.string().optional(),

	// File attachments
	titleDeedFile: z.custom<File>((f) => !f || f instanceof File).optional(),
	passportFile: z.custom<File>((f) => !f || f instanceof File).optional(),
	emiratesIdFile: z.custom<File>((f) => !f || f instanceof File).optional(),

	// Media (multiple files — set programmatically before submit)
	pictureFiles: fileArray,
	videoFiles: fileArray,
	floorPlanFiles: fileArray,

	// Existing media URLs that should be kept on update
	retainedMediaUrls: stringArrayFromForm,
	retainedFloorPlanUrls: stringArrayFromForm,

	// Pricing
	price: z.coerce.number().min(0, 'Expected selling price is required'),

	// Listed by agents
	listedByEmails: z.preprocess(
		(v) => {
			if (Array.isArray(v)) return v;
			if (typeof v !== 'string') return v;
			const s = v.trim();
			if (!s) return [];
			if (s.startsWith('[')) {
				try {
					const parsed = JSON.parse(s);
					if (Array.isArray(parsed)) return parsed;
				} catch {
					return [s];
				}
			}
			return [s];
		},
		z.array(z.string().min(1)).min(1, 'At least one agent is required')
	)
};

const listingSchema = z
	.object({
		createdByUid: z.string().min(1, 'User ID is required'),
		createdByEmail: z.string().email('Valid user email is required'),
		...listingShape
	})
	.superRefine((data, ctx) => {
		if (data.unitType === 'Others' && !data.unitTypeOther) {
			ctx.addIssue({
				code: 'custom',
				path: ['unitTypeOther'],
				message: 'Please specify the unit type'
			});
		}

		if (['Apartment', 'Villa', 'Townhouse', 'Mansion'].includes(data.unitType) && !data.bedrooms) {
			ctx.addIssue({
				code: 'custom',
				path: ['bedrooms'],
				message: 'Number of bedrooms is required'
			});
		}

		if (data.projectType === 'Off-Plan Property') {
			if (!data.handoverYear) {
				ctx.addIssue({
					code: 'custom',
					path: ['handoverYear'],
					message: 'Handover year is required for off-plan listings'
				});
			}
			if (!data.handoverQuarter) {
				ctx.addIssue({
					code: 'custom',
					path: ['handoverQuarter'],
					message: 'Handover quarter is required for off-plan listings'
				});
			}
			if (!data.paymentPlan) {
				ctx.addIssue({
					code: 'custom',
					path: ['paymentPlan'],
					message: 'Payment plan is required for off-plan listings'
				});
			}
			if (data.amountPaid == null) {
				ctx.addIssue({
					code: 'custom',
					path: ['amountPaid'],
					message: 'Amount paid is required for off-plan listings'
				});
			}
		}

		if (data.projectType === 'Ready Property') {
			if (!data.unitStatus) {
				ctx.addIssue({
					code: 'custom',
					path: ['unitStatus'],
					message: 'Unit status is required'
				});
			}
			if (data.unitStatus === 'Rented' && data.rentAmount == null) {
				ctx.addIssue({
					code: 'custom',
					path: ['rentAmount'],
					message: 'Current monthly rent is required for rented units'
				});
			}
		}

		const pictureFiles = Array.isArray(data.pictureFiles) ? data.pictureFiles : [];
		if (!pictureFiles.some((file) => file instanceof File && file.size > 0)) {
			ctx.addIssue({
				code: 'custom',
				path: ['pictureFiles'],
				message: 'Please upload at least one property photo'
			});
		}

		const floorPlanFiles = Array.isArray(data.floorPlanFiles) ? data.floorPlanFiles : [];
		if (!floorPlanFiles.some((file) => file instanceof File && file.size > 0)) {
			ctx.addIssue({
				code: 'custom',
				path: ['floorPlanFiles'],
				message: 'Please upload at least one floor plan'
			});
		}

		if (!data.titleDeedFile || (data.titleDeedFile as File).size <= 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['titleDeedFile'],
				message: 'Title deed / Qood is required'
			});
		}

		if (data.listingType === 'portal') {
			if (!data.passportFile || (data.passportFile as File).size <= 0) {
				ctx.addIssue({
					code: 'custom',
					path: ['passportFile'],
					message: 'Passport is required for portal listings'
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

	const { locals } = getRequestEvent();
	if (!locals.user) throw error(401, 'Unauthorized');
	const { uid: createdByUid, email: createdByEmail } = locals.user;

	const timestamp = FieldValue.serverTimestamp();
	const listingId = await generateListingId();
	const basePath = `listings/${createdByUid}/${listingId}`;

	// Upload single file attachments in parallel
	const [titleDeedFile, passportFile, emiratesIdFile] = await Promise.all([
		toUploadedFile(data.titleDeedFile as File | null, `${basePath}/title-deed`),
		toUploadedFile(data.passportFile as File | null, `${basePath}/passport`),
		toUploadedFile(data.emiratesIdFile as File | null, `${basePath}/emirates-id`)
	]);

	// Upload media files in parallel
	const pictureFileInputs = Array.isArray(data.pictureFiles) ? data.pictureFiles : [];
	const videoFileInputs = Array.isArray(data.videoFiles) ? data.videoFiles : [];
	const floorPlanFileInputs = Array.isArray(data.floorPlanFiles) ? data.floorPlanFiles : [];

	const [uploadedPictures, uploadedVideos, uploadedFloorPlans] = await Promise.all([
		Promise.all(
			pictureFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/pictures`))
		),
		Promise.all(videoFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/video`))),
		Promise.all(
			floorPlanFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/floor-plans`))
		)
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
		availableFor: data.availableFor,
		furnishing: data.furnishing,
		city: data.city,
		location: data.location,
		agentEmail: data.agentEmail,
		agentMobile: data.agentMobile,
		reportingManager: data.reportingManager,
		seniorManager: data.seniorManager,
		clientName: `${data.firstName} ${data.lastName}`.trim(),
		clientPhone: data.clientPhone,
		clientEmail: data.clientEmail,
		developerName: data.developerName,
		projectName: data.projectName,
		unitNo: data.unitNo,
		projectType: data.projectType,
		unitType: data.unitType === 'Others' ? (data.unitTypeOther ?? 'Others') : data.unitType,
		unitTypeOther: data.unitType === 'Others' ? data.unitTypeOther : null,
		bedrooms: data.bedrooms ?? null,
		unitArea: data.unitArea,
		internalArea: data.internalArea ?? null,
		balconyArea: data.balconyArea ?? null,
		plotSize: data.plotSize ?? null,
		...(data.builtUpArea && { builtUpArea: data.builtUpArea }),
		unitStatus: data.projectType === 'Off-Plan Property' ? 'Off-Plan' : data.unitStatus,
		paymentType: data.paymentType,
		rentAmount:
			data.projectType === 'Ready Property' && data.unitStatus === 'Rented'
				? (data.rentAmount ?? null)
				: null,
		vacantDate:
			data.projectType === 'Ready Property' && data.unitStatus === 'Rented'
				? (data.vacantDate ?? null)
				: null,
		handoverYear: data.projectType === 'Off-Plan Property' ? (data.handoverYear ?? '') : '',
		handoverQuarter: data.projectType === 'Off-Plan Property' ? (data.handoverQuarter ?? '') : '',
		paymentPlan: data.projectType === 'Off-Plan Property' ? (data.paymentPlan ?? '') : '',
		originalPrice: data.originalPrice ?? null,
		purchasePrice: data.purchasePrice ?? null,
		amountPaid: data.projectType === 'Off-Plan Property' ? (data.amountPaid ?? null) : null,
		propertyAddress: {
			...(data.addressLine1 && { addressLine1: data.addressLine1 }),
			...(data.addressLine2 && { addressLine2: data.addressLine2 }),
			...(data.buildingName && { buildingName: data.buildingName }),
			...(data.street && { street: data.street }),
			area: data.location,
			city: data.city,
			...(data.country && { country: data.country }),
			...(data.postalCode && { postalCode: data.postalCode }),
			...(data.landmark && { landmark: data.landmark })
		},
		// Listing-type compatible file name fields
		titleDeedFileName: titleDeedFile?.name ?? null,
		passportFileName: passportFile?.name ?? null,
		emiratesIdFileName: emiratesIdFile?.name ?? null,
		floorPlansFileName: uploadedFloorPlans
			.filter(Boolean)
			.map((file) => file!.name)
			.join(', '),
		mediaAssets,
		floorPlanAssets: uploadedFloorPlans
			.filter(Boolean)
			.map((f) => ({ fileName: f!.name, url: f!.downloadURL })),
		price: data.price,
		listedByEmails: Array.isArray(data.listedByEmails)
			? data.listedByEmails
			: [data.listedByEmails],
		// Full file metadata for downloads / compliance
		attachments: {
			titleDeed: titleDeedFile ?? null,
			passport: passportFile ?? null,
			emiratesId: emiratesIdFile ?? null,
			pictures: uploadedPictures.filter(Boolean),
			videos: uploadedVideos.filter(Boolean),
			floorPlans: uploadedFloorPlans.filter(Boolean)
		},
		createdByUid,
		createdByEmail,
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

	if (data.unitType === 'Others' && !data.unitTypeOther) {
		issue.unitTypeOther = 'Please specify the unit type';
	}
	if (['Apartment', 'Villa', 'Townhouse', 'Mansion'].includes(data.unitType) && !data.bedrooms) {
		issue.bedrooms = 'Number of bedrooms is required';
	}
	if (data.projectType === 'Off-Plan Property') {
		if (!data.handoverYear) issue.handoverYear = 'Handover year is required for off-plan listings';
		if (!data.handoverQuarter)
			issue.handoverQuarter = 'Handover quarter is required for off-plan listings';
		if (!data.paymentPlan) issue.paymentPlan = 'Payment plan is required for off-plan listings';
		if (data.amountPaid == null) issue.amountPaid = 'Amount paid is required for off-plan listings';
	}
	if (data.projectType === 'Ready Property') {
		if (!data.unitStatus) issue.unitStatus = 'Unit status is required';
		if (data.unitStatus === 'Rented' && data.rentAmount == null) {
			issue.rentAmount = 'Current monthly rent is required for rented units';
		}
	}
	if (Object.keys(issue).length > 0) return;

	// Upload only if a real new file was provided
	const [newTitleDeed, newPassport, newEmiratesId] = await Promise.all([
		toUploadedFile(data.titleDeedFile as File | null, `${basePath}/title-deed`),
		toUploadedFile(data.passportFile as File | null, `${basePath}/passport`),
		toUploadedFile(data.emiratesIdFile as File | null, `${basePath}/emirates-id`)
	]);

	const pictureFileInputs = Array.isArray(data.pictureFiles) ? data.pictureFiles : [];
	const videoFileInputs = Array.isArray(data.videoFiles) ? data.videoFiles : [];
	const floorPlanFileInputs = Array.isArray(data.floorPlanFiles) ? data.floorPlanFiles : [];

	const [uploadedPictures, uploadedVideos, uploadedFloorPlans] = await Promise.all([
		Promise.all(
			pictureFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/pictures`))
		),
		Promise.all(videoFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/video`))),
		Promise.all(
			floorPlanFileInputs.map((f) => toUploadedFile(f as File | null, `${basePath}/floor-plans`))
		)
	]);

	// Resolve final attachment metadata: prefer new upload, fall back to existing Firestore record
	const finalTitleDeed = newTitleDeed ?? existing.attachments?.titleDeed ?? null;
	const finalPassport = newPassport ?? existing.attachments?.passport ?? null;
	const finalEmiratesId = newEmiratesId ?? existing.attachments?.emiratesId ?? null;

	// Required documents/files can be new or pre-existing on update.
	if (!finalTitleDeed) issue.titleDeedFile = 'Title deed / Qood is required';
	if (data.listingType === 'portal') {
		if (!finalPassport) issue.passportFile = 'Passport is required for portal listings';
	}

	const newMediaAssets = [
		...uploadedPictures
			.filter(Boolean)
			.map((f) => ({ type: 'photo' as const, fileName: f!.name, url: f!.downloadURL })),
		...uploadedVideos
			.filter(Boolean)
			.map((f) => ({ type: 'video' as const, fileName: f!.name, url: f!.downloadURL }))
	];

	const retainedMediaUrlSet = new Set(data.retainedMediaUrls ?? []);
	const retainedFloorPlanUrlSet = new Set(data.retainedFloorPlanUrls ?? []);

	const retainedExistingMediaAssets = (existing.mediaAssets ?? []).filter(
		(asset: { url?: string }) => !!asset?.url && retainedMediaUrlSet.has(asset.url)
	);

	const mergedMediaAssets = [...retainedExistingMediaAssets, ...newMediaAssets];
	if (!mergedMediaAssets.some((asset) => asset.type === 'photo')) {
		issue.pictureFiles = 'Please upload at least one property photo';
	}

	const retainedExistingFloorPlanAssets = (existing.floorPlanAssets ?? []).filter(
		(asset: { url?: string }) => !!asset?.url && retainedFloorPlanUrlSet.has(asset.url)
	);
	const newFloorPlanAssets = uploadedFloorPlans
		.filter(Boolean)
		.map((f) => ({ fileName: f!.name, url: f!.downloadURL }));
	const mergedFloorPlanAssets = [...retainedExistingFloorPlanAssets, ...newFloorPlanAssets];
	if (!mergedFloorPlanAssets.length) {
		issue.floorPlanFiles = 'Please upload at least one floor plan';
	}
	if (Object.keys(issue).length > 0) return;

	const retainedPictureAttachments = (existing.attachments?.pictures ?? []).filter(
		(file: { downloadURL?: string }) =>
			!!file?.downloadURL && retainedMediaUrlSet.has(file.downloadURL)
	);

	const retainedVideoAttachments = (existing.attachments?.videos ?? []).filter(
		(file: { downloadURL?: string }) =>
			!!file?.downloadURL && retainedMediaUrlSet.has(file.downloadURL)
	);
	const retainedFloorPlanAttachments = (existing.attachments?.floorPlans ?? []).filter(
		(file: { downloadURL?: string }) =>
			!!file?.downloadURL && retainedFloorPlanUrlSet.has(file.downloadURL)
	);

	const updateRecord = {
		listingType: data.listingType,
		availableFor: data.availableFor,
		furnishing: data.furnishing,
		city: data.city,
		location: data.location,
		agentEmail: data.agentEmail,
		agentMobile: data.agentMobile,
		reportingManager: data.reportingManager,
		seniorManager: data.seniorManager,
		clientName: `${data.firstName} ${data.lastName}`.trim(),
		clientPhone: data.clientPhone,
		clientEmail: data.clientEmail,
		developerName: data.developerName,
		projectName: data.projectName,
		unitNo: data.unitNo,
		projectType: data.projectType,
		unitType: data.unitType === 'Others' ? (data.unitTypeOther ?? 'Others') : data.unitType,
		unitTypeOther: data.unitType === 'Others' ? data.unitTypeOther : null,
		bedrooms: data.bedrooms ?? null,
		unitArea: data.unitArea,
		internalArea: data.internalArea ?? null,
		balconyArea: data.balconyArea ?? null,
		plotSize: data.plotSize ?? null,
		builtUpArea: data.builtUpArea ?? null,
		unitStatus: data.projectType === 'Off-Plan Property' ? 'Off-Plan' : data.unitStatus,
		paymentType: data.paymentType,
		rentAmount:
			data.projectType === 'Ready Property' && data.unitStatus === 'Rented'
				? (data.rentAmount ?? null)
				: null,
		vacantDate:
			data.projectType === 'Ready Property' && data.unitStatus === 'Rented'
				? (data.vacantDate ?? null)
				: null,
		handoverYear: data.projectType === 'Off-Plan Property' ? (data.handoverYear ?? '') : '',
		handoverQuarter: data.projectType === 'Off-Plan Property' ? (data.handoverQuarter ?? '') : '',
		paymentPlan: data.projectType === 'Off-Plan Property' ? (data.paymentPlan ?? '') : '',
		originalPrice: data.originalPrice ?? null,
		purchasePrice: data.purchasePrice ?? null,
		amountPaid: data.projectType === 'Off-Plan Property' ? (data.amountPaid ?? null) : null,
		propertyAddress: {
			...(data.addressLine1 && { addressLine1: data.addressLine1 }),
			...(data.addressLine2 && { addressLine2: data.addressLine2 }),
			...(data.buildingName && { buildingName: data.buildingName }),
			...(data.street && { street: data.street }),
			area: data.location,
			city: data.city,
			...(data.country && { country: data.country }),
			...(data.postalCode && { postalCode: data.postalCode }),
			...(data.landmark && { landmark: data.landmark })
		},
		titleDeedFileName: finalTitleDeed?.name ?? existing.titleDeedFileName ?? null,
		passportFileName: finalPassport?.name ?? existing.passportFileName ?? null,
		emiratesIdFileName: finalEmiratesId?.name ?? existing.emiratesIdFileName ?? null,
		mediaAssets: mergedMediaAssets,
		floorPlanAssets: mergedFloorPlanAssets,
		floorPlansFileName: mergedFloorPlanAssets.map((asset) => asset.fileName).join(', '),
		price: data.price,
		listedByEmails: Array.isArray(data.listedByEmails)
			? data.listedByEmails
			: [data.listedByEmails],
		attachments: {
			titleDeed: finalTitleDeed,
			passport: finalPassport,
			emiratesId: finalEmiratesId,
			pictures: [...retainedPictureAttachments, ...uploadedPictures.filter(Boolean)],
			videos: [...retainedVideoAttachments, ...uploadedVideos.filter(Boolean)],
			floorPlans: [...retainedFloorPlanAttachments, ...uploadedFloorPlans.filter(Boolean)]
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
