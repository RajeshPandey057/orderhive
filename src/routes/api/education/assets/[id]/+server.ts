import { canAccessEducationModule } from '$lib/constants';
import { educationVideosCollection } from '$lib/server/education';
import { storage } from '$lib/server/firebase';
import { error, type RequestHandler } from '@sveltejs/kit';

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

	const filePath = typeof data.filePath === 'string' ? data.filePath : '';
	if (!filePath) {
		throw error(404, 'PDF file is missing');
	}

	const file = storage.bucket().file(filePath);
	const [exists] = await file.exists();
	if (!exists) {
		throw error(404, 'PDF file not found');
	}

	const [buffer] = await file.download();
	const rawName = typeof data.fileName === 'string' && data.fileName ? data.fileName : `${id}.pdf`;
	// RFC 5987 encoding for non-ASCII / special character safe Content-Disposition
	const encodedName = encodeURIComponent(rawName);

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
			'Cache-Control': 'private, no-store, max-age=0'
		}
	});
};
