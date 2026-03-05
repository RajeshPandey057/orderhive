import { readFile } from 'fs/promises';
import { join } from 'path';
import { generatePDFFromHTML } from './pdf-generator';

export interface BuyerData {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	passportNumber?: string;
	nationality?: string;
	dateOfBirth?: string;
	maritalStatus?: string;
	gender?: string;
	residentAddress?: string;
	permanentAddress?: string;
	occupation?: string;
	companyName?: string;
	businessAddress?: string;
	natureOfBusiness?: string;
	giveDetails?: string;
	annualGrossIncome?: string;
	purposeOfTransaction?: string;
	financialCustomerName?: string;
	sourceOfFunds?: string;
	// AML-specific fields
	date?: string;
	referenceNo?: string;
	firstPropertyTransaction?: string;
	previousTransactionsDetails?: string;
	transactionFor?: string;
	thirdPartyDetails?: string;
	pepRelated?: string;
	customerName?: string;
	customerSignature?: string;
	salesAgentName?: string;
	salesAgentSignature?: string;
}

export interface ReferralAgreementData {
	srNo: string;
	referrerName: string;
	referrerNationality: string;
	referrerEidNo: string;
	agreementDate: string;
	propertyName: string;
	referralFeePercentage: string;
	firstPartyDate: string;
	secondPartyDate: string;
}

/**
 * Read HTML template file from the workspace root
 */
async function readTemplate(filename: string): Promise<string> {
	const templatePath = join(process.cwd(), filename);
	return await readFile(templatePath, 'utf-8');
}

/**
 * Set the checked attribute on a radio button matching the given value
 */
function setRadioChecked(html: string, name: string, value: string): string {
	// Remove any existing checked attributes for this radio group
	const removeChecked = new RegExp(
		`(<input[^>]*type="radio"[^>]*name="${name}"[^>]*?) checked([^>]*>)`,
		'gi'
	);
	html = html.replace(removeChecked, '$1$2');
	// Add checked to the matching value radio
	const addChecked = new RegExp(
		`(<input[^>]*type="radio"[^>]*name="${name}"[^>]*?value="${value}"[^>]*?)(/?>)`,
		'gi'
	);
	return html.replace(addChecked, '$1 checked$2');
}

/**
 * Replace input field values in HTML
 */
function setInputValue(html: string, name: string, value: string): string {
	// Match input elements with the specific name attribute
	// Replace any existing value or add value attribute
	const regex = new RegExp(`(<input[^>]*name="${name}"[^>]*)(value="[^"]*")([^>]*>)`, 'gi');

	// If value attribute exists, replace it
	if (regex.test(html)) {
		return html.replace(regex, `$1value="${value}"$3`);
	}

	// If value attribute doesn't exist, add it before the closing >
	const addValueRegex = new RegExp(`(<input[^>]*name="${name}"[^>]*)(/?>)`, 'gi');
	return html.replace(addValueRegex, `$1 value="${value}"$2`);
}

/**
 * Generate today's date in a readable format
 */
function formatDate(date: Date = new Date()): string {
	const day = date.getDate();
	const month = date.toLocaleString('en-US', { month: 'short' });
	const year = date.getFullYear();

	// Add ordinal suffix
	const suffix =
		day === 1 || day === 21 || day === 31
			? 'st'
			: day === 2 || day === 22
				? 'nd'
				: day === 3 || day === 23
					? 'rd'
					: 'th';

	return `${day}${suffix} ${month} ${year}`;
}

/**
 * Generate a reference number for AML form
 */
function generateReferenceNumber(): string {
	const date = new Date();
	const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
	const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
	return `AML-${dateStr}-${randomStr}`;
}

/**
 * Fill AML form template with buyer data
 */
export async function fillAMLTemplate(buyerData: BuyerData): Promise<string> {
	let html = await readTemplate('aml-form-docusign.html');

	const fullName = `${buyerData.firstName} ${buyerData.lastName}`;
	const todayDate = formatDate();
	const referenceNo = generateReferenceNumber();

	// Fill in all the fields
	html = setInputValue(html, 'date', buyerData.date || todayDate);
	html = setInputValue(html, 'reference_no', buyerData.referenceNo || referenceNo);
	html = setInputValue(html, 'full_name', fullName);
	html = setInputValue(html, 'passport_id_no', buyerData.passportNumber || '');
	html = setInputValue(html, 'nationality', buyerData.nationality || '');
	html = setInputValue(html, 'date_of_birth', buyerData.dateOfBirth || '');
	html = setInputValue(html, 'marital_status', buyerData.maritalStatus || '');
	html = setInputValue(html, 'gender', buyerData.gender || '');
	html = setInputValue(html, 'resident_address', buyerData.residentAddress || '');
	html = setInputValue(html, 'permanent_address', buyerData.permanentAddress || '');
	html = setInputValue(html, 'contact_no', buyerData.phone);
	html = setInputValue(html, 'email_address', buyerData.email);
	html = setInputValue(html, 'occupation', buyerData.occupation || '');
	html = setInputValue(html, 'company_name', buyerData.companyName || '');
	html = setInputValue(html, 'business_address', buyerData.businessAddress || '');
	html = setInputValue(html, 'nature_of_business', buyerData.natureOfBusiness || '');
	html = setInputValue(html, 'give_details', buyerData.giveDetails || '');
	html = setInputValue(html, 'annual_gross_income', buyerData.annualGrossIncome || '');
	html = setInputValue(
		html,
		'purpose_of_transaction',
		buyerData.purposeOfTransaction || 'Property Investment'
	);
	html = setInputValue(
		html,
		'financial_customer_name',
		buyerData.financialCustomerName || fullName
	);
	html = setInputValue(html, 'source_of_funds', buyerData.sourceOfFunds || '');

	// Additional Questions
	if (buyerData.firstPropertyTransaction) {
		html = setRadioChecked(html, 'first_property_transaction', buyerData.firstPropertyTransaction);
	}
	html = setInputValue(
		html,
		'previous_transactions_details',
		buyerData.previousTransactionsDetails || ''
	);
	html = setInputValue(html, 'transaction_for', buyerData.transactionFor || '');
	html = setInputValue(html, 'third_party_details', buyerData.thirdPartyDetails || '');
	if (buyerData.pepRelated) {
		html = setRadioChecked(html, 'pep_related', buyerData.pepRelated);
	}

	// Declaration
	html = setInputValue(html, 'customer_name', buyerData.customerName || fullName);
	html = setInputValue(html, 'customer_signature', buyerData.customerSignature || '');
	html = setInputValue(html, 'sales_agent_name', buyerData.salesAgentName || '');
	html = setInputValue(html, 'sales_agent_signature', buyerData.salesAgentSignature || '');

	return html;
}

/**
 * Fill Referral Agreement template with deal data
 */
export async function fillReferralAgreementTemplate(data: ReferralAgreementData): Promise<string> {
	let html = await readTemplate('referral-agreement-docusign.html');

	// Fill in all the fields
	html = setInputValue(html, 'sr_no', data.srNo);
	html = setInputValue(html, 'agency_name', 'I N D GLOBAL REAL ESTATE L.L.C');
	html = setInputValue(html, 'trade_license', '1232144');
	html = setInputValue(html, 'referrer_name', data.referrerName);
	html = setInputValue(html, 'eid_no', data.referrerEidNo);
	html = setInputValue(html, 'referrer_nationality', data.referrerNationality);
	html = setInputValue(html, 'agreement_date', data.agreementDate);
	html = setInputValue(html, 'referral_fee_pct', data.referralFeePercentage);
	html = setInputValue(html, 'property_name', data.propertyName);
	html = setInputValue(html, 'first_party_name', 'I N D GLOBAL REAL ESTATE L.LC');
	html = setInputValue(html, 'first_party_signature', 'Meet Shah');
	html = setInputValue(html, 'first_party_date', data.firstPartyDate);
	html = setInputValue(html, 'second_party_name', data.referrerName);
	html = setInputValue(html, 'second_party_signature', ''); // To be signed by referrer
	html = setInputValue(html, 'second_party_date', data.secondPartyDate);

	return html;
}

/**
 * Generate AML form PDF from buyer data
 */
export async function generateAMLFormPDF(buyerData: BuyerData): Promise<Buffer> {
	const htmlContent = await fillAMLTemplate(buyerData);

	return await generatePDFFromHTML({
		htmlContent,
		format: 'A4',
		printBackground: true,
		margin: {
			top: '0mm',
			right: '0mm',
			bottom: '0mm',
			left: '0mm'
		}
	});
}

/**
 * Generate Referral Agreement PDF from deal data
 */
export async function generateReferralAgreementPDF(data: ReferralAgreementData): Promise<Buffer> {
	const htmlContent = await fillReferralAgreementTemplate(data);

	return await generatePDFFromHTML({
		htmlContent,
		format: 'A4',
		printBackground: true,
		margin: {
			top: '0mm',
			right: '0mm',
			bottom: '0mm',
			left: '0mm'
		}
	});
}
