import { form } from '$app/server';
import { createEnvelopeFromPDF } from '$lib/server/docusign';
import { generateReferralAgreementPDF } from '$lib/server/template-renderer';
import { z } from 'zod';

const referralAgreementSchema = z.object({
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

	return {
		success: true,
		envelopeId: envelope.envelopeId,
		status: envelope.status,
		message: 'Referral agreement sent successfully via DocuSign'
	};
});
