import { canAccessEducationModule } from '$lib/constants';
import { educationVideosCollection } from '$lib/server/education';
import { storage } from '$lib/server/firebase';
import { error, type RequestHandler } from '@sveltejs/kit';
import { Readable } from 'node:stream';

type ResolvedEducationPdf = {
	file: ReturnType<ReturnType<typeof storage.bucket>['file']>;
	id: string;
	filePath: string;
	headers: Headers;
};

type AssetRouteParams = {
	id?: string;
};

function isStorageNotFound(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false;
	const code = 'code' in err ? (err as { code?: unknown }).code : undefined;
	return code === 404 || code === '404';
}

async function resolveEducationPdf(
	params: AssetRouteParams,
	locals: App.Locals
): Promise<ResolvedEducationPdf> {
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

	const bucket = storage.bucket();
	const file = bucket.file(filePath);
	const fileName = typeof data.fileName === 'string' && data.fileName ? data.fileName : `${id}.pdf`;
	const encodedName = encodeURIComponent(fileName);

	try {
		const [metadata] = await file.getMetadata();
		const headers = new Headers({
			'Content-Type': 'application/pdf',
			'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
			'Cache-Control': 'private, no-store, max-age=0',
			'X-Content-Type-Options': 'nosniff'
		});

		if (metadata.size) {
			headers.set('Content-Length', String(metadata.size));
		}

		return { file, id, filePath, headers };
	} catch (err) {
		const stage = 'metadata';
		console.error('[education/assets] storage lookup failed', { id, filePath, stage, err });

		if (isStorageNotFound(err)) {
			throw error(404, 'PDF file not found');
		}

		throw error(500, 'Unable to access PDF file');
	}
}

export const HEAD: RequestHandler = async ({ params, locals }) => {
	const { headers } = await resolveEducationPdf(params, locals);
	return new Response(null, { headers });
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const { file, id, filePath, headers } = await resolveEducationPdf(params, locals);

	const readStream = file.createReadStream();
	readStream.on('error', (err) => {
		console.error('[education/assets] stream failed', { id, filePath, stage: 'stream', err });
	});

	return new Response(Readable.toWeb(readStream) as ReadableStream<Uint8Array>, { headers });
};
