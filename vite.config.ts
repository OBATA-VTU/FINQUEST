import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Map the Vercel/System environment variable to process.env.API_KEY 
      // This is required for @google/genai to work in the browser build.
      // Use fallback to empty string to prevent JSON.stringify(undefined)
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_GENAI_API_KEY || ""),
      'process.env.DROPBOX_ACCESS_TOKEN': JSON.stringify(env.VITE_DROPBOX_ACCESS_TOKEN || ""),
      'process.env.GOOGLE_DRIVE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_DRIVE_CLIENT_ID || ""),
      'process.env.GOOGLE_DRIVE_CLIENT_SECRET': JSON.stringify(env.VITE_GOOGLE_DRIVE_CLIENT_SECRET || ""),
    },
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
    }
  };
});