import { defineConfig } from 'vite';

declare const process: {
  env: {
    NODE_ENV?: string;
  };
};

export default defineConfig({
  // GitHub Pages base path - will be /repository-name/ when deployed
  // For local development, this will be '/'
  base: process.env.NODE_ENV === 'production' ? '/trendyol-oblio-integration/' : '/',
  
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
  assetsInclude: ['**/*.css', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  
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
});