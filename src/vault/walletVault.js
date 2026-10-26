/**
 * ============================================================================
 *  TUXAWALLET — Orquestador de Billeteras (Wallet Vault)
 * ============================================================================
 *  Archivo:   src/vault/walletVault.js
 *  Propósito: Conecta la generación BIP-39 y la derivación HD con el motor
 *             de cifrado AES-GCM (crypto.service.js).
 *
 *  DISEÑO DE SEGURIDAD Y MEMORIA:
 *  - Usa @scure/bip39 y @scure/bip32 (auditadas, cero dependencias Node).
 *  - Aplica "higiene de memoria": las variables con semillas o claves
 *    privadas se sobrescriben con ceros (fill) al dejar de ser necesarias,
 *    reduciendo la ventana de exposición en RAM ante volcados de memoria.
 *  - El AAD (Additional Authenticated Data) es el walletId, atando el
 *    ciphertext a esa billetera específica.
 * ============================================================================
 */

import { generateMnemonic, mnemonicToSeedSync, wordlist } from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import { privateKeyToAccount } from 'viem/accounts';
import { bytesToHex } from 'viem';
import {
  generateSalt,
  deriveKey,
  encryptData,
  decryptData,
} from './crypto.service.js';

// Constante de ruta de derivación HD estándar para cuentas EVM (BIP-44)
const EVM_DERIVATION_PATH = "m/44'/60'/0'/0";

/* ---------------------------------------------------------------------------
 * 1) GENERACIÓN DE NUEVA BILLETERA (VAULT BLOB)
 * ------------------------------------------------------------------------ */

/**
 * Genera una nueva frase semilla BIP-39 (inglés por compatibilidad universal),
 * la cifra con la contraseña maestra y devuelve el "Vault Blob" listo para
 * almacenarse (localStorage, IndexedDB, o Capacitor Preferences).
 *
 * @param {string} password - Contraseña maestra validada.
 * @param {number} numWords - 12 o 24 palabras (default 24).
 * @returns {Promise<object>} Vault Blob cifrado y metadata pública.
 */
export async function createNewWallet(password, numWords = 24) {
  // 256 bits = 24 palabras | 128 bits = 12 palabras
  const strength = numWords === 24 ? 256 : 128;

  // 1. Generar semilla con wordlist en inglés (compatibilidad universal Web3)
  const mnemonic = generateMnemonic(wordlist, strength);

  // 2. Crear ID único para esta billetera (usado como AAD)
  const walletId = crypto.randomUUID();

  // 3. Derivar clave y cifrar semilla
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const encrypted = await encryptData(mnemonic, key, walletId);

  // 4. Derivar la primera cuenta (índice 0) para retornar su dirección pública
  const firstAccount = deriveAccount(mnemonic, 0);

  // 5. Construir el Vault Blob (estructura JSON persistible)
  const vaultBlob = {
    version: 1,
    id: walletId,
    salt: salt,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    accounts: [{ index: 0, address: firstAccount.address }],
    createdAt: Date.now(),
  };

  // 6. Devolver el mnemonic SOLO para que la UI lo muestre al usuario.
  //    La UI debe forzar su respaldo; nunca debe persistirse en claro.
  return {
    vaultBlob,
    mnemonic,
  };
}

/* ---------------------------------------------------------------------------
 * 2) DESBLOQUEO DE BILLETERA EXISTENTE
 * ------------------------------------------------------------------------ */

/**
 * Descifra la semilla a partir del Vault Blob y la contraseña maestra.
 *
 * @param {object} vaultBlob - Objeto previamente generado.
 * @param {string} password - Contraseña maestra del usuario.
 * @returns {Promise<{mnemonic: string, key: CryptoKey}>}
 */
export async function unlockWallet(vaultBlob, password) {
  // 1. Derivar clave usando el salt guardado en el blob
  const key = await deriveKey(password, vaultBlob.salt);

  // 2. Descifrar. Si la contraseña es incorrecta o el AAD no coincide,
  //    lanzará error (comportamiento de seguridad AES-GCM).
  const mnemonic = await decryptData(
    vaultBlob.ciphertext,
    key,
    vaultBlob.iv,
    vaultBlob.id // AAD = walletId
  );

  return { mnemonic, key };
}

/* ---------------------------------------------------------------------------
 * 3) DERIVACIÓN DE CUENTAS (MULTI-CUENTA)
 * ------------------------------------------------------------------------ */

/**
 * Deriva una cuenta EVM a partir de la frase semilla y un índice.
 * Ruta HD estándar: m/44'/60'/0'/0/{index}
 *
 * @param {string} mnemonic - Frase semilla BIP-39.
 * @param {number} index - Índice de la cuenta (0, 1, 2...).
 * @returns {{address: string, privateKey: string, index: number}}
 */
export function deriveAccount(mnemonic, index) {
  // 1. Convertir mnemonic a seed (64 bytes)
  const seed = mnemonicToSeedSync(mnemonic);

  // 2. Crear raíz HD desde la seed
  const hdkey = HDKey.fromMasterSeed(seed);

  // 3. Derivar la ruta BIP-44 de la cuenta solicitada
  const path = `${EVM_DERIVATION_PATH}/${index}`;
  const child = hdkey.derive(path);

  if (!child.privateKey) {
    throw new Error('[TuxaWallet] Fallo al derivar llave privada.');
  }

  // 4. Convertir llave privada (Uint8Array) a string hex usando viem.bytesToHex
  //    (evita depender de Buffer, que es de Node.js y no existe en navegador).
  const privateKeyHex = bytesToHex(child.privateKey);

  // 5. Obtener la dirección pública EVM desde la llave privada
  const account = privateKeyToAccount(privateKeyHex);

  // 6. Higiene de memoria: sobrescribir con ceros
  seed.fill(0);
  child.privateKey.fill(0);

  return {
    index,
    address: account.address,
    privateKey: privateKeyHex, // ⚠️ Uso efímero, descartar tras firmar
  };
}

/* ---------------------------------------------------------------------------
 * 4) AGREGAR NUEVA CUENTA AL VAULT BLOB
 * ------------------------------------------------------------------------ */

/**
 * Añade una nueva cuenta derivada de la misma semilla al Vault Blob.
 * Solo añade metadata pública (index y address); no requiere re-cifrar.
 *
 * @param {object} vaultBlob - Vault Blob existente.
 * @param {string} mnemonic - Frase semilla descifrada en memoria.
 * @param {number} nextIndex - Índice de la nueva cuenta (ej: 1).
 * @returns {object} Vault Blob actualizado.
 */
export function addAccountToWallet(vaultBlob, mnemonic, nextIndex) {
  const newAccount = deriveAccount(mnemonic, nextIndex);

  // Evitar duplicados
  if (vaultBlob.accounts.some((a) => a.index === nextIndex)) {
    throw new Error(
      `[TuxaWallet] La cuenta con índice ${nextIndex} ya existe.`
    );
  }

  return {
    ...vaultBlob,
    accounts: [
      ...vaultBlob.accounts,
      { index: newAccount.index, address: newAccount.address },
    ],
  };
    }
