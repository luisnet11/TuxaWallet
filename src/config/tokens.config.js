export const TOKEN_MAP = {
  'native': {
    coingeckoId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isStable: false,
    logoFile: 'eth.svg' // <-- Nombre exacto en el repo de Aurora
  },
  '0x8bec47865ade3b172a928df8f990bc7f2a3b9f79': {
    coingeckoId: 'aurora-near',
    symbol: 'AURORA',
    name: 'Aurora',
    decimals: 18,
    isStable: false,
    logoFile: 'aurora.svg'
  },
  '0xc42c30ac6cc15fac9bd938618bcaa1a1fae8501d': {
    coingeckoId: 'wrapped-near',
    symbol: 'wNEAR',
    name: 'Wrapped NEAR',
    decimals: 24,
    isStable: false,
    logoFile: 'wnear.svg'
  },
  '0x368ebb46aca6b8d0787c96b2b20bd3cc3f2c45f7': {
    coingeckoId: 'usd-coin',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isStable: true,
    logoFile: 'usdc.svg'
  },
  '0x80da25da4d783e57d2fcda0436873a193a4beccf': {
    coingeckoId: 'tether',
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    isStable: true,
    logoFile: 'usdt.svg'
  },
  '0x91b72833c45844d2182b7bcb49a08ec927b14dca': {
    coingeckoId: 'turbo',
    symbol: 'TURBO',
    name: 'Turbo',
    decimals: 18,
    isStable: false,
    logoFile: 'turbo.svg' // Si Turbo no está, fallará y mostrará el fallback
  }
};

export const DEFAULT_TOKENS = [
  { address: '0x8bec47865ade3b172a928df8f990bc7f2a3b9f79', symbol: 'AURORA', name: 'Aurora', decimals: 18 },
  { address: '0xc42c30ac6cc15fac9bd938618bcaa1a1fae8501d', symbol: 'wNEAR', name: 'Wrapped NEAR', decimals: 24 },
  { address: '0x368ebb46aca6b8d0787c96b2b20bd3cc3f2c45f7', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { address: '0x80da25da4d783e57d2fcda0436873a193a4beccf', symbol: 'USDT', name: 'Tether', decimals: 6 },
  { address: '0x91b72833c45844d2182b7bcb49a08ec927b14dca', symbol: 'TURBO', name: 'Turbo', decimals: 18 }
];
