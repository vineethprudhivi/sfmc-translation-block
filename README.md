# SFMC Translation Data Entry Custom Content Block

A Salesforce Marketing Cloud (SFMC) custom content block that enables marketers to create dynamic field name-value pairs and save them to a Data Extension for external translation processing.

## Purpose

This custom block streamlines the workflow of sending email content to external translation engines by:
- Providing an intuitive interface for defining email content fields
- Using key-value pair storage for maximum flexibility
- Saving each field as a separate Data Extension row
- Supporting dynamic field addition/removal without schema changes
- Validating input to ensure data integrity

## Features

- **Key-Value Pair Storage**: Each field stored as a separate row for maximum flexibility
- **Dynamic Field Management**: Add or remove field name-value pairs as needed
- **Email Name Identifier**: Groups all fields for a specific email together
- **Default Fields**: Pre-populated with common fields (subject, preheader, header, body, footer)
- **Data Validation**: Ensures email name is provided, all fields have names and values, prevents duplicates
- **Data Extension Integration**: Saves data directly to SFMC Data Extension via REST API
- **User-Friendly Interface**: Clean, Salesforce-styled UI with responsive design
- **Error Handling**: Comprehensive error messages and loading states
- **No Schema Changes**: Add any field types without modifying Data Extension schema

## Quick Start

### Prerequisites

1. Salesforce Marketing Cloud account with Content Builder access
2. Data Extension created with appropriate columns
3. API credentials (automatically provided by SFMC in Content Builder context)

### Data Extension Setup

Create a Data Extension with the following structure (key-value pair storage):

| Column Name | Data Type | Length | Primary Key | Required | Description |
|-------------|-----------|--------|-------------|----------|-------------|
| email name  | Text      | 255    | Yes         | Yes      | Identifies which email (e.g., "Welcome Email") |
| fieldname   | Text      | 255    | Yes         | Yes      | Field type (e.g., "subject", "preheader") |
| field value | Text      | 4000   | No          | Yes      | The actual content for translation |
| EntryDate   | Date      | -      | No          | No       | Timestamp when record was created |

**Important Notes:**
- **Composite Primary Key**: Use both `email name` + `fieldname` as the primary key
- This allows multiple fields (subject, preheader, header, etc.) for the same email
- Each field-value pair creates a separate row in the Data Extension
- Field names can be anything - no schema changes needed for new field types
- For example, one email might create 5 rows (one for each field: subject, preheader, header, body, footer)

### Installation

1. **Clone or download this repository**
   ```powershell
   git clone <repository-url>
   cd sfmc-custom-block
   ```

2. **Configure Data Extension External Key**
   
   Edit [customBlock.js](customBlock.js#L14) and update the `DE_EXTERNAL_KEY`:
   ```javascript
   const CONFIG = {
       DE_EXTERNAL_KEY: 'YourDataExtensionExternalKey', // Update this
       // ...
   };
   ```

3. **Host the files**
   
   Upload `index.html` and `customBlock.js` to a publicly accessible web server:
   - SFMC CloudPages (recommended)
   - External web hosting
   - CDN

   The files must be served over HTTPS.

4. **Create Custom Content Block in SFMC**
   
   - Navigate to Content Builder
   - Create New > Custom Content Block
   - Provide the URL to your hosted `index.html`
   - Save the block

### Usage

1. **Drag the custom block** into your email in Content Builder
2. **Enter the Email Name** (e.g., "Welcome Email", "Newsletter March 2026") - this acts as the identifier
3. **Add or remove fields** using the + and − buttons
4. **Enter field names** (e.g., subject, preheader, header) **and values** for content that needs translation
5. **Click "Save to Data Extension"** to persist the data
6. Each field creates a separate row in the DE, all linked by the email name
7. The data is now available in your Data Extension for export to translation services

**Example Output:**
If email name is "Welcome Email" with 3 fields, you'll get 3 rows:

| email name | fieldname | field value |
|------------|-----------|-------------|
| Welcome Email | subject | Welcome to our platform! |
| Welcome Email | preheader | Get started today |
| Welcome Email | header | Hello and welcome |

## Environment Variables

Configure these in [customBlock.js](customBlock.js):

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DE_EXTERNAL_KEY` | Data Extension external key | `TranslationDataExtension` | Yes |
| `MIN_FIELDS` | Minimum number of fields | `1` | No |
| `MAX_FIELDS` | Maximum number of fields | `20` | No |

## Architecture

### File Structure

```
sfmc-custom-block/
├── index.html          # UI and styling
├── customBlock.js      # Business logic and SFMC integration
└── README.md          # Documentation
```

### Key Components

- **Postmonger Integration**: Communication layer between custom block and SFMC
- **Data Collection Module**: Gathers and validates field data
- **REST API Client**: Interacts with SFMC Data Extension APIs
- **UI Manager**: Handles dynamic field rendering and user interactions

### Data Flow

1. User enters field names and values in the UI
2. JavaScript validates input (required fields, duplicates, format)
3. Data is converted to Data Extension row format
4. REST API call saves data to the specified Data Extension
5. Response is handled and user receives confirmation

## Testing

### Manual Testing (Without SFMC)

The block includes a testing mode that simulates SFMC connection:

1. Open `index.html` directly in a browser
2. The block will operate without actual SFMC integration
3. Save operations will simulate success after a delay
4. Check browser console for debug information

### Integration Testing

1. Deploy to SFMC Content Builder
2. Create a test email
3. Add the custom block
4. Enter test data
5. Save and verify data appears in Data Extension
6. Check for proper error handling (invalid data, API failures)

### Coverage Goals

- **Input Validation**: ≥80% coverage
- **Data Transformation**: ≥80% coverage
- **API Integration**: Mock-based unit tests
- **UI Interactions**: End-to-end tests recommended

## Security Considerations

- **Input Sanitization**: All user input is sanitized to prevent XSS attacks
- **API Authentication**: Uses SFMC-provided OAuth tokens
- **HTTPS Only**: All connections must use secure transport
- **No Hardcoded Secrets**: Authentication handled by SFMC platform
- **Output Encoding**: HTML entities encoded before display

## Troubleshooting

### Data Not Saving

**Symptom**: Save button shows success but data doesn't appear in DE

**Solutions**:
1. Verify Data Extension external key is correct in customBlock.js
2. Check that your DE has the correct schema: `email name`, `fieldname`, `field value` columns
3. Ensure composite primary key is set: `email name` + `fieldname`
4. Verify API user has permission to write to the Data Extension
5. Check browser console for error messages
6. Ensure field names don't exceed 255 characters

### Authentication Errors

**Symptom**: "API error: 401" in console

**Solutions**:
1. Verify the block is accessed through SFMC Content Builder (not directly)
2. Check that Marketing Cloud app has proper API permissions
3. Refresh the Content Builder page and try again

### Maximum Fields Reached

**Symptom**: + button doesn't add new fields

**Solutions**:
1. Default maximum is 20 fields
2. Update `MAX_FIELDS` in [customBlock.js](customBlock.js#L16) if needed
3. Consider splitting data across multiple blocks for very large forms

## Release Notes

### Version 1.0.0 (Initial Release)

**Features**:
- Key-value pair storage model (email name, fieldname, field value)
- Email name identifier for grouping fields
- Dynamic field addition/removal (up to 20 fields)
- Input validation (required fields, duplicates, XSS prevention)
- Data Extension integration via REST API
- Default fields: subject, preheader, header, body, footer
- Comprehensive error handling
- Testing mode for local development
- No DE schema changes needed for new field types

**Known Limitations**:
- Supports text fields only (no rich text or file uploads)
- Maximum 20 fields per email entry (configurable)
- Composite primary key (email name + fieldname) required in DE
- All fields for one email must be saved together in one session

## API Reference

### Configuration Object

```javascript
const CONFIG = {
    DE_EXTERNAL_KEY: 'TranslationDataExtension',
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
```

### Data Extension Row Format

Each field-value pair creates a separate row:

```json
[
  {
    "email name": "Welcome Email",
    "fieldname": "subject",
    "field value": "Welcome to our platform!",
    "EntryDate": "2026-02-23T10:30:00.000Z"
  },
  {
    "email name": "Welcome Email",
    "fieldname": "preheader",
    "field value": "Get started today",
    "EntryDate": "2026-02-23T10:30:00.000Z"
  },
  {
    "email name": "Welcome Email",
    "fieldname": "header",
    "field value": "Hello and welcome",
    "EntryDate": "2026-02-23T10:30:00.000Z"
  }
]
```

**Query Example:**
To get all fields for a specific email:
```sql
SELECT fieldname, [field value]
FROM TranslationDataExtension
WHERE [email name] = 'Welcome Email'
```

## Contributing

When contributing to this project, please follow these guidelines:

1. **Code Style**: Follow existing patterns and conventions
2. **Testing**: Maintain ≥80% test coverage
3. **Documentation**: Update README for any functional changes
4. **Security**: Validate all inputs, sanitize all outputs
5. **DRY Principle**: Eliminate code duplication

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review SFMC Content Builder documentation
3. Contact your SFMC administrator
4. Review browser console for detailed error messages

## License

Internal use only - Deloitte US Consulting

---

**Last Updated**: February 23, 2026
