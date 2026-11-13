/**
 * ============================================================================
 *  TUXAWALLET — Servicio de Gas Patrocinado (Frontend)
 * ============================================================================
 *  Archivo:   src/services/gas.service.js
 * ============================================================================
 */

// URL configurable. Si existe en Vercel/local, la usa. 
// Si no, usa la ruta por defecto en Vercel (/api/check-gas).
const API_BASE_URL = import.meta.env.VITE_GAS_API_URL || '/api/check-gas';

export async function fetchSponsoredGasStatus(walletAddress) {
  if (!walletAddress) return { success: false, error: 'Sin dirección' };

  try {
    const response = await fetch(`${API_BASE_URL}?address=${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[TuxaWallet] Fallo al consultar gas patrocinado:', error);
    
    return {
      success: false,
      data: {
        walletAddress,
        isGasSponsored: false,
        remainingFreeTransactions: 0,
        tier: 'Desconocido'
      },
      error: error.message
    };
  }
  }
