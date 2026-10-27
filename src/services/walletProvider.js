/**
 * ============================================================================
 *  TUXAWALLET — Adaptador EIP-1193 (Wallet Provider)
 * ============================================================================
 *  Archivo:   src/services/walletProvider.js
 *  Propósito: Exponer la billetera a DApps externas (window.tuxachain).
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
    this.isMetaMask = false;
    this.listeners = new Map();
  }

  async request({ method, params }) {
    const store = useWalletStore.getState();

    switch (method) {
      case 'eth_chainId':
        return TUXACHAIN_CHAIN_ID_HEX;
      case 'net_version':
        return TUXACHAIN_CHAIN_ID.toString();
      case 'eth_accounts':
        return store.isUnlocked && store.activeAccount ? [store.activeAccount.address] : [];
      case 'eth_requestAccounts':
        if (!store.isUnlocked || !store.activeAccount) {
          throw new Error('TuxaWallet: Billetera bloqueada.');
        }
        return [store.activeAccount.address];

      case 'personal_sign':
        return this._handlePersonalSign(params, store);
      case 'eth_sendTransaction':
        return this._handleSendTransaction(params, store);

      // Lecturas públicas (Redirigidas al RPC)
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

  async _handlePersonalSign(params, store) {
    if (!store.isUnlocked || !store.mnemonicSession) {
      throw new Error('TuxaWallet: Billetera bloqueada.');
    }
    // EIP-191: params suele ser [mensaje, address]
    const [message, address] = params;

    if (address && address.toLowerCase() !== store.activeAccount.address.toLowerCase()) {
      throw new Error('TuxaWallet: La firma no corresponde a la cuenta activa.');
    }

    const { privateKey } = deriveAccount(store.mnemonicSession, store.activeAccount.index);
    const account = privateKeyToAccount(privateKey);

    try {
      // Fix de auditoría: Si el mensaje es un hex string (0x...), usar { raw: ... }
      const isHexString = typeof message === 'string' && message.startsWith('0x');
      const signature = await account.signMessage({ 
        message: isHexString ? { raw: message } : message 
      });
      return signature;
    } finally {
      // Memory cleanup implícito al salir del scope
    }
  }

  async _handleSendTransaction(params, store) {
    if (!store.isUnlocked || !store.mnemonicSession) {
      throw new Error('TuxaWallet: Billetera bloqueada.');
    }
    const [tx] = params;

    // Fix de auditoría: Validar el Chain ID de la DApp
    if (tx.chainId) {
      const requestedChainId = parseInt(tx.chainId, 16); // DApps mandan hex
      if (requestedChainId !== TUXACHAIN_CHAIN_ID) {
        throw new Error('TuxaWallet: La transacción apunta a otra red.');
      }
    }

    // Fix de auditoría: Validar el remitente
    if (tx.from && tx.from.toLowerCase() !== store.activeAccount.address.toLowerCase()) {
      throw new Error('TuxaWallet: La dirección "from" no coincide con la cuenta activa.');
    }

    const { privateKey } = deriveAccount(store.mnemonicSession, store.activeAccount.index);
    const account = privateKeyToAccount(privateKey);
    const walletClient = createTuxaWalletClient(account);

    try {
      const preparedTx = {
        to: tx.to,
        value: tx.value ? hexToBigInt(tx.value) : 0n,
        data: tx.data || '0x',
        gas: tx.gas ? hexToBigInt(tx.gas) : undefined,
        maxFeePerGas: tx.maxFeePerGas ? hexToBigInt(tx.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? hexToBigInt(tx.maxPriorityFeePerGas) : undefined,
      };
      return await walletClient.sendTransaction(preparedTx);
    } finally {
      // Memory cleanup implícito
    }
  }

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

export const tuxaProvider = new TuxaProvider();

export function injectTuxaProvider() {
  if (typeof window !== 'undefined') {
    window.tuxachain = tuxaProvider;
  }
}
