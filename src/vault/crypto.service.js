/**
 * ============================================================================
 *  TUXAWALLET — Servicio de Criptografía (Web Crypto API)
 * ============================================================================
 *  Archivo:   src/vault/crypto.service.js
 *  Propósito: Capa pura de criptografía. Cero dependencias externas.
 *             Implementa derivación de claves (PBKDF2), cifrado autenticado
 *             (AES-GCM 256 bits), generación de salt/IV y validación de
 *             fortaleza de contraseñas.
 *
 *  DISEÑO DE SEGURIDAD:
 *  - PBKDF2 con SHA-256 y 600,000 iteraciones (recomendación OWASP 2023).
 *  - AES-GCM de 256 bits con IV aleatorio de 12 bytes por operación.
 *  - AAD (Additional Authenticated Data) obligatorio para atar el cifrado
 *    a un contexto (ej: ID de wallet) y evitar reutilización de ciphertext.
 *  - Todos los buffers se serializan a Base64 para almacenamiento seguro
 *    en JSON/localStorage sin corromper bytes.
 * ============================================================================
 */

/* ---------------------------------------------------------------------------
 * CONSTANTES CRIPTOGRÁFICAS
 * ------------------------------------------------------------------------ */
const PBKDF2_ITERATIONS = 600_000; // OWASP 2023 recomienda >= 600k para SHA-256
const SALT_LENGTH = 16;            // 128 bits
const IV_LENGTH = 12;              // 96 bits (recomendado para AES-GCM)
const KEY_LENGTH = 256;            // 256 bits (AES-256)

/* ---------------------------------------------------------------------------
 * UTILIDADES DE CODIFICACIÓN (Uint8Array <-> Base64)
 * Necesarias para serializar buffers a strings seguras para JSON.
 * ------------------------------------------------------------------------ */

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/* ---------------------------------------------------------------------------
 * 1) GENERACIÓN DE SALT
 * ------------------------------------------------------------------------ */

/**
 * Genera un Salt criptográficamente seguro.
 * @returns {string} Salt codificado en Base64.
 */
export function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return bufferToBase64(salt.buffer);
}

/* ---------------------------------------------------------------------------
 * 2) DERIVACIÓN DE CLAVE (PBKDF2)
 * ------------------------------------------------------------------------ */

/**
 * Deriva una clave criptográfica a partir de una contraseña y un salt.
 * @param {string} password - Contraseña maestra del usuario.
 * @param {string} saltBase64 - Salt generado previamente (Base64).
 * @returns {Promise<CryptoKey>} Clave AES-GCM lista para usar.
 */
export async function deriveKey(password, saltBase64) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = base64ToBuffer(saltBase64);

  // Importar la contraseña como material de clave base
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false, // No exportable
    ['deriveKey']
  );

  // Derivar clave AES-GCM de 256 bits
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // No exportable
    ['encrypt', 'decrypt']
  );
}

/* ---------------------------------------------------------------------------
 * 3) CIFRADO (AES-GCM)
 * ------------------------------------------------------------------------ */

/**
 * Cifra datos con AES-GCM.
 * @param {string} plaintext - Texto plano (ej: frase semilla BIP-39).
 * @param {CryptoKey} key - Clave derivada con deriveKey().
 * @param {string} aad - Additional Authenticated Data (ej: "wallet-1").
 * @returns {Promise<{iv: string, ciphertext: string}>} Objeto serializable.
 */
export async function encryptData(plaintext, key, aad) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const aadBuffer = encoder.encode(aad);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      additionalData: aadBuffer,
    },
    key,
    encoder.encode(plaintext)
  );

  return {
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertextBuffer),
  };
}

/* ---------------------------------------------------------------------------
 * 4) DESCIFRADO (AES-GCM)
 * ------------------------------------------------------------------------ */

/**
 * Descifra datos con AES-GCM. Lanza error si el ciphertext fue manipulado
 * o si el AAD no coincide (autenticación fallida).
 * @param {string} ciphertextBase64 - Texto cifrado en Base64.
 * @param {CryptoKey} key - Clave derivada con deriveKey().
 * @param {string} ivBase64 - IV usado en el cifrado.
 * @param {string} aad - Additional Authenticated Data (debe coincidir).
 * @returns {Promise<string>} Texto plano original.
 */
export async function decryptData(ciphertextBase64, key, ivBase64, aad) {
  const encoder = new TextEncoder();
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const aadBuffer = encoder.encode(aad);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aadBuffer,
      },
      key,
      ciphertext
    );
    return new TextDecoder().decode(plaintextBuffer);
  } catch (error) {
    // Error intencionalmente genérico: no revelar si el fallo fue de
    // contraseña incorrecta, IV corrupto o AAD incorrecto (evita oráculos).
    throw new Error('[TuxaWallet] Fallo al descifrar: contraseña o datos corruptos.');
  }
}

/* ---------------------------------------------------------------------------
 * 5) VALIDACIÓN DE FORTALEZA DE CONTRASEÑA
 *    Requerimiento del Director: mínimo 12 caracteres, con letras, números
 *    y al menos un símbolo especial.
 * ------------------------------------------------------------------------ */

/**
 * Valida la fortaleza de una contraseña maestra.
 * @param {string} password - Contraseña a validar.
 * @returns {{valid: boolean, errors: string[]}} Resultado y detalle.
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 12) {
    errors.push('Debe tener al menos 12 caracteres.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una letra mayúscula.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una letra minúscula.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número.');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Debe contener al menos un símbolo especial.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
