# SFMC Custom Content Block - Setup Guide

This guide will help you set up and deploy the SFMC Translation Custom Content Block.

## Prerequisites

- Salesforce Marketing Cloud account with admin access
- Vercel account (free tier works fine)
- Git and GitHub account

## Step 1: Get SFMC API Credentials

1. Log into your SFMC account
2. Go to **Setup → Apps → Installed Packages**
3. Click **New** to create a new package
4. Enter package name: `Translation Custom Block API`
5. Click **Add Component** → **API Integration**
6. Select **Server-to-Server** integration type
7. Grant the following permissions:
   - **Data Extensions**: Read and Write
   - (Optional) **Email**: Read (if you need email permissions)
8. Click **Save**
9. **Copy and save** the following credentials:
   - **Client ID**
   - **Client Secret**
   - **Subdomain** (from the Authentication Base URI, e.g., if URL is `https://abc123.auth.marketingcloudapis.com`, subdomain is `abc123`)
   - **Account ID / MID** (your Marketing Cloud account ID)

## Step 2: Create Data Extension

1. In SFMC, go to **Email Studio → Email → Data Extensions**
2. Click **Create** → **Standard Data Extension**
3. Create with the following schema:

   | Field Name   | Data Type     | Length | Primary Key | Required | Default Value |
   |-------------|---------------|--------|-------------|----------|---------------|
   | email name  | Text          | 100    | ✓           | ✓        |               |
   | fieldname   | Text          | 100    | ✓           | ✓        |               |
   | field value | Text          | 4000   |             | ✓        |               |
   | EntryDate   | Date          |        |             |          | Current Date  |

4. Save and note the **External Key** (e.g., `D4344287-6DDF-49F6-B7A5-A7E0043A3C2C`)

## Step 3: Deploy to Vercel

### 3.1: Clone and Push to GitHub

```bash
# If not already done
git init
git add .
git commit -m "Initial commit - SFMC custom content block"
git remote add origin https://github.com/yourusername/sfmc-custom-block.git
git push -u origin main
```

### 3.2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New Project**
3. Import your GitHub repository
4. **Before deploying**, add Environment Variables:
   - Click **Environment Variables**
   - Add the following variables:
     - `SFMC_CLIENT_ID` = (your client ID from Step 1)
     - `SFMC_CLIENT_SECRET` = (your client secret from Step 1)
     - `SFMC_SUBDOMAIN` = (your subdomain from Step 1)
     - `SFMC_ACCOUNT_ID` = (your account ID/MID from Step 1)
     - `DE_EXTERNAL_KEY` = (your DE external key from Step 2)
5. Click **Deploy**
6. Wait for deployment to complete
7. Copy your **Vercel URL** (e.g., `https://your-project.vercel.app`)

### 3.3: Install Dependencies

After first deployment, Vercel will automatically install dependencies from `package.json`.

## Step 4: Configure Custom Content Block in SFMC

1. In SFMC, go to **Setup → Apps → Installed Packages**
2. Create a new package or use existing one
3. Click **Add Component** → **Custom Content Block (Heroku)**
4. Fill in the details:
   - **Name**: `Translation Data Entry Block`
   - **Description**: `Custom content block for email translation field entry`
   - **Endpoint URL**: `https://your-project.vercel.app/index.html`
   - **Category**: Select or create a category (e.g., `Custom Blocks`)
5. Click **Save**
6. Note: You may need to wait a few minutes for SFMC to cache the new block

## Step 5: Test the Block

1. Go to **Email Studio → Content Builder**
2. Create a new email
3. In the content editor, look for your custom block in the content blocks panel
4. Drag the **Translation Data Entry Block** into the email
5. Enter test data:
   - **Email Name**: `test-email-001`
   - Add field name-value pairs (e.g., `subject` → `Test Subject`)
6. Click **Save to Data Extension**
7. Check your Data Extension to verify the data was saved

## Step 6: Verify Data Extension Writes

1. Go to **Email Studio → Email → Data Extensions**
2. Find your Data Extension (from Step 2)
3. Click **Records** tab
4. You should see your test data with rows like:

   | email name     | fieldname | field value   | EntryDate           |
   |---------------|-----------|---------------|---------------------|
   | test-email-001 | subject   | Test Subject  | 2026-02-23 10:30:00 |
   | test-email-001 | preheader | Test Preheader| 2026-02-23 10:30:00 |

## Troubleshooting

### Error: "Missing SFMC configuration"

- **Cause**: Environment variables not set in Vercel
- **Solution**: Go to Vercel → Your Project → Settings → Environment Variables and verify all variables are set

### Error: "SFMC Auth failed: 401"

- **Cause**: Invalid client credentials or expired secret
- **Solution**: Verify Client ID and Client Secret in SFMC Setup → Installed Packages → Your API Integration

### Error: "DE Insert failed: 404"

- **Cause**: Data Extension external key doesn't match
- **Solution**: Verify `DE_EXTERNAL_KEY` in Vercel environment variables matches your actual DE external key

### Error: "Network error" or "Failed to fetch"

- **Cause**: CORS or connectivity issues
- **Solution**: Verify `vercel.json` has CORS headers configured correctly

### Block doesn't appear in Content Builder

- **Cause**: SFMC hasn't cached the new block yet
- **Solution**: Wait 5-10 minutes, then refresh Content Builder. If still not showing, verify the Endpoint URL in the custom block configuration.

## Architecture Overview

```
┌─────────────────┐
│  SFMC Content   │
│    Builder      │
└────────┬────────┘
         │ (iframe)
         ▼
┌─────────────────┐
│  Vercel Static  │
│   (Frontend)    │◄────┐
│  index.html     │     │
│  customBlock.js │     │
└────────┬────────┘     │
         │ POST /api    │
         ▼              │
┌─────────────────┐     │
│ Vercel Function │     │
│  save-to-de.js  │     │
└────────┬────────┘     │
         │ OAuth        │
         ▼              │
┌─────────────────┐     │
│  SFMC REST API  │─────┘
│ (Data Extension)│
└─────────────────┘
```

## Next Steps

- Customize the default fields in `customBlock.js` (CONFIG.DEFAULT_FIELDS)
- Add custom styling to match your brand
- Extend validation rules as needed
- Add more Data Extension fields if required

## Support

For issues or questions, please check:
- SFMC API documentation: https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/rest-api.html
- Vercel documentation: https://vercel.com/docs
