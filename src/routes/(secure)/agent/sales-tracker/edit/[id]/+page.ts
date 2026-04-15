export async function load({ params, parent }) {
	const parentData = await parent();
	return {
		...parentData,
		saleId: params.id
	};
}
