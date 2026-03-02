import { form } from '$app/server';
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
	// The form data will be available in the `data` parameter
	// For now, we'll just return success - actual PDF generation and DocuSign sending
	// will be handled after the form is submitted
	return {
		success: true,
		message: 'AML form submitted successfully',
		data
	};
});
