import { canManageEducationVideos } from '$lib/constants';
import {
	MAX_EDUCATION_PDF_SIZE,
	buildEducationSearchIndex,
	isSupportedEducationPdf,
	normalizeEducationTags
} from '$lib/education';
import { educationVideosCollection } from '$lib/server/education';
import { storage, uploadFileWithLink } from '$lib/server/firebase';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { FieldValue } from 'firebase-admin/firestore';

function requireManager(locals: App.Locals) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!canManageEducationVideos(locals.user.role)) {
		throw error(403, 'You do not have permission to manage education PDFs');
	}

	return locals.user;
}

function parseTags(formData: FormData): string[] {
	return formData
		.getAll('tags')
		.map((value) => (typeof value === 'string' ? value : ''))
		.filter(Boolean);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireManager(locals);
	const formData = await request.formData();
	const title = `${formData.get('title') ?? ''}`.trim();
	const subject = `${formData.get('subject') ?? ''}`.trim();
	const tags = normalizeEducationTags(parseTags(formData));
	const pdfFile = formData.get('pdfFile');

	if (!title) {
		throw error(400, 'Title is required');
	}

	if (!(pdfFile instanceof File) || pdfFile.size <= 0) {
		throw error(400, 'PDF file is required');
	}

	if (!isSupportedEducationPdf(pdfFile)) {
		throw error(400, 'Please upload a valid PDF file');
	}

	if (pdfFile.size > MAX_EDUCATION_PDF_SIZE) {
		throw error(400, 'PDF file must be 50 MB or smaller');
	}

	const uploaded = await uploadFileWithLink(pdfFile, `education/${user.uid}/pdfs`);
	if (!uploaded) {
		throw error(400, 'Unable to upload PDF');
	}

	const { searchText, searchTokens } = buildEducationSearchIndex({
		title,
		subject,
		tags
	});

	const docRef = educationVideosCollection.doc();
	await docRef.set({
		itemType: 'pdf',
		title,
		subject,
		tags,
		sourceType: 'upload',
		sourceUrl: '',
		embedUrl: '',
		driveFileId: '',
		filePath: uploaded.path,
		downloadURL: uploaded.downloadURL,
		token: uploaded.token,
		fileName: pdfFile.name,
		fileSize: pdfFile.size,
		contentType: pdfFile.type || 'application/pdf',
		lastModified: pdfFile.lastModified,
		searchText,
		searchTokens,
		status: 'ready',
		createdAt: FieldValue.serverTimestamp(),
		updatedAt: FieldValue.serverTimestamp(),
		createdByUid: user.uid,
		createdByEmail: user.email
	});

	return json({ success: true, id: docRef.id });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const user = requireManager(locals);
	const formData = await request.formData();
	const id = `${formData.get('id') ?? ''}`.trim();
	const title = `${formData.get('title') ?? ''}`.trim();
	const subject = `${formData.get('subject') ?? ''}`.trim();
	const tags = normalizeEducationTags(parseTags(formData));
	const pdfFile = formData.get('pdfFile');

	if (!id) {
		throw error(400, 'PDF id is required');
	}

	if (!title) {
		throw error(400, 'Title is required');
	}

	const docRef = educationVideosCollection.doc(id);
	const existing = await docRef.get();

	if (!existing.exists) {
		throw error(404, 'Education PDF not found');
	}

	const existingData = existing.data() as Record<string, unknown>;
	if (existingData.itemType !== 'pdf') {
		throw error(400, 'The selected item is not a PDF');
	}

	let nextFileData: Record<string, unknown> = {};
	if (pdfFile instanceof File && pdfFile.size > 0) {
		if (!isSupportedEducationPdf(pdfFile)) {
			throw error(400, 'Please upload a valid PDF file');
		}

		if (pdfFile.size > MAX_EDUCATION_PDF_SIZE) {
			throw error(400, 'PDF file must be 50 MB or smaller');
		}

		const uploaded = await uploadFileWithLink(pdfFile, `education/${user.uid}/pdfs`);
		if (!uploaded) {
			throw error(400, 'Unable to upload PDF');
		}

		// Delete the old file from storage to avoid orphan accumulation
		const oldPath = typeof existingData.filePath === 'string' ? existingData.filePath : '';
		if (oldPath) {
			try {
				await storage.bucket().file(oldPath).delete();
			} catch {
				// Non-fatal: old file may already be missing; proceed with the update
			}
		}

		nextFileData = {
			filePath: uploaded.path,
			downloadURL: uploaded.downloadURL,
			token: uploaded.token,
			fileName: pdfFile.name,
			fileSize: pdfFile.size,
			contentType: pdfFile.type || 'application/pdf',
			lastModified: pdfFile.lastModified
		};
	}

	const { searchText, searchTokens } = buildEducationSearchIndex({
		title,
		subject,
		tags
	});

	await docRef.set(
		{
			title,
			subject,
			tags,
			searchText,
			searchTokens,
			status: 'ready',
			updatedAt: FieldValue.serverTimestamp(),
			updatedByUid: user.uid,
			updatedByEmail: user.email,
			...nextFileData
		},
		{ merge: true }
	);

	return json({ success: true, id });
};
