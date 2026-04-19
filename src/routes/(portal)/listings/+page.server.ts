import { firestore } from '$lib/server/firebase';

export async function load() {
	try {
		const snap = await firestore.collection('listings').get();

		const listings: Listing[] = snap.docs.map((doc) => {
			const d = doc.data();
			return {
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
		});

		const portalListings = listings
			.filter((l) => l.listingType === 'portal')
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		return { firestoreListings: portalListings };
	} catch {
		return { firestoreListings: [] };
	}
}
