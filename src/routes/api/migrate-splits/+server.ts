import { firestore } from '$lib/server/firebase';
import { getSaleHierarchyEmails, normalizeHierarchyEmail } from '$lib/sale-hierarchy';
import { employeeIdForEmail } from '$lib/server/hr';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BATCH_SIZE = 500;

function sameNormalizedArray(left: unknown, right: string[]) {
	if (!Array.isArray(left)) return false;
	const normalizedLeft = left.map(normalizeHierarchyEmail).filter(Boolean).sort();
	const normalizedRight = [...right].sort();
	return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

type EmployeeHierarchy = { reportingManagerEmail: string; seniorManagerEmail: string };

async function loadEmployeeHierarchyMap(): Promise<Map<string, EmployeeHierarchy>> {
	const snap = await firestore.collection('employees').get();
	const map = new Map<string, EmployeeHierarchy>();
	for (const doc of snap.docs) {
		const data = doc.data() as Record<string, unknown>;
		const email = normalizeHierarchyEmail(data.email ?? doc.id);
		if (!email) continue;
		map.set(email, {
			reportingManagerEmail: normalizeHierarchyEmail(data.reportingManagerEmail),
			seniorManagerEmail: normalizeHierarchyEmail(data.seniorManagerEmail)
		});
	}
	return map;
}

/**
 * POST /api/migrate-splits
 * Two-phase migration on `sales` docs:
 *
 * Phase 1 (always): backfill splits[] + splitAgentIds[] from legacy dealOwners[].
 * Phase 2 (when ?v2=1): for splits that still lack managerEmail / seniorManagerEmail,
 *   look the agent up in the `employees` collection and fill them in, then recompute
 *   managerEmails[] / seniorManagerEmails[] on the sale doc.
 *
 * Safe to run multiple times (idempotent). Super-admin only.
 */
export const POST: RequestHandler = async ({ locals, url }) => {
	const user = locals.user;
	if (!user || user.role !== 'super-admin') {
		return json({ success: false, error: 'Unauthorized — super-admin only' }, { status: 403 });
	}

	const v2 = url.searchParams.get('v2') === '1';

	try {
		const [salesSnap, employeeMap] = await Promise.all([
			firestore.collection('sales').get(),
			v2 ? loadEmployeeHierarchyMap() : Promise.resolve(new Map<string, EmployeeHierarchy>())
		]);

		const docs = salesSnap.docs;

		let migratedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;
		const errors: string[] = [];

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
					let splits: Record<string, unknown>[] =
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

					// Phase 2: fill in missing hierarchy emails from employees lookup
					if (v2) {
						splits = splits.map((s) => {
							const hasMgr = typeof s.managerEmail === 'string' && s.managerEmail.trim();
							const hasSMgr =
								typeof s.seniorManagerEmail === 'string' && s.seniorManagerEmail.trim();
							if (hasMgr && hasSMgr) return s;

							const agentEmail = normalizeHierarchyEmail(s.agentEmail);
							if (!agentEmail) return s;

							const emp =
								employeeMap.get(agentEmail) ??
								employeeMap.get(normalizeHierarchyEmail(employeeIdForEmail(agentEmail)));
							if (!emp) return s;

							return {
								...s,
								managerEmail: hasMgr ? s.managerEmail : emp.reportingManagerEmail,
								seniorManagerEmail: hasSMgr ? s.seniorManagerEmail : emp.seniorManagerEmail
							};
						});
					}

					const splitAgentIds = splits
						.map((s) => (typeof s.agentId === 'string' ? s.agentId : ''))
						.filter(Boolean);
					const hierarchyEmails = getSaleHierarchyEmails(
						splits as { managerEmail?: string; seniorManagerEmail?: string }[]
					);
					const updatePayload: Record<string, unknown> = {};

					if (existingSplits.length === 0) updatePayload.splits = splits;
					else if (
						v2 &&
						splits.some((s, i) => {
							const orig = existingSplits[i] as Record<string, unknown>;
							return (
								s.managerEmail !== orig?.managerEmail ||
								s.seniorManagerEmail !== orig?.seniorManagerEmail
							);
						})
					) {
						updatePayload.splits = splits;
					}

					if (!sameNormalizedArray(data.splitAgentIds, splitAgentIds)) {
						updatePayload.splitAgentIds = splitAgentIds;
					}
					if (!sameNormalizedArray(data.managerEmails, hierarchyEmails.managerEmails)) {
						updatePayload.managerEmails = hierarchyEmails.managerEmails;
					}
					if (
						!sameNormalizedArray(data.seniorManagerEmails, hierarchyEmails.seniorManagerEmails)
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
				phase: v2 ? 'v2' : 'v1',
				total: docs.length,
				migrated: migratedCount,
				skipped: skippedCount,
				errors: errorCount,
				errorDetails: errors.slice(0, 20)
			}
		});
	} catch (err) {
		console.error('Migration failed:', err);
		return json({ success: false, error: String(err) }, { status: 500 });
	}
};
