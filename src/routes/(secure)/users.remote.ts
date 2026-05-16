import { query } from '$app/server';
import { firestore } from '$lib/server/firebase';
import { employeeCollection, employeeIdForEmail, normalizeEmail } from '$lib/server/hr';
import { z } from 'zod';

const searchSchema = z.object({
	q: z.string().default(''),
	// When set, restricts results to users with the given accessType OR super-admins
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
		reportingManagerEmail?: string | null;
		seniorManagerEmail?: string | null;
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
			photoURL: data.photoURL ?? null
		});
	}

	async function enrichHierarchy(users: UserResult[]) {
		const emails = users
			.map((user) => (user.email ? normalizeEmail(user.email) : ''))
			.filter(Boolean);

		if (emails.length === 0) return users;

		const uniqueEmails = Array.from(new Set(emails));
		const employeeRefs = uniqueEmails.map((email) =>
			employeeCollection.doc(employeeIdForEmail(email))
		);
		const employeeDocs = await firestore.getAll(...employeeRefs);

		const hierarchyByEmail = new Map<
			string,
			{ reportingManagerEmail: string; seniorManagerEmail: string }
		>();
		for (const doc of employeeDocs) {
			if (!doc.exists) continue;
			const data = doc.data() ?? {};
			hierarchyByEmail.set(normalizeEmail(doc.id), {
				reportingManagerEmail: (data.reportingManagerEmail ?? '').trim(),
				seniorManagerEmail: (data.seniorManagerEmail ?? '').trim()
			});
		}

		return users.map((user) => {
			if (!user.email) return user;
			const hierarchy = hierarchyByEmail.get(normalizeEmail(user.email));
			if (!hierarchy) return user;
			return {
				...user,
				reportingManagerEmail: hierarchy.reportingManagerEmail,
				seniorManagerEmail: hierarchy.seniorManagerEmail
			};
		});
	}

	// --- Role-filtered mode: only search roles collection for matching accessType + super-admins ---
	if (roleFilter) {
		const [byRoleSnap, superAdminSnap] = await Promise.all([
			rolesRef.where('accessType', '==', roleFilter).limit(200).get(),
			rolesRef.where('accessType', '==', 'super-admin').limit(200).get()
		]);
		for (const snap of [byRoleSnap, superAdminSnap]) {
			for (const doc of snap.docs) addDoc(doc);
		}

		let filtered = results;
		if (term) {
			filtered = results.filter((r) => {
				const name = (r.displayName ?? '').toLowerCase();
				const email = (r.email ?? '').toLowerCase();
				return name.includes(term) || email.includes(term);
			});
		}
		return enrichHierarchy(filtered);
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

		return enrichHierarchy(results);
	}

	// No term — return all from both collections (up to 100 each)
	const [usersSnap, rolesSnap] = await Promise.all([
		usersRef.limit(100).get(),
		rolesRef.limit(100).get()
	]);
	for (const snap of [usersSnap, rolesSnap]) {
		for (const doc of snap.docs) addDoc(doc);
	}
	return enrichHierarchy(results);
});
