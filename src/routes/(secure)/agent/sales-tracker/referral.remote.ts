import { form } from '$app/server';
import { createEnvelopeFromPDF } from '$lib/server/docusign';
import { firestore } from '$lib/server/firebase';
import { createDocusignDocumentRecord } from '$lib/server/sale-documents';
import { generateReferralAgreementPDF } from '$lib/server/template-renderer';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const referralAgreementSchema = z.object({
	saleId: z.string().min(1, 'Sale ID is required'),

	// Agreement Header
	srNo: z.string().min(1, 'Serial number is required'),
	agencyName: z.string().min(1, 'Real estate agency name is required'),
	tradeLicense: z.string().min(1, 'Trade license number is required'),

	// Referrer Information
	referrerName: z.string().min(1, 'Referrer name is required'),
	referrerEmail: z.email('Valid email is required'),
	eidNo: z.string().min(1, 'EID number is required'),
	referrerNationality: z.string().min(1, 'Nationality is required'),
	agreementDate: z.string().min(1, 'Agreement date is required'),

	// Referral Details
	referralFeePct: z.string().min(1, 'Referral fee percentage is required'),
	propertyName: z.string().min(1, 'Property name is required'),

	// First Party (IND Global)
	firstPartyName: z.string().min(1, 'First party name is required'),
	firstPartyDate: z.string().min(1, 'First party date is required'),

	// Second Party (Referrer)
	secondPartyName: z.string().min(1, 'Second party name is required'),
	secondPartyDate: z.string().min(1, 'Second party date is required')
});

export const submitReferralAgreement = form(referralAgreementSchema, async (data) => {
	const saleRef = firestore.collection('sales').doc(data.saleId);
	const saleSnap = await saleRef.get();

	if (!saleSnap.exists) {
		return {
			success: false,
			message: 'Sale not found. Save the sale before generating the referral agreement.'
		};
	}

	const sale = saleSnap.data() as Record<string, unknown>;

	if (sale.refferalAgreementFile) {
		return {
			success: false,
			message: 'Referral agreement already exists for this sale.'
		};
	}

	const pdfBuffer = await generateReferralAgreementPDF({
		srNo: data.srNo,
		referrerName: data.referrerName,
		referrerNationality: data.referrerNationality,
		referrerEidNo: data.eidNo,
		agreementDate: data.agreementDate,
		propertyName: data.propertyName,
		referralFeePercentage: data.referralFeePct,
		firstPartyDate: data.firstPartyDate,
		secondPartyDate: data.secondPartyDate
	});

	const envelope = await createEnvelopeFromPDF({
		pdfBuffer,
		documentName: `Referral Agreement - ${data.propertyName}`,
		recipientEmail: data.referrerEmail,
		recipientName: data.referrerName,
		emailSubject: 'Referral Agreement - Please Review and Sign',
		emailBlurb: `Dear ${data.referrerName}, please review and sign this referral agreement for ${data.propertyName}.`
	});

	const document = createDocusignDocumentRecord({
		documentName: `Referral Agreement - ${data.propertyName}`,
		pdfBuffer,
		envelope,
		referenceNo: data.srNo,
		recipientEmail: data.referrerEmail,
		recipientName: data.referrerName
	});

	await saleRef.update({
		refferalAgreementFile: document,
		updatedAt: FieldValue.serverTimestamp()
	});

	return {
		success: true,
		envelopeId: envelope.envelopeId,
		status: envelope.status,
		document,
		message: 'Referral agreement sent successfully via DocuSign'
	};
});
