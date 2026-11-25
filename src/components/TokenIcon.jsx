import { useState, useEffect } from 'react';
import { getTokenLogo } from '../services/logo.service.js';
import { isNativeToken } from '../utils/tokenHelpers.js';

export default function TokenIcon({ address, symbol, size = 40 }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const native = isNativeToken(address, symbol);
  const lookupAddress = native ? 'native' : address;
  const lookupSymbol = native ? 'ETH' : symbol;

  useEffect(() => {
    let isMounted = true;

    const loadLogo = async () => {
      setIsLoading(true);
      try {
        const url = await getTokenLogo(lookupAddress, lookupSymbol);
        if (isMounted) setLogoUrl(url || null);
      } catch (_) {
        if (isMounted) setLogoUrl(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadLogo();
    return () => { isMounted = false; };
  }, [lookupAddress, lookupSymbol]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 animate-pulse rounded-full shrink-0" style={{ width: size, height: size }} />
    );
  }

  if (logoUrl) {
    return (
      <img src={logoUrl} alt={lookupSymbol || 'Token'} className="rounded-full object-contain bg-gray-800 p-1 shrink-0" style={{ width: size, height: size }} />
    );
  }

  return (
    <div className="bg-gray-800 rounded-full flex items-center justify-center font-bold text-purple-400 shrink-0" style={{ width: size, height: size }}>
      <span style={{ fontSize: size * 0.4 }}>{lookupSymbol?.[0] || '?'}</span>
    </div>
  );
}
