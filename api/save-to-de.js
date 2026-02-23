/**
 * Vercel Serverless Function: Save to SFMC Data Extension
 * 
 * This endpoint receives field data from the custom content block
 * and saves it to an SFMC Data Extension using server-to-server OAuth.
 */

const fetch = require('node-fetch');

// SFMC Configuration from environment variables
const SFMC_CONFIG = {
    clientId: process.env.SFMC_CLIENT_ID,
    clientSecret: process.env.SFMC_CLIENT_SECRET,
    subdomain: process.env.SFMC_SUBDOMAIN,
    accountId: process.env.SFMC_ACCOUNT_ID || process.env.SFMC_MID,
    deExternalKey: process.env.DE_EXTERNAL_KEY || 'D4344287-6DDF-49F6-B7A5-A7E0043A3C2C'
};

// Token cache (in-memory for serverless)
let tokenCache = {
    token: null,
    expiresAt: 0
};

/**
 * Get SFMC authentication token using OAuth 2.0
 */
async function getSFMCToken() {
    // Return cached token if still valid
    if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
        console.log('Using cached SFMC token');
        return tokenCache.token;
    }

    console.log('Requesting new SFMC token...');
    
    const authUrl = `https://${SFMC_CONFIG.subdomain}.auth.marketingcloudapis.com/v2/token`;
    
    const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: SFMC_CONFIG.clientId,
            client_secret: SFMC_CONFIG.clientSecret,
            account_id: SFMC_CONFIG.accountId
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SFMC Auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Cache token (expires_in is in seconds, subtract 60s for safety)
    tokenCache.token = data.access_token;
    tokenCache.expiresAt = Date.now() + ((data.expires_in - 60) * 1000);
    
    console.log('SFMC token acquired successfully');
    return data.access_token;
}

/**
 * Insert rows into SFMC Data Extension
 */
async function insertDataExtensionRows(authToken, dataRows) {
    const restEndpoint = `https://${SFMC_CONFIG.subdomain}.rest.marketingcloudapis.com/`;
    const url = `${restEndpoint}hub/v1/dataevents/key:${SFMC_CONFIG.deExternalKey}/rowset`;
    
    // Convert data rows to API format
    const requestBody = dataRows.map(row => ({
        keys: {
            'email name': row['email name'],
            'fieldname': row['fieldname']
        },
        values: row
    }));

    console.log(`Inserting ${dataRows.length} rows into DE ${SFMC_CONFIG.deExternalKey}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DE Insert failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

/**
 * Main handler for Vercel serverless function
 */
module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Validate environment variables
        if (!SFMC_CONFIG.clientId || !SFMC_CONFIG.clientSecret || !SFMC_CONFIG.subdomain) {
            throw new Error('Missing SFMC configuration. Please set environment variables.');
        }

        // Parse request body
        const { emailName, fields } = req.body;

        if (!emailName || !fields || !Array.isArray(fields)) {
            return res.status(400).json({ 
                error: 'Invalid request body. Expected: { emailName, fields }' 
            });
        }

        // Convert fields to DE rows
        const dataRows = fields.map(field => ({
            'email name': emailName,
            'fieldname': field.name,
            'field value': field.value,
            'EntryDate': new Date().toISOString()
        }));

        // Get SFMC auth token
        const authToken = await getSFMCToken();

        // Insert rows into Data Extension
        const result = await insertDataExtensionRows(authToken, dataRows);

        // Success response
        return res.status(200).json({
            success: true,
            rowsInserted: dataRows.length,
            message: `Successfully saved ${dataRows.length} row(s) to Data Extension`,
            result: result
        });

    } catch (error) {
        console.error('API Error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
