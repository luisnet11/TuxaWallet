import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../store/useWalletStore.js';

export default function useAutoLock(timeoutMinutes = 5) {
  const navigate = useNavigate();
  const isUnlocked = useWalletStore(state => state.isUnlocked);
  const lockWallet = useWalletStore(state => state.lockWallet);
  
  // Usamos un ref para guardar el ID del temporizador y no causar re-renders
  const timerRef = useRef(null);

  useEffect(() => {
    // Si la billetera no está desbloqueada, no hacemos nada
    if (!isUnlocked) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const handleLock = () => {
      lockWallet();
      navigate('/unlock');
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLock, timeoutMs);
    };

    // Iniciar el temporizador al cargar
    resetTimer();

    // Eventos que reinician el contador (movimiento, teclado, toque, scroll)
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    // Usamos un "throttle" básico para no saturar el CPU
    let lastReset = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset > 1000) { // Solo reinicia si pasó 1 segundo
        lastReset = now;
        resetTimer();
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));

    // Limpieza cuando el componente se desmonta o la billetera se bloquea
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [isUnlocked, timeoutMinutes, lockWallet, navigate]);
}
