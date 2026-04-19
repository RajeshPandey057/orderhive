import { firestore } from '$lib/server/firebase';

export async function load({ params }) {
	const slug = params.slug;
	// Slug format: `{project-slug}-lst-YYYYMMDD-XXXX` — extract the listing ID at the end
	const match = slug.match(/-(lst-\d{8}-\d{4})$/i);
	if (!match) return { firestoreListing: null };

	const listingId = match[1].toUpperCase();

	try {
		const doc = await firestore.collection('listings').doc(listingId).get();
		if (!doc.exists || doc.data()?.listingType !== 'portal') return { firestoreListing: null };

		const d = doc.data()!;
		const listing: Listing = {
			id: doc.id,
			listingType: d.listingType ?? 'portal',
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
			createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString()
		};

		return { firestoreListing: listing };
	} catch {
		return { firestoreListing: null };
	}
}
