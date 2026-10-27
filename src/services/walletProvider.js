/**
 * ============================================================================
 *  TUXAWALLET — Adaptador EIP-1193 (Wallet Provider)
 * ============================================================================
 *  Archivo:   src/services/walletProvider.js
 *  Propósito: Exponer la billetera TuxaWallet a DApps externas inyectando
 *             un objeto compatible con el estándar EIP-1193 en `window.tuxachain`.
 *
 *  DISEÑO DE SEGURIDAD:
 *  - El provider NO guarda llaves privadas. Cuando una DApp pide firmar,
 *    lee el `mnemonicSession` del estado (RAM), deriva la llave, firma
 *    localmente usando viem, y descarta la llave inmediatamente.
 * ============================================================================
 */

import { useWalletStore } from '../store/useWalletStore.js';
import { createTuxaWalletClient } from './viemClient.js';
import { deriveAccount } from '../vault/walletVault.js';
import { TUXACHAIN_CHAIN_ID_HEX, TUXACHAIN_CHAIN_ID } from './tuxachain.config.js';
import { hexToBigInt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

class TuxaProvider {
  constructor() {
    this.isTuxaWallet = true;
    this.isMetaMask = false; // Evita conflictos con MetaMask
    this.listeners = new Map();
  }

  /* -------------------------------------------------------------------
   * 1) MÉTODO PRINCIPAL: request (Manejo de RPC de DApps)
   * ---------------------------------------------------------------- */
  async request({ method, params }) {
    const store = useWalletStore.getState();

    // Métodos que NO requieren firma ni desbloqueo (lectura pública)
    switch (method) {
      case 'eth_chainId':
        return TUXACHAIN_CHAIN_ID_HEX;

      case 'net_version':
        return TUXACHAIN_CHAIN_ID.toString();

      case 'eth_accounts':
        return store.isUnlocked && store.activeAccount 
          ? [store.activeAccount.address] 
          : [];

      case 'eth_requestAccounts':
        if (!store.isUnlocked || !store.activeAccount) {
          throw new Error('TuxaWallet: Billetera bloqueada. Desbloquéala primero.');
        }
        return [store.activeAccount.address];

      case 'personal_sign':
        return this._handlePersonalSign(params, store);

      case 'eth_sendTransaction':
        return this._handleSendTransaction(params, store);

      // Métodos comunes que redirigimos al RPC de Tuxachain
      case 'eth_blockNumber':
      case 'eth_getBalance':
      case 'eth_call':
      case 'eth_estimateGas':
      case 'eth_gasPrice':
      case 'eth_getTransactionByHash':
      case 'eth_getTransactionReceipt':
        return this._forwardToRpc(method, params);

      default:
        throw new Error(`TuxaWallet: Método no soportado -> ${method}`);
    }
  }

  /* -------------------------------------------------------------------
   * 2) LÓGICA DE FIRMA LOCAL (Usando viem/accounts)
   * ---------------------------------------------------------------- */
  
  async _handlePersonalSign(params, store) {
    if (!store.isUnlocked || !store.mnemonicSession) {
      throw new Error('TuxaWallet: Billetera bloqueada.');
    }
    const [message] = params;

    // Derivar llave privada de la RAM
    const { privateKey } = deriveAccount(store.mnemonicSession, store.activeAccount.index);
    
    // Convertir a LocalAccount de Viem para firmar LOCALMENTE (nunca en el RPC)
    const account = privateKeyToAccount(privateKey);

    try {
      const signature = await account.signMessage({ message });
      return signature;
    } finally {
      // Higiene de memoria
      // (Nota: account es inmutable, pero el string privateKey sale del scope)
    }
  }

  async _handleSendTransaction(params, store) {
    if (!store.isUnlocked || !store.mnemonicSession) {
      throw new Error('TuxaWallet: Billetera bloqueada.');
    }
    const [tx] = params;

    const { privateKey } = deriveAccount(store.mnemonicSession, store.activeAccount.index);
    
    // Convertir a LocalAccount para enviar la transacción firmada
    const account = privateKeyToAccount(privateKey);
    const walletClient = createTuxaWalletClient(account);

    try {
      // Preparar la transacción (convertir hex strings de DApp a BigInt)
      const preparedTx = {
        to: tx.to,
        value: tx.value ? hexToBigInt(tx.value) : 0n,
        data: tx.data || '0x',
        gas: tx.gas ? hexToBigInt(tx.gas) : undefined,
        maxFeePerGas: tx.maxFeePerGas ? hexToBigInt(tx.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? hexToBigInt(tx.maxPriorityFeePerGas) : undefined,
      };

      const hash = await walletClient.sendTransaction(preparedTx);
      return hash;
    } finally {
      // Higiene de memoria
    }
  }

  /* -------------------------------------------------------------------
   * 3) REDIRECCIÓN AL RPC (Lecturas públicas)
   * ---------------------------------------------------------------- */
  async _forwardToRpc(method, params) {
    const response = await fetch('https://0x4e4542e3.rpc.aurora-cloud.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || [],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  }

  /* -------------------------------------------------------------------
   * 4) MANEJO DE EVENTOS (Requisito EIP-1193)
   * ---------------------------------------------------------------- */
  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(listener);
  }

  removeListener(event, listener) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) eventListeners.splice(index, 1);
    }
  }
}

/* ---------------------------------------------------------------------------
 * 5) INYECCIÓN GLOBAL
 * ------------------------------------------------------------------------ */

export const tuxaProvider = new TuxaProvider();

/**
 * Inyecta el provider en window.tuxachain.
 */
export function injectTuxaProvider() {
  if (typeof window !== 'undefined') {
    window.tuxachain = tuxaProvider;
  }
}
