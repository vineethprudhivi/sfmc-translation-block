/**
 * SFMC Custom Content Block for Translation Data Entry
 * 
 * This block allows marketers to create field name-value pairs
 * and save them to a Data Extension for translation processing.
 * 
 * Uses backend API for SFMC authentication and Data Extension writes.
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        API_ENDPOINT: '/api/save-to-de', // Backend API endpoint
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
    let fieldCounter = 0;
    let savedData = {}; // Store data for Content Builder persistence

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
        loadSavedData();
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
     * Load saved data from localStorage (for persistence)
     */
    function loadSavedData() {
        try {
            const saved = localStorage.getItem('sfmc-translation-block-data');
            if (saved) {
                savedData = JSON.parse(saved);
                
                if (savedData.emailName) {
                    elements.emailName.value = savedData.emailName;
                }
                
                if (savedData.fields && savedData.fields.length > 0) {
                    // Clear default fields and load saved ones
                    elements.fieldsContainer.innerHTML = '';
                    fieldCounter = 0;
                    savedData.fields.forEach(field => {
                        addFieldRow(field.name, field.value);
                    });
                    return; // Skip rendering default fields
                }
            }
        } catch (error) {
            console.warn('Could not load saved data:', error);
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
     * Save data to SFMC Data Extension via backend API
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
            // Call backend API to save to Data Extension
            const success = await callBackendAPI(data);
            
            if (success) {
                showMessage('success', `Successfully saved ${data.fields.length} field(s) to Data Extension!`);
                
                // Save to localStorage for persistence
                saveToLocalStorage(data);
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
     * Call backend API to insert rows into Data Extension
     * @param {Object} data - Object with emailName and fields
     * @returns {Promise<boolean>} Success status
     */
    async function callBackendAPI(data) {
        const url = CONFIG.API_ENDPOINT;
        
        console.log('Calling backend API:', url);
        console.log('Sending data:', data);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailName: data.emailName,
                    fields: data.fields
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `API error: ${response.status}`);
            }

            console.log('Backend API response:', result);
            return result.success;
            
        } catch (error) {
            console.error('Backend API error:', error);
            throw error;
        }
    }

    /**
     * Save data to localStorage for persistence
     * @param {Object} data - Object with emailName and fields
     */
    function saveToLocalStorage(data) {
        try {
            localStorage.setItem('sfmc-translation-block-data', JSON.stringify(data));
            console.log('Data saved to localStorage');
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
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

    // Expose removeFieldRow to global scope for onclick handler
    window.removeFieldRow = removeFieldRow;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
