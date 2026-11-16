import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { bottts, identicon } from '@dicebear/collection';

/**
 * Genera un avatar cyberpunk determinista basado en la dirección de la billetera.
 * @param {string} address - Dirección EVM (ej. 0x123...).
 * @param {number} size - Tamaño del avatar en píxeles.
 * @param {'bottts' | 'identicon'} style - Estilo del avatar.
 */
export default function AccountAvatar({ address, size = 40, style = 'bottts' }) {
  const avatarUri = useMemo(() => {
    if (!address) return '';
    
    // Semilla: Usamos la dirección para que el avatar sea siempre el mismo.
    const seed = address.toLowerCase();

    if (style === 'identicon') {
      // Estilo Cyberpunk "Electric": Colores neón sobre fondo oscuro
      return createAvatar(identicon, {
        seed,
        size,
        backgroundColor: ['101216'], // Fondo oscuro cyberpunk
        rowColor: ['ff2e88', '00e5ff', 'ffe600', '7cff00', 'ff6a00', 'b400ff'], // Neones
      }).toDataUri();
    }

    // Estilo Robot (Bottts) con colores personalizados para Tuxachain
    return createAvatar(bottts, {
      seed,
      size,
      // Personalización de colores para el robot
      baseColor: ['8a2be2'], // Morado Tuxachain
      primaryColor: ['00ffff'], // Cian neón
      secondaryColor: ['ff00ff'], // Magenta neón
    }).toDataUri();
  }, [address, size, style]);

  if (!avatarUri) return null;

  return (
    <img 
      src={avatarUri} 
      alt="Account Avatar" 
      className="rounded-full border border-white/20 shadow-[0_0_10px_rgba(0,255,255,0.3)]" 
      style={{ width: size, height: size }}
    />
  );
    }
