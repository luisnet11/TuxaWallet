/**
 * ============================================================================
 *  TUXAWALLET — Orquestador de Billeteras (Wallet Vault)
 * ============================================================================
 */

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { privateKeyToAccount } from 'viem/accounts';
import { bytesToHex } from 'viem';
import {
  generateSalt,
  deriveKey,
  encryptData,
  decryptData,
} from './crypto.service.js';

const EVM_DERIVATION_PATH = "m/44'/60'/0'/0";
const AAD_PREFIX = 'v1|pbkdf2-sha256-600000';

/* ---------------------------------------------------------------------------
 * 1) GENERACIÓN DE NUEVA BILLETERA
 * ------------------------------------------------------------------------ */
export async function createNewWallet(password, numWords = 24) {
  const strength = numWords === 24 ? 256 : 128;
  const mnemonic = generateMnemonic(wordlist, strength);
  const walletId = crypto.randomUUID();

  const salt = generateSalt();
  const key = await deriveKey(password, salt);

  const aad = `${AAD_PREFIX}|${walletId}`;
  const encrypted = await encryptData(mnemonic, key, aad);

  const firstAccount = deriveAccount(mnemonic, 0);

  const vaultBlob = {
    version: 1,
    id: walletId,
    salt: salt,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    accounts: [{ index: 0, address: firstAccount.address }],
    createdAt: Date.now(),
  };

  return { vaultBlob, mnemonic };
}

/* ---------------------------------------------------------------------------
 * 2) IMPORTAR BILLETERA DESDE SEMILLA
 * ------------------------------------------------------------------------ */
export async function importWalletFromMnemonic(mnemonic, password) {
  const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // CORRECCIÓN CRÍTICA: Validar que la semilla sea real y no tenga errores tipográficos
  if (!validateMnemonic(cleanMnemonic, wordlist)) {
    throw new Error('Frase semilla inválida. Verifica que las palabras estén bien escritas.');
  }

  const walletId = crypto.randomUUID();
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const aad = `${AAD_PREFIX}|${walletId}`;
  const encrypted = await encryptData(cleanMnemonic, key, aad);

  const firstAccount = deriveAccount(cleanMnemonic, 0);

  const vaultBlob = {
    version: 1,
    id: walletId,
    salt: salt,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    accounts: [{ index: 0, address: firstAccount.address }],
    createdAt: Date.now(),
  };

  return { vaultBlob, mnemonic: cleanMnemonic };
}

/* ---------------------------------------------------------------------------
 * 3) DESBLOQUEO DE BILLETERA EXISTENTE
 * ------------------------------------------------------------------------ */
export async function unlockWallet(vaultBlob, password) {
  const key = await deriveKey(password, vaultBlob.salt);
  const aad = `${AAD_PREFIX}|${vaultBlob.id}`;
  const mnemonic = await decryptData(vaultBlob.ciphertext, key, vaultBlob.iv, aad);
  return { mnemonic, key };
}

/* ---------------------------------------------------------------------------
 * 4) DERIVACIÓN DE CUENTAS
 * ------------------------------------------------------------------------ */
export function deriveAccount(mnemonic, index) {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdkey = HDKey.fromMasterSeed(seed);
  const path = `${EVM_DERIVATION_PATH}/${index}`;
  const child = hdkey.derive(path);

  if (!child.privateKey) {
    throw new Error('[TuxaWallet] Fallo al derivar llave privada.');
  }

  const privateKeyHex = bytesToHex(child.privateKey);
  const account = privateKeyToAccount(privateKeyHex);

  seed.fill(0);
  child.privateKey.fill(0);

  return {
    index,
    address: account.address,
    privateKey: privateKeyHex,
  };
}

/* ---------------------------------------------------------------------------
 * 5) AGREGAR NUEVA CUENTA
 * ------------------------------------------------------------------------ */
export function addAccountToWallet(vaultBlob, mnemonic, nextIndex) {
  const newAccount = deriveAccount(mnemonic, nextIndex);
  if (vaultBlob.accounts.some((a) => a.index === nextIndex)) {
    throw new Error(`[TuxaWallet] La cuenta con índice ${nextIndex} ya existe.`);
  }
  return {
    ...vaultBlob,
    accounts: [
      ...vaultBlob.accounts,
      { index: newAccount.index, address: newAccount.address },
    ],
  };
}
