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
 * Recursively gathers every agent UID from all managers in their managedTeamIds.
 */
async function resolveSeniorManagerAgentIds(managerUids: string[]): Promise<string[]> {
	if (managerUids.length === 0) return [];

	const chunks: string[][] = [];
	for (let i = 0; i < managerUids.length; i += 10) {
		chunks.push(managerUids.slice(i, i + 10));
	}

	const allAgentIds: string[] = [...managerUids];

	for (const chunk of chunks) {
		const snaps = await Promise.all(
			chunk.map((uid) => firestore.collection('roles').where('uid', '==', uid).limit(1).get())
		);

		for (const snap of snaps) {
			if (!snap.empty) {
				const data = snap.docs[0].data() as { managedTeamIds?: string[] };
				if (Array.isArray(data.managedTeamIds)) {
					allAgentIds.push(...data.managedTeamIds);
				}
			}
		}
	}

	return [...new Set(allAgentIds)];
}

export type SalesScope =
	| { type: 'all' }
	| { type: 'array-contains'; field: string; value: string }
	| { type: 'array-contains-any'; field: string; values: string[] };

/**
 * Returns the Firestore filter scope for querying sales based on user role.
 *
 * - admin / super-admin / finance / compliance → no filter (see all)
 * - agent → where splitAgentIds array-contains uid
 * - manager → where splitAgentIds array-contains-any [uid, ...managedTeamIds]
 * - senior-manager → recursive team expansion → array-contains-any
 */
export async function getSalesScope(user: SessionUser): Promise<SalesScope> {
	const { role, uid, managedTeamIds = [] } = user;

	switch (role) {
		case 'admin':
		case 'super-admin':
		case 'finance':
		case 'compliance':
			return { type: 'all' };

		case 'agent':
			return { type: 'array-contains', field: 'splitAgentIds', value: uid };

		case 'manager': {
			const ids = [uid, ...managedTeamIds];
			if (ids.length === 1) {
				return { type: 'array-contains', field: 'splitAgentIds', value: uid };
			}
			// Firestore array-contains-any supports max 30 values
			return { type: 'array-contains-any', field: 'splitAgentIds', values: ids.slice(0, 30) };
		}

		case 'senior-manager': {
			const resolvedIds = await resolveSeniorManagerAgentIds([uid, ...managedTeamIds]);
			if (resolvedIds.length === 0) {
				return { type: 'array-contains', field: 'splitAgentIds', value: uid };
			}
			if (resolvedIds.length === 1) {
				return { type: 'array-contains', field: 'splitAgentIds', value: resolvedIds[0] };
			}
			return {
				type: 'array-contains-any',
				field: 'splitAgentIds',
				values: resolvedIds.slice(0, 30)
			};
		}

		default:
			return { type: 'array-contains', field: 'splitAgentIds', value: uid };
	}
}

/**
 * Applies a SalesScope to a Firestore collection reference.
 * Returns a Query or CollectionReference that can be chained with .get() or .orderBy().
 */
export function applySalesScope(
	ref: FirebaseFirestore.CollectionReference,
	scope: SalesScope
): FirebaseFirestore.Query | FirebaseFirestore.CollectionReference {
	if (scope.type === 'all') return ref;
	if (scope.type === 'array-contains') {
		return ref.where(scope.field, 'array-contains', scope.value);
	}
	// array-contains-any
	return ref.where(scope.field, 'array-contains-any', scope.values);
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
