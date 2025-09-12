# Product Overview

## Trendyol-Oblio Invoice Integration

A frontend-only web application that provides manual control for creating invoices in Oblio accounting software based on orders from Trendyol marketplace.

### Key Features
- **Manual Invoice Synchronization**: User-controlled process for creating invoices from Trendyol orders
- **Secure Credential Storage**: Encrypted storage of API credentials using Web Crypto API
- **Order Management**: Fetch and filter orders without invoices from Trendyol
- **Batch Processing**: Select and process multiple orders at once
- **Error Handling**: Comprehensive error handling with retry functionality
- **Configuration Management**: Easy setup and management of API credentials for both services

### Target Users
- E-commerce businesses selling on Trendyol marketplace
- Accounting teams using Oblio for invoice management
- Small to medium businesses requiring integration between these platforms

### Security Focus
- All API credentials are encrypted and stored locally in browser
- No sensitive data transmitted to external servers beyond the required APIs
- HTTPS-only communications
- Local storage encryption for credential protection