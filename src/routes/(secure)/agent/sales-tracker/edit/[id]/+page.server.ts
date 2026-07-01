import { firestore } from '$lib/server/firebase';
import { getSalesScope } from '$lib/server/rbac';
import { error } from '@sveltejs/kit';

const serializeFirestoreValue = (value: unknown): unknown => {
	if (!value || typeof value !== 'object') return value;

	if ('toDate' in value && typeof value.toDate === 'function') {
		return value.toDate().toISOString();
	}

	if (Array.isArray(value)) {
		return value.map((item) => serializeFirestoreValue(item));
	}

	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [key, serializeFirestoreValue(entry)])
	);
};

const includesAny = (values: unknown, allowedIds: string[]) =>
	Array.isArray(values) &&
	values.some((value) => typeof value === 'string' && allowedIds.includes(value));

async function canViewSale(user: NonNullable<App.Locals['user']>, sale: Record<string, unknown>) {
	const scope = await getSalesScope(user);
	if (scope.type === 'all') return true;

	if (scope.type === 'array-contains') {
		return (
			includesAny(sale[scope.field], [scope.value]) || includesAny(sale.dealOwnerIds, [scope.value])
		);
	}

	return (
		includesAny(sale[scope.field], scope.values) || includesAny(sale.dealOwnerIds, scope.values)
	);
}

export async function load({ params, parent, locals }) {
	const parentData = await parent();
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const saleSnap = await firestore.collection('sales').doc(params.id).get();
	if (!saleSnap.exists) {
		throw error(404, 'Sale not found');
	}

	const saleData = saleSnap.data() as Record<string, unknown>;
	if (saleData.isDeleted) {
		throw error(404, 'Sale not found');
	}

	if (!(await canViewSale(user, saleData))) {
		throw error(403, 'You do not have permission to view this sale');
	}

	const serializedSale = serializeFirestoreValue(saleData) as Record<string, unknown>;

	return {
		...parentData,
		saleId: params.id,
		sale: {
			...serializedSale,
			id: params.id
		} as Sale
	};
}
