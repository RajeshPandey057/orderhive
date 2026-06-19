import { listListingFilterOptions, listListingsPage } from '$lib/server/listings';

const LISTING_MANAGEMENT_PAGE_SIZE = 20;

export async function load({ locals, url }) {
	const isAdmin = locals.user?.role === 'admin' || locals.user?.role === 'super-admin';
	if (!isAdmin && !locals.user?.uid) {
		return {
			listings: [],
			pagination: {
				page: 1,
				pageSize: LISTING_MANAGEMENT_PAGE_SIZE,
				hasNextPage: false,
				totalCount: 0,
				totalPages: 1,
				search: ''
			},
			filters: {},
			filterOptions: {
				developers: [],
				agents: [],
				unitTypes: []
			}
		};
	}

	const pageParam = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isFinite(pageParam) ? pageParam : 1;
	const createdByUid = isAdmin ? undefined : locals.user?.uid;
	const [listingPage, filterOptions] = await Promise.all([
		listListingsPage({
			page,
			pageSize: LISTING_MANAGEMENT_PAGE_SIZE,
			createdByUid,
			includeClientDetails: true,
			search: url.searchParams.get('q') ?? '',
			filters: {
				developerName: url.searchParams.get('developer') ?? '',
				agentEmail: url.searchParams.get('agent') ?? '',
				unitType: url.searchParams.get('unitType') ?? ''
			},
			returnAllMatches: true
		}),
		listListingFilterOptions({ createdByUid })
	]);

	return {
		listings: listingPage.listings,
		pagination: {
			page: listingPage.page,
			pageSize: listingPage.pageSize,
			hasNextPage: listingPage.hasNextPage,
			totalCount: listingPage.totalCount,
			totalPages: listingPage.totalPages,
			search: listingPage.search
		},
		filters: listingPage.filters,
		filterOptions
	};
}
