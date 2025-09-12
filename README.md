# Trendyol-Oblio Invoice Integration

A frontend-only web application that provides manual control for creating invoices in Oblio accounting software based on orders from Trendyol marketplace.

## Project Structure

```
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions deployment workflow
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
│   ├── test/             # Test files and setup
│   │   └── setup.ts      # Test environment configuration
│   └── main.ts           # Application entry point
├── dist/                 # Build output directory (generated)
├── index.html            # Main HTML file
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Project dependencies and scripts
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

- **Frontend**: Vanilla TypeScript with strict type checking
- **Build Tool**: Vite 5.x with ES2020 target
- **Testing**: Vitest with jsdom environment
- **HTTP Client**: Native Fetch API for all API communications
- **Encryption**: Web Crypto API for credential security
- **Storage**: Browser LocalStorage and SessionStorage
- **Styling**: Pure CSS3 with modern features

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Development Commands

### Development
- `npm run dev` - Start Vite dev server on port 3000 with hot module replacement
- `npm run build` - Build for production with optimizations
- `npm run preview` - Preview production build on port 4173
- `npm start` - Build and preview (production simulation)

### Testing
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI interface

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment

1. **Enable GitHub Pages**: Go to your repository settings → Pages → Source → Select "GitHub Actions"

2. **Push to main branch**: Any push to the main branch will automatically trigger the deployment workflow

3. **Monitor deployment**: Check the Actions tab in your GitHub repository to monitor the deployment progress

4. **Access your site**: Once deployed, your site will be available at `https://yourusername.github.io/repository-name/`

### Manual Deployment

If you need to deploy manually:

1. Build the project:
   ```bash
   npm run build
   ```

2. The built files will be in the `dist/` directory, ready for deployment to any static hosting service

### Deployment Configuration

- **Base Path**: Configured for GitHub Pages repository deployment (`/repository-name/`)
- **Build Output**: Static files generated in `dist/` directory
- **Assets**: Optimized with esbuild minification and proper hashing
- **Source Maps**: Enabled for debugging in production

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

## Troubleshooting

### Common Issues

#### Development Server Won't Start
- **Issue**: `npm run dev` fails to start
- **Solution**: 
  - Ensure Node.js version 16+ is installed
  - Delete `node_modules` and run `npm install` again
  - Check if port 3000 is already in use

#### Build Failures
- **Issue**: `npm run build` fails with TypeScript errors
- **Solution**:
  - Run `npm run test` to check for type errors
  - Ensure all imports use correct file extensions
  - Check `tsconfig.json` configuration

#### GitHub Pages Deployment Issues
- **Issue**: Site doesn't load correctly on GitHub Pages
- **Solution**:
  - Verify the base path in `vite.config.ts` matches your repository name
  - Check that GitHub Pages is enabled in repository settings
  - Ensure the deployment workflow completed successfully in Actions tab

#### Assets Not Loading
- **Issue**: CSS/JS files return 404 errors
- **Solution**:
  - Verify the base path configuration in `vite.config.ts`
  - Check that all asset imports use relative paths
  - Clear browser cache and try again

#### Hot Module Replacement Not Working
- **Issue**: Changes don't reflect immediately in development
- **Solution**:
  - Restart the development server (`npm run dev`)
  - Check browser console for WebSocket connection errors
  - Ensure firewall isn't blocking the development server

### Getting Help

If you encounter issues not covered here:
1. Check the [Vite documentation](https://vitejs.dev/guide/troubleshooting.html)
2. Review the GitHub Actions logs in the repository's Actions tab
3. Ensure all dependencies are up to date with `npm update`