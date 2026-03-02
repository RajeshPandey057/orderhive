import { form } from '$app/server';
import { z } from 'zod';

const referralAgreementSchema = z.object({
	// Agreement Header
	srNo: z.string().min(1, 'Serial number is required'),
	agencyName: z.string().min(1, 'Real estate agency name is required'),
	tradeLicense: z.string().min(1, 'Trade license number is required'),

	// Referrer Information
	referrerName: z.string().min(1, 'Referrer name is required'),
	eidNo: z.string().min(1, 'EID number is required'),
	referrerNationality: z.string().min(1, 'Nationality is required'),
	agreementDate: z.string().min(1, 'Agreement date is required'),

	// Referral Details
	referralFeePct: z.string().min(1, 'Referral fee percentage is required'),
	propertyName: z.string().min(1, 'Property name is required'),

	// First Party (IND Global)
	firstPartyName: z.string().min(1, 'First party name is required'),
	firstPartySignature: z.string().min(1, 'First party signature is required'),
	firstPartyDate: z.string().min(1, 'First party date is required'),

	// Second Party (Referrer)
	secondPartyName: z.string().min(1, 'Second party name is required'),
	secondPartySignature: z.string().min(1, 'Second party signature is required'),
	secondPartyDate: z.string().min(1, 'Second party date is required')
});

export const submitReferralAgreement = form(referralAgreementSchema, async (data) => {
	// The form data will be available in the `data` parameter
	// For now, we'll just return success - actual PDF generation and DocuSign sending
	// will be handled after the form is submitted
	return {
		success: true,
		message: 'Referral agreement submitted successfully',
		data
	};
});
