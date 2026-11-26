import { TOKEN_MAP } from '../config/tokens.config.js';

const JSDELIVR_BASE_URL = 'https://cdn.jsdelivr.net/gh/aurora-is-near/bridge-assets@master/tokens/';
const CACHE_PREFIX = 'tuxa_logo_v1_';
// URL oficial de TrustWallet para ETH, para salir del problema del logo faltante
const ETH_LOGO_URL = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png';

function svgToDataUri(svgText) {
  const bytes = new TextEncoder().encode(svgText);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export async function getTokenLogo(address, symbol = '', customLogoURI = null) {
  // Si el token ya trae un logoURI (del JSON o importación manual), lo usamos directo
  if (customLogoURI) return customLogoURI;

  const cleanKey = (address || '').toString().trim().toLowerCase();
  if (!cleanKey && !symbol) return null;

  const cacheKey = `${CACHE_PREFIX}${cleanKey || symbol.toLowerCase()}`;

  try {
    const cachedLogo = localStorage.getItem(cacheKey);
    if (cachedLogo) return cachedLogo;
  } catch (_) {}

  // Si es ETH nativo, usamos el logo de TrustWallet
  if (symbol.toUpperCase() === 'ETH') {
    return ETH_LOGO_URL;
  }

  const tokenInfo = TOKEN_MAP[cleanKey] || Object.values(TOKEN_MAP).find(t => symbol && t.symbol?.toLowerCase() === symbol.toLowerCase());
  let logoFile = tokenInfo?.logoFile || (symbol ? `${symbol.toLowerCase()}.svg` : null);
  
  if (!logoFile) return null;

  try {
    const response = await fetch(`${JSDELIVR_BASE_URL}${logoFile}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const svgText = await response.text();
    if (!svgText.includes('<svg')) throw new Error('No es SVG');
    
    const dataUri = svgToDataUri(svgText);
    try { localStorage.setItem(cacheKey, dataUri); } catch (_) {}
    return dataUri;
  } catch (error) {
    return null;
  }
}
