# Design Document

## Overview

This design outlines the conversion of the existing TypeScript project to use Vite as the build tool and the setup of GitHub Pages deployment. The current project uses a custom TypeScript compilation process with manual asset copying. We'll modernize this to use Vite for better development experience, faster builds, and simplified deployment.

## Architecture

### Current Architecture
- Custom TypeScript build process using `tsc`
- Manual asset copying with Node.js scripts
- Separate development and production HTML files
- Python HTTP server for local development

### Target Architecture
- Vite as the primary build tool and development server
- Unified HTML file with Vite's asset handling
- GitHub Actions for automated deployment
- GitHub Pages for hosting

## Components and Interfaces

### 1. Vite Configuration
**File:** `vite.config.ts`
- Configure build settings for GitHub Pages
- Set proper base path for repository deployment
- Configure asset handling and optimization
- Integrate with existing Vitest configuration

### 2. Package.json Updates
**File:** `package.json`
- Add Vite as a dependency
- Update build scripts to use Vite
- Add deployment scripts
- Remove custom build logic

### 3. HTML File Consolidation
**Files:** `index.html` (updated)
- Merge development and production HTML into single file
- Use Vite's asset resolution
- Remove manual script/style references

### 4. GitHub Actions Workflow
**File:** `.github/workflows/deploy.yml`
- Automated build on push to main branch
- Deploy to GitHub Pages
- Handle build artifacts and caching

### 5. TypeScript Configuration Updates
**File:** `tsconfig.json`
- Adjust for Vite compatibility
- Update module resolution if needed
- Maintain existing strict settings

## Data Models

### Build Configuration
```typescript
interface ViteConfig {
  base: string;           // GitHub Pages base path
  build: {
    outDir: string;       // Output directory
    assetsDir: string;    // Assets directory
    sourcemap: boolean;   // Source maps for debugging
  };
  test: {
    environment: string;  // Test environment (jsdom)
    globals: boolean;     // Global test utilities
  };
}
```

### Deployment Configuration
```typescript
interface DeploymentConfig {
  repository: string;     // GitHub repository name
  branch: string;         // Deployment branch (gh-pages)
  buildCommand: string;   // Build command to execute
  outputDir: string;      // Directory to deploy
}
```

## Error Handling

### Build Errors
- Vite will provide detailed error messages for compilation issues
- TypeScript errors will be displayed with file locations
- Asset resolution errors will be caught during build

### Deployment Errors
- GitHub Actions will fail gracefully with error logs
- Build failures will prevent deployment
- Network issues during deployment will be retried

### Runtime Errors
- Existing error handling in the application will be preserved
- Source maps will be available for debugging in production

## Testing Strategy

### Development Testing
- Existing Vitest configuration will be integrated with Vite
- All current tests should continue to work
- Hot module replacement for faster test development

### Build Testing
- Verify that production build generates correct assets
- Test that all routes and resources work with GitHub Pages base path
- Validate that the deployed application functions correctly

### Deployment Testing
- Test GitHub Actions workflow in a fork or test repository
- Verify that the deployment process completes successfully
- Confirm that the live site reflects the latest changes

## Implementation Details

### Vite Configuration Strategy
```typescript
// vite.config.ts structure
export default defineConfig({
  base: '/repository-name/',  // Will be set to actual repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  test: {
    // Inherit from existing vitest.config.ts
  }
});
```

### Asset Path Resolution
- Vite will handle all asset imports automatically
- CSS imports will be processed and bundled
- TypeScript modules will be compiled and bundled
- Static assets will be copied with proper hashing

### GitHub Pages Configuration
- Repository settings will need to be configured for Pages
- Source will be set to GitHub Actions
- Custom domain can be configured if needed

### Backward Compatibility
- All existing TypeScript code will work without changes
- Current test suite will be preserved
- Application functionality will remain identical

## Migration Steps Overview

1. Install Vite and update dependencies
2. Create Vite configuration file
3. Update package.json scripts
4. Consolidate HTML files
5. Create GitHub Actions workflow
6. Test build and deployment process
7. Update documentation