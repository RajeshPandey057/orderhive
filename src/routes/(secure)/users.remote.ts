import { query } from '$app/server';
import { firestore } from '$lib/server/firebase';
import { z } from 'zod';

const searchSchema = z.object({
	q: z.string().default('')
});

export const searchUsers = query(searchSchema, async ({ q }) => {
	const term = q.trim().toLowerCase();
	const usersRef = firestore.collection('users');

	if (term) {
		const end = term + '\uf8ff';

		const [nameSnap, emailSnap] = await Promise.all([
			usersRef.orderBy('displayName').startAt(term).endAt(end).limit(20).get(),
			usersRef.orderBy('email').startAt(term).endAt(end).limit(20).get()
		]);

		const seen: Record<string, true> = {};
		const results: {
			id: string;
			displayName: string | null;
			email: string | null;
			photoURL: string | null;
		}[] = [];

		for (const snap of [nameSnap, emailSnap]) {
			for (const doc of snap.docs) {
				if (!seen[doc.id]) {
					seen[doc.id] = true;
					const data = doc.data();
					results.push({
						id: doc.id,
						displayName: data.displayName ?? null,
						email: data.email ?? null,
						photoURL: data.photoURL ?? null
					});
				}
			}
		}

		// Also scan up to 200 docs for contains matches (catches mid-word hits)
		if (results.length < 5) {
			const allSnap = await usersRef.limit(200).get();
			for (const doc of allSnap.docs) {
				if (!seen[doc.id]) {
					const data = doc.data();
					const name = (data.displayName ?? '').toLowerCase();
					const email = (data.email ?? '').toLowerCase();
					if (name.includes(term) || email.includes(term)) {
						seen[doc.id] = true;
						results.push({
							id: doc.id,
							displayName: data.displayName ?? null,
							email: data.email ?? null,
							photoURL: data.photoURL ?? null
						});
					}
				}
			}
		}

		return results;
	}

	// No term — return all users (up to 100)
	const snap = await usersRef.limit(100).get();
	return snap.docs.map((doc) => {
		const data = doc.data();
		return {
			id: doc.id,
			displayName: data.displayName ?? null,
			email: data.email ?? null,
			photoURL: data.photoURL ?? null
		};
	});
});
