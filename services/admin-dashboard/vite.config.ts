import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
    'import.meta.env.VITE_ZITADEL_ISSUER': JSON.stringify(process.env.VITE_ZITADEL_ISSUER || ''),
    'import.meta.env.VITE_ZITADEL_CLIENT_ID': JSON.stringify(process.env.VITE_ZITADEL_CLIENT_ID || ''),
    'import.meta.env.VITE_ZITADEL_REDIRECT_URI': JSON.stringify(process.env.VITE_ZITADEL_REDIRECT_URI || ''),
    'import.meta.env.VITE_ZITADEL_POST_LOGOUT_URI': JSON.stringify(process.env.VITE_ZITADEL_POST_LOGOUT_URI || ''),
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    testTimeout: 30000,
  },
});
