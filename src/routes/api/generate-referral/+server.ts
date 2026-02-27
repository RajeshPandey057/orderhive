import { createEnvelopeFromPDF } from '$lib/server/docusign';
import { FieldValue, firestore } from '$lib/server/firebase';
import {
	generateReferralAgreementPDF,
	type ReferralAgreementData
} from '$lib/server/template-renderer';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { referralData, saleId } = body as {
			referralData: ReferralAgreementData;
			saleId: string;
		};

		// Validate required fields
		if (!referralData.referrerName || !saleId) {
			throw error(400, 'Missing required information');
		}

		console.log('📄 Generating Referral Agreement PDF for:', referralData.referrerName);

		// Generate PDF from template with proper styling
		const pdfBuffer = await generateReferralAgreementPDF(referralData);

		console.log('✅ PDF generated:', `${Math.round(pdfBuffer.length / 1024)}KB`);

		// Create DocuSign envelope with PDF
		const envelope = await createEnvelopeFromPDF({
			pdfBuffer,
			documentName: `Referral Agreement - ${referralData.propertyName}`,
			recipientEmail: locals.user.email || '',
			recipientName: referralData.referrerName,
			emailSubject: 'Referral Agreement - Please Review and Sign',
			emailBlurb: `Dear ${referralData.referrerName}, please review and sign this referral agreement for ${referralData.propertyName}.`
		});

		// Update Firestore with envelope information
		const saleRef = firestore.collection('sales').doc(saleId);

		await saleRef.update({
			referralAgreementEnvelope: {
				envelopeId: envelope.envelopeId,
				status: envelope.status,
				sentAt: FieldValue.serverTimestamp(),
				recipientEmail: locals.user.email,
				recipientName: referralData.referrerName
			},
			updatedAt: FieldValue.serverTimestamp()
		});

		return json({
			success: true,
			envelopeId: envelope.envelopeId,
			status: envelope.status,
			message: 'Referral agreement sent successfully via DocuSign'
		});
	} catch (err) {
		console.error('Error generating referral agreement:', err);
		const message = err instanceof Error ? err.message : 'Failed to generate referral agreement';
		throw error(500, message);
	}
};
