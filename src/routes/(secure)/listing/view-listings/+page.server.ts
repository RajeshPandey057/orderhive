import { listListingsPage } from '$lib/server/listings';

const VIEW_LISTINGS_PAGE_SIZE = 15;

export async function load({ url }) {
	try {
		const pageParam = Number(url.searchParams.get('page') ?? '1');
		const page = Number.isFinite(pageParam) ? pageParam : 1;
		const listingPage = await listListingsPage({
			page,
			pageSize: VIEW_LISTINGS_PAGE_SIZE,
			search: url.searchParams.get('q') ?? ''
		});

		return {
			listings: listingPage.listings,
			pagination: {
				page: listingPage.page,
				pageSize: listingPage.pageSize,
				hasNextPage: listingPage.hasNextPage,
				totalCount: listingPage.totalCount,
				totalPages: listingPage.totalPages,
				search: listingPage.search
			}
		};
	} catch {
		return {
			listings: [],
			pagination: {
				page: 1,
				pageSize: VIEW_LISTINGS_PAGE_SIZE,
				hasNextPage: false,
				totalCount: 0,
				totalPages: 1,
				search: ''
			}
		};
	}
}
