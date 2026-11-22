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
    const urlObj = new URL(`${BLOCKSCOUT_API_URL}/addresses/${cleanAddress}/transactions`);
    urlObj.searchParams.set('t', String(Date.now()));

    if (nextParams && typeof nextParams === 'object') {
      Object.entries(nextParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          urlObj.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(urlObj.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Error en API del explorador (${response.status})`);
    }

    const data = await response.json();
    const rawTransactions = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.result)
        ? data.result
        : [];

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
              (t) =>
                t.from?.hash?.toLowerCase() === lowerAddr ||
                t.to?.hash?.toLowerCase() === lowerAddr
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
        } catch {
          amount = '0';
        }
      }

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
      };
    });

    return { data: processed, nextPage, error: null };
  } catch (error) {
    console.error('[TuxaWallet] Error al obtener historial:', error);
    return {
      data: [],
      nextPage: null,
      error: error?.message || 'No se pudo consultar el historial',
    };
  }
}
