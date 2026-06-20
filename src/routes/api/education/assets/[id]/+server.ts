import { canAccessEducationModule } from '$lib/constants';
import { educationVideosCollection } from '$lib/server/education';
import { storage } from '$lib/server/firebase';
import { error, type RequestHandler } from '@sveltejs/kit';

function buildStorageMediaUrl(bucketName: string, filePath: string, token: string): string {
	return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!canAccessEducationModule(locals.user.role)) {
		throw error(403, 'Forbidden');
	}

	const id = params.id?.trim();
	if (!id) {
		throw error(400, 'Asset id is required');
	}

	const doc = await educationVideosCollection.doc(id).get();
	if (!doc.exists) {
		throw error(404, 'Education asset not found');
	}

	const data = doc.data() as Record<string, unknown>;
	if (data.itemType !== 'pdf') {
		throw error(400, 'Asset is not a PDF');
	}

	const downloadURL = typeof data.downloadURL === 'string' ? data.downloadURL.trim() : '';
	if (downloadURL) {
		return Response.redirect(downloadURL, 302);
	}

	const filePath = typeof data.filePath === 'string' ? data.filePath : '';
	if (!filePath) {
		throw error(404, 'PDF file is missing');
	}

	const bucket = storage.bucket();
	const file = bucket.file(filePath);
	const [exists] = await file.exists();
	if (!exists) {
		throw error(404, 'PDF file not found');
	}

	const explicitToken = typeof data.token === 'string' ? data.token.trim() : '';
	if (explicitToken) {
		return Response.redirect(buildStorageMediaUrl(bucket.name, filePath, explicitToken), 302);
	}

	// Try to get the download token from GCS custom metadata (set by current uploadFileWithLink)
	try {
		const [metadata] = await file.getMetadata();
		const metadataToken = `${metadata.metadata?.firebaseStorageDownloadTokens ?? ''}`
			.split(',')
			.map((t) => t.trim())
			.find(Boolean);

		if (metadataToken) {
			return Response.redirect(buildStorageMediaUrl(bucket.name, filePath, metadataToken), 302);
		}
	} catch (metaErr) {
		console.error('[education/assets] getMetadata failed for id:', id, metaErr);
	}

	// Fallback: stream the file directly via Firebase Admin SDK (no signed-URL IAM permission needed)
	const rawName = typeof data.fileName === 'string' && data.fileName ? data.fileName : `${id}.pdf`;
	const encodedName = encodeURIComponent(rawName);

	const readStream = file.createReadStream();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			readStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
			readStream.on('end', () => controller.close());
			readStream.on('error', (err) => {
				console.error('[education/assets] stream error for id:', id, err);
				controller.error(err);
			});
		},
		cancel() {
			(readStream as import('stream').Readable).destroy();
		}
	});

	return new Response(body, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
			'Cache-Control': 'private, no-store, max-age=0'
		}
	});
};
