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

	const [metadata] = await file.getMetadata();
	const metadataToken = `${metadata.metadata?.firebaseStorageDownloadTokens ?? ''}`
		.split(',')
		.map((token) => token.trim())
		.find(Boolean);

	if (metadataToken) {
		return Response.redirect(buildStorageMediaUrl(bucket.name, filePath, metadataToken), 302);
	}

	const [signedUrl] = await file.getSignedUrl({
		action: 'read',
		expires: Date.now() + 60 * 60 * 1000,
		version: 'v4'
	});

	return Response.redirect(signedUrl, 302);
};
