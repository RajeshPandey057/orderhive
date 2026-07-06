import type { AccessType } from '$lib/constants';
import { firestore } from '$lib/server/firebase';

interface SessionUser {
	uid: string;
	email: string;
	role: AccessType;
	managedTeamIds?: string[];
}

/**
 * Resolves the complete set of agent UIDs a senior-manager can see.
 * Gathers every agent UID from all managers in their managedTeamIds.
 *
 * `managedTeamIds` stores Firebase Auth UIDs, but `roles` documents are keyed
 * by normalized email (they have no `uid` field). To look up a manager's own
 * role doc we first resolve their UID to an email via the `users` collection
 * (which is keyed by UID), then fetch `roles/{email}`.
 */
async function resolveSeniorManagerAgentIds(managerUids: string[]): Promise<string[]> {
	if (managerUids.length === 0) return [];

	const allAgentIds: string[] = [...managerUids];

	const userDocs = await firestore.getAll(
		...managerUids.map((uid) => firestore.collection('users').doc(uid))
	);
	const emails = userDocs
		.filter((doc) => doc.exists)
		.map((doc) => (doc.data()?.email as string | undefined)?.trim().toLowerCase())
		.filter((email): email is string => !!email);

	if (emails.length > 0) {
		const roleDocs = await firestore.getAll(
			...emails.map((email) => firestore.collection('roles').doc(email))
		);
		for (const doc of roleDocs) {
			if (!doc.exists) continue;
			const data = doc.data() as { managedTeamIds?: string[] };
			if (Array.isArray(data.managedTeamIds)) {
				allAgentIds.push(...data.managedTeamIds);
			}
		}
	}

	return [...new Set(allAgentIds)];
}

/**
 * Resolves the flat set of UIDs a manager/senior-manager's visibility should
 * cover: themselves, their directly managed team, and (for senior-managers)
 * every agent under the managers they oversee.
 */
export async function resolveTeamAgentIds(user: SessionUser): Promise<string[]> {
	const { role, uid, managedTeamIds = [] } = user;

	if (role === 'senior-manager') {
		const resolved = await resolveSeniorManagerAgentIds([uid, ...managedTeamIds]);
		return resolved.length > 0 ? resolved : [uid];
	}

	if (role === 'manager') {
		return [uid, ...managedTeamIds];
	}

	return [uid];
}

type SingleSalesScope =
	| { type: 'array-contains'; field: string; value: string }
	| { type: 'array-contains-any'; field: string; values: string[] };

export type SalesScope =
	| { type: 'all' }
	| SingleSalesScope
	| { type: 'any'; scopes: SingleSalesScope[] };

// Firestore caps 'array-contains-any' at 30 disjunction values per query, so
// larger teams are split across multiple scopes and merged by getSalesDocsForScope.
const MAX_ARRAY_CONTAINS_ANY = 30;

function idScopesForField(field: string, ids: string[]): SingleSalesScope[] {
	const scopes: SingleSalesScope[] = [];
	for (let i = 0; i < ids.length; i += MAX_ARRAY_CONTAINS_ANY) {
		const values = ids.slice(i, i + MAX_ARRAY_CONTAINS_ANY);
		scopes.push(
			values.length === 1
				? { type: 'array-contains', field, value: values[0] }
				: { type: 'array-contains-any', field, values }
		);
	}
	return scopes;
}

/**
 * Returns the Firestore filter scope for querying sales based on user role.
 *
 * - admin / super-admin / finance / compliance → no filter (see all)
 * - agent → where splitAgentIds array-contains uid
 * - manager → mapped manager email, with split/deal-owner UID fallback
 * - senior-manager → mapped senior-manager email, with recursive UID fallback
 */
export async function getSalesScope(user: SessionUser): Promise<SalesScope> {
	const { role, uid, email } = user;
	const normalizedEmail = email.trim().toLowerCase();

	switch (role) {
		case 'admin':
		case 'super-admin':
		case 'finance':
		case 'compliance':
			return { type: 'all' };

		case 'agent':
			return {
				type: 'any',
				scopes: [
					{ type: 'array-contains', field: 'splitAgentIds', value: uid },
					{ type: 'array-contains', field: 'dealOwnerIds', value: uid }
				]
			};

		case 'manager': {
			const ids = await resolveTeamAgentIds(user);
			return {
				type: 'any',
				scopes: [
					{ type: 'array-contains', field: 'managerEmails', value: normalizedEmail },
					...idScopesForField('splitAgentIds', ids),
					...idScopesForField('dealOwnerIds', ids)
				]
			};
		}

		case 'senior-manager': {
			const ids = await resolveTeamAgentIds(user);
			return {
				type: 'any',
				scopes: [
					{ type: 'array-contains', field: 'seniorManagerEmails', value: normalizedEmail },
					...idScopesForField('splitAgentIds', ids),
					...idScopesForField('dealOwnerIds', ids)
				]
			};
		}

		case 'general':
			// General employees have no sales visibility
			return { type: 'array-contains', field: 'splitAgentIds', value: uid };

		default:
			return { type: 'array-contains', field: 'splitAgentIds', value: uid };
	}
}

function applySingleSalesScope(
	ref: FirebaseFirestore.CollectionReference,
	scope: SingleSalesScope
): FirebaseFirestore.Query {
	if (scope.type === 'array-contains') {
		return ref.where(scope.field, 'array-contains', scope.value);
	}
	return ref.where(scope.field, 'array-contains-any', scope.values);
}

export async function getSalesDocsForScope(
	ref: FirebaseFirestore.CollectionReference,
	scope: SalesScope,
	applyAdditionalFilters?: (
		query: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference
	) => FirebaseFirestore.Query | FirebaseFirestore.CollectionReference
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
	const withFilters = (
		query: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference
	) => applyAdditionalFilters?.(query) ?? query;

	if (scope.type === 'all') {
		return (await withFilters(ref).get()).docs;
	}

	const scopes = scope.type === 'any' ? scope.scopes : [scope];
	const snapshots = await Promise.all(
		scopes
			.filter(
				(candidate) =>
					candidate.type !== 'array-contains-any' || candidate.values.length > 0
			)
			.map((candidate) => withFilters(applySingleSalesScope(ref, candidate)).get())
	);

	const docsById = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
	for (const snap of snapshots) {
		for (const doc of snap.docs) {
			docsById.set(doc.id, doc);
		}
	}

	return [...docsById.values()];
}

/**
 * Utility: check if a role can punch (create) a new sale.
 */
export function canPunchOrder(role: AccessType): boolean {
	return role === 'admin' || role === 'super-admin';
}

/**
 * Utility: check if a role can edit a sale.
 */
export function canEditSale(role: AccessType): boolean {
	return role === 'admin' || role === 'super-admin';
}

/**
 * Utility: check if a role can edit the invoicing status field only.
 */
export function isFinanceRole(role: AccessType): boolean {
	return role === 'finance';
}

/**
 * Utility: check if a role can access document upload / checklist section only.
 */
export function isComplianceRole(role: AccessType): boolean {
	return role === 'compliance';
}
