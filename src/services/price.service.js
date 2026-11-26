import { TOKEN_MAP } from '../config/tokens.config.js';

const CACHE_KEY = 'tuxa_prices_cache';
const CACHE_TTL_MS = 60 * 1000; // 1 minuto

export async function fetchTokenPrices(tokenIdentifiers, fiatCurrency = 'usd') {
  const targetFiat = fiatCurrency.toLowerCase();

  // 1. Revisar Caché
  try {
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
      const cache = JSON.parse(cachedStr);
      if ((Date.now() - cache.timestamp) < CACHE_TTL_MS && cache.fiat === targetFiat) {
        // Verificamos si el cache tiene el formato nuevo (con price y change24h)
        const firstKey = Object.keys(cache.data)[0];
        if (firstKey && typeof cache.data[firstKey] === 'object' && 'price' in cache.data[firstKey]) {
          return cache.data;
        }
      }
    }
  } catch (e) {}

  // 2. Consultar CoinGecko
  let prices = await fetchFromCoinGecko(tokenIdentifiers, targetFiat);

  // 3. Fallback
  if (!prices) prices = generateFallbackPrices(tokenIdentifiers);

  // 4. Guardar en Caché
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: prices,
      timestamp: Date.now(),
      fiat: targetFiat
    }));
  } catch (e) {}

  return prices;
}

async function fetchFromCoinGecko(tokenIdentifiers, fiat) {
  try {
    const ids = tokenIdentifiers
      .map(addr => TOKEN_MAP[addr.toLowerCase()]?.coingeckoId || TOKEN_MAP[addr]?.coingeckoId)
      .filter(id => id);
    
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return {};

    // Añadimos include_24hr_change=true
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=${fiat}&include_24hr_change=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('CoinGecko error');

    const rawData = await response.json();
    const formatted = {};

    tokenIdentifiers.forEach(addr => {
      const info = TOKEN_MAP[addr.toLowerCase()] || TOKEN_MAP[addr];
      if (info && rawData[info.coingeckoId] && rawData[info.coingeckoId][fiat]) {
        formatted[info.symbol] = {
          price: rawData[info.coingeckoId][fiat],
          change24h: rawData[info.coingeckoId][`${fiat}_24h_change`] || 0
        };
      }
    });

    return formatted;
  } catch (error) {
    console.warn('[TuxaWallet] CoinGecko falló:', error.message);
    return null;
  }
}

function generateFallbackPrices(tokenIdentifiers) {
  const fallback = {};
  tokenIdentifiers.forEach(addr => {
    const info = TOKEN_MAP[addr.toLowerCase()] || TOKEN_MAP[addr];
    if (info) fallback[info.symbol] = { price: info.isStable ? 1 : 0, change24h: 0 };
  });
  return fallback;
      }
