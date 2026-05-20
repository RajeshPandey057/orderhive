/**
 * POST /api/bulk-import/[jobId]/start
 *
 * Kicks off server-side background processing for a queued job.
 * Returns 202 immediately — processing continues on the server even if the
 * client navigates away. Poll GET /api/bulk-import/[jobId] for progress.
 *
 * Works because this app runs as a persistent Node.js process (Docker) rather
 * than a serverless/edge function, so fire-and-forget tasks keep running after
 * the HTTP response is sent.
 */
import { processJobBackground } from '$lib/server/bulk-import-helpers';
import { firestore } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || !['admin', 'super-admin'].includes(locals.user.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const jobRef = firestore.collection('bulkImportJobs').doc(params.jobId);
	const jobSnap = await jobRef.get();

	if (!jobSnap.exists) return json({ error: 'Job not found' }, { status: 404 });

	const job = jobSnap.data()!;
	if (job.createdBy !== locals.user.uid && locals.user.role !== 'super-admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	if (job.status === 'completed') {
		return json({ error: 'Job already completed' }, { status: 409 });
	}
	// 'processing' is allowed — restarting a stuck job resumes from processedCount

	// Fire and forget — intentionally not awaited.
	// The Node.js event loop keeps this promise running after the response.
	processJobBackground(params.jobId).catch((err) => {
		console.error(`[bulk-import] Unhandled error in background job ${params.jobId}:`, err);
	});

	return json({ started: true }, { status: 202 });
};
