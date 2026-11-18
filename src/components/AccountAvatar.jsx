import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { bottts } from '@dicebear/collection';

export default function AccountAvatar({ address, size = 40 }) {
  const avatarUri = useMemo(() => {
    if (!address) return '';
    
    // Semilla: Usamos la dirección en minúsculas para que sea determinista
    const seed = address.toLowerCase();

    // Generamos un robot único con colores Cyberpunk para Tuxachain
    return createAvatar(bottts, {
      seed,
      size,
      baseColor: ['8a2be2', '6a0dad', '4b0082', '9400d3', '8b008b'], 
      primaryColor: ['00ffff', 'ff00ff', '00ff00', 'ffff00', 'ff4500'],
      secondaryColor: ['101216'], 
      backgroundColor: ['101216'],
    }).toDataUri();
  }, [address, size]);

  if (!avatarUri) return null;

  return (
    <img 
      src={avatarUri} 
      alt="Account Avatar" 
      className="rounded-full border border-white/20 shadow-[0_0_10px_rgba(0,255,255,0.2)]" 
      style={{ width: size, height: size }}
    />
  );
                  }
