/**
 * ============================================================================
 *  TUXAWALLET — Cliente Viem para Tuxachain
 * ============================================================================
 *  Archivo:   src/services/viemClient.js
 *  Propósito: Exponer el "puente vivo" entre TuxaWallet y Tuxachain.
 *             Aquí Viem deja de ser configuración y empieza a ejecutar
 *             lecturas (publicClient) y prepara firmas (walletClient).
 *
 *  DISEÑO DE SEGURIDAD (CRÍTICO):
 *  1) publicClient  → SINGLETON. Solo lectura, sin llaves. Seguro reutilizar.
 *  2) walletClient  → FÁBRICA BAJO DEMANDA. Recibe una `account` (descifrada
 *                     desde /src/vault), se usa para UNA operación de firma
 *                     y se descarta. La llave privada NO vive en memoria
 *                     más tiempo del estrictamente necesario.
 *  3) NO se guarda, cifra ni persiste ninguna llave aquí. Eso es /src/vault.
 *  4) NO se inyecta window.ethereum aquí. Eso es walletProvider.js.
 * ============================================================================
 */

import {
  createPublicClient,
  createWalletClient,
  http,
} from 'viem';
import {
  tuxachain,
  TUXACHAIN_CHAIN_ID,
  TUXACHAIN_CHAIN_ID_HEX,
  TUXACHAIN_RPC_URL,
} from './tuxachain.config.js';

/* ---------------------------------------------------------------------------
 * 1) PUBLIC CLIENT (SINGLETON — SOLO LECTURA)
 *    Instanciado una única vez en el módulo. Sin llaves. Reutilizable.
 *    Usos: getBalance, readContract, getBlockNumber, estimateGas, etc.
 * ------------------------------------------------------------------------ */
const _publicClient = createPublicClient({
  chain: tuxachain,
  transport: http(TUXACHAIN_RPC_URL, {
    // Reintentos básicos ante fallos transitorios del RPC.
    retryCount: 2,
    // Timeout por petición: 20s. Ajustable si Tuxachain responde lento.
    timeout: 20_000,
  }),
});

/**
 * Devuelve el publicClient singleton.
 * Se expone como función (no como export directo del objeto) para evitar
 * importaciones accidentales que podrían mutar el transporte.
 */
export function getTuxaPublicClient() {
  return _publicClient;
}

/* ---------------------------------------------------------------------------
 * 2) WALLET CLIENT (FÁBRICA BAJO DEMANDA — FIRMA CON LLAVE)
 *    Recibe una `account` de Viem (LocalAccount o { address, privateKey }).
 *    NO se exporta una instancia global: cada flujo de firma crea, usa y
 *    descarta su propio walletClient.
 *
 *    ⚠️ El `account` DEBE venir ya descifrado desde /src/vault.
 *       Este módulo NO descifra, NO pide contraseña, NO persiste nada.
 * ------------------------------------------------------------------------ */
export function createTuxaWalletClient(account) {
  if (!account) {
    throw new Error(
      '[TuxaWallet] createTuxaWalletClient requiere un `account` de Viem ' +
        'descifrado desde el vault. Recibido: ' + account
    );
  }

  const walletClient = createWalletClient({
    chain: tuxachain,
    transport: http(TUXACHAIN_RPC_URL, {
      retryCount: 1, // menos reintentos en firma (evita duplicar txs)
      timeout: 30_000,
    }),
    account,
  });

  /**
   * Helper de "uso y descarte": ejecuta un callback con el walletClient
   * y garantiza que las referencias locales queden liberables al terminar.
   * No borra la cuenta del llamador (eso es responsabilidad de /src/vault),
   * pero sí desaconseja almacenarla más allá del callback.
   *
   * Ejemplo de uso:
   *   await withTuxaWalletClient(account, async (wallet) => {
   *     const hash = await wallet.sendTransaction({ to, value });
   *     return hash;
   *   });
   */
  walletClient.__disposeAfterUse = async (callback) => {
    return callback(walletClient);
  };

  return walletClient;
}

/* ---------------------------------------------------------------------------
 * 3) HELPERS EIP-1193 (PARA DAPPS Y WALLET INYECTADA)
 *    Construyen los objetos que espera `window.ethereum.request` en:
 *      - wallet_addEthereumChain
 *      - wallet_switchEthereumChain
 *    Útiles cuando una DApp o el propio usuario deba añadir/cambiar
 *    Tuxachain en MetaMask, Phantom, Rabby, etc.
 * ------------------------------------------------------------------------ */

/**
 * Parámetros para `wallet_addEthereumChain`.
 * Formato oficial EIP-3085 (objeto con `chainId` en hex, `rpcUrls` array,
 * `nativeCurrency`, etc.).
 */
export function buildAddEthereumChainParams() {
  return {
    chainId: TUXACHAIN_CHAIN_ID_HEX,
    chainName: tuxachain.name,
    nativeCurrency: tuxachain.nativeCurrency,
    rpcUrls: [TUXACHAIN_RPC_URL],
    blockExplorerUrls: [tuxachain.blockExplorers.default.url],
  };
}

/**
 * Parámetros para `wallet_switchEthereumChain`.
 * Formato oficial EIP-3326. Solo requiere el chainId en hex.
 */
export function buildSwitchEthereumChainParams() {
  return {
    chainId: TUXACHAIN_CHAIN_ID_HEX,
  };
}

/**
 * Valida si un chainId (numérico o hex) corresponde a Tuxachain.
 * Acepta tanto `1313161955` como `'0x4E4542E3'` (case-insensitive).
 */
export function isOnTuxachain(chainId) {
  if (chainId == null) return false;
  if (typeof chainId === 'number') {
    return chainId === TUXACHAIN_CHAIN_ID;
  }
  if (typeof chainId === 'string') {
    return chainId.toLowerCase() === TUXACHAIN_CHAIN_ID_HEX.toLowerCase();
  }
  return false;
  }
