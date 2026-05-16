export function isActiveSale(sale: Pick<Sale, 'isDeleted'> | null | undefined): boolean {
	return !sale?.isDeleted;
}

export function getEffectiveSaleRevenue(
	sale: Pick<Sale, 'dealStage' | 'revenueAfterPassback' | 'revenueAchieved'> | null | undefined
): number {
	if (!sale || sale.dealStage === 'cancelled') return 0;
	return sale.revenueAfterPassback ?? sale.revenueAchieved ?? 0;
}
