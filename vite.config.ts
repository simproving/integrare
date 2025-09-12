import { defineConfig } from 'vite';

declare const process: {
  env: {
    NODE_ENV?: string;
  };
};

export default defineConfig(({ command }) => ({
  // GitHub Pages base path - will be /repository-name/ when deployed via GitHub Actions
  // For local development and preview, this will be relative paths
  base: command === 'build' && process.env.GITHUB_ACTIONS ? '/integrare/' : './',
  
  // Build configuration for production optimization
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          vendor: ['jsdom']
        }
      }
    }
  },
  
  // Asset handling configuration
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  
  // Preview server configuration (for testing production builds)
  preview: {
    port: 4173,
    open: true
  },
  
  // Integrate existing Vitest configuration
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  
  // Ensure proper module resolution
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  
  // Define global constants
  define: {
    __DEV__: process.env.NODE_ENV !== 'production'
  }
}));