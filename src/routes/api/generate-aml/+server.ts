import { createEnvelopeFromPDF } from '$lib/server/docusign';
import { FieldValue, firestore } from '$lib/server/firebase';
import { generateAMLFormPDF, type BuyerData } from '$lib/server/template-renderer';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { buyerData, saleId, buyerType } = body as {
			buyerData: BuyerData;
			saleId?: string;
			buyerType: 'primary' | string; // 'primary' or 'joint-{index}'
		};

		// Validate required fields
		if (!buyerData.firstName || !buyerData.lastName || !buyerData.email || !buyerData.phone) {
			throw error(400, 'Missing required buyer information');
		}

		console.log('📄 Generating AML form PDF for:', `${buyerData.firstName} ${buyerData.lastName}`);

		// Generate PDF from template with proper styling
		const pdfBuffer = await generateAMLFormPDF(buyerData);

		console.log('✅ PDF generated:', `${Math.round(pdfBuffer.length / 1024)}KB`);

		// Create DocuSign envelope with PDF
		const envelope = await createEnvelopeFromPDF({
			pdfBuffer,
			documentName: `AML Form - ${buyerData.firstName} ${buyerData.lastName}`,
			recipientEmail: buyerData.email,
			recipientName: `${buyerData.firstName} ${buyerData.lastName}`,
			emailSubject: 'AML/KYC Form - Please Review and Sign',
			emailBlurb: `Dear ${buyerData.firstName}, please review and sign this AML (Anti-Money Laundering) and KYC (Know Your Customer) form as part of your property purchase process.`
		});

		// Update Firestore with envelope information if saleId provided
		if (saleId) {
			const saleRef = firestore.collection('sales').doc(saleId);
			const updatePath =
				buyerType === 'primary'
					? 'clientDetails.amlFormEnvelope'
					: `jointBuyers.${buyerType.replace('joint-', '')}.amlFormEnvelope`;

			await saleRef.update({
				[updatePath]: {
					envelopeId: envelope.envelopeId,
					status: envelope.status,
					sentAt: FieldValue.serverTimestamp(),
					recipientEmail: buyerData.email,
					recipientName: `${buyerData.firstName} ${buyerData.lastName}`
				},
				updatedAt: FieldValue.serverTimestamp()
			});
		}

		return json({
			success: true,
			envelopeId: envelope.envelopeId,
			status: envelope.status,
			message: 'AML form sent successfully via DocuSign'
		});
	} catch (err) {
		console.error('Error generating AML form:', err);
		const message = err instanceof Error ? err.message : 'Failed to generate AML form';
		throw error(500, message);
	}
};
