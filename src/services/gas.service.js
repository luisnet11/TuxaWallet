/**
 * ============================================================================
 *  TUXAWALLET — Servicio de Gas Patrocinado (Frontend Autónomo)
 * ============================================================================
 *  Archivo:   src/services/gas.service.js
 *  Propósito: Consultar el gas a través de un backend externo (Cloudflare).
 *             Vercel no maneja secretos, solo sirve la UI.
 * ============================================================================
 */

// URL obligatoria del backend externo (ej. Cloudflare Worker)
const API_BASE_URL = import.meta.env.VITE_GAS_API_URL;

export async function fetchSponsoredGasStatus(walletAddress) {
  if (!walletAddress) return { success: false, error: 'Sin dirección' };

  // Si el administrador no configuró la URL externa, fallamos de forma segura
  if (!API_BASE_URL) {
    console.warn('[TuxaWallet] VITE_GAS_API_URL no está configurada. El gas patrocinado está desactivado.');
    return {
      success: false,
      data: { walletAddress, isGasSponsored: false, remainingFreeTransactions: 0, tier: 'No configurado' },
      error: 'Backend externo no configurado'
    };
  }

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
        tier: 'Error de conexión'
      },
      error: error.message
    };
  }
}
