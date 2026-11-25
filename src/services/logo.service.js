import { TOKEN_MAP } from '../config/tokens.config.js';

const JSDELIVR_BASE_URL = 'https://cdn.jsdelivr.net/gh/aurora-is-near/bridge-assets@master/tokens/';
const CACHE_PREFIX = 'tuxa_logo_v1_';

function svgToDataUri(svgText) {
  const bytes = new TextEncoder().encode(svgText);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export async function getTokenLogo(address, symbol = '') {
  const cleanKey = (address || '').toString().trim().toLowerCase();
  if (!cleanKey && !symbol) return null;

  const cacheKey = `${CACHE_PREFIX}${cleanKey || symbol.toLowerCase()}`;

  // 1. Revisar caché en localStorage
  try {
    const cachedLogo = localStorage.getItem(cacheKey);
    if (cachedLogo) return cachedLogo;
  } catch (_) {}

  // 2. Buscar configuración en TOKEN_MAP por dirección o por símbolo
  const tokenInfo =
    TOKEN_MAP[cleanKey] ||
    Object.values(TOKEN_MAP).find(
      (t) => symbol && t.symbol?.toLowerCase() === symbol.toLowerCase()
    );

  let logoFile = tokenInfo?.logoFile;
  
  // Si no hay logoFile mapeado pero es ETH, intentamos eth.svg
  if (!logoFile && symbol.toUpperCase() === 'ETH') {
    logoFile = 'eth.svg';
  } else if (!logoFile && symbol) {
    logoFile = `${symbol.toLowerCase()}.svg`;
  }
  
  if (!logoFile) return null;

  // 3. Descargar desde jsDelivr (rama master)
  try {
    const response = await fetch(`${JSDELIVR_BASE_URL}${logoFile}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al cargar ${logoFile}`);
    }

    const svgText = await response.text();
    if (!svgText.includes('<svg')) {
      throw new Error('Respuesta no contiene un SVG válido');
    }

    const dataUri = svgToDataUri(svgText);

    try {
      localStorage.setItem(cacheKey, dataUri);
    } catch (_) {
      console.warn('No se pudo guardar el logo en localStorage');
    }

    return dataUri;
  } catch (error) {
    console.warn(`[TuxaWallet] No se pudo cargar el logo para ${symbol || cleanKey}:`, error.message);
    return null;
  }
}
