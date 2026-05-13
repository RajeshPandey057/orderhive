import { firestore } from '$lib/server/firebase';
import { normalizeListingMedia } from '$lib/server/listing-media';

export async function load({ params }) {
	const slug = params.slug;
	// Slug format: `{project-slug}-ind-0000001` — extract the listing ID at the end
	const match = slug.match(/-(ind-\d{7})$/i);
	if (!match) return { firestoreListing: null };

	const listingId = match[1].toUpperCase();

	try {
		const doc = await firestore.collection('listings').doc(listingId).get();
		if (!doc.exists || doc.data()?.listingType !== 'portal') return { firestoreListing: null };

		const d = doc.data()!;
		const listing: Listing = {
			id: doc.id,
			listingType: d.listingType ?? 'portal',
			availableFor: d.availableFor ?? '',
			furnishing: d.furnishing ?? '',
			city: d.city ?? '',
			location: d.location ?? '',
			agentEmail: d.agentEmail ?? '',
			agentMobile: d.agentMobile ?? '',
			reportingManager: d.reportingManager ?? '',
			seniorManager: d.seniorManager ?? '',
			clientName: d.clientName ?? '',
			clientPhone: d.clientPhone ?? '',
			clientEmail: d.clientEmail ?? '',
			developerName: d.developerName ?? '',
			projectName: d.projectName ?? '',
			unitNo: d.unitNo ?? '',
			projectType: d.projectType ?? '',
			unitType: d.unitType ?? '',
			unitTypeOther: d.unitTypeOther,
			bedrooms: d.bedrooms,
			unitArea: d.unitArea ?? 0,
			internalArea: d.internalArea,
			balconyArea: d.balconyArea,
			plotSize: d.plotSize,
			builtUpArea: d.builtUpArea,
			unitStatus: d.unitStatus,
			paymentType: d.paymentType ?? '',
			rentAmount: d.rentAmount ?? null,
			vacantDate: d.vacantDate ?? null,
			handoverYear: d.handoverYear,
			handoverQuarter: d.handoverQuarter,
			paymentPlan: d.paymentPlan,
			originalPrice: d.originalPrice ?? null,
			purchasePrice: d.purchasePrice ?? null,
			amountPaid: d.amountPaid ?? null,
			propertyAddress: d.propertyAddress ?? {},
			titleDeedFileName: d.titleDeedFileName ?? null,
			passportFileName: d.passportFileName ?? null,
			emiratesIdFileName: d.emiratesIdFileName ?? null,
			mediaAssets: d.mediaAssets ?? [],
			floorPlanAssets: d.floorPlanAssets ?? [],
			price: d.price ?? 0,
			listedByEmails: d.listedByEmails ?? [],
			createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
			createdByUid: d.createdByUid ?? '',
			createdByEmail: d.createdByEmail ?? ''
		};

		const media = normalizeListingMedia(d);

		return {
			firestoreListing: listing,
			media
		};
	} catch {
		return { firestoreListing: null };
	}
}
