import { firestore } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BATCH_SIZE = 500;

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

					// Skip if splits already migrated and up to date
					if (
						Array.isArray(data.splits) &&
						data.splits.length > 0 &&
						Array.isArray(data.splitAgentIds)
					) {
						skippedCount++;
						continue;
					}

					const dealOwners = data.dealOwners as
						| {
								userId: string;
								email: string;
								name?: string;
								photoURL?: string;
								ownerRole: 'caller' | 'closer';
								split: number;
						  }[]
						| undefined;

					if (!Array.isArray(dealOwners) || dealOwners.length === 0) {
						skippedCount++;
						continue;
					}

					const splits = dealOwners.map((owner, idx) => ({
						agentId: owner.userId ?? '',
						agentName: owner.name ?? owner.email ?? '',
						agentEmail: owner.email ?? '',
						agentPhotoURL: owner.photoURL ?? '',
						// Third+ agents get role 'extra'
						ownerRole: (idx >= 2 ? 'extra' : owner.ownerRole) as 'caller' | 'closer' | 'extra',
						percentage: owner.split ?? 0
					}));

					const splitAgentIds = splits.map((s) => s.agentId).filter(Boolean);

					batch.update(doc.ref, {
						splits,
						splitAgentIds,
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
