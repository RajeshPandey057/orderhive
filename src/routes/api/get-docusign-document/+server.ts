import { getEnvelopeDocument } from '$lib/server/docusign';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const envelopeId = url.searchParams.get('envelopeId');
		const documentId = url.searchParams.get('documentId') || '1';

		if (!envelopeId) {
			throw error(400, 'Envelope ID is required');
		}

		// Retrieve document PDF from DocuSign
		const documentBuffer = await getEnvelopeDocument(envelopeId, documentId);

		// Return PDF content with proper content type
		return new Response(new Uint8Array(documentBuffer), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="document-${envelopeId}.pdf"`
			}
		});
	} catch (err) {
		console.error('Error retrieving DocuSign document:', err);
		const message = err instanceof Error ? err.message : 'Failed to retrieve document';
		throw error(500, message);
	}
};
