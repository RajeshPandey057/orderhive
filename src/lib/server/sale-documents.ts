import type { EnvelopeResult } from '$lib/server/docusign';

type DocusignDocumentOptions = {
	documentName: string;
	pdfBuffer: Buffer;
	envelope: EnvelopeResult;
	referenceNo: string;
	recipientEmail: string;
	recipientName: string;
};

export const createDocusignDocumentRecord = ({
	documentName,
	pdfBuffer,
	envelope,
	referenceNo,
	recipientEmail,
	recipientName
}: DocusignDocumentOptions) => {
	const name = documentName.endsWith('.pdf') ? documentName : `${documentName}.pdf`;
	const lastModified = Date.now();
	const downloadURL = `/api/get-docusign-document?envelopeId=${encodeURIComponent(envelope.envelopeId)}`;

	return {
		financeStatus: 'generated',
		complianceStatus: 'generated',
		source: 'docusign',
		referenceNo,
		generatedAt: new Date().toISOString(),
		path: `docusign/${envelope.envelopeId}`,
		downloadURL,
		token: '',
		contentType: 'application/pdf',
		size: pdfBuffer.length,
		name,
		lastModified,
		original: {
			name,
			size: pdfBuffer.length,
			type: 'application/pdf',
			lastModified
		},
		docusign: {
			envelopeId: envelope.envelopeId,
			status: envelope.status,
			statusDateTime: envelope.statusDateTime,
			uri: envelope.uri,
			recipientEmail,
			recipientName,
			documentId: '1'
		}
	};
};
