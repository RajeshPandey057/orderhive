import { firestore } from '$lib/server/firebase';
import { normalizeListingMedia } from '$lib/server/listing-media';

export async function load({ params }) {
	const listingId = params.id.toUpperCase();

	try {
		const doc = await firestore.collection('listings').doc(listingId).get();
		if (!doc.exists) return { listing: null };

		const d = doc.data()!;
		if (d.isDeleted) return { listing: null };

		const listing: Listing = {
			id: doc.id,
			listingType: d.listingType ?? 'internal',
			clientName: d.clientName ?? '',
			clientPhone: d.clientPhone ?? '',
			clientEmail: d.clientEmail ?? '',
			developer: d.developer ?? '',
			community: d.community,
			project: d.project ?? '',
			unitNo: d.unitNo ?? '',
			propertyType: d.propertyType ?? 'apartment',
			bedroomType: d.bedroomType,
			commercialSubType: d.commercialSubType,
			propertySize: d.propertySize,
			plotArea: d.plotArea,
			builtUpArea: d.builtUpArea,
			grossFloorArea: d.grossFloorArea,
			propertyAddress: d.propertyAddress ?? {},
			titleDeedFileName: d.titleDeedFileName ?? null,
			passportFileName: d.passportFileName ?? null,
			emiratesIdFileName: d.emiratesIdFileName ?? null,
			mediaAssets: d.mediaAssets ?? [],
			buyingPrice: d.buyingPrice ?? 0,
			liquidityInvested: d.liquidityInvested ?? 0,
			sellingPrice: d.sellingPrice ?? 0,
			listedByEmails: d.listedByEmails ?? [],
			createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
			createdByUid: d.createdByUid ?? '',
			createdByEmail: d.createdByEmail ?? ''
		};

		const media = normalizeListingMedia(d);

		return {
			listing,
			media
		};
	} catch {
		return { listing: null };
	}
}
