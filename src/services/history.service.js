import { formatEther } from 'viem';
import { classifyTransaction } from './transactionClassifier.js';

const BLOCKSCOUT_API_URL = 'https://0x4e4542e3.explorer.aurora-cloud.dev/api/v2';

function formatMethodName(method) {
  if (!method) return 'Interacción';
  if (method.startsWith('0x') || method.length > 20) return 'Contrato';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export async function fetchTransactionHistory(address, nextParams = null) {
  if (!address) return { data: [], nextPage: null, error: 'Dirección no proporcionada' };

  try {
    // Usamos concatenación simple para evitar fallos de comillas
    const cacheBuster = 't=' + Date.now();
    let url = `${BLOCKSCOUT_API_URL}/addresses/${address}/transactions?${cacheBuster}`;
    
    if (nextParams) {
      const params = new URLSearchParams(nextParams);
      url += `&${params.toString()}`;
    }

    // Petición estándar
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error en API: ${response.status}`);

    const data = await response.json();
    const rawTransactions = data.items || [];
    const nextPage = data.next_page_params || null;

    const processed = rawTransactions.map(tx => {
      const type = classifyTransaction(tx, address);
      const isSender = tx.from?.hash?.toLowerCase() === address.toLowerCase();

      let amount = '0';
      let symbol = 'ETH';

      if (type === 'token_send' || type === 'token_receive') {
        const transfer = tx.token_transfers?.find(t => 
          t.from?.hash?.toLowerCase() === address.toLowerCase() || 
          t.to?.hash?.toLowerCase() === address.toLowerCase()
        );
        if (transfer) {
          amount = transfer.total?.value ? (Number(transfer.total.value) / Math.pow(10, transfer.total.decimals)).toFixed(4) : '0';
          symbol = transfer.token?.symbol || 'TOKEN';
        }
      } else if (tx.value) {
        amount = formatEther(BigInt(tx.value));
        amount = Number(amount).toFixed(4);
      }

      return {
        hash: tx.hash,
        timestamp: tx.timestamp,
        type,
        status: tx.status,
        from: tx.from?.hash || '',
        to: tx.to?.hash || '',
        amount,
        symbol,
        method: formatMethodName(tx.method),
        isSender
      };
    });

    return { data: processed, nextPage, error: null };

  } catch (error) {
    console.error('[TuxaWallet] Error al obtener historial:', error);
    return { data: [], nextPage: null, error: error.message };
  }
}
