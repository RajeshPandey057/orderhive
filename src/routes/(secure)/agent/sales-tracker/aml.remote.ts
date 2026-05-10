import { form } from '$app/server';
import { createEnvelopeFromPDF } from '$lib/server/docusign';
import { firestore } from '$lib/server/firebase';
import { createDocusignDocumentRecord } from '$lib/server/sale-documents';
import { generateAMLFormPDF } from '$lib/server/template-renderer';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const jointBuyerIndexSchema = z
	.union([z.number().int().min(0), z.string().regex(/^\d+$/).transform(Number)])
	.optional();

const amlFormSchema = z.object({
	saleId: z.string().min(1, 'Sale ID is required'),
	buyerType: z.enum(['primary', 'joint']).default('primary'),
	jointBuyerIndex: jointBuyerIndexSchema,

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
	emailAddress: z.email('Valid email is required'),

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
	salesAgentName: z.string().min(1, 'Sales agent name is required')
});

export const submitAMLForm = form(amlFormSchema, async (data) => {
	const saleRef = firestore.collection('sales').doc(data.saleId);
	const saleSnap = await saleRef.get();

	if (!saleSnap.exists) {
		return {
			success: false,
			message: 'Sale not found. Save the sale before generating AML.'
		};
	}

	const sale = saleSnap.data() as Record<string, unknown>;
	const clientDetails = (sale.clientDetails as Record<string, unknown> | undefined) ?? {};
	const jointBuyers = (sale.jointBuyers as Array<Record<string, unknown>> | undefined) ?? [];

	if (data.buyerType === 'primary' && clientDetails.amlFormFile) {
		return {
			success: false,
			message: 'AML form already exists for the primary buyer.'
		};
	}

	if (data.buyerType === 'joint') {
		if (data.jointBuyerIndex === undefined || !jointBuyers[data.jointBuyerIndex]) {
			return {
				success: false,
				message: 'Joint buyer not found for this sale.'
			};
		}

		if (jointBuyers[data.jointBuyerIndex].amlFormFile) {
			return {
				success: false,
				message: 'AML form already exists for this joint buyer.'
			};
		}
	}

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
		salesAgentName: data.salesAgentName
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

	const document = createDocusignDocumentRecord({
		documentName: `AML Form - ${data.fullName}`,
		pdfBuffer,
		envelope,
		referenceNo: data.referenceNo,
		recipientEmail: data.emailAddress,
		recipientName: data.fullName
	});

	if (data.buyerType === 'joint') {
		const updatedJointBuyers = [...jointBuyers];
		updatedJointBuyers[data.jointBuyerIndex!] = {
			...updatedJointBuyers[data.jointBuyerIndex!],
			amlFormFile: document
		};

		await saleRef.update({
			jointBuyers: updatedJointBuyers,
			updatedAt: FieldValue.serverTimestamp()
		});
	} else {
		await saleRef.update({
			'clientDetails.amlFormFile': document,
			updatedAt: FieldValue.serverTimestamp()
		});
	}

	return {
		success: true,
		envelopeId: envelope.envelopeId,
		status: envelope.status,
		document,
		message: 'AML form sent successfully via DocuSign'
	};
});
