/**
 * POST /api/bulk-import
 *
 * Phase 1 of async bulk import: parse the CSV, run all structural/Zod
 * validation (no Firestore lookups), and persist the job in Firestore.
 * Returns immediately with the jobId and a count of valid groups so the
 * client can drive chunked processing via /api/bulk-import/[jobId]/process.
 */
import { parseAndGroupCSV } from '$lib/server/bulk-import-helpers';
import { FieldValue, firestore } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import { Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !['admin', 'super-admin'].includes(locals.user.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const formData = await request.formData();
	const csvFile = formData.get('csv');
	const lenient = formData.get('lenient') === 'true';

	if (!(csvFile instanceof File) || csvFile.size === 0) {
		return json({ error: 'No CSV file provided' }, { status: 400 });
	}

	const csvText = await csvFile.text();
	if (!csvText.trim()) {
		return json({ error: 'CSV file is empty' }, { status: 400 });
	}

	// Pure validation pass — zero Firestore I/O
	const { groups, errors: validationErrors } = parseAndGroupCSV(csvText, lenient);

	const jobId = randomUUID();
	const now = FieldValue.serverTimestamp();
	const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

	await firestore.collection('bulkImportJobs').doc(jobId).set({
		status: 'queued',
		createdBy: locals.user.uid,
		createdAt: now,
		updatedAt: now,
		expiresAt,
		lenient,
		csvText,
		totalGroups: groups.length,
		processedCount: 0,
		validationErrors,
		imported: [],
		updated: [],
		errors: []
	});

	return json({ jobId, totalGroups: groups.length, validationErrors });
};
