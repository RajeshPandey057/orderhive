/**
 * POST /api/bulk-import/[jobId]/process
 *
 * Manual chunk-processing endpoint (kept for debugging/fallback).
 * The primary flow now uses POST /api/bulk-import/[jobId]/start which runs
 * the entire job as a server-side background task.
 */
import {
	makeEmailCache,
	parseAndGroupCSV,
	processGroupChunk
} from '$lib/server/bulk-import-helpers';
import { FieldValue, firestore } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || !['admin', 'super-admin'].includes(locals.user.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { jobId } = params;

	let offset = 0;
	let chunkSize = 20;
	try {
		const body = await request.json();
		offset = Number(body.offset ?? 0);
		chunkSize = Math.min(Number(body.chunkSize ?? 20), 50); // cap at 50
	} catch {
		return json(
			{ error: 'Invalid request body — expected JSON with offset and chunkSize' },
			{ status: 400 }
		);
	}

	// -----------------------------------------------------------------------
	// Load the job document
	// -----------------------------------------------------------------------
	const jobRef = firestore.collection('bulkImportJobs').doc(jobId);
	const jobSnap = await jobRef.get();

	if (!jobSnap.exists) {
		return json({ error: 'Job not found' }, { status: 404 });
	}

	const job = jobSnap.data()!;

	// Ownership check: the creator or any super-admin may process
	if (job.createdBy !== locals.user.uid && locals.user.role !== 'super-admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	if (job.status === 'completed') {
		return json({ error: 'Job already completed' }, { status: 409 });
	}

	// -----------------------------------------------------------------------
	// Re-parse CSV (fast, in-memory — PapaParse on the raw text stored in job)
	// -----------------------------------------------------------------------
	const { groups } = parseAndGroupCSV(job.csvText as string, job.lenient as boolean);

	const chunk = groups.slice(offset, offset + chunkSize);
	if (chunk.length === 0) {
		return json({
			imported: [],
			updated: [],
			errors: [],
			processedCount: job.processedCount ?? 0,
			isComplete: true
		});
	}

	// -----------------------------------------------------------------------
	// Parallel existence checks for the whole chunk
	// -----------------------------------------------------------------------
	const existingSnaps = await Promise.all(
		chunk.map((g) => firestore.collection('sales').doc(g.orderId).get())
	);

	// Shared email cache across all groups in this chunk
	const resolveUser = makeEmailCache();

	const existFlags = existingSnaps.map((s) => s.exists);
	const {
		imported: importedSales,
		updated: updatedSales,
		errors
	} = await processGroupChunk(chunk, existFlags, resolveUser, job.lenient as boolean);

	// -----------------------------------------------------------------------
	// Update job progress
	// -----------------------------------------------------------------------
	const newProcessedCount = Math.min(
		((job.processedCount as number) ?? 0) + chunk.length,
		job.totalGroups as number
	);
	const isComplete = newProcessedCount >= (job.totalGroups as number);

	// Build the update payload — only spread non-empty arrays into arrayUnion
	const progressUpdate: Record<string, unknown> = {
		status: isComplete ? 'completed' : 'processing',
		processedCount: newProcessedCount,
		updatedAt: FieldValue.serverTimestamp()
	};
	if (importedSales.length > 0) progressUpdate.imported = FieldValue.arrayUnion(...importedSales);
	if (updatedSales.length > 0) progressUpdate.updated = FieldValue.arrayUnion(...updatedSales);
	if (errors.length > 0) progressUpdate.errors = FieldValue.arrayUnion(...errors);

	await jobRef.update(progressUpdate);

	return json({
		imported: importedSales,
		updated: updatedSales,
		errors,
		processedCount: newProcessedCount,
		isComplete
	});
};
