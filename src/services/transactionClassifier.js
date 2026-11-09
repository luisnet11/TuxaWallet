/**
 * ============================================================================
 *  TUXAWALLET — Clasificador de Transacciones
 * ============================================================================
 *  Archivo:   src/services/transactionClassifier.js
 *  Propósito: Analizar los datos crudos de la API (Blockscout) y determinar
 *             el tipo de transacción para asignarle un ícono en la UI.
 * ============================================================================
 */

export function classifyTransaction(tx, userAddress) {
  if (!tx || !userAddress) return 'unknown';

  const userAddr = userAddress.toLowerCase();
  const from = tx.from?.hash?.toLowerCase() || '';
  const to = tx.to?.hash?.toLowerCase() || '';
  const method = tx.method?.toLowerCase() || '';
  
  // 1. Detección por método (Swaps, Aprobaciones, etc.)
  if (method.includes('swap') || method.includes('exchange')) return 'swap';
  if (method.includes('approve') || method.includes('allowance')) return 'approve';
  if (method.includes('bridge') || method.includes('deposit') || method.includes('withdraw')) return 'bridge';

  // 2. Detección de NFTs y Tokens ERC-20
  if (tx.token_transfers && tx.token_transfers.length > 0) {
    // Revisamos si hay transferencias de NFTs (ERC-721 o ERC-1155)
    const hasNFT = tx.token_transfers.some(t => 
      t.token?.type === 'ERC-721' || t.token?.type === 'ERC-1155'
    );
    if (hasNFT) return 'nft';

    // Si no es NFT, es una transferencia de Token ERC-20
    // Determinamos si fue enviado o recibido comparando las direcciones
    const isSender = tx.token_transfers.some(t => t.from?.hash?.toLowerCase() === userAddr);
    return isSender ? 'token_send' : 'token_receive';
  }

  // 3. Detección de transferencias nativas (Gas token / ETH)
  if (from === userAddr) return 'send';
  if (to === userAddr) return 'receive';

  // 4. Si no encaja en nada, es una interacción con un contrato
  return 'contract';
      }
