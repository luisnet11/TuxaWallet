import { createPublicClient, createWalletClient, http } from 'viem';
import { tuxachain, TUXACHAIN_RPC_URL } from './tuxachain.config.js';

// ABI mínimo del estándar ERC-20
export const ERC20_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }
];

const _publicClient = createPublicClient({
  chain: tuxachain,
  transport: http(TUXACHAIN_RPC_URL, { 
    retryCount: 2, 
    timeout: 20_000,
    batch: true, // <-- ACTIVADO POR DIAGNÓSTICO
  }),
});

export function getTuxaPublicClient() {
  return _publicClient;
}

export function createTuxaWalletClient(account) {
  if (!account) throw new Error('[TuxaWallet] Se requiere una cuenta para firmar.');
  return createWalletClient({
    chain: tuxachain,
    transport: http(TUXACHAIN_RPC_URL, { 
      retryCount: 1, 
      timeout: 30_000,
      batch: true, // <-- ACTIVADO POR DIAGNÓSTICO
    }),
    account,
  });
}

export const TUXACHAIN_CHAIN_ID_HEX = '0x4E4542E3';
export const TUXACHAIN_CHAIN_ID = 1313161955;

export function buildAddEthereumChainParams() {
  return { chainId: TUXACHAIN_CHAIN_ID_HEX, chainName: tuxachain.name, nativeCurrency: tuxachain.nativeCurrency, rpcUrls: [TUXACHAIN_RPC_URL], blockExplorerUrls: [tuxachain.blockExplorers.default.url] };
}
export function buildSwitchEthereumChainParams() { return { chainId: TUXACHAIN_CHAIN_ID_HEX }; }
export function isOnTuxachain(chainId) { return chainId == TUXACHAIN_CHAIN_ID || (typeof chainId === 'string' && chainId.toLowerCase() === TUXACHAIN_CHAIN_ID_HEX.toLowerCase()); }
