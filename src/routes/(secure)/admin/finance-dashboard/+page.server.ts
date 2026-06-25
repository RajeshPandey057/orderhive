import { firestore } from '$lib/server/firebase';
import {
	buildDashboardData,
	isInPeriod,
	toDealRow,
	type DashboardData,
	type DealRow
} from '$lib/finance-dashboard-utils';
import {
	getFinancePeriodRange,
	parseFinancePeriodParams
} from '$lib/date-period';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const role = locals.user?.role;
	if (role !== 'admin' && role !== 'super-admin') {
		throw error(403, 'Access denied');
	}

	const periodParams = parseFinancePeriodParams(url.searchParams);
	const { start, end } = getFinancePeriodRange(periodParams, new Date());

	const snap = await firestore
		.collection('sales')
		.where('dealStage', '==', 'booking')
		.get();

	const confirmedDeals: Sale[] = snap.docs
		.map((doc) => ({ id: doc.id, ...doc.data() } as Sale))
		.filter(
			(sale) =>
				!sale.isDeleted &&
				isInPeriod(sale.saleDate, sale.createdAt, start, end)
		);

	const dashboardData: DashboardData = buildDashboardData(confirmedDeals);
	const allDeals: DealRow[] = confirmedDeals.map(toDealRow);

	return {
		user: locals.user,
		periodParams,
		allDeals,
		...dashboardData
	};
};
