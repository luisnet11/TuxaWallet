import { TOKEN_MAP } from '../config/tokens.config.js';

const JSDELIVR_BASE_URL = 'https://cdn.jsdelivr.net/gh/aurora-is-near/bridge-assets@master/tokens/';
const CACHE_PREFIX = 'tuxa_logo_';

export async function getTokenLogo(address) {
  if (!address) return null;
  const cleanAddress = address.toLowerCase();
  
  // 1. Revisar si ya está en el almacenamiento persistente (localStorage)
  try {
    const cachedLogo = localStorage.getItem(`${CACHE_PREFIX}${cleanAddress}`);
    if (cachedLogo) return cachedLogo;
  } catch (e) {}

  // 2. Buscar el archivo correspondiente en la configuración
  const tokenInfo = TOKEN_MAP[cleanAddress];
  if (!tokenInfo || !tokenInfo.logoFile) return null;

  // 3. Descargar desde jsDelivr
  try {
    const response = await fetch(`${JSDELIVR_BASE_URL}${tokenInfo.logoFile}`);
    if (!response.ok) throw new Error('Logo no encontrado en el repositorio');
    
    const svgText = await response.text();
    
    // Convertir el SVG a un Data URI (Base64) para guardarlo
    // Usamos unescape/encodeURIComponent para manejar caracteres especiales en el SVG
    const base64Svg = btoa(unescape(encodeURIComponent(svgText)));
    const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

    // 4. Guardar en la caché persistente
    try {
      localStorage.setItem(`${CACHE_PREFIX}${cleanAddress}`, dataUri);
    } catch (e) {
      console.warn('No se pudo guardar el logo en localStorage (cuota excedida)', e);
    }

    return dataUri;
  } catch (error) {
    console.warn(`[TuxaWallet] No se pudo cargar el logo para ${tokenInfo.symbol}:`, error.message);
    return null;
  }
}
