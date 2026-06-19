import { firestore } from '$lib/server/firebase';

export type ListingPage = {
	listings: Listing[];
	page: number;
	pageSize: number;
	hasNextPage: boolean;
	totalCount: number;
	totalPages: number;
	search: string;
	filters: ListingFilters;
};

export type ListingFilters = {
	developerName?: string;
	agentEmail?: string;
	unitType?: string;
};

export type ListingFilterOptions = {
	developers: string[];
	agents: string[];
	unitTypes: string[];
};

type ListListingsPageOptions = {
	page?: number;
	pageSize: number;
	createdByUid?: string;
	includeClientDetails?: boolean;
	search?: string;
	filters?: ListingFilters;
	returnAllMatches?: boolean;
};

type ListListingFilterOptionsOptions = {
	createdByUid?: string;
};

function normalizeFilterValue(value?: string | null) {
	const trimmed = value?.trim() ?? '';
	return trimmed && trimmed !== 'all' ? trimmed : undefined;
}

function normalizeListingFilters(filters?: ListingFilters): ListingFilters {
	return {
		developerName: normalizeFilterValue(filters?.developerName),
		agentEmail: normalizeFilterValue(filters?.agentEmail),
		unitType: normalizeFilterValue(filters?.unitType)
	};
}

function hasListingFilters(filters: ListingFilters) {
	return Boolean(filters.developerName || filters.agentEmail || filters.unitType);
}

function serializeListingDoc(
	doc: FirebaseFirestore.QueryDocumentSnapshot,
	options?: { includeClientDetails?: boolean }
): Listing {
	const d = doc.data();
	const propertyAddress = d.propertyAddress ?? {};
	const includeClientDetails = options?.includeClientDetails ?? false;

	return {
		id: doc.id,
		listingType: d.listingType ?? 'internal',
		availableFor: d.availableFor,
		furnishing: d.furnishing,
		city: d.city ?? '',
		location: d.location ?? '',
		agentEmail: d.agentEmail ?? '',
		agentMobile: d.agentMobile,
		reportingManager: d.reportingManager,
		seniorManager: d.seniorManager,
		clientName: includeClientDetails ? (d.clientName ?? '') : '',
		clientPhone: includeClientDetails ? (d.clientPhone ?? '') : '',
		clientEmail: includeClientDetails ? (d.clientEmail ?? '') : '',
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
		titleDeedFileName: d.titleDeedFileName ?? null,
		passportFileName: d.passportFileName ?? null,
		emiratesIdFileName: d.emiratesIdFileName ?? null,
		mediaAssets: d.mediaAssets ?? [],
		floorPlanAssets: d.floorPlanAssets ?? [],
		price: d.price ?? 0,
		createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
		createdByUid: d.createdByUid ?? '',
		createdByEmail: d.createdByEmail ?? ''
	};
}

function listingMatchesSearch(listing: Listing, search: string) {
	if (!search) return true;

	return [
		listing.id,
		listing.projectName,
		listing.developerName,
		listing.unitNo,
		listing.agentEmail,
		listing.city,
		listing.location,
		listing.unitType,
		listing.projectType,
		listing.createdByEmail,
		listing.clientName,
		listing.clientPhone,
		listing.clientEmail
	].some((value) =>
		String(value ?? '')
			.toLowerCase()
			.includes(search)
	);
}

function listingMatchesFilters(listing: Listing, filters: ListingFilters) {
	const matchesDeveloper =
		!filters.developerName || listing.developerName?.trim() === filters.developerName;
	const matchesAgent = !filters.agentEmail || listing.agentEmail?.trim() === filters.agentEmail;
	const matchesUnitType = !filters.unitType || listing.unitType?.trim() === filters.unitType;

	return matchesDeveloper && matchesAgent && matchesUnitType;
}

export async function listListingsPage(options: ListListingsPageOptions): Promise<ListingPage> {
	const pageSize = options.pageSize;
	const search = options.search?.trim().toLowerCase() ?? '';
	const filters = normalizeListingFilters(options.filters);
	const hasFilters = hasListingFilters(filters);
	const requestedPage = Math.max(1, Math.floor(options.page ?? 1));
	const chunkSize = Math.max(pageSize * 2, 30);

	let query: FirebaseFirestore.Query = firestore
		.collection('listings')
		.orderBy('createdAt', 'desc');

	if (options.createdByUid) {
		query = query.where('createdByUid', '==', options.createdByUid);
	}

	if (search || hasFilters) {
		const matches: Listing[] = [];
		let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
		let hasMoreDocs = true;

		while (hasMoreDocs) {
			let chunkQuery = query.limit(chunkSize);
			if (cursor) chunkQuery = chunkQuery.startAfter(cursor);

			const snap = await chunkQuery.get();
			if (snap.empty) break;

			cursor = snap.docs.at(-1) ?? null;
			hasMoreDocs = snap.docs.length === chunkSize;

			for (const doc of snap.docs) {
				if (doc.data().isDeleted) continue;
				const listing = serializeListingDoc(doc, {
					includeClientDetails: options.includeClientDetails
				});
				if (listingMatchesSearch(listing, search) && listingMatchesFilters(listing, filters)) {
					matches.push(listing);
				}
			}
		}

		const totalCount = matches.length;
		const shouldReturnAllMatches = Boolean(options.returnAllMatches);
		const resultPageSize = shouldReturnAllMatches ? Math.max(totalCount, pageSize) : pageSize;
		const totalPages = shouldReturnAllMatches ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));
		const page = shouldReturnAllMatches ? 1 : Math.min(requestedPage, totalPages);

		return {
			listings: shouldReturnAllMatches
				? matches
				: matches.slice((page - 1) * pageSize, page * pageSize),
			page,
			pageSize: resultPageSize,
			hasNextPage: !shouldReturnAllMatches && page < totalPages,
			totalCount,
			totalPages,
			search,
			filters
		};
	}

	let countQuery: FirebaseFirestore.Query = firestore.collection('listings');
	if (options.createdByUid) {
		countQuery = countQuery.where('createdByUid', '==', options.createdByUid);
	}

	const [allCountSnap, deletedCountSnap] = await Promise.all([
		countQuery.count().get(),
		countQuery.where('isDeleted', '==', true).count().get()
	]);
	const totalCount = Math.max(0, allCountSnap.data().count - deletedCountSnap.data().count);
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
	const page = Math.min(requestedPage, totalPages);
	const activeEndIndex = page * pageSize;
	const targetActiveCount = activeEndIndex + 1;
	const activeListings: Listing[] = [];

	let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
	let hasMoreDocs = true;

	while (activeListings.length < targetActiveCount && hasMoreDocs) {
		let chunkQuery = query.limit(chunkSize);
		if (cursor) chunkQuery = chunkQuery.startAfter(cursor);

		const snap = await chunkQuery.get();
		if (snap.empty) break;

		cursor = snap.docs.at(-1) ?? null;
		hasMoreDocs = snap.docs.length === chunkSize;

		for (const doc of snap.docs) {
			if (doc.data().isDeleted) continue;
			activeListings.push(
				serializeListingDoc(doc, { includeClientDetails: options.includeClientDetails })
			);
			if (activeListings.length >= targetActiveCount) break;
		}
	}

	const start = (page - 1) * pageSize;
	const pageListings = activeListings.slice(start, activeEndIndex);

	return {
		listings: pageListings,
		page,
		pageSize,
		hasNextPage: activeListings.length > activeEndIndex,
		totalCount,
		totalPages,
		search,
		filters
	};
}

export async function listListingFilterOptions(
	options: ListListingFilterOptionsOptions = {}
): Promise<ListingFilterOptions> {
	let query: FirebaseFirestore.Query = firestore.collection('listings');

	if (options.createdByUid) {
		query = query.where('createdByUid', '==', options.createdByUid);
	}

	const snap = await query.get();
	const developers = new Set<string>();
	const agents = new Set<string>();
	const unitTypes = new Set<string>();

	for (const doc of snap.docs) {
		const data = doc.data();
		if (data.isDeleted) continue;

		const developerName = normalizeFilterValue(data.developerName);
		const agentEmail = normalizeFilterValue(data.agentEmail);
		const unitType = normalizeFilterValue(data.unitType);

		if (developerName) developers.add(developerName);
		if (agentEmail) agents.add(agentEmail);
		if (unitType) unitTypes.add(unitType);
	}

	return {
		developers: [...developers].sort((a, b) => a.localeCompare(b)),
		agents: [...agents].sort((a, b) => a.localeCompare(b)),
		unitTypes: [...unitTypes].sort((a, b) => a.localeCompare(b))
	};
}
