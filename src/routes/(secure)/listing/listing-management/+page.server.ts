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
			const propertyAddress = d.propertyAddress ?? {};
			return {
				id: doc.id,
				listingType: d.listingType ?? 'internal',
				availableFor: d.availableFor,
				furnishing: d.furnishing,
				city: d.city ?? '',
				location: d.location ?? '',
				agentEmail: d.agentEmail,
				agentMobile: d.agentMobile,
				reportingManager: d.reportingManager,
				seniorManager: d.seniorManager,
				clientName: d.clientName ?? '',
				clientPhone: d.clientPhone ?? '',
				clientEmail: d.clientEmail ?? '',
				developerName: d.developerName ?? '',
				projectName: d.projectName ?? '',
				unitNo: d.unitNo ?? '',
				projectType: d.projectType,
				unitType: d.unitType,
				unitTypeOther: d.unitTypeOther,
				bedrooms: d.bedrooms,
				unitArea: d.unitArea,
				internalArea: d.internalArea,
				balconyArea: d.balconyArea,
				plotSize: d.plotSize,
				builtUpArea: d.builtUpArea,
				unitStatus: d.unitStatus,
				paymentType: d.paymentType,
				rentAmount: d.rentAmount ?? null,
				vacantDate: d.vacantDate ?? null,
				handoverYear: d.handoverYear,
				handoverQuarter: d.handoverQuarter,
				paymentPlan: d.paymentPlan,
				originalPrice: d.originalPrice ?? null,
				purchasePrice: d.purchasePrice ?? null,
				amountPaid: d.amountPaid ?? null,
				propertyAddress: {
					...propertyAddress,
					area: d.location ?? '',
					city: d.city ?? ''
				},
				titleDeedFileName: d.titleDeedFileName,
				passportFileName: d.passportFileName,
				emiratesIdFileName: d.emiratesIdFileName,
				mediaAssets: d.mediaAssets ?? [],
				floorPlanAssets: d.floorPlanAssets ?? [],
				price: d.price ?? 0,
				listedByEmails: d.listedByEmails ?? [],
				createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
				createdByUid: d.createdByUid ?? '',
				createdByEmail: d.createdByEmail ?? ''
			};
		});

	return { listings };
}
