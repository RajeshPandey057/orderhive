/**
 * GET  /api/bulk-import/[jobId]  — return current job status
 * DELETE /api/bulk-import/[jobId]  — cancel / clean up a job
 */
import { firestore } from '$lib/server/firebase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || !['admin', 'super-admin'].includes(locals.user.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const jobSnap = await firestore.collection('bulkImportJobs').doc(params.jobId).get();
	if (!jobSnap.exists) return json({ error: 'Job not found' }, { status: 404 });

	const job = jobSnap.data()!;
	if (job.createdBy !== locals.user.uid && locals.user.role !== 'super-admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	// Return status without the raw csvText to keep the response small
	const { csvText: _csv, ...safeJob } = job;
	return json({ id: params.jobId, ...safeJob });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
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

	await jobRef.delete();
	return json({ success: true });
};
