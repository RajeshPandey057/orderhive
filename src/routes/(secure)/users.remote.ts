import { query } from '$app/server';
import { firestore } from '$lib/server/firebase';
import { z } from 'zod';

const searchSchema = z.object({
	q: z.string().default(''),
	// When set, restricts results to users with the given agentRole OR super-admins
	roleFilter: z.enum(['manager', 'senior-manager']).optional()
});

export const searchUsers = query(searchSchema, async ({ q, roleFilter }) => {
	const term = q.trim().toLowerCase();
	const rolesRef = firestore.collection('roles');

	type UserResult = {
		id: string;
		displayName: string | null;
		email: string | null;
		photoURL: string | null;
		agentRole?: string | null;
	};

	const seen: Record<string, true> = {};
	const results: UserResult[] = [];

	function addDoc(doc: FirebaseFirestore.QueryDocumentSnapshot) {
		if (seen[doc.id]) return;
		seen[doc.id] = true;
		const data = doc.data();
		results.push({
			id: doc.id,
			displayName: data.displayName ?? null,
			email: data.email ?? null,
			photoURL: data.photoURL ?? null,
			agentRole: data.agentRole ?? null
		});
	}

	// --- Role-filtered mode: only search roles collection for matching agentRole + super-admins ---
	if (roleFilter) {
		const [byRoleSnap, superAdminSnap] = await Promise.all([
			rolesRef.where('agentRole', '==', roleFilter).limit(200).get(),
			rolesRef.where('accessType', '==', 'super-admin').limit(200).get()
		]);
		for (const snap of [byRoleSnap, superAdminSnap]) {
			for (const doc of snap.docs) addDoc(doc);
		}

		if (term) {
			return results.filter((r) => {
				const name = (r.displayName ?? '').toLowerCase();
				const email = (r.email ?? '').toLowerCase();
				return name.includes(term) || email.includes(term);
			});
		}
		return results;
	}

	// --- Default mode: search all users + roles ---
	const usersRef = firestore.collection('users');

	if (term) {
		const end = term + '\uf8ff';

		// Prefix search on both collections simultaneously
		const [usersNameSnap, usersEmailSnap, rolesNameSnap, rolesEmailSnap] = await Promise.all([
			usersRef.orderBy('displayName').startAt(term).endAt(end).limit(20).get(),
			usersRef.orderBy('email').startAt(term).endAt(end).limit(20).get(),
			rolesRef.orderBy('displayName').startAt(term).endAt(end).limit(20).get(),
			rolesRef.orderBy('email').startAt(term).endAt(end).limit(20).get()
		]);

		for (const snap of [usersNameSnap, usersEmailSnap, rolesNameSnap, rolesEmailSnap]) {
			for (const doc of snap.docs) addDoc(doc);
		}

		// Contains fallback — scan both collections for mid-word hits
		if (results.length < 5) {
			const [allUsersSnap, allRolesSnap] = await Promise.all([
				usersRef.limit(200).get(),
				rolesRef.limit(200).get()
			]);
			for (const snap of [allUsersSnap, allRolesSnap]) {
				for (const doc of snap.docs) {
					if (!seen[doc.id]) {
						const data = doc.data();
						const name = (data.displayName ?? '').toLowerCase();
						const email = (data.email ?? '').toLowerCase();
						if (name.includes(term) || email.includes(term)) addDoc(doc);
					}
				}
			}
		}

		return results;
	}

	// No term — return all from both collections (up to 100 each)
	const [usersSnap, rolesSnap] = await Promise.all([
		usersRef.limit(100).get(),
		rolesRef.limit(100).get()
	]);
	for (const snap of [usersSnap, rolesSnap]) {
		for (const doc of snap.docs) addDoc(doc);
	}
	return results;
});
