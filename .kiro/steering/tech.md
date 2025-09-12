# Technology Stack & Build System

## Core Technologies
- **Frontend**: Vanilla TypeScript with strict type checking
- **Build Tool**: Vite 5.x with ES2020 target
- **Testing**: Vitest with jsdom environment
- **HTTP Client**: Native Fetch API for all API communications
- **Encryption**: Web Crypto API for credential security
- **Storage**: Browser LocalStorage and SessionStorage
- **Styling**: Pure CSS3 with modern features

## TypeScript Configuration
- Strict mode enabled with additional safety checks
- ES2020 target with ESNext modules
- Path aliases: `@/*` maps to `src/*`
- No emit mode (Vite handles compilation)
- Exact optional property types enforced

## Build System Commands

### Development
```bash
npm run dev          # Start Vite dev server on port 3000
npm run build        # Build for production
npm run preview      # Preview production build on port 4173
npm start           # Build and preview (production simulation)
```

### Testing
```bash
npm test            # Run tests once
npm run test:watch  # Run tests in watch mode
npm run test:ui     # Run tests with UI interface
```

## Deployment
- Configured for GitHub Pages deployment
- Production base path: `/trendyol-oblio-integration/`
- Assets optimized with esbuild minification
- Source maps enabled for debugging

## Development Guidelines
- Use ES modules exclusively (`type: "module"`)
- Leverage native browser APIs over external libraries
- Maintain zero runtime dependencies for security
- Follow async/await patterns for all asynchronous operations