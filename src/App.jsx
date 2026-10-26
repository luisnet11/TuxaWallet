/**
 * ============================================================================
 *  TUXAWALLET — Componente raíz (PLACEHOLDER TEMPORAL)
 * ============================================================================
 *  Archivo:   src/App.jsx
 *  Propósito: Placeholder mínimo que confirma que el bootstrap está OK
 *             y que la configuración de Tuxachain se importa correctamente.
 *
 *  ⚠️ ESTE ARCHIVO ES DESECHABLE:
 *  El chat de UI lo reemplazará por el layout real (Tailwind + daisyUI)
 *  y el chat de lógica enganchará aquí el Router en fases posteriores.
 *  No invertir tiempo en estilos aquí.
 * ============================================================================
 */

import {
  TUXACHAIN_CHAIN_ID,
  TUXACHAIN_CHAIN_ID_HEX,
  TUXACHAIN_RPC_URL,
  TUXACHAIN_EXPLORER_URL,
  TUXACHAIN_NEAR_EXPLORER_URL,
  TUXACHAIN_RELAYER,
  TUXACHAIN_GAS_TOKEN_NEAR,
} from './services/tuxachain.config.js';

export default function App() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '1.5rem',
        maxWidth: '720px',
        margin: '0 auto',
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ marginBottom: '0.5rem' }}>TuxaWallet</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        Bootstrap OK ✅ — React montado y configuración de Tuxachain importada.
      </p>

      {/*
        Panel de diagnóstico temporal.
        Sirve para verificar de un vistazo que tuxachain.config.js
        exporta las constantes esperadas y con los valores correctos.
        Se eliminará cuando el chat de UI traiga el layout definitivo.
      */}
      <section
        aria-label="Diagnóstico de red Tuxachain"
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '1rem',
          fontSize: '0.9rem',
          background: '#fafafa',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Red Tuxachain</h2>
        <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
          <li>
            <strong>Chain ID (dec):</strong> {TUXACHAIN_CHAIN_ID}
          </li>
          <li>
            <strong>Chain ID (hex):</strong> {TUXACHAIN_CHAIN_ID_HEX}
          </li>
          <li>
            <strong>RPC:</strong> {TUXACHAIN_RPC_URL}
          </li>
          <li>
            <strong>Explorer EVM:</strong>{' '}
            <a
              href={TUXACHAIN_EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {TUXACHAIN_EXPLORER_URL}
            </a>
          </li>
          <li>
            <strong>Explorer NEAR:</strong>{' '}
            <a
              href={TUXACHAIN_NEAR_EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {TUXACHAIN_NEAR_EXPLORER_URL}
            </a>
          </li>
          <li>
            <strong>Relayer / Engine:</strong> {TUXACHAIN_RELAYER}
          </li>
          <li>
            <strong>Gas token (NEAR):</strong> {TUXACHAIN_GAS_TOKEN_NEAR}
          </li>
        </ul>
      </section>

      <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '1.5rem' }}>
        v0.1.0 — Bootstrap. Este panel será reemplazado por el layout de UI.
      </p>
    </main>
  );
}
