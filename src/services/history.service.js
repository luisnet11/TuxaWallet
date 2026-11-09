/**
 * ============================================================================
 *  TUXAWALLET — Servicio de Historial de Transacciones
 * ============================================================================
 *  Archivo:   src/services/history.service.js
 *  Propósito: Conectar con la API de Blockscout de Tuxachain para obtener
 *             las transacciones de una dirección, procesarlas y clasificarlas.
 * ============================================================================
 */

import { formatEther } from 'viem';
import { classifyTransaction } from './transactionClassifier.js';

// URL base de la API de Blockscout para Tuxachain
const BLOCKSCOUT_API_URL = 'https://0x4e4542e3.explorer.aurora-cloud.dev/api/v2';

/**
 * Limpia el nombre del método para que sea legible en la UI.
 * Si la API devuelve un hash (0x...) o un texto raro, lo reemplaza.
 */
function formatMethodName(method) {
  if (!method) return 'Interacción';
  // Si empieza por 0x o tiene una longitud muy larga (típico de hashes)
  if (method.startsWith('0x') || method.length > 20) {
    return 'Contrato';
  }
  // Capitalizar la primera letra (ej: transfer -> Transfer)
  return method.charAt(0).toUpperCase() + method.slice(1);
}

/**
 * Obtiene el historial de transacciones de una dirección.
 * @param {string} address - Dirección EVM del usuario.
 * @returns {Promise<Array>} Lista de transacciones procesadas y clasificadas.
 */
export async function fetchTransactionHistory(address) {
  if (!address) return [];

  try {
    const response = await fetch(`${BLOCKSCOUT_API_URL}/addresses/${address}/transactions`);
    
    if (!response.ok) {
      throw new Error(`Error en la API de Blockscout: ${response.status}`);
    }

    const data = await response.json();
    const rawTransactions = data.items || [];

    // Procesamos cada transacción para limpiarla y clasificarla
    return rawTransactions.map(tx => {
      const type = classifyTransaction(tx, address);
      const isSender = tx.from?.hash?.toLowerCase() === address.toLowerCase();

      // Determinamos el monto y el símbolo
      let amount = '0';
      let symbol = 'ETH';

      if (type === 'token_send' || type === 'token_receive') {
        // Si es un token, buscamos la info en el array de token_transfers
        const transfer = tx.token_transfers?.find(t => 
          t.from?.hash?.toLowerCase() === address.toLowerCase() || 
          t.to?.hash?.toLowerCase() === address.toLowerCase()
        );
        if (transfer) {
          amount = transfer.total?.value ? (Number(transfer.total.value) / Math.pow(10, transfer.total.decimals)).toFixed(4) : '0';
          symbol = transfer.token?.symbol || 'TOKEN';
        }
      } else if (tx.value) {
        // Si es nativo (ETH), usamos formatEther de Viem
        amount = formatEther(BigInt(tx.value));
        // Truncamos a 4 decimales para la UI
        amount = Number(amount).toFixed(4);
      }

      return {
        hash: tx.hash,
        timestamp: tx.timestamp, // Formato ISO (ej. "2023-10-27T12:00:00Z")
        type,
        status: tx.status, // "ok" o "error"
        from: tx.from?.hash || '',
        to: tx.to?.hash || '',
        amount,
        symbol,
        // Usamos la nueva función para limpiar el nombre del método
        method: formatMethodName(tx.method),
        isSender
      };
    });

  } catch (error) {
    console.error('[TuxaWallet] Error al obtener historial:', error);
    // En caso de error, devolvemos un array vacío para no romper la UI
    return [];
  }
}
