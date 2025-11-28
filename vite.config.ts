import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Some libraries use process.env.NODE_ENV or other process.env variables.
    // This prevents "process is not defined" error in the browser.
    'process.env': {} 
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  }
});