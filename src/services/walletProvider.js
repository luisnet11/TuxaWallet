/**
 * ============================================================================
 *  TUXAWALLET — Adaptador EIP-1193 (window.tuxachain) — versión endurecida
 * ============================================================================
 *  Cambios clave frente a la versión anterior:
 *   1) Consentimiento: conectar, firmar y enviar exigen aprobación explícita del usuario.
 *   2) Permisos por origen (en memoria; se pierden al bloquear).
 *   3) Validación estricta de parámetros; sin creación de contratos; errores EIP-1193 con `code`.
 *   4) Lecturas vía publicClient (timeout/retry) con lista blanca ampliada.
 *   5) personal_sign: el mensaje SIEMPRE llega en hex (spec) → siempre { raw }.
 *   6) window.tuxachain no sobrescribible; eventos accountsChanged al cambiar/bloquear.
 *
 *  NOTA: mientras el provider se inyecte en la propia página de la billetera, `origin` es el de la
 *  billetera. Para DApps reales (extensión / webview Capacitor) el origin debe venir del canal de
 *  mensajes del navegador, nunca de datos que envíe la página.
 * ============================================================================
 */
import { getAddress, hexToBigInt, hexToString, formatEther, isAddress, isHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { useWalletStore } from '../store/useWalletStore.js';
import { useApprovalStore } from '../store/useApprovalStore.js';
import { createTuxaWalletClient, getTuxaPublicClient } from './viemClient.js';
import { deriveAccount } from '../vault/walletVault.js';
import { TUXACHAIN_CHAIN_ID_HEX, TUXACHAIN_CHAIN_ID } from './tuxachain.config.js';

class ProviderRpcError extends Error {
  constructor(code, message) { super(message); this.name = 'ProviderRpcError'; this.code = code; }
}
const rpcError = (code, msg) => new ProviderRpcError(code, msg);
const E = {
  REJECTED: () => rpcError(4001, 'El usuario rechazó la solicitud.'),
  UNAUTHORIZED: (m = 'Origen o cuenta no autorizados.') => rpcError(4100, m),
  UNSUPPORTED: (m) => rpcError(4200, `Método no soportado: ${m}`),
  INVALID: (m) => rpcError(-32602, m),
};

const READ_METHODS = new Set([
  'eth_blockNumber', 'eth_getBalance', 'eth_call', 'eth_estimateGas', 'eth_gasPrice',
  'eth_getCode', 'eth_getStorageAt', 'eth_getTransactionCount', 'eth_getTransactionByHash',
  'eth_getTransactionReceipt', 'eth_getBlockByNumber', 'eth_getBlockByHash', 'eth_getLogs',
  'eth_maxPriorityFeePerGas', 'web3_clientVersion',
]);

const short = (s, n = 400) => (String(s).length > n ? `${String(s).slice(0, n)}…` : String(s));
const printable = (s) => /^[\x20-\x7E\n\r\t\u00A0-\uFFFF]*$/.test(s);

class TuxaProvider {
  constructor() {
    this.isTuxaWallet = true;
    this._listeners = new Map();
    this._connected = new Set(); // orígenes con permiso (solo sesión desbloqueada)
    this._watchStore();
  }

  /* ------------------------------ eventos ------------------------------ */
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return this;
  }
  once(event, fn) { const w = (...a) => { this.removeListener(event, w); fn(...a); }; return this.on(event, w); }
  removeListener(event, fn) { this._listeners.get(event)?.delete(fn); return this; }
  off(event, fn) { return this.removeListener(event, fn); }
  _emit(event, payload) {
    this._listeners.get(event)?.forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
  }
  _watchStore() {
    useWalletStore.subscribe((s, prev) => {
      if (prev.isUnlocked && !s.isUnlocked) {
        this._connected.clear();
        this._emit('accountsChanged', []);
      } else if (s.isUnlocked && s.activeAccount?.address !== prev.activeAccount?.address && this._connected.size) {
        this._emit('accountsChanged', [s.activeAccount.address]);
      }
    });
  }

  /* ------------------------------ request ------------------------------ */
  async request(args) {
    if (!args || typeof args !== 'object' || typeof args.method !== 'string') {
      throw E.INVALID('request() requiere { method, params }.');
    }
    const { method, params } = args;
    const origin = window.location.origin;
    const store = useWalletStore.getState();

    switch (method) {
      case 'eth_chainId': return TUXACHAIN_CHAIN_ID_HEX;
      case 'net_version': return String(TUXACHAIN_CHAIN_ID);

      case 'eth_accounts':
        return store.isUnlocked && store.activeAccount && this._connected.has(origin)
          ? [store.activeAccount.address] : [];

      case 'eth_requestAccounts': {
        if (!store.isUnlocked || !store.activeAccount) throw E.UNAUTHORIZED('Billetera bloqueada.');
        if (!this._connected.has(origin)) {
          await this._approve('Conectar con TuxaWallet', origin, [['Cuenta', store.activeAccount.address], ['Red', 'Tuxachain']]);
          this._connected.add(origin);
          this._emit('connect', { chainId: TUXACHAIN_CHAIN_ID_HEX });
        }
        return [store.activeAccount.address];
      }

      case 'personal_sign': return this._personalSign(params, origin);
      case 'eth_sendTransaction': return this._sendTransaction(params, origin);

      case 'wallet_switchEthereumChain': {
        const id = params?.[0]?.chainId;
        if (id !== undefined && Number(id) === TUXACHAIN_CHAIN_ID) return null;
        throw rpcError(4902, 'Red no reconocida: TuxaWallet solo opera en Tuxachain.');
      }
      case 'wallet_addEthereumChain': {
        const id = params?.[0]?.chainId;
        if (id !== undefined && Number(id) === TUXACHAIN_CHAIN_ID) return null;
        throw rpcError(4200, 'TuxaWallet no permite añadir otras redes.');
      }

      default:
        if (READ_METHODS.has(method)) return this._read(method, params);
        throw E.UNSUPPORTED(method);
    }
  }

  /* ------------------------------ internos ------------------------------ */
  async _approve(title, origin, lines) {
    const ok = await useApprovalStore.getState().request({
      title, origin, lines: lines.map(([k, v]) => [k, short(v)]),
    });
    if (!ok) throw E.REJECTED();
  }

  _requireSession(origin, address) {
    const store = useWalletStore.getState();
    if (!store.isUnlocked || !store.mnemonicSession || !store.activeAccount) throw E.UNAUTHORIZED('Billetera bloqueada.');
    if (!this._connected.has(origin)) throw E.UNAUTHORIZED('Conecta primero con eth_requestAccounts.');
    if (address !== undefined && (!isAddress(address) || address.toLowerCase() !== store.activeAccount.address.toLowerCase())) {
      throw E.UNAUTHORIZED('La dirección no corresponde a la cuenta activa.');
    }
    return store;
  }

  async _personalSign(params, origin) {
    const [message, address] = Array.isArray(params) ? params : [];
    if (!isHex(message)) throw E.INVALID('personal_sign requiere el mensaje en hexadecimal (0x…).');
    const store = this._requireSession(origin, address);

    let text;
    try { text = hexToString(message); } catch { text = null; }
    await this._approve('Firmar mensaje', origin, [
      ['Cuenta', store.activeAccount.address],
      ['Mensaje', text && printable(text) ? text : `(binario) ${message}`],
    ]);

    const { privateKey } = deriveAccount(store.mnemonicSession, store.activeAccount.index);
    return privateKeyToAccount(privateKey).signMessage({ message: { raw: message } });
  }

  async _sendTransaction(params, origin) {
    const tx = Array.isArray(params) ? params[0] : null;
    if (!tx || typeof tx !== 'object') throw E.INVALID('Falta el objeto de transacción.');
    const store = this._requireSession(origin, tx.from);

    if (!isAddress(tx.to)) throw E.INVALID('Destino inválido (no se admite creación de contratos).');
    if (tx.chainId !== undefined && Number(tx.chainId) !== TUXACHAIN_CHAIN_ID) {
      throw rpcError(4901, 'La transacción apunta a otra red.');
    }

    const qty = (v, name) => {
      if (v === undefined) return undefined;
      if (!isHex(v)) throw E.INVALID(`${name} debe ser un hex (0x…).`);
      return hexToBigInt(v);
    };
    const data = tx.data ?? tx.input ?? '0x';
    if (!isHex(data)) throw E.INVALID('data debe ser un hex (0x…).');

    const value = qty(tx.value, 'value') ?? 0n;
    const prepared = {
      to: getAddress(tx.to),
      value,
      data,
      type: 'legacy', // consistente con las transferencias nativas/ERC-20 de la app
      gas: qty(tx.gas, 'gas'),
      gasPrice: qty(tx.gasPrice, 'gasPrice'),
    };

    await this._approve('Enviar transacción', origin, [
      ['De', store.activeAccount.address],
      ['Para', prepared.to],
      ['Valor', `${formatEther(value)} ETH`],
      ['Datos', data === '0x' ? '—' : `${data.slice(0, 10)} (${(data.length - 2) / 2} bytes)`],
      ['Red', 'Tuxachain'],
    ]);

    const { privateKey } = deriveAccount(store.mnemonicSession, store.activeAccount.index);
    const walletClient = createTuxaWalletClient(privateKeyToAccount(privateKey));
    return walletClient.sendTransaction(prepared);
  }

  async _read(method, params) {
    try {
      return await getTuxaPublicClient().request({ method, params: params ?? [] });
    } catch (err) {
      throw rpcError(err?.code ?? -32603, err?.shortMessage || err?.message || 'Error de RPC');
    }
  }
}

export const tuxaProvider = new TuxaProvider();

export function injectTuxaProvider() {
  if (typeof window === 'undefined') return;
  try {
    Object.defineProperty(window, 'tuxachain', {
      value: tuxaProvider,
      writable: false,
      configurable: import.meta.env.DEV, // permite HMR en desarrollo; en producción no se puede redefinir
      enumerable: true,
    });
  } catch {
    /* ya inyectado (HMR) */
  }
          }
