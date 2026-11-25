export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Si en algún lado del puente o configuración llega una dirección específica de ETH
// que en tu virtual chain debe tratarse siempre como nativo, agrégala aquí en minúsculas:
export const NATIVE_ETH_ALIASES = new Set([
  'native',
  ZERO_ADDRESS,
]);

export function isNativeToken(addressOrToken, symbol = '') {
  const rawAddress =
    typeof addressOrToken === 'object' && addressOrToken !== null
      ? addressOrToken.address
      : addressOrToken;

  const rawSymbol =
    typeof addressOrToken === 'object' && addressOrToken !== null
      ? addressOrToken.symbol || symbol
      : symbol;

  const addr = (rawAddress || '').toString().trim().toLowerCase();
  const sym = (rawSymbol || '').toString().trim().toUpperCase();

  if (NATIVE_ETH_ALIASES.has(addr)) return true;
  if (!addr && sym === 'ETH') return true;

  return false;
}

export function normalizeTokenId(address, symbol = '') {
  if (isNativeToken(address, symbol)) return 'native';
  return (address || '').toString().trim().toLowerCase();
}
