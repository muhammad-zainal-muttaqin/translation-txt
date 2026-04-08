/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Simple middleware to log API requests
const logApiRequests = () => ({
  name: 'log-api-requests',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const originalWrite = res.write;
      const originalEnd = res.end;
      const start = Date.now();
      
      res.write = function(chunk, ...args) {
        return originalWrite.call(this, chunk, ...args);
      };
      
      res.end = function(chunk, ...args) {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        return originalEnd.call(this, chunk, ...args);
      };
      
      next();
    });
  }
});

export default defineConfig({
  plugins: [
    logApiRequests(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'TranslationTXT',
        short_name: 'TranslationTXT',
        description: 'Client-side translation workspace for text and structured text files',
        theme_color: '#1e8f7a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
})
