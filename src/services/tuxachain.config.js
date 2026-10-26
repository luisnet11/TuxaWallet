/**
 * ============================================================================
 *  TUXACHAIN — Configuración canónica de red para Viem
 * ============================================================================
 *
 *  Archivo:   src/services/tuxachain.config.js
 *  Proyecto:  TuxaWallet
 *  Propósito: Definir el objeto Chain de Tuxachain que Viem usará en toda la
 *             aplicación (publicClient, walletClient, lecturas, escrituras,
 *             helpers de explorer, y wallet_addEthereumChain vía EIP-1193).
 *
 *  ⚠️ NATURALEZA DE TUXACHAIN:
 *  Tuxachain NO es una blockchain independiente ni un L1/L2 tradicional.
 *  Es una **Virtual Chain** de Aurora Cloud: una instancia del Aurora Engine
 *  (motor EVM) desplegada como contrato inteligente sobre la **mainnet de
 *  NEAR Protocol**. Por lo tanto:
 *
 *    - Hereda la seguridad y el consenso de NEAR.
 *    - No tiene validadores propios.
 *    - Su actividad EVM se refleja en NEAR como cross-contract calls.
 *    - Cada Virtual Chain define su propio Chain ID y token de gas.
 *
 *  ⚠️ INVARIANTE DEL PROYECTO:
 *  Chain ID decimal 1313161955  ===  0x4E4542E3 (hexadecimal)
 *  Ese mismo identificador coincide con la cuenta NEAR subyacente:
 *  0x4e4542e3.c.aurora
 *  Si en el futuro alguien cambia uno, DEBEN cambiar los tres en bloque.
 *
 * ============================================================================
 */

import { defineChain } from 'viem';

/* ---------------------------------------------------------------------------
 * 1) OBJETO CHAIN — fuente única de verdad para Viem
 * ------------------------------------------------------------------------ */
export const tuxachain = defineChain({
  /**
   * Chain ID único de la Virtual Chain Tuxachain.
   * Decimal: 1313161955  |  Hex: 0x4E4542E3
   * Coincide con la cuenta NEAR subyacente (0x4e4542e3.c.aurora).
   */
  id: 1313161955,

  /** Nombre legible que se mostrará en firmas y UIs de DApps. */
  name: 'Tuxachain',

  /**
   * Token de gas nativo de la chain.
   * En Tuxachain el gas se paga con ETH puenteado desde NEAR,
   * cuya cuenta NEAR es `eth.bridge.near` (ver constante más abajo).
   */
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },

  /**
   * Endpoints RPC.
   * `default` es el que Viem usa por defecto para `publicClient`.
   * `public` se mantiene apuntando al mismo host para permitir fallback
   * explícito si en el futuro se añade un segundo nodo.
   *
   * URL confirmada por el Director:
   *   https://0x4e4542e3.rpc.aurora-cloud.dev
   */
  rpcUrls: {
    default: {
      http: ['https://0x4e4542e3.rpc.aurora-cloud.dev'],
    },
    public: {
      http: ['https://0x4e4542e3.rpc.aurora-cloud.dev'],
    },
  },

  /**
   * Explorers.
   *
   * `default` → Explorer EVM propio de Tuxachain. Es el que Viem usará
   *             automáticamente en helpers como `getTransactionUrl` y
   *             `getAddressUrl`. Muestra bloques/txs/direcciones EVM.
   *
   * `near`    → Explorer de NEAR Protocol a nivel de capa base. Muestra la
   *             cuenta-contrato subyacente (receipts, XCC, actividad NEAR).
   *             No es un explorer de bloques EVM, por eso NO es `default`.
   */
  blockExplorers: {
    default: {
      name: 'Tuxachain Explorer',
      url: 'https://0x4e4542e3.explorer.aurora-cloud.dev',
    },
    near: {
      name: 'NEAR Protocol Explorer',
      url: 'https://explorer.near.org/accounts/0x4e4542e3.c.aurora',
    },
  },

  /**
   * `testnet: false` porque Tuxachain corre sobre la **mainnet de NEAR**.
   * Si en el futuro se despliega una Virtual Chain de pruebas, este flag
   * deberá cambiar a `true` junto con su propio config.
   */
  testnet: false,
});

/* ---------------------------------------------------------------------------
 * 2) CONSTANTES EXPORTADAS
 *    Reutilizables en store (Zustand), servicios (Viem), vault y UI.
 *    Mantenerlas como strings/números primitivos evita importar el objeto
 *    completo de la chain cuando solo se necesita un valor.
 * ------------------------------------------------------------------------ */

/** Chain ID numérico. Para comparaciones directas (ej: chainId === X). */
export const TUXACHAIN_CHAIN_ID = 1313161955;

/**
 * Chain ID en formato hexadecimal (EIP-155 / EIP-1193).
 * Requerido por `wallet_addEthereumChain` y `wallet_switchEthereumChain`.
 * Formato: string con prefijo 0x, en mayúsculas por convención.
 */
export const TUXACHAIN_CHAIN_ID_HEX = '0x4E4542E3';

/** Endpoint RPC principal de Tuxachain. */
export const TUXACHAIN_RPC_URL = 'https://0x4e4542e3.rpc.aurora-cloud.dev';

/** Explorer EVM propio de Tuxachain (bloques/txs/direcciones). */
export const TUXACHAIN_EXPLORER_URL =
  'https://0x4e4542e3.explorer.aurora-cloud.dev';

/**
 * Explorer de NEAR Protocol para la cuenta subyacente.
 * Útil para vistas de transparencia ("ver esta tx en NEAR") y debugging XCC.
 */
export const TUXACHAIN_NEAR_EXPLORER_URL =
  'https://explorer.near.org/accounts/0x4e4542e3.c.aurora';

/**
 * Cuenta NEAR del Aurora Engine / relayer de Tuxachain.
 * Coincide con el identificador que forma el Chain ID (ver invariante arriba).
 * Necesaria para lógica futura de gas patrocinado / meta-transacciones.
 */
export const TUXACHAIN_RELAYER = '0x4e4542e3.c.aurora';

/**
 * Cuenta NEAR del token de gas puenteado (ETH de NEAR).
 * Documental: el gas de Tuxachain se liquida con ETH originado en esta cuenta.
 */
export const TUXACHAIN_GAS_TOKEN_NEAR = 'eth.bridge.near';
