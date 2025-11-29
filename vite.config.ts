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
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_GENAI_API_KEY),
      // Polyfill other process.env calls to avoid crashes
      'process.env': {} 
    },
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
    }
  };
});