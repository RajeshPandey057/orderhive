import { form } from '$app/server';
import { createEnvelopeFromPDF } from '$lib/server/docusign';
import { generateAMLFormPDF } from '$lib/server/template-renderer';
import { z } from 'zod';

const amlFormSchema = z.object({
	// Date and Reference
	date: z.string().min(1, 'Date is required'),
	referenceNo: z.string().min(1, 'Reference number is required'),

	// Personal Identity Information
	fullName: z.string().min(1, 'Full name is required'),
	passportIdNo: z.string().min(1, 'Passport/ID number is required'),
	nationality: z.string().min(1, 'Nationality is required'),
	dateOfBirth: z.string().min(1, 'Date of birth is required'),
	maritalStatus: z.string().min(1, 'Marital status is required'),
	gender: z.string().min(1, 'Gender is required'),

	// Address and Contact Details
	residentAddress: z.string().min(1, 'Resident address is required'),
	permanentAddress: z.string().min(1, 'Permanent address is required'),
	contactNo: z.string().min(1, 'Contact number is required'),
	emailAddress: z.string().email('Valid email is required'),

	// Business and Occupational Details
	occupation: z.string().min(1, 'Occupation is required'),
	companyName: z.string().min(1, 'Company name is required'),
	businessAddress: z.string().min(1, 'Business address is required'),
	natureOfBusiness: z.string().min(1, 'Nature of business is required'),
	giveDetails: z.string().optional(),

	// Financial Details
	annualGrossIncome: z.string().min(1, 'Annual gross income is required'),
	purposeOfTransaction: z.string().min(1, 'Purpose of transaction is required'),
	financialCustomerName: z.string().min(1, 'Customer name is required'),
	sourceOfFunds: z.string().min(1, 'Source of funds is required'),

	// Additional Questions
	firstPropertyTransaction: z.enum(['Yes', 'No'], {
		message: 'Please select Yes or No'
	}),
	previousTransactionsDetails: z.string().optional(),
	transactionFor: z.string().min(1, 'Please specify who the transaction is for'),
	thirdPartyDetails: z.string().optional(),
	pepRelated: z.enum(['Yes', 'No'], {
		message: 'Please select Yes or No'
	}),

	// Declaration
	customerName: z.string().min(1, 'Customer name is required'),
	customerSignature: z.string().min(1, 'Customer signature is required'),
	salesAgentName: z.string().min(1, 'Sales agent name is required'),
	salesAgentSignature: z.string().min(1, 'Sales agent signature is required')
});

export const submitAMLForm = form(amlFormSchema, async (data) => {
	const nameParts = data.fullName.trim().split(/\s+/).filter(Boolean);
	const firstName = nameParts[0];
	const lastName = nameParts.slice(1).join(' ') || '-';

	console.log('📄 Generating AML form PDF for:', data.fullName);

	const pdfBuffer = await generateAMLFormPDF({
		firstName,
		lastName,
		email: data.emailAddress,
		phone: data.contactNo,
		passportNumber: data.passportIdNo,
		nationality: data.nationality,
		dateOfBirth: data.dateOfBirth,
		maritalStatus: data.maritalStatus,
		gender: data.gender,
		residentAddress: data.residentAddress,
		permanentAddress: data.permanentAddress,
		occupation: data.occupation,
		companyName: data.companyName,
		businessAddress: data.businessAddress,
		natureOfBusiness: data.natureOfBusiness,
		giveDetails: data.giveDetails,
		annualGrossIncome: data.annualGrossIncome,
		purposeOfTransaction: data.purposeOfTransaction,
		financialCustomerName: data.financialCustomerName,
		sourceOfFunds: data.sourceOfFunds,
		date: data.date,
		referenceNo: data.referenceNo,
		firstPropertyTransaction: data.firstPropertyTransaction,
		previousTransactionsDetails: data.previousTransactionsDetails,
		transactionFor: data.transactionFor,
		thirdPartyDetails: data.thirdPartyDetails,
		pepRelated: data.pepRelated,
		customerName: data.customerName,
		customerSignature: data.customerSignature,
		salesAgentName: data.salesAgentName,
		salesAgentSignature: data.salesAgentSignature
	});

	console.log('✅ PDF generated:', `${Math.round(pdfBuffer.length / 1024)}KB`);

	const envelope = await createEnvelopeFromPDF({
		pdfBuffer,
		documentName: `AML Form - ${data.fullName}`,
		recipientEmail: data.emailAddress,
		recipientName: data.fullName,
		emailSubject: 'AML/KYC Form - Please Review and Sign',
		emailBlurb: `Dear ${firstName}, please review and sign this AML (Anti-Money Laundering) and KYC (Know Your Customer) form as part of your property purchase process.`
	});

	return {
		success: true,
		envelopeId: envelope.envelopeId,
		status: envelope.status,
		message: 'AML form sent successfully via DocuSign'
	};
});
