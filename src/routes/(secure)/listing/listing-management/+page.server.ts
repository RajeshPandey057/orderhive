import { firestore } from '$lib/server/firebase';

export async function load({ locals }) {
	const isAdmin = locals.user?.role === 'admin' || locals.user?.role === 'super-admin';
	if (!isAdmin && !locals.user?.uid) return { listings: [] };

	let query: FirebaseFirestore.Query = firestore
		.collection('listings')
		.orderBy('createdAt', 'desc');

	if (!isAdmin && locals.user?.uid) {
		query = query.where('createdByUid', '==', locals.user.uid);
	}

	const snap = await query.get();

	const listings: Listing[] = snap.docs
		.filter((doc) => !doc.data().isDeleted)
		.map((doc) => {
			const d = doc.data();
			return {
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
				titleDeedFileName: d.titleDeedFileName,
				passportFileName: d.passportFileName,
				emiratesIdFileName: d.emiratesIdFileName,
				mediaAssets: d.mediaAssets ?? [],
				buyingPrice: d.buyingPrice ?? 0,
				liquidityInvested: d.liquidityInvested ?? 0,
				sellingPrice: d.sellingPrice ?? 0,
				dxbPrice: d.dxbPrice ?? undefined,
				listedByEmails: d.listedByEmails ?? [],
				createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
				createdByUid: d.createdByUid ?? '',
				createdByEmail: d.createdByEmail ?? ''
			};
		});

	return { listings };
}
