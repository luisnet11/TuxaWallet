/**
 * ============================================================================
 *  TUXAWALLET — Orquestador de Billeteras (Wallet Vault)
 * ============================================================================
 *  Archivo:   src/vault/walletVault.js
 *  Propósito: Generación BIP-39 y derivación HD con cifrado AES-GCM.
 * ============================================================================
 */

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { privateKeyToAccount } from 'viem/accounts';
import { bytesToHex } from 'viem';
import { generateSalt, deriveKey, encryptData, decryptData } from './crypto.service.js';

const EVM_DERIVATION_PATH = "m/44'/60'/0'/0";
const AAD_PREFIX = 'v1|pbkdf2-sha256-600000';

// ... (createNewWallet y unlockWallet se mantienen igual)

export async function importWalletFromMnemonic(mnemonic, password) {
  // 1. Validar que la semilla sea correcta (BIP-39)
  const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!validateMnemonic(cleanMnemonic, wordlist)) {
    throw new Error('Frase semilla inválida. Verifica las palabras.');
  }

  // 2. Cifrar la semilla con la nueva contraseña
  const walletId = crypto.randomUUID();
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const aad = `${AAD_PREFIX}|${walletId}`;
  const encrypted = await encryptData(cleanMnemonic, key, aad);

  // 3. Derivar la primera cuenta
  const firstAccount = deriveAccount(cleanMnemonic, 0);

  // 4. Construir el Vault Blob
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

export function deriveAccount(mnemonic, index) {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdkey = HDKey.fromMasterSeed(seed);
  const path = `${EVM_DERIVATION_PATH}/${index}`;
  const child = hdkey.derive(path);

  if (!child.privateKey) throw new Error('[TuxaWallet] Fallo al derivar llave privada.');

  const privateKeyHex = bytesToHex(child.privateKey);
  const account = privateKeyToAccount(privateKeyHex);

  seed.fill(0);
  child.privateKey.fill(0);

  return { index, address: account.address, privateKey: privateKeyHex };
}

export function addAccountToWallet(vaultBlob, mnemonic, nextIndex) {
  const newAccount = deriveAccount(mnemonic, nextIndex);
  if (vaultBlob.accounts.some((a) => a.index === nextIndex)) {
    throw new Error(`[TuxaWallet] La cuenta con índice ${nextIndex} ya existe.`);
  }
  return {
    ...vaultBlob,
    accounts: [...vaultBlob.accounts, { index: newAccount.index, address: newAccount.address }],
  };
}
