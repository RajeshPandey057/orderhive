import { command } from '$app/server';
import { generateAmlDocx, type AmlFormData } from '$lib/server/aml-form';
import { sendDocumentForSignature } from '$lib/server/docusign';
import { uploadFileWithLink } from '$lib/server/firebase';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

// Schema for generating AML form
const generateAmlSchema = z.object({
	// Buyer information
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.email('Valid email is required'),
	phone: z.string().min(1, 'Phone number is required'),

	// Optional fields (can be added based on template requirements)
	dateOfBirth: z.string().optional(),
	nationality: z.string().optional(),
	address: z.string().optional(),
	idNumber: z.string().optional(),

	// Context for file storage
	saleId: z.string().optional(), // For organizing files by sale
	buyerType: z.enum(['primary', 'joint']).default('primary'),
	buyerIndex: z.number().optional() // For joint buyers
});

export type GenerateAmlFormData = z.infer<typeof generateAmlSchema>;

export interface GenerateAmlResult {
	success: boolean;
	file?: {
		path: string;
		downloadURL: string;
		token: string;
		contentType: string;
		size: number;
		name: string;
		lastModified: number;
	};
	docusign?: {
		envelopeId: string;
		status: string;
		statusDateTime: string;
		uri: string;
	};
	error?: string;
}

/**
 * Generate AML form, convert to PDF, upload to Firebase, and send via DocuSign
 */
export const generateAmlForm = command(
	generateAmlSchema,
	async (data): Promise<GenerateAmlResult> => {
		try {
			// Step 1: Generate DOCX from template (DocuSign supports DOCX natively)
			const amlData: AmlFormData = {
				firstName: data.firstName,
				lastName: data.lastName,
				email: data.email,
				phone: data.phone,
				dateOfBirth: data.dateOfBirth,
				nationality: data.nationality,
				residentAddress: data.address,
				passportNo: data.idNumber,
				currentDate: new Date().toLocaleDateString('en-GB')
			};

			console.log('Generating AML DOCX for:', data.firstName, data.lastName);
			const docxBuffer = await generateAmlDocx(amlData);
			// Step 2: Convert Buffer to File object for upload
			const fileName = `AML-Form-${data.firstName}-${data.lastName}-${Date.now()}.docx`;
			const docxBlob = new Uint8Array(docxBuffer);
			const docxFile = new File([docxBlob], fileName, {
				type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				lastModified: Date.now()
			});

			// Step 3: Determine storage path
			let storagePath = 'aml-forms';
			if (data.saleId) {
				if (data.buyerType === 'joint' && data.buyerIndex !== undefined) {
					storagePath = `sales/${data.saleId}/joint/${data.buyerIndex}/aml-form`;
				} else {
					storagePath = `sales/${data.saleId}/primary/aml-form`;
				}
			} else {
				// Fallback path if no sale context
				storagePath = `aml-forms/standalone/${fileName}`;
			}

			// Step 4: Upload to Firebase Storage
			console.log('Uploading AML DOCX to Firebase:', storagePath);
			const uploadedFile = await uploadFileWithLink(docxFile, storagePath);

			if (!uploadedFile) {
				throw error(500, 'Failed to upload AML form to storage');
			}

			// Step 5: Send via DocuSign for signature (DOCX is natively supported)
			console.log('Sending AML form to DocuSign for signature:', data.email);
			const docusignResult = await sendDocumentForSignature(
				docxBuffer,
				`AML Form - ${data.firstName} ${data.lastName}`,
				'docx',
				{
					email: data.email,
					name: `${data.firstName} ${data.lastName}`
				},
				`Please review and sign your AML (Anti-Money Laundering) Form`
			);

			console.log('AML form sent successfully. Envelope ID:', docusignResult.envelopeId);

			return {
				success: true,
				file: uploadedFile,
				docusign: docusignResult
			};
		} catch (err) {
			console.error('Failed to generate AML form:', err);

			// Provide specific error messages
			let errorMessage = 'Failed to generate AML form';
			if (err instanceof Error) {
				errorMessage = err.message;
			}

			return {
				success: false,
				error: errorMessage
			};
		}
	}
);
