import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { promisify } from 'util';

// Dynamic import for libreoffice-convert to avoid require()
const getLibreOfficeConvert = async () => {
	const libre = await import('libreoffice-convert');
	return promisify(libre.convert);
};

export interface AmlFormData {
	// Personal Identity Information
	firstName: string;
	lastName: string;
	passportNo?: string;
	nationality?: string;
	dateOfBirth?: string;
	maritalStatus?: string;
	gender?: string;

	// Address and Contact Details
	residentAddress?: string;
	permanentAddress?: string;
	phone: string;
	email: string;

	// Business and Occupational Details
	occupation?: string;
	companyName?: string;
	businessAddress?: string;
	natureOfBusiness?: string;
	businessDetails?: string;

	// Financial Details
	annualGrossIncome?: string;
	purposeOfTransaction?: string;
	sourceOfFunds?: string;

	// Additional Questions
	firstPropertyTransaction?: boolean;
	previousTransactionDetails?: string;
	transactionForSelf?: boolean;
	thirdPartyDetails?: string;
	politicallyExposed?: boolean;

	// Metadata
	referenceNo?: string;
	salesAgentName?: string;
	currentDate?: string;
}

/**
 * Load the AML form DOCX template from the file system
 */
function loadTemplate(): Buffer {
	const templatePath = path.join(process.cwd(), 'AML Form.docx');

	if (!fs.existsSync(templatePath)) {
		throw new Error(
			`AML Form template not found at ${templatePath}. Please ensure "AML Form.docx" exists in the project root.`
		);
	}

	return fs.readFileSync(templatePath);
}

/**
 * Fill the DOCX template with buyer data using docxtemplater
 */
function fillTemplate(data: AmlFormData): Buffer {
	try {
		const template = loadTemplate();
		const zip = new PizZip(template);

		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
			nullGetter() {
				return ''; // Return empty string for missing fields
			}
		});

		// Prepare data with defaults
		const templateData = {
			// Current date and reference
			date: data.currentDate || new Date().toLocaleDateString('en-GB'),
			currentDate: data.currentDate || new Date().toLocaleDateString('en-GB'),
			referenceNo: data.referenceNo || '',

			// Personal Identity Information
			firstName: data.firstName || '',
			lastName: data.lastName || '',
			fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
			fullNamePerPassport: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
			passportNo: data.passportNo || '',
			idNo: data.passportNo || '',
			nationality: data.nationality || '',
			dateOfBirth: data.dateOfBirth || '',
			maritalStatus: data.maritalStatus || '',
			gender: data.gender || '',

			// Address and Contact Details
			residentAddress: data.residentAddress || '',
			permanentAddress: data.permanentAddress || data.residentAddress || '',
			contactNo: data.phone || '',
			phone: data.phone || '',
			emailAddress: data.email || '',
			email: data.email || '',

			// Business and Occupational Details
			occupation: data.occupation || '',
			companyName: data.companyName || '',
			businessAddress: data.businessAddress || '',
			natureOfBusiness: data.natureOfBusiness || '',
			details: data.businessDetails || '',
			giveDetails: data.businessDetails || '',

			// Financial Details
			annualGrossIncome: data.annualGrossIncome || '',
			purposeOfTransaction: data.purposeOfTransaction || 'Property Purchase',
			customerName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
			sourceOfFunds: data.sourceOfFunds || '',

			// Additional Questions
			firstPropertyTransaction:
				data.firstPropertyTransaction === true ? '☑ Yes    ☐ No' : '☐ Yes    ☑ No',
			firstPropertyYes: data.firstPropertyTransaction === true ? '☑' : '☐',
			firstPropertyNo: data.firstPropertyTransaction === false ? '☑' : '☐',
			previousTransactionDetails: data.previousTransactionDetails || '',

			transactionForSelf: data.transactionForSelf === true ? 'Yourself' : 'Another',
			thirdPartyDetails: data.thirdPartyDetails || '',

			politicallyExposed: data.politicallyExposed === true ? '☑ Yes    ☐ No' : '☐ Yes    ☑ No',
			politicallyExposedYes: data.politicallyExposed === true ? '☑' : '☐',
			politicallyExposedNo: data.politicallyExposed === false ? '☑' : '☐',

			// Declaration
			customerNameDeclaration: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
			salesAgentName: data.salesAgentName || 'IND Global Dubai Properties'
		};

		doc.render(templateData);

		const buffer = doc.getZip().generate({
			type: 'nodebuffer',
			compression: 'DEFLATE'
		});

		return buffer;
	} catch (error) {
		console.error('Error filling template:', error);
		if (error instanceof Error) {
			throw new Error(`Failed to fill AML form template: ${error.message}`);
		}
		throw new Error('Failed to fill AML form template');
	}
}

/**
 * Convert DOCX buffer to PDF using LibreOffice
 * Note: Requires LibreOffice to be installed on the system
 */
async function convertToPDF(docxBuffer: Buffer): Promise<Buffer> {
	try {
		// Check if LibreOffice is available (basic check)
		// The convert function will fail gracefully if LibreOffice is not installed
		const convertAsync = await getLibreOfficeConvert();
		const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
		return pdfBuffer as Buffer;
	} catch (error) {
		console.error('Error converting to PDF:', error);

		// Provide helpful error message
		if (error instanceof Error && error.message.includes('LibreOffice')) {
			throw new Error(
				'LibreOffice is not installed. Please install LibreOffice to enable PDF conversion. ' +
					'macOS: brew install libreoffice, Ubuntu: apt-get install libreoffice'
			);
		}

		throw new Error(
			`Failed to convert document to PDF. Ensure LibreOffice is installed. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Generate AML form DOCX from buyer data
 * This is the main function - no PDF conversion needed!
 */
export async function generateAmlDocx(data: AmlFormData): Promise<Buffer> {
	try {
		// Fill the template with data
		const docxBuffer = fillTemplate(data);
		return docxBuffer;
	} catch (error) {
		console.error('Error generating AML DOCX:', error);
		throw error; // Re-throw to be handled by caller
	}
}

/**
 * Generate AML form PDF from buyer data (requires LibreOffice installed)
 * @deprecated Use generateAmlDocx instead - DocuSign supports DOCX natively
 */
export async function generateAmlPdf(data: AmlFormData): Promise<Buffer> {
	try {
		// Step 1: Fill the template
		const docxBuffer = fillTemplate(data);

		// Step 2: Convert to PDF
		const pdfBuffer = await convertToPDF(docxBuffer);

		return pdfBuffer;
	} catch (error) {
		console.error('Error generating AML PDF:', error);
		throw error; // Re-throw to be handled by caller
	}
}

/**
 * Validate that the template file exists (useful for startup checks)
 */
export function validateTemplateExists(): boolean {
	const templatePath = path.join(process.cwd(), 'AML Form.docx');
	return fs.existsSync(templatePath);
}
