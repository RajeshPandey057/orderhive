import { env } from '$env/dynamic/private';
// Don't rely on TypeScript types - they're outdated
// Access all classes as properties on the docusign module
// @ts-expect-error - docusign-esign is a CommonJS module without complete type definitions
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

		// Check for consent_required error
		const errorData = (error as { response?: { data?: { error?: string } } })?.response?.data;
		if (errorData?.error === 'consent_required') {
			const consentUrl = `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${DOCUSIGN_INTEGRATION_KEY}&redirect_uri=http://localhost:3000`;
			throw new Error(`User consent required. Visit this URL to grant consent: ${consentUrl}`);
		}

		throw new Error(
			`Failed to authenticate with DocuSign: ${error instanceof Error ? error.message : 'Unknown error'}`
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

export interface CreateEnvelopeOptions {
	htmlContent: string;
	documentName: string;
	recipientEmail: string;
	recipientName: string;
	emailSubject: string;
	emailBlurb?: string;
}

export interface EnvelopeResult {
	envelopeId: string;
	status: string;
	statusDateTime: string;
	uri: string;
}

/**
 * Create a DocuSign envelope with HTML document and send for remote signing
 */
export async function createEnvelopeFromHTML(
	options: CreateEnvelopeOptions
): Promise<EnvelopeResult> {
	const { htmlContent, documentName, recipientEmail, recipientName, emailSubject, emailBlurb } =
		options;

	try {
		const apiClient = await getApiClient();
		const envelopesApi = new docusign.EnvelopesApi(apiClient);
		const accountId = getAccountId();

		// Create document from HTML
		const document = new docusign.Document();
		document.documentBase64 = Buffer.from(htmlContent).toString('base64');
		document.name = documentName;
		document.fileExtension = 'html';
		document.documentId = '1';

		// Create signer recipient
		const signer = new docusign.Signer();
		signer.email = recipientEmail;
		signer.name = recipientName;
		signer.recipientId = '1';
		signer.routingOrder = '1';

		// Create recipients object
		const recipients = new docusign.Recipients();
		recipients.signers = [signer];

		// Create envelope definition
		const envelopeDefinition = new docusign.EnvelopeDefinition();
		envelopeDefinition.emailSubject = emailSubject;
		envelopeDefinition.emailBlurb =
			emailBlurb || 'Please review and sign the document using DocuSign.';
		envelopeDefinition.documents = [document];
		envelopeDefinition.recipients = recipients;
		envelopeDefinition.status = 'sent'; // Send immediately

		// Create envelope
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
	} catch (error) {
		console.error('Failed to create DocuSign envelope:', error);
		if (error instanceof Error) {
			throw new Error(`DocuSign envelope creation failed: ${error.message}`);
		}
		throw new Error('Failed to create DocuSign envelope');
	}
}

/**
 * Get envelope status
 */
export async function getEnvelopeStatus(envelopeId: string): Promise<unknown> {
	try {
		const apiClient = await getApiClient();
		const envelopesApi = new docusign.EnvelopesApi(apiClient);
		const accountId = getAccountId();

		const envelope = await envelopesApi.getEnvelope(accountId, envelopeId);
		return envelope;
	} catch (error) {
		console.error('Failed to get envelope status:', error);
		throw new Error('Failed to retrieve envelope status');
	}
}

/**
 * Get document from envelope (returns HTML content)
 */
export async function getEnvelopeDocument(envelopeId: string, documentId = '1'): Promise<string> {
	try {
		const apiClient = await getApiClient();
		const envelopesApi = new docusign.EnvelopesApi(apiClient);
		const accountId = getAccountId();

		const document = await envelopesApi.getDocument(accountId, envelopeId, documentId, {});

		// Document comes as Buffer, convert to string
		if (Buffer.isBuffer(document)) {
			return document.toString('utf-8');
		}

		// If it's already a string, return it
		if (typeof document === 'string') {
			return document;
		}

		// Otherwise, try to convert
		return String(document);
	} catch (error) {
		console.error('Failed to get envelope document:', error);
		throw new Error('Failed to retrieve document from envelope');
	}
}

/**
 * Void an envelope
 */
export async function voidEnvelope(envelopeId: string, reason = 'Voided by system'): Promise<void> {
	try {
		const apiClient = await getApiClient();
		const envelopesApi = new docusign.EnvelopesApi(apiClient);
		const accountId = getAccountId();

		const envelope = new docusign.Envelope();
		envelope.status = 'voided';
		envelope.voidedReason = reason;

		await envelopesApi.update(accountId, envelopeId, { envelope });
	} catch (error) {
		console.error('Failed to void envelope:', error);
		throw new Error('Failed to void envelope');
	}
}
