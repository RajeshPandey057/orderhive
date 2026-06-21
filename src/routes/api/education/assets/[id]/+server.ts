import { canAccessEducationModule } from '$lib/constants';
import { educationVideosCollection } from '$lib/server/education';
import { storage } from '$lib/server/firebase';
import { error, type RequestHandler } from '@sveltejs/kit';

type ResolvedEducationPdf = {
	file: ReturnType<ReturnType<typeof storage.bucket>['file']>;
	id: string;
	filePath: string;
	bucketName: string;
	fallbackUrl: string;
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

function buildStorageMediaUrl(bucketName: string, filePath: string, token: string): string {
	return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${encodeURIComponent(token)}`;
}

async function fetchFallbackPdf({
	url,
	id,
	filePath,
	headers,
	stage
}: {
	url: string;
	id: string;
	filePath: string;
	headers: Headers;
	stage: string;
}): Promise<Response> {
	const response = await fetch(url);
	if (!response.ok) {
		console.error('[education/assets] fallback URL failed', {
			id,
			filePath,
			stage,
			status: response.status
		});
		throw error(500, 'Unable to download PDF file');
	}

	const buffer = await response.arrayBuffer();
	headers.set('Content-Length', String(buffer.byteLength));

	return new Response(buffer, { headers });
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
	const downloadURL = typeof data.downloadURL === 'string' ? data.downloadURL.trim() : '';
	const token = typeof data.token === 'string' ? data.token.trim() : '';
	const fallbackUrl = downloadURL || (token ? buildStorageMediaUrl(bucket.name, filePath, token) : '');
	const headers = new Headers({
		'Content-Type': 'application/pdf',
		'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
		'Cache-Control': 'private, no-store, max-age=0',
		'X-Content-Type-Options': 'nosniff'
	});

	return { file, id, filePath, bucketName: bucket.name, fallbackUrl, headers };
}

export const HEAD: RequestHandler = async ({ params, locals }) => {
	const { headers } = await resolveEducationPdf(params, locals);
	return new Response(null, { headers });
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const { file, id, filePath, bucketName, fallbackUrl, headers } = await resolveEducationPdf(
		params,
		locals
	);

	if (fallbackUrl) {
		try {
			return await fetchFallbackPdf({
				url: fallbackUrl,
				id,
				filePath,
				headers,
				stage: 'document-fallback'
			});
		} catch (fallbackErr) {
			console.error('[education/assets] document fallback download failed', {
				id,
				filePath,
				stage: 'document-fallback',
				err: fallbackErr
			});
		}
	}

	try {
		const [buffer] = await file.download();
		headers.set('Content-Length', String(buffer.byteLength));

		return new Response(new Uint8Array(buffer), { headers });
	} catch (err) {
		const stage = 'download';
		console.error('[education/assets] storage download failed', { id, filePath, stage, err });

		if (isStorageNotFound(err) && !fallbackUrl) {
			throw error(404, 'PDF file not found');
		}

		let nextFallbackUrl = fallbackUrl;
		if (!nextFallbackUrl) {
			try {
				const [metadata] = await file.getMetadata();
				const metadataToken = `${metadata.metadata?.firebaseStorageDownloadTokens ?? ''}`
					.split(',')
					.map((value) => value.trim())
					.find(Boolean);

				if (metadataToken) {
					nextFallbackUrl = buildStorageMediaUrl(bucketName, filePath, metadataToken);
				}
			} catch (metadataErr) {
				console.error('[education/assets] fallback metadata lookup failed', {
					id,
					filePath,
					stage: 'fallback-metadata',
					err: metadataErr
				});
			}
		}

		if (!nextFallbackUrl) {
			throw error(500, 'Unable to download PDF file');
		}

		try {
			return await fetchFallbackPdf({
				url: nextFallbackUrl,
				id,
				filePath,
				headers,
				stage: 'fallback'
			});
		} catch (fallbackErr) {
			console.error('[education/assets] fallback download failed', {
				id,
				filePath,
				stage: 'fallback',
				err: fallbackErr
			});

			throw error(500, 'Unable to download PDF file');
		}
	}
};
