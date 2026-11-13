/**
 * ============================================================================
 *  TUXAWALLET — Servicio de Precios (Fiat Blindado)
 * ============================================================================
 *  Archivo:   src/services/price.service.js
 *  Propósito: Obtener precios con caché local, CoinGecko y DexScreener.
 * ============================================================================
 */

import { TOKEN_MAP } from '../config/tokens.config.js';

const CACHE_KEY = 'tuxa_prices_cache';
const CACHE_TTL_MS = 60 * 1000; // 1 minuto

/**
 * Obtiene el precio de un conjunto de tokens en una moneda fiat específica.
 */
export async function fetchTokenPrices(tokenIdentifiers, fiatCurrency = 'usd') {
  // 1. Revisar Caché Local (localStorage)
  try {
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
      const cache = JSON.parse(cachedStr);
      const isFresh = (Date.now() - cache.timestamp) < CACHE_TTL_MS;
      const isSameFiat = cache.fiat === fiatCurrency;
      
      if (isFresh && isSameFiat) {
        return cache.data;
      }
    }
  } catch (e) {
    console.warn('[TuxaWallet] Error leyendo caché de precios', e);
  }

  // 2. Intentar con CoinGecko
  let prices = await tryCoinGecko(tokenIdentifiers, fiatCurrency);

  // 3. Fallback: Si CoinGecko falla (ej. rate limit), intentar con DexScreener
  if (!prices) {
    console.warn('[TuxaWallet] CoinGecko falló. Usando DexScreener...');
    prices = await tryDexScreener(tokenIdentifiers, fiatCurrency);
  }

  // 4. Si ambos fallan, usar Stablecoins = 1 y el resto 0 para no romper la UI
  if (!prices) {
    prices = generateFallbackPrices(tokenIdentifiers);
  }

  // 5. Guardar en caché para futuras peticiones
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: prices,
      timestamp: Date.now(),
      fiat: fiatCurrency
    }));
  } catch (e) {}

  return prices;
}

/* ---------------------------------------------------------------------------
 * FUENTE 1: CoinGecko
 * ------------------------------------------------------------------------ */
async function tryCoinGecko(tokenIdentifiers, fiat) {
  try {
    const coingeckoIds = tokenIdentifiers
      .map(addr => TOKEN_MAP[addr.toLowerCase()] || TOKEN_MAP[addr] || TOKEN_MAP['native'])
      .filter(t => t && t.coingeckoId)
      .map(t => t.coingeckoId);

    const uniqueIds = [...new Set(coingeckoIds)];
    if (uniqueIds.length === 0) return null;

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=${fiat}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('CoinGecko error');
    
    const rawData = await response.json();
    
    const formatted = {};
    for (const [address, tokenInfo] of Object.entries(TOKEN_MAP)) {
      if (rawData[tokenInfo.coingeckoId] && rawData[tokenInfo.coingeckoId][fiat]) {
        formatted[tokenInfo.symbol] = rawData[tokenInfo.coingeckoId][fiat];
      }
    }
    return formatted;

  } catch (error) {
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * FUENTE 2: DexScreener (Usa direcciones de contrato)
 * ------------------------------------------------------------------------ */
async function tryDexScreener(tokenIdentifiers, fiat) {
  try {
    // DexScreener solo devuelve precios en USD en su API pública
    if (fiat !== 'usd') return null;

    const addresses = tokenIdentifiers
      .map(addr => addr === 'native' ? null : addr)
      .filter(addr => addr !== null);

    // Si solo se pidió el token nativo (ETH), DexScreener no sirve aquí,
    // así que devolvemos null para que salte al fallback.
    if (addresses.length === 0) return null;

    const url = `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(',')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('DexScreener error');

    const data = await response.json();
    const formatted = {};

    // DexScreener devuelve un array de pares, buscamos el de mayor liquidez
    if (data.pairs && data.pairs.length > 0) {
      for (const tokenAddr of addresses) {
        const pairs = data.pairs.filter(p => 
          p.baseToken.address.toLowerCase() === tokenAddr.toLowerCase() ||
          p.quoteToken.address.toLowerCase() === tokenAddr.toLowerCase()
        );
        
        if (pairs.length > 0) {
          // Ordenar por liquidez (usd) de mayor a menor
          pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
          const bestPair = pairs[0];
          
          const tokenInfo = TOKEN_MAP[tokenAddr.toLowerCase()] || TOKEN_MAP[tokenAddr];
          if (tokenInfo) {
            formatted[tokenInfo.symbol] = parseFloat(bestPair.priceUsd);
          }
        }
      }
    }
    return Object.keys(formatted).length > 0 ? formatted : null;

  } catch (error) {
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * FALLBACK FINAL
 * ------------------------------------------------------------------------ */
function generateFallbackPrices(tokenIdentifiers) {
  const fallback = {};
  for (const addr of tokenIdentifiers) {
    const tokenInfo = TOKEN_MAP[addr.toLowerCase()] || TOKEN_MAP[addr] || TOKEN_MAP['native'];
    if (tokenInfo) {
      fallback[tokenInfo.symbol] = tokenInfo.isStable ? 1 : 0;
    }
  }
  return fallback;
  }
