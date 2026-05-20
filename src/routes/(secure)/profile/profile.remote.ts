import { command, getRequestEvent } from '$app/server';
import { firestore, storage } from '$lib/server/firebase';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

function assertSuperAdmin() {
	const { locals } = getRequestEvent();
	if (!locals.user) throw error(401, 'Unauthorized');
	if (locals.user.role !== 'super-admin') {
		throw error(403, 'Only super-admins can perform this action');
	}
	return locals.user;
}

async function batchDeleteCollection(collectionPath: string) {
	const CHUNK = 499;
	let deleted = 0;

	while (true) {
		const snap = await firestore.collection(collectionPath).limit(CHUNK).get();
		if (snap.empty) break;

		const batch = firestore.batch();
		for (const doc of snap.docs) {
			batch.delete(doc.ref);
		}
		await batch.commit();
		deleted += snap.size;

		if (snap.size < CHUNK) break;
	}

	return deleted;
}

export const resetAllSales = command(z.object({}), async () => {
	assertSuperAdmin();

	// Delete all files under sales/ in Firebase Storage
	await storage.bucket().deleteFiles({ prefix: 'sales/', force: true });

	// Delete all sales Firestore documents
	await batchDeleteCollection('sales');

	// Delete all sale-counter documents (ids like "sale-20260516")
	const countersSnap = await firestore.collection('counters').get();
	const saleCounterRefs = countersSnap.docs
		.filter((doc) => doc.id.startsWith('sale-'))
		.map((doc) => doc.ref);

	const CHUNK = 499;
	for (let i = 0; i < saleCounterRefs.length; i += CHUNK) {
		const batch = firestore.batch();
		for (const ref of saleCounterRefs.slice(i, i + CHUNK)) {
			batch.delete(ref);
		}
		await batch.commit();
	}

	return { success: true };
});

export const resetAllListings = command(z.object({}), async () => {
	assertSuperAdmin();

	// Delete all files under listings/ in Firebase Storage
	await storage.bucket().deleteFiles({ prefix: 'listings/', force: true });

	// Delete all listings Firestore documents
	await batchDeleteCollection('listings');

	// Reset listing counter to 0
	await firestore.collection('counters').doc('listing-ind').set({ count: 0 });

	return { success: true };
});
