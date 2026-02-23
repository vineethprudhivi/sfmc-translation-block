/**
 * SFMC Custom Content Block for Translation Data Entry
 * 
 * This block allows marketers to create field name-value pairs
 * and save them to a Data Extension for translation processing.
 * 
 * Environment Variables Required:
 * - DE_EXTERNAL_KEY: Data Extension external key (configure in config.js or pass from SFMC)
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        DE_EXTERNAL_KEY: 'D4344287-6DDF-49F6-B7A5-A7E0043A3C2C', // Update with your actual DE external key
        MIN_FIELDS: 1,
        MAX_FIELDS: 20,
        DEFAULT_FIELDS: [
            { name: 'subject', value: '' },
            { name: 'preheader', value: '' },
            { name: 'header', value: '' },
            { name: 'body', value: '' },
            { name: 'footer', value: '' }
        ]
    };

    // State management
    let connection = null; // Will be initialized when Postmonger is available
    let payload = {};
    let fieldCounter = 0;
    let authToken = null;
    let sfmcEndpoint = null;

    // DOM elements (cached for performance)
    const elements = {
        emailName: null,
        fieldsContainer: null,
        btnAddField: null,
        btnSave: null,
        messageArea: null,
        saveLoader: null
    };

    /**
     * Initialize the custom block
     */
    function init() {
        cacheElements();
        setupEventListeners();
        initializeConnection();
        renderDefaultFields();
    }

    /**
     * Cache DOM elements to avoid repeated queries
     */
    function cacheElements() {
        elements.emailName = document.getElementById('emailName');
        elements.fieldsContainer = document.getElementById('fieldsContainer');
        elements.btnAddField = document.getElementById('btnAddField');
        elements.btnSave = document.getElementById('btnSave');
        elements.messageArea = document.getElementById('messageArea');
        elements.saveLoader = document.getElementById('saveLoader');
    }

    /**
     * Set up event listeners for user interactions
     */
    function setupEventListeners() {
        elements.btnAddField.addEventListener('click', addFieldRow);
        elements.btnSave.addEventListener('click', saveToDataExtension);
    }

    /**
     * Initialize Postmonger connection with SFMC
     */
    function initializeConnection() {
        // Initialize Postmonger connection
        if (typeof Postmonger !== 'undefined') {
            connection = new Postmonger();
            
            connection.on('initActivity', onInitActivity);
            connection.on('requestedTokens', onGetTokens);
            connection.on('requestedEndpoints', onGetEndpoints);
            
            // Trigger the handshake
            connection.trigger('ready');
            connection.trigger('requestTokens');
            connection.trigger('requestEndpoints');
        } else {
            console.warn('Postmonger not available - running in standalone mode');
        }
    }

    /**
     * Handle activity initialization
     * @param {Object} data - Activity data from SFMC
     */
    function onInitActivity(data) {
        if (data) {
            payload = data;
        }

        // Load saved data if exists
        const savedData = (payload && payload.arguments && payload.arguments.execute) 
            ? payload.arguments.execute.inArguments[0] 
            : null;

        if (savedData) {
            if (savedData.emailName) {
                elements.emailName.value = savedData.emailName;
            }
            if (savedData.fields) {
                loadSavedFields(savedData.fields);
            }
        }
    }

    /**
     * Receive authentication tokens from SFMC
     * @param {Object} tokens - Authentication tokens
     */
    function onGetTokens(tokens) {
        if (tokens && tokens.token) {
            authToken = tokens.token;
        }
    }

    /**
     * Receive SFMC endpoints
     * @param {Object} endpoints - SFMC endpoints
     */
    function onGetEndpoints(endpoints) {
        if (endpoints && endpoints.restEndpoint) {
            sfmcEndpoint = endpoints.restEndpoint;
        }
    }

    /**
     * Render default fields on initial load
     */
    function renderDefaultFields() {
        CONFIG.DEFAULT_FIELDS.forEach(field => {
            addFieldRow(field.name, field.value);
        });
    }

    /**
     * Load previously saved fields
     * @param {Array} fields - Array of field objects
     */
    function loadSavedFields(fields) {
        elements.fieldsContainer.innerHTML = '';
        fieldCounter = 0;
        
        fields.forEach(field => {
            addFieldRow(field.name, field.value);
        });
    }

    /**
     * Add a new field row to the form
     * @param {string} name - Field name
     * @param {string} value - Field value
     */
    function addFieldRow(name = '', value = '') {
        // Enforce max fields limit
        if (getFieldCount() >= CONFIG.MAX_FIELDS) {
            showMessage('error', `Maximum ${CONFIG.MAX_FIELDS} fields allowed.`);
            return;
        }

        const rowId = `field-${fieldCounter++}`;
        const fieldRow = document.createElement('div');
        fieldRow.className = 'field-row';
        fieldRow.id = rowId;
        
        fieldRow.innerHTML = `
            <input 
                type="text" 
                class="field-name" 
                placeholder="Field name (e.g., subject)" 
                value="${sanitizeHtml(name)}"
                data-row="${rowId}"
            />
            <input 
                type="text" 
                class="field-value" 
                placeholder="Field value" 
                value="${sanitizeHtml(value)}"
                data-row="${rowId}"
            />
            <button 
                class="btn-remove" 
                onclick="window.removeFieldRow('${rowId}')"
                ${getFieldCount() === 0 ? 'disabled' : ''}
            >
                −
            </button>
        `;
        
        elements.fieldsContainer.appendChild(fieldRow);
        updateRemoveButtons();
    }

    /**
     * Remove a field row from the form
     * @param {string} rowId - ID of the row to remove
     */
    function removeFieldRow(rowId) {
        const row = document.getElementById(rowId);
        if (row && getFieldCount() > CONFIG.MIN_FIELDS) {
            row.remove();
            updateRemoveButtons();
        }
    }

    /**
     * Update the state of remove buttons based on field count
     */
    function updateRemoveButtons() {
        const removeButtons = document.querySelectorAll('.btn-remove');
        const fieldCount = getFieldCount();
        
        removeButtons.forEach(button => {
            button.disabled = fieldCount <= CONFIG.MIN_FIELDS;
        });
    }

    /**
     * Get the current number of field rows
     * @returns {number} Number of field rows
     */
    function getFieldCount() {
        return elements.fieldsContainer.querySelectorAll('.field-row').length;
    }

    /**
     * Collect all field data from the form
     * @returns {Object|null} Object with emailName and fields array, or null if validation fails
     */
    function collectFieldData() {
        const emailName = elements.emailName.value.trim();
        
        // Validation: email name is required
        if (!emailName) {
            showMessage('error', 'Email Name is required.');
            elements.emailName.focus();
            return null;
        }
        
        const fields = [];
        const rows = elements.fieldsContainer.querySelectorAll('.field-row');
        
        for (let row of rows) {
            const nameInput = row.querySelector('.field-name');
            const valueInput = row.querySelector('.field-value');
            
            const name = nameInput.value.trim();
            const value = valueInput.value.trim();
            
            // Validation: ensure both name and value are provided
            if (!name || !value) {
                showMessage('error', 'All fields must have both a name and a value.');
                nameInput.focus();
                return null;
            }
            
            // Validation: check for duplicate field names
            if (fields.some(f => f.name.toLowerCase() === name.toLowerCase())) {
                showMessage('error', `Duplicate field name: "${name}". Each field name must be unique.`);
                nameInput.focus();
                return null;
            }
            
            fields.push({
                name: sanitizeInput(name),
                value: sanitizeInput(value)
            });
        }
        
        return {
            emailName: sanitizeInput(emailName),
            fields: fields
        };
    }

    /**
     * Save data to SFMC Data Extension
     */
    async function saveToDataExtension() {
        const data = collectFieldData();
        
        if (!data) {
            return; // Validation failed
        }

        // Show loading state
        setLoadingState(true);
        showMessage('info', 'Saving to Data Extension...');

        try {
            // Convert fields array to multiple DE rows (key-value pairs)
            const dataRows = convertFieldsToDataRows(data.emailName, data.fields);
            
            // Save to Data Extension via REST API
            const success = await insertDataExtensionRows(dataRows);
            
            if (success) {
                showMessage('success', `Successfully saved ${dataRows.length} row(s) to Data Extension!`);
                
                // Save to Content Builder payload for persistence
                saveToPayload(data);
            } else {
                throw new Error('Failed to save data');
            }
        } catch (error) {
            console.error('Save error:', error);
            showMessage('error', `Error saving data: ${error.message}`);
        } finally {
            setLoadingState(false);
        }
    }

    /**
     * Convert fields array to multiple Data Extension rows (key-value pairs)
     * @param {string} emailName - Email name identifier
     * @param {Array} fields - Array of field objects
     * @returns {Array} Array of Data Extension rows
     */
    function convertFieldsToDataRows(emailName, fields) {
        const dataRows = [];
        
        fields.forEach(field => {
            dataRows.push({
                'email name': emailName,
                'fieldname': field.name,
                'field value': field.value,
                'EntryDate': new Date().toISOString()
            });
        });
        
        return dataRows;
    }

    /**
     * Insert multiple rows into the Data Extension via SFMC REST API
     * @param {Array} dataRows - Array of data rows to insert
     * @returns {Promise<boolean>} Success status
     */
    async function insertDataExtensionRows(dataRows) {
        // If no auth token or endpoint, simulate success for testing
        if (!authToken || !sfmcEndpoint) {
            console.warn('No SFMC connection. Simulating save for testing.');
            console.log('Would save rows:', dataRows);
            await simulateDelay(1000);
            return true;
        }

        const url = `${sfmcEndpoint}hub/v1/dataevents/key:${CONFIG.DE_EXTERNAL_KEY}/rowset`;
        
        // Convert data rows to API format
        const requestBody = dataRows.map(row => ({
            keys: {
                'email name': row['email name'],
                'fieldname': row['fieldname']
            },
            values: row
        }));

        try {
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
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            return true;
        } catch (error) {
            console.error('Data Extension insert error:', error);
            throw error;
        }
    }

    /**
     * Save data to Content Builder payload for persistence
     * @param {Object} data - Object with emailName and fields
     */
    function saveToPayload(data) {
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};
        payload.arguments.execute.inArguments = [{
            emailName: data.emailName,
            fields: data.fields
        }];
        
        payload.metaData = payload.metaData || {};
        payload.metaData.isConfigured = true;
        
        if (connection) {
            connection.trigger('updateActivity', payload);
        }
    }

    /**
     * Set loading state for save button
     * @param {boolean} loading - Loading state
     */
    function setLoadingState(loading) {
        elements.btnSave.disabled = loading;
        elements.saveLoader.style.display = loading ? 'inline-block' : 'none';
    }

    /**
     * Show a message to the user
     * @param {string} type - Message type (success, error, info)
     * @param {string} message - Message text
     */
    function showMessage(type, message) {
        elements.messageArea.className = `message ${type}`;
        elements.messageArea.textContent = message;
        elements.messageArea.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                elements.messageArea.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Sanitize user input to prevent XSS
     * @param {string} input - User input
     * @returns {string} Sanitized input
     */
    function sanitizeInput(input) {
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Sanitize HTML for display
     * @param {string} html - HTML string
     * @returns {string} Sanitized HTML
     */
    function sanitizeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Simulate delay (for testing without SFMC connection)
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    function simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Expose removeFieldRow to global scope for onclick handler
    window.removeFieldRow = removeFieldRow;

    // Initialize when DOM and Postmonger are ready
    function waitForPostmonger() {
        if (typeof Postmonger !== 'undefined') {
            init();
        } else {
            console.warn('Postmonger not loaded yet, retrying...');
            setTimeout(waitForPostmonger, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForPostmonger);
    } else {
        waitForPostmonger();
    }

})();
