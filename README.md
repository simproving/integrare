# Trendyol-Oblio Invoice Integration

A frontend-only web application that provides manual control for creating invoices in Oblio accounting software based on orders from Trendyol marketplace.

## Project Structure

```
├── src/
│   ├── models/           # TypeScript interfaces and data models
│   │   ├── trendyol.ts   # Trendyol API models
│   │   ├── oblio.ts      # Oblio API models
│   │   ├── common.ts     # Common interfaces
│   │   └── storage.ts    # Storage models
│   ├── services/         # Business logic and API clients
│   │   ├── trendyol-client.ts    # Trendyol API client
│   │   ├── oblio-client.ts       # Oblio API client
│   │   ├── storage-service.ts    # Storage management
│   │   ├── sync-service.ts       # Sync orchestration
│   │   └── transform-service.ts  # Data transformation
│   ├── ui/               # UI components
│   │   ├── app.ts        # Main application controller
│   │   ├── dashboard.ts  # Dashboard interface
│   │   ├── orders-list.ts        # Orders table component
│   │   ├── config-panel.ts      # Configuration panel
│   │   └── loading-spinner.ts   # Loading indicator
│   ├── styles/
│   │   └── main.css      # Application styles
│   └── main.ts           # Application entry point
├── index.html            # Main HTML file
├── tsconfig.json         # TypeScript configuration
├── package.json          # Project dependencies
└── README.md             # Project documentation
```

## Features

- **Manual Invoice Synchronization**: User-controlled process for creating invoices
- **Secure Credential Storage**: Encrypted storage of API credentials in browser
- **Order Management**: Fetch and filter orders without invoices
- **Batch Processing**: Select and process multiple orders at once
- **Error Handling**: Comprehensive error handling with retry functionality
- **Configuration Management**: Easy setup and management of API credentials

## Technology Stack

- **Frontend**: Vanilla JavaScript with TypeScript
- **HTTP Client**: Fetch API for API communications
- **UI Styling**: CSS3 with modern features
- **Storage**: Browser Local Storage with encryption
- **Build Tool**: TypeScript compiler (tsc)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:8000`

## Development

- `npm run dev` - Start TypeScript compiler in watch mode
- `npm run build` - Build the project
- `npm run serve` - Start a local HTTP server

## Configuration

The application requires API credentials for both Trendyol and Oblio:

### Trendyol API
- API Key
- Secret Key
- Supplier ID
- Store Front Code (TR for Turkey, INT for International)

### Oblio API
- Email
- Secret Key
- Company CIF
- Work Station Number

All credentials are encrypted and stored locally in the browser.

## Security

- API credentials are encrypted using Web Crypto API
- All communications use HTTPS
- No sensitive data is transmitted to external servers
- Local storage encryption for credential protection