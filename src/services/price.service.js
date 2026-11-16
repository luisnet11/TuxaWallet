/**
 * ============================================================================
 *  TUXAWALLET — Servicio de Precios (Cascada Unificada y Resiliente)
 * ============================================================================
 *  Archivo:   src/services/price.service.js
 * ============================================================================
 */

import { TOKEN_MAP } from '../config/tokens.config.js';

const CACHE_KEY = 'tuxa_prices_cache';
const CACHE_TTL_MS = 60 * 1000; // 1 minuto

// ⚠️ Interruptor: false hasta que Tuxachain esté indexada.
const ENABLE_DYNAMIC_DISCOVERY = false; 

export async function fetchTokenPrices(tokenIdentifiers, fiatCurrency = 'usd') {
  const targetFiat = fiatCurrency.toLowerCase();
  let finalPrices = {};

  // 1. CACHÉ LOCAL (Prioridad si es fresco)
  try {
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
      const cache = JSON.parse(cachedStr);
      const isFresh = (Date.now() - cache.timestamp) < CACHE_TTL_MS;
      if (isFresh && cache.fiat === targetFiat) return cache.data;
    }
  } catch (e) {}

  // 2. INTENTO 1: CoinGecko (Masivo)
  const cgPrices = await tryCoinGeckoAll(tokenIdentifiers, targetFiat);
  finalPrices = { ...finalPrices, ...cgPrices };

  // 3. INTENTO 2: DexScreener (De Rescate)
  // Verificamos qué tokens aún no tienen precio (o si CoinGecko falló por completo)
  const missingTokens = tokenIdentifiers.filter(addr => {
    const lowerAddr = addr.toLowerCase();
    const tokenInfo = TOKEN_MAP[lowerAddr] || TOKEN_MAP[addr];
    // Si es conocido y ya tiene precio, no lo buscamos. Si es nativo y falló, tampoco (DexScreener no lee nativo).
    if (tokenInfo && finalPrices[tokenInfo.symbol] !== undefined) return false;
    if (addr === 'native' && finalPrices['ETH'] !== undefined) return false;
    
    // Si llegamos aquí, el token necesita precio de rescate (o es desconocido)
    return addr !== 'native'; 
  });

  if (missingTokens.length > 0) {
    console.warn('[TuxaWallet] Faltan precios, usando DexScreener de rescate...');
    const dsPrices = await tryDexScreener(missingTokens, targetFiat);
    finalPrices = { ...finalPrices, ...dsPrices };
  }

  // 4. INTENTO 3: Fallback para Stablecoins y Tokens sin precio
  tokenIdentifiers.forEach(addr => {
    const lowerAddr = addr.toLowerCase();
    const tokenInfo = TOKEN_MAP[lowerAddr] || TOKEN_MAP[addr];
    const key = tokenInfo ? tokenInfo.symbol : lowerAddr;

    if (finalPrices[key] === undefined) {
      finalPrices[key] = tokenInfo?.isStable ? 1 : 0;
    }
  });

  // 5. Guardar en Caché
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: finalPrices,
      timestamp: Date.now(),
      fiat: targetFiat
    }));
  } catch (e) {}

  return finalPrices;
}

/* ---------------------------------------------------------------------------
 * RASTREADOR 1: CoinGecko (Intenta leer todos los IDs conocidos)
 * ------------------------------------------------------------------------ */
async function tryCoinGeckoAll(addresses, fiat) {
  try {
    const ids = addresses
      .map(addr => TOKEN_MAP[addr.toLowerCase()]?.coingeckoId || TOKEN_MAP[addr]?.coingeckoId)
      .filter(id => id);
    
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return {};

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=${fiat}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('CoinGecko error');

    const rawData = await response.json();
    const formatted = {};

    addresses.forEach(addr => {
      const info = TOKEN_MAP[addr.toLowerCase()] || TOKEN_MAP[addr];
      if (info && rawData[info.coingeckoId] && rawData[info.coingeckoId][fiat]) {
        formatted[info.symbol] = rawData[info.coingeckoId][fiat];
      }
    });

    return formatted;
  } catch (error) {
    console.warn('[TuxaWallet] CoinGecko falló:', error.message);
    return {};
  }
}

/* ---------------------------------------------------------------------------
 * RASTREADOR 2: DexScreener (Busca por contrato, siempre en USD)
 * ------------------------------------------------------------------------ */
async function tryDexScreener(addresses, targetFiat) {
  if (!ENABLE_DYNAMIC_DISCOVERY && addresses.every(a => TOKEN_MAP[a.toLowerCase()])) {
    // Si no hay descubrimiento dinámico y todos son conocidos, 
    // no hacemos la petición para no saturar DexScreener sin necesidad.
    return {};
  }

  try {
    // DexScreener siempre devuelve USD
    const url = `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(',')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('DexScreener error');

    const data = await response.json();
    const formatted = {};

    if (data.pairs && data.pairs.length > 0) {
      addresses.forEach(addr => {
        const lowerAddr = addr.toLowerCase();
        const info = TOKEN_MAP[lowerAddr] || TOKEN_MAP[addr];
        
        // Buscar el par con mayor liquidez
        const pairs = data.pairs.filter(p => 
          p.baseToken.address.toLowerCase() === lowerAddr
        ).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

        if (pairs.length > 0) {
          const priceUsd = parseFloat(pairs[0].priceUsd);
          
          // Si el usuario pide otra moneda, aquí iría la conversión Forex.
          // Por ahora, si es EUR, dejamos un estimado (1 USD ≈ 0.92 EUR).
          // Esto se puede mejorar luego con una API de divisas.
          let finalPrice = priceUsd;
          if (targetFiat === 'eur') finalPrice = priceUsd * 0.92; 

          if (info) {
            formatted[info.symbol] = finalPrice;
          } else {
            formatted[lowerAddr] = finalPrice; // Token desconocido
          }
        }
      });
    }
    return formatted;
  } catch (error) {
    console.warn('[TuxaWallet] DexScreener falló:', error.message);
    return {};
  }
}
