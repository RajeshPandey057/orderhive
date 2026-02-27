# DocuSign Integration Setup Guide

This guide explains how to set up DocuSign integration for automatic AML form and Referral Agreement generation.

## Overview

The system generates and sends documents via DocuSign when agents click "Generate Now" buttons for:

- **AML Forms**: Sent to buyers (primary and joint) for KYC compliance
- **Referral Agreements**: Sent to deal owners for commission agreements

## Prerequisites

1. DocuSign Developer Account (or Production Account)
2. Integration Key (OAuth Client ID)
3. RSA Private/Public Key Pair
4. User consent for JWT authentication

## Step 1: Create DocuSign Developer Account

1. Visit [https://admindemo.docusign.com/](https://admindemo.docusign.com/)
2. Sign up for a free developer account
3. Confirm your email address
4. Log in to the DocuSign Dashboard

## Step 2: Create Integration Key

1. Navigate to **Settings** > **Apps and Keys**
2. Click **Add App and Integration Key**
3. Enter an app name (e.g., "IND Global AML Generator")
4. Click **Create App**
5. Copy the **Integration Key** (you'll need this for `DOCUSIGN_INTEGRATION_KEY`)

## Step 3: Generate RSA Key Pair

1. In the same **Apps and Keys** page, find your integration
2. Click **Actions** > **Add RSA Keypair**
3. Click **Generate RSA**
4. Copy the **Private Key** (you'll need this for `DOCUSIGN_PRIVATE_KEY`)
5. The public key is automatically stored by DocuSign

**Important**: Keep your private key secure and never commit it to version control!

## Step 4: Get Your User ID

1. On the **Apps and Keys** page, look for **API Username**
2. Copy the GUID value (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
3. This is your `DOCUSIGN_USER_ID`

## Step 5: Get Your Account ID (Optional)

**Note**: As of the latest implementation, the account ID is automatically retrieved from DocuSign's `getUserInfo()` API during authentication. You no longer need to manually configure this in your environment variables.

However, if you want to verify your account ID:

1. Navigate to **Settings** > **API and Keys**
2. Find **Account ID(s)** section
3. Your Account ID will be shown there

## Step 6: Configure Environment Variables

1. Open your `.env.local` file
2. Add the following variables:

```env
# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=<your-integration-key>
DOCUSIGN_USER_ID=<your-user-id-guid>
DOCUSIGN_PRIVATE_KEY=<your-rsa-private-key>
DOCUSIGN_BASE_PATH=https://demo.docusign.net
```

**Note**: `DOCUSIGN_ACCOUNT_ID` is no longer required as it's automatically retrieved during authentication.

**Private Key Format**:

- Keep all `\n` characters in the key as-is
- Wrap the entire key in quotes if it contains special characters
- Example:
  ```env
  DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
  ```

## Step 7: Grant User Consent

To use JWT authentication, you need to grant user consent once:

1. Open your browser and navigate to:

   ```
   https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=<YOUR_INTEGRATION_KEY>&redirect_uri=https://www.docusign.com
   ```

2. Replace `<YOUR_INTEGRATION_KEY>` with your actual integration key
3. Log in with your DocuSign account
4. Click **Allow** to grant consent
5. You only need to do this once per integration

## Step 8: Test the Integration

1. Restart your development server: `bun run dev`
2. Navigate to the Sales Tracker
3. Click "Add New Sale"
4. Fill in buyer information (name, email, phone)
5. Click "Generate Now" for AML form
6. Check that:
   - Toast message shows "Generating and sending AML form..."
   - Success message appears
   - Button changes to "AML form sent" with green checkmark
   - "Open Generated AML" button appears
7. Check the buyer's email for the DocuSign signing request

## Production Setup

When moving to production:

1. Create a production DocuSign account
2. Follow the same steps above on [https://account.docusign.com/](https://account.docusign.com/)
3. Update environment variables:
   ```env
   DOCUSIGN_BASE_PATH=https://na3.docusign.net/restapi
   ```
   (Replace `na3` with your region's API endpoint)

## Troubleshooting

### "Failed to authenticate with DocuSign"

**Problem**: JWT authentication failed

**Solutions**:

- Verify all environment variables are set correctly
- Ensure private key format is correct (includes `-----BEGIN RSA PRIVATE KEY-----` header)
- Check that you've granted user consent (Step 7)
- Verify the integration key is active in DocuSign dashboard

### "User consent required"

**Problem**: Haven't granted consent for JWT authentication

**Solution**: Follow Step 7 to grant user consent

### "Invalid Account ID"

**Problem**: Account ID doesn't match the authenticated user

**Solutions**:

- Double-check your credentials (Integration Key, User ID, Private Key)
- Ensure you're using the account ID from the same DocuSign account as the User ID

### "Buyer not receiving emails"

**Problem**: DocuSign emails not being delivered

**Solutions**:

- Check buyer email address is valid
- Look in spam/junk folders
- Verify your DocuSign account email settings
- In demo mode, only certain email domains may work (use real addresses, not test@example.com)

## Features Implemented

### AML Form Generation

- ✅ Automatically fills buyer information (name, email, phone)
- ✅ Generates unique reference numbers
- ✅ Sends via DocuSign for remote signing
- ✅ Tracks envelope status
- ✅ Allows viewing generated forms
- ✅ Works for primary and joint buyers

### Referral Agreement Generation

- ✅ Automatically fills deal owner information
- ✅ Includes property details (project, developer)
- ✅ Calculates referral fee percentage
- ✅ Sends to deal owner for signing
- ✅ Company signature pre-filled (Meet Shah)

## API Endpoints

### `/api/generate-aml` (POST)

Generates and sends AML form via DocuSign

**Request Body**:

```json
{
	"buyerData": {
		"firstName": "John",
		"lastName": "Doe",
		"email": "john@example.com",
		"phone": "+971501234567"
	},
	"buyerType": "primary",
	"saleId": "IND-20260227-0001" // optional
}
```

**Response**:

```json
{
	"success": true,
	"envelopeId": "abc123...",
	"status": "sent",
	"message": "AML form sent successfully via DocuSign"
}
```

### `/api/generate-referral` (POST)

Generates and sends referral agreement via DocuSign

**Request Body**:

```json
{
	"referralData": {
		"srNo": "619",
		"referrerName": "Jane Smith",
		"referrerNationality": "UAE",
		"referrerEidNo": "784-1234-5678901-2",
		"agreementDate": "27th Feb 2026",
		"propertyName": "Terra Woods by Emaar",
		"referralFeePercentage": "2%",
		"firstPartyDate": "27th Feb 2026",
		"secondPartyDate": "27th Feb 2026"
	},
	"saleId": "IND-20260227-0001" // optional
}
```

### `/api/get-docusign-document` (GET)

Retrieves generated document HTML from DocuSign

**Query Parameters**:

- `envelopeId`: DocuSign envelope ID
- `documentId`: Document ID (default: "1")

**Response**: HTML content of the document

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   └── add-sale-sheet.svelte     # UI with "Generate Now" buttons
│   └── server/
│       ├── docusign.ts                # DocuSign SDK wrapper
│       ├── template-renderer.ts       # HTML template population
│       └── firebase.ts                # Firebase integration
├── routes/
│   └── api/
│       ├── generate-aml/+server.ts    # AML generation endpoint
│       ├── generate-referral/+server.ts # Referral generation endpoint
│       └── get-docusign-document/+server.ts # Document retrieval
└── templates/
    ├── aml-form-docusign.html         # AML form template
    └── referral-agreement-docusign.html # Referral agreement template
```

## Security Considerations

- ✅ JWT authentication (server-to-server, no user credentials exposed)
- ✅ Private keys stored in environment variables (not in code)
- ✅ Session validation on all API endpoints
- ✅ Document access restricted to authenticated users
- ⚠️ Store private keys securely (use secrets management in production)
- ⚠️ Rotate keys periodically
- ⚠️ Monitor DocuSign API usage and rate limits

## Support

For issues or questions:

1. Check the DocuSign API documentation: [https://developers.docusign.com/](https://developers.docusign.com/)
2. Review error logs in the browser console and server terminal
3. Verify all environment variables are set correctly

## Next Steps

- [ ] Set up DocuSign webhooks to track document completion
- [ ] Add document completion notifications to compliance team
- [ ] Implement document archival in Firebase Storage
- [ ] Add audit logging for all document generation events
- [ ] Create admin dashboard for viewing all DocuSign envelopes
