import { firestore } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';
import type { RequestHandler } from './$types';

const BATCH_SIZE = 500;
const COLLECTIONS = ['roles', 'employees'] as const;
const ACCESS_TYPES = [
	'admin',
	'agent',
	'compliance',
	'finance',
	'super-admin',
	'manager',
	'senior-manager'
] as const;

type MigratedAccessType = (typeof ACCESS_TYPES)[number];

function isAccessType(value: unknown): value is MigratedAccessType {
	return typeof value === 'string' && ACCESS_TYPES.includes(value as MigratedAccessType);
}

function resolveAccessType(data: FirebaseFirestore.DocumentData): MigratedAccessType {
	const currentAccessType = isAccessType(data.accessType) ? data.accessType : undefined;
	const legacyAgentRole = typeof data.agentRole === 'string' ? data.agentRole.trim() : '';

	if (legacyAgentRole === 'reporting-manager') return 'manager';
	if (legacyAgentRole === 'senior-manager') return 'senior-manager';
	if (currentAccessType && currentAccessType !== 'agent') return currentAccessType;

	return currentAccessType ?? 'agent';
}

/**
 * POST /api/migrate-agent-role-access
 * One-time migration from legacy `agentRole` / `agentLevel` fields to `accessType`.
 * Safe to run multiple times.
 *
 * Protected: requires a valid session cookie with role === 'super-admin'.
 */
export const POST: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user || user.role !== 'super-admin') {
		return json({ success: false, error: 'Unauthorized - super-admin only' }, { status: 403 });
	}

	try {
		const totals = {
			total: 0,
			migrated: 0,
			skipped: 0,
			errors: 0,
			errorDetails: [] as string[]
		};
		const byCollection: Record<
			(typeof COLLECTIONS)[number],
			{ total: number; migrated: number; skipped: number; errors: number }
		> = {
			roles: { total: 0, migrated: 0, skipped: 0, errors: 0 },
			employees: { total: 0, migrated: 0, skipped: 0, errors: 0 }
		};

		for (const collectionName of COLLECTIONS) {
			const snap = await firestore.collection(collectionName).get();
			const docs = snap.docs;
			totals.total += docs.length;
			byCollection[collectionName].total = docs.length;

			for (let i = 0; i < docs.length; i += BATCH_SIZE) {
				const batch = firestore.batch();
				const chunk = docs.slice(i, i + BATCH_SIZE);
				let writes = 0;

				for (const doc of chunk) {
					try {
						const data = doc.data();
						const accessType = resolveAccessType(data);
						const hasLegacyAgentRole = Object.hasOwn(data, 'agentRole');
						const hasLegacyAgentLevel = Object.hasOwn(data, 'agentLevel');
						const needsAccessTypeUpdate = data.accessType !== accessType;

						if (!needsAccessTypeUpdate && !hasLegacyAgentRole && !hasLegacyAgentLevel) {
							totals.skipped++;
							byCollection[collectionName].skipped++;
							continue;
						}

						batch.update(doc.ref, {
							accessType,
							agentRole: FieldValue.delete(),
							agentLevel: FieldValue.delete(),
							updatedAt: FieldValue.serverTimestamp(),
							_migratedAgentRoleAccessAt: new Date().toISOString()
						});
						writes++;
						totals.migrated++;
						byCollection[collectionName].migrated++;
					} catch (docErr) {
						totals.errors++;
						byCollection[collectionName].errors++;
						totals.errorDetails.push(`${collectionName}/${doc.id}: ${String(docErr)}`);
					}
				}

				if (writes > 0) {
					await batch.commit();
				}
			}
		}

		return json({
			success: true,
			data: {
				...totals,
				errorDetails: totals.errorDetails.slice(0, 20),
				byCollection
			}
		});
	} catch (err) {
		console.error('Agent role access migration failed:', err);
		return json({ success: false, error: String(err) }, { status: 500 });
	}
};
