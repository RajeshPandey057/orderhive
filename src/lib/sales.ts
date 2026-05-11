export function isActiveSale(sale: Pick<Sale, 'isDeleted'> | null | undefined): boolean {
	return !sale?.isDeleted;
}
