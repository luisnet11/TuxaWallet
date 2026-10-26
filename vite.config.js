/**
 * ============================================================================
 *  TUXAWALLET — Configuración de Vite
 * ============================================================================
 *  Archivo:   vite.config.js  (raíz del repo)
 *  Propósito: Configuración mínima del empaquetador para React + Vite.
 *             Se irá ampliando cuando se agregue Capacitor (build móvil).
 * ============================================================================
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Plugin oficial de React (JSX, Fast Refresh en dev).
  plugins: [react()],

  // Base raíz. Cuando se compile para Capacitor (APK), se ajustará a './'.
  base: '/',

  server: {
    port: 5173,       // Puerto por defecto de Vite.
    host: true,       // Permite acceso desde la red local (útil en móvil).
  },

  build: {
    outDir: 'dist',   // Carpeta de salida estándar para Vercel.
    sourcemap: false, // Desactivado en producción por seguridad.
  },
});
