import { firestore } from '$lib/server/firebase';
import { getSalesDocsForScope, getSalesScope } from '$lib/server/rbac';
import {
	buildDashboardData,
	isInPeriod,
	type DashboardData
} from '$lib/finance-dashboard-utils';
import {
	getFinancePeriodRange,
	parseFinancePeriodParams
} from '$lib/date-period';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Not authenticated');

	const role = user.role;
	const allowed = ['agent', 'manager', 'senior-manager', 'general'];
	if (!allowed.includes(role)) {
		throw error(403, 'Access denied');
	}

	const periodParams = parseFinancePeriodParams(url.searchParams);
	const { start, end } = getFinancePeriodRange(periodParams, new Date());

	const scope = await getSalesScope(user);
	const salesRef = firestore.collection('sales');

	const docs = await getSalesDocsForScope(salesRef, scope, (query) =>
		query.where('dealStage', '==', 'booking')
	);

	const confirmedDeals: Sale[] = docs
		.map((doc) => ({ id: doc.id, ...doc.data() } as Sale))
		.filter(
			(sale) =>
				!sale.isDeleted &&
				isInPeriod(sale.saleDate, sale.createdAt, start, end)
		);

	const dashboardData: DashboardData = buildDashboardData(confirmedDeals);

	return {
		user,
		periodParams,
		role,
		...dashboardData
	};
};
