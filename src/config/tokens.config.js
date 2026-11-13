/**
 * ============================================================================
 *  TUXAWALLET — Configuración de Tokens y Mapeo de Precios
 * ============================================================================
 *  Archivo:   src/config/tokens.config.js
 *  Propósito: Mapear las direcciones de contrato de Tuxachain con sus IDs
 *             canónicos y preparar el terreno para múltiples APIs.
 * ============================================================================
 */

export const TOKEN_MAP = {
  // 1. Token Nativo (Gas)
  'native': {
    coingeckoId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum (Gas)',
    decimals: 18,
    isStable: false
  },

  // 2. Tokens Puenteados (OmniBridge)
  '0x8bec47865ade3b172a928df8f990bc7f2a3b9f79': {
    coingeckoId: 'aurora-near',
    symbol: 'AURORA',
    name: 'Aurora',
    decimals: 18,
    isStable: false
  },
  '0xc42c30ac6cc15fac9bd938618bcaa1a1fae8501d': {
    coingeckoId: 'wrapped-near',
    symbol: 'wNEAR',
    name: 'Wrapped NEAR',
    decimals: 24,
    isStable: false
  },
  '0x5a524251df27a25ac6b9964a93e1c23ad692688d': {
    coingeckoId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum (Puenteado)',
    decimals: 18,
    isStable: false
  },
  '0x368ebb46aca6b8d0787c96b2b20bd3cc3f2c45f7': {
    coingeckoId: 'usd-coin',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isStable: true
  },
  '0x80da25da4d783e57d2fcda0436873a193a4beccf': {
    coingeckoId: 'tether',
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    isStable: true
  },
  '0x91b72833c45844d2182b7bcb49a08ec927b14dca': {
    coingeckoId: 'turbo',
    symbol: 'TURBO',
    name: 'Turbo',
    decimals: 18,
    isStable: false
  }
};
