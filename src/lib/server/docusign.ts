import { env } from '$env/dynamic/private';
import docusign from 'docusign-esign';

const SCOPES = ['signature', 'impersonation'];
const TOKEN_EXPIRATION_SECONDS = 3600; // 1 hour

// Get environment variables with fallbacks
const DOCUSIGN_INTEGRATION_KEY = env.DOCUSIGN_INTEGRATION_KEY || '';
const DOCUSIGN_USER_ID = env.DOCUSIGN_USER_ID || '';
const DOCUSIGN_PRIVATE_KEY = env.DOCUSIGN_PRIVATE_KEY || '';
const DOCUSIGN_BASE_PATH = env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';

let cachedAccessToken: string | null = null;
let tokenExpirationTime: number | null = null;
let cachedAccountId: string | null = null;

/**
 * Get DocuSign API client with JWT authentication
 */
async function getApiClient(): Promise<docusign.ApiClient> {
	const apiClient = new docusign.ApiClient();
	apiClient.setBasePath(DOCUSIGN_BASE_PATH);

	// Check if we have a valid cached token
	if (cachedAccessToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
		apiClient.addDefaultHeader('Authorization', `Bearer ${cachedAccessToken}`);
		return apiClient;
	}

	// Generate new token via JWT
	try {
		// Format the private key (ensure proper line breaks)
		const privateKey = DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n');

		console.log('🔐 DocuSign JWT Auth Attempt:');
		console.log('  Integration Key:', DOCUSIGN_INTEGRATION_KEY);
		console.log('  User ID:', DOCUSIGN_USER_ID);
		console.log('  Scopes:', SCOPES);
		console.log('  Private Key Length:', privateKey.length);
		console.log('  Private Key starts with:', privateKey.substring(0, 50));

		const results = await apiClient.requestJWTUserToken(
			DOCUSIGN_INTEGRATION_KEY,
			DOCUSIGN_USER_ID,
			SCOPES,
			privateKey,
			TOKEN_EXPIRATION_SECONDS
		);

		const accessToken = results.body.access_token;

		// Cache the token
		cachedAccessToken = accessToken;
		tokenExpirationTime = Date.now() + (TOKEN_EXPIRATION_SECONDS - 60) * 1000; // Refresh 1 min early

		apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

		// Get user info to retrieve account ID
		const userInfo = await apiClient.getUserInfo(accessToken);

		if (!userInfo.accounts || userInfo.accounts.length === 0) {
			throw new Error('No DocuSign accounts found for this user');
		}

		// Get the default (first) account
		const account = userInfo.accounts[0];
		cachedAccountId = account.accountId;

		// Update base path to use the account's base URI
		if (account.baseUri) {
			apiClient.setBasePath(account.baseUri + '/restapi');
		}

		console.log('✅ DocuSign JWT authentication successful');
		console.log('  Account ID:', cachedAccountId);
		console.log('  Base URI:', account.baseUri);

		return apiClient;
	} catch (error: unknown) {
		console.error('❌ DocuSign JWT authentication failed:', error);
		console.error('Error details:', {
			message: error instanceof Error ? error.message : 'Unknown',
			response: (error as { response?: { data?: unknown } })?.response?.data,
			status: (error as { response?: { status?: number } })?.response?.status,
			statusText: (error as { response?: { statusText?: string } })?.response?.statusText
		});

		// Check for consent_required error
		const errorData = (error as { response?: { data?: { error?: string } } })?.response?.data;
		if (errorData?.error === 'consent_required') {
			const consentUrl = `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${DOCUSIGN_INTEGRATION_KEY}&redirect_uri=http://localhost:3000`;
			throw new Error(`User consent required. Visit this URL to grant consent: ${consentUrl}`);
		}

		throw new Error(
			`Failed to authenticate with DocuSign. Please check your credentials. ${error instanceof Error ? error.message : ''}`
		);
	}
}

/**
 * Get the cached account ID
 */
function getAccountId(): string {
	if (!cachedAccountId) {
		throw new Error('Account ID not available. Please authenticate first.');
	}
	return cachedAccountId;
}

export interface DocuSignRecipient {
	email: string;
	name: string;
}

export interface DocuSignEnvelopeResult {
	envelopeId: string;
	status: string;
	statusDateTime: string;
	uri: string;
}

/**
 * Create and send an envelope with document for signature
 * Supports PDF, DOCX, and other DocuSign-compatible formats
 */
export async function sendDocumentForSignature(
	documentBuffer: Buffer,
	documentName: string,
	fileExtension: 'pdf' | 'docx' | 'doc' | 'txt' = 'pdf',
	recipient: DocuSignRecipient,
	emailSubject?: string
): Promise<DocuSignEnvelopeResult> {
	try {
		const apiClient = await getApiClient();
		const envelopesApi = new docusign.EnvelopesApi(apiClient);

		// Create the document
		const document = new docusign.Document();
		document.documentBase64 = documentBuffer.toString('base64');
		document.name = documentName;
		document.fileExtension = fileExtension;
		document.documentId = '1';

		// Create the signer recipient
		const signer = new docusign.Signer();
		signer.email = recipient.email;
		signer.name = recipient.name;
		signer.recipientId = '1';
		signer.routingOrder = '1';

		// Create a sign here tab (signature field)
		const signHere = new docusign.SignHere();
		signHere.documentId = '1';
		signHere.pageNumber = '1';
		signHere.recipientId = '1';
		signHere.tabLabel = 'SignHereTab';
		signHere.xPosition = '100';
		signHere.yPosition = '100';

		// Add the tab to the signer
		const tabs = new docusign.Tabs();
		tabs.signHereTabs = [signHere];
		signer.tabs = tabs;

		// Create the envelope definition
		const envelopeDefinition = new docusign.EnvelopeDefinition();
		envelopeDefinition.emailSubject = emailSubject || `Please sign: ${documentName}`;
		envelopeDefinition.documents = [document];
		envelopeDefinition.recipients = new docusign.Recipients();
		envelopeDefinition.recipients.signers = [signer];
		envelopeDefinition.status = 'sent'; // Send immediately

		// Get the account ID
		const accountId = getAccountId();

		console.log('📤 Creating DocuSign envelope:');
		console.log('  Account ID:', accountId);
		console.log('  Recipient:', recipient.email);
		console.log('  Document:', documentName);

		// Create the envelope
		const results = await envelopesApi.createEnvelope(accountId, {
			envelopeDefinition
		});

		if (!results.envelopeId) {
			throw new Error('Failed to create envelope: No envelope ID returned');
		}

		return {
			envelopeId: results.envelopeId,
			status: results.status || 'sent',
			statusDateTime: results.statusDateTime || new Date().toISOString(),
			uri: results.uri || ''
		};
	} catch (error: unknown) {
		console.error('Error sending document via DocuSign:', error);
		console.error('Error details:', {
			message: error instanceof Error ? error.message : 'Unknown',
			response: (error as { response?: { data?: unknown } })?.response?.data,
			status: (error as { response?: { status?: number } })?.response?.status,
			statusText: (error as { response?: { statusText?: string } })?.response?.statusText
		});

		if (error instanceof Error) {
			throw new Error(`Failed to send document via DocuSign: ${error.message}`);
		}
		throw new Error('Failed to send document via DocuSign');
	}
}

/**
 * Get the status of an envelope
 */
export async function getEnvelopeStatus(envelopeId: string): Promise<string> {
	try {
		const apiClient = await getApiClient();
		const envelopesApi = new docusign.EnvelopesApi(apiClient);
		const accountId = getAccountId();

		const envelope = await envelopesApi.getEnvelope(accountId, envelopeId);

		return envelope.status || 'unknown';
	} catch (error) {
		console.error('Error getting envelope status:', error);
		throw new Error(
			`Failed to get envelope status: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Get the signed document from a completed envelope
 */
export async function getSignedDocument(
	envelopeId: string,
	documentId: string = '1'
): Promise<Buffer> {
	try {
		const apiClient = await getApiClient();
		const envelopesApi = new docusign.EnvelopesApi(apiClient);
		const accountId = getAccountId();

		const document = await envelopesApi.getDocument(accountId, envelopeId, documentId);

		// The document is returned as a Buffer
		return Buffer.from(document);
	} catch (error) {
		console.error('Error getting signed document:', error);
		throw new Error(
			`Failed to get signed document: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Validate that all required DocuSign environment variables are set
 */
export function validateDocuSignConfig(): { valid: boolean; missingVars: string[] } {
	const requiredVars = {
		DOCUSIGN_INTEGRATION_KEY,
		DOCUSIGN_USER_ID,
		DOCUSIGN_PRIVATE_KEY,
		DOCUSIGN_BASE_PATH
	};

	const missingVars: string[] = [];

	for (const [key, value] of Object.entries(requiredVars)) {
		if (!value || value.trim() === '') {
			missingVars.push(key);
		}
	}

	return {
		valid: missingVars.length === 0,
		missingVars
	};
}
