import { firestore } from '$lib/server/firebase';
import { getSaleHierarchyEmails, normalizeHierarchyEmail } from '$lib/sale-hierarchy';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BATCH_SIZE = 500;

function sameNormalizedArray(left: unknown, right: string[]) {
	if (!Array.isArray(left)) return false;
	const normalizedLeft = left.map(normalizeHierarchyEmail).filter(Boolean).sort();
	const normalizedRight = [...right].sort();
	return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

/**
 * POST /api/migrate-splits
 * One-time migration: reads all `sales` docs and writes `splits[]` + `splitAgentIds[]`
 * from the legacy `dealOwners[]` field. Safe to run multiple times (idempotent).
 *
 * Protected: requires a valid session cookie with role === 'super-admin'.
 */
export const POST: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user || user.role !== 'super-admin') {
		return json({ success: false, error: 'Unauthorized — super-admin only' }, { status: 403 });
	}

	try {
		const salesSnap = await firestore.collection('sales').get();
		const docs = salesSnap.docs;

		let migratedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;
		const errors: string[] = [];

		// Process in batches of BATCH_SIZE
		for (let i = 0; i < docs.length; i += BATCH_SIZE) {
			const batch = firestore.batch();
			const chunk = docs.slice(i, i + BATCH_SIZE);

			for (const doc of chunk) {
				try {
					const data = doc.data() as Record<string, unknown>;

					const dealOwners = data.dealOwners as
						| {
								userId: string;
								email: string;
								name?: string;
								photoURL?: string;
								ownerRole: 'caller' | 'closer';
								split: number;
								managerEmail?: string;
								seniorManagerEmail?: string;
						  }[]
						| undefined;

					const existingSplits = Array.isArray(data.splits) ? data.splits : [];
					const splits =
						existingSplits.length > 0
							? existingSplits
							: Array.isArray(dealOwners) && dealOwners.length > 0
								? dealOwners.map((owner, idx) => {
										const ownerRole = idx >= 2 ? 'closer2' : owner.ownerRole;
										return {
											agentId: owner.userId ?? '',
											agentName: owner.name ?? owner.email ?? '',
											agentEmail: owner.email ?? '',
											agentPhotoURL: owner.photoURL ?? '',
											ownerRole,
											percentage: owner.split ?? 0,
											managerEmail:
												owner.managerEmail ??
												(ownerRole === 'caller'
													? data.callerManagerEmail
													: ownerRole === 'closer'
														? data.closerManagerEmail
														: ''),
											seniorManagerEmail:
												owner.seniorManagerEmail ??
												(ownerRole === 'caller'
													? data.callerSeniorManagerEmail
													: ownerRole === 'closer'
														? data.closerSeniorManagerEmail
														: '')
										};
									})
								: [];

					if (splits.length === 0) {
						skippedCount++;
						continue;
					}

					const splitAgentIds = splits
						.map((s) => (typeof s.agentId === 'string' ? s.agentId : ''))
						.filter(Boolean);
					const hierarchyEmails = getSaleHierarchyEmails(splits);
					const updatePayload: Record<string, unknown> = {};

					if (existingSplits.length === 0) updatePayload.splits = splits;
					if (!sameNormalizedArray(data.splitAgentIds, splitAgentIds)) {
						updatePayload.splitAgentIds = splitAgentIds;
					}
					if (!sameNormalizedArray(data.managerEmails, hierarchyEmails.managerEmails)) {
						updatePayload.managerEmails = hierarchyEmails.managerEmails;
					}
					if (
						!sameNormalizedArray(
							data.seniorManagerEmails,
							hierarchyEmails.seniorManagerEmails
						)
					) {
						updatePayload.seniorManagerEmails = hierarchyEmails.seniorManagerEmails;
					}

					if (Object.keys(updatePayload).length === 0) {
						skippedCount++;
						continue;
					}

					batch.update(doc.ref, {
						...updatePayload,
						_migratedAt: new Date().toISOString()
					});

					migratedCount++;
				} catch (docErr) {
					errorCount++;
					errors.push(`${doc.id}: ${String(docErr)}`);
				}
			}

			await batch.commit();
		}

		return json({
			success: true,
			data: {
				total: docs.length,
				migrated: migratedCount,
				skipped: skippedCount,
				errors: errorCount,
				errorDetails: errors.slice(0, 20) // cap error list
			}
		});
	} catch (err) {
		console.error('Migration failed:', err);
		return json({ success: false, error: String(err) }, { status: 500 });
	}
};
