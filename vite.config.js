import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // <-- IMPORTANTE

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- IMPORTANTE
  ],
  base: '/',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
