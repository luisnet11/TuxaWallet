/**
 * ============================================================================
 *  TUXAWALLET — Punto de entrada de React
 * ============================================================================
 *  Archivo:   src/main.jsx
 *  Propósito: Arrancar React y montar <App /> en el #root de index.html.
 *             Este archivo debe mantenerse mínimo y estable.
 *             El Router y los Providers se añadirán en fases posteriores
 *             (no aquí todavía, para no acoplar el bootstrap).
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Localiza el punto de montaje definido en index.html.
// Si no existe, lanzamos un error explícito en lugar de fallar silenciosamente.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error(
    '[TuxaWallet] No se encontró el elemento #root en index.html. ' +
      'Verifica que index.html conserve <div id="root"></div>.'
  );
}

ReactDOM.createRoot(rootElement).render(
  // StrictMode ayuda a detectar efectos secundarios inseguros en desarrollo.
  // No afecta el comportamiento en producción.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
