
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Map the Vercel/System environment variable to process.env.GROK_API_KEY 
      // This is required for OpenAI client to work in the browser build.
      // Use fallback to empty string to prevent JSON.stringify(undefined)
      'process.env.GROK_API_KEY': JSON.stringify(env.GROK_API_KEY || ""),
      'process.env.MEGA_API_KEY': JSON.stringify(env.VITE_MEGA_API_KEY || ""),
    },
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
    }
  };
});