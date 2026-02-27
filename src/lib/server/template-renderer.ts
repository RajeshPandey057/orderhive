import { readFile } from 'fs/promises';
import { join } from 'path';

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
	annualGrossIncome?: string;
	purposeOfTransaction?: string;
	sourceOfFunds?: string;
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
	html = setInputValue(html, 'date', todayDate);
	html = setInputValue(html, 'reference_no', referenceNo);
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
	html = setInputValue(html, 'give_details', '');
	html = setInputValue(html, 'annual_gross_income', buyerData.annualGrossIncome || '');
	html = setInputValue(
		html,
		'purpose_of_transaction',
		buyerData.purposeOfTransaction || 'Property Investment'
	);
	html = setInputValue(html, 'financial_customer_name', fullName);
	html = setInputValue(html, 'source_of_funds', buyerData.sourceOfFunds || '');

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
