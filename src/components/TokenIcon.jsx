import { useState, useEffect } from 'react';
import { getTokenLogo } from '../services/logo.service.js';

export default function TokenIcon({ address, symbol, size = 40 }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadLogo = async () => {
      setIsLoading(true);
      const url = await getTokenLogo(address);
      if (isMounted) {
        setLogoUrl(url);
        setIsLoading(false);
      }
    };

    loadLogo();
    return () => { isMounted = false; };
  }, [address]);

  // Si es el token nativo (ETH) o no hay dirección, usamos el fallback
  if (!address || address === 'native') {
    return (
      <div 
        className="bg-gray-800 rounded-full flex items-center justify-center font-bold text-purple-400"
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.4 }}>{symbol?.[0] || '?'}</span>
      </div>
    );
  }

  // Mientras carga, mostramos un esqueleto de carga
  if (isLoading) {
    return (
      <div 
        className="bg-gray-800 animate-pulse rounded-full"
        style={{ width: size, height: size }}
      ></div>
    );
  }

  // Si tenemos el logo, lo mostramos
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={symbol} 
        className="rounded-full object-contain bg-gray-800 p-1"
        style={{ width: size, height: size }}
      />
    );
  }

  // Fallback final: Círculo con la inicial del token
  return (
    <div 
      className="bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-300"
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: size * 0.4 }}>{symbol?.[0] || '?'}</span>
    </div>
  );
}
