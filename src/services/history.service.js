import { formatEther } from 'viem';
import { classifyTransaction } from './transactionClassifier.js';

const BLOCKSCOUT_API_URL = 'https://0x4e4542e3.explorer.aurora-cloud.dev/api/v2';

function formatMethodName(method) {
  if (!method) return 'Interacción';
  if (method.startsWith('0x') || method.length > 20) return 'Contrato';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function formatTokenAmount(rawValue, decimals = 18) {
  if (!rawValue) return '0';
  try {
    const dec = Number.isFinite(Number(decimals)) ? Number(decimals) : 18;
    const bigVal = BigInt(rawValue);
    const divisor = BigInt(10) ** BigInt(dec);
    const whole = bigVal / divisor;
    const remainder = bigVal % divisor;
    const fracStr = remainder.toString().padStart(dec, '0').slice(0, 4);
    return `${whole.toString()}.${fracStr}`;
  } catch {
    return '0';
  }
}

export async function fetchTransactionHistory(address, nextParams = null) {
  if (!address) {
    return { data: [], nextPage: null, error: 'Dirección no proporcionada' };
  }

  try {
    const cleanAddress = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      throw new Error('Dirección EVM inválida');
    }

    const urlObj = new URL(`${BLOCKSCOUT_API_URL}/addresses/${cleanAddress}/transactions`);

    if (nextParams && typeof nextParams === 'object') {
      Object.entries(nextParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && typeof value !== 'object') {
          urlObj.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(urlObj.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = errBody?.message ? ` - ${errBody.message}` : '';
      } catch (e) {}
      throw new Error(`Error en API del explorador (${response.status})${detail}`);
    }

    const data = await response.json();
    const rawTransactions = Array.isArray(data?.items) ? data.items : Array.isArray(data?.result) ? data.result : [];
    const nextPage = data?.next_page_params || null;
    const lowerAddr = cleanAddress.toLowerCase();

    const processed = rawTransactions.map((tx) => {
      const type = classifyTransaction(tx, cleanAddress);
      const fromHash = tx.from?.hash || (typeof tx.from === 'string' ? tx.from : '');
      const toHash = tx.to?.hash || (typeof tx.to === 'string' ? tx.to : '');
      const isSender = fromHash.toLowerCase() === lowerAddr;

      let amount = '0';
      let symbol = 'ETH';

      if (type === 'token_send' || type === 'token_receive') {
        const transfer = Array.isArray(tx.token_transfers)
          ? tx.token_transfers.find(
              (t) => t.from?.hash?.toLowerCase() === lowerAddr || t.to?.hash?.toLowerCase() === lowerAddr
            ) || tx.token_transfers[0]
          : null;

        if (transfer) {
          const rawAmount = transfer.total?.value ?? transfer.value ?? '0';
          const decimals = transfer.token?.decimals ?? transfer.total?.decimals ?? 18;
          amount = formatTokenAmount(rawAmount, decimals);
          symbol = transfer.token?.symbol || 'TOKEN';
        }
      } else if (tx.value) {
        try {
          const ethFormatted = formatEther(BigInt(tx.value));
          amount = Number(ethFormatted).toFixed(4);
        } catch { amount = '0'; }
      }

      // Extraemos los datos técnicos para el modal
      return {
        hash: tx.hash,
        timestamp: tx.timestamp,
        type,
        status: tx.status || 'ok',
        from: fromHash,
        to: toHash,
        amount,
        symbol,
        method: formatMethodName(tx.method),
        isSender,
        // Datos técnicos
        blockNumber: tx.block_number || 'N/A',
        confirmations: tx.confirmations || 0,
        gasUsed: tx.gas_used ? BigInt(tx.gas_used).toString() : '0',
        gasPrice: tx.gas_price ? BigInt(tx.gas_price).toString() : '0',
        nonce: tx.nonce !== undefined ? tx.nonce : 'N/A'
      };
    });

    return { data: processed, nextPage, error: null };
  } catch (error) {
    console.error('[TuxaWallet] Error al obtener historial:', error);
    return { data: [], nextPage: null, error: error?.message || 'No se pudo consultar el historial' };
  }
        }
