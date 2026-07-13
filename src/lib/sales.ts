import { parseAmount } from './finance-dashboard-utils';

export function isActiveSale(sale: Pick<Sale, 'isDeleted'> | null | undefined): boolean {
	return !sale?.isDeleted;
}

export function getSaleRevenue(
	sale:
		| Pick<Sale, 'dealStage' | 'unitValue' | 'commissionPercentage' | 'revenueAchieved'>
		| null
		| undefined
): number {
	if (!sale || sale.dealStage === 'cancelled') return 0;
	// Revenue is derived live from commission % × unit value; the stored
	// revenueAchieved is only a fallback for deals without a commission %.
	const unitValue = parseAmount(sale.unitValue);
	const commissionPct = sale.commissionPercentage ?? 0;
	if (unitValue > 0 && commissionPct > 0) {
		return Math.round((unitValue * commissionPct) / 100);
	}
	return sale.revenueAchieved ?? 0;
}

export function getSaleRevenuePostPassback(
	sale:
		| Pick<
				Sale,
				'dealStage' | 'unitValue' | 'commissionPercentage' | 'revenueAchieved' | 'passbackAmount'
		  >
		| null
		| undefined
): number {
	if (!sale || sale.dealStage === 'cancelled') return 0;
	return getSaleRevenue(sale) - (sale.passbackAmount ?? 0);
}
