import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../store/useWalletStore.js';

export default function useAutoLock(timeoutMinutes = 5) {
  const navigate = useNavigate();
  const isUnlocked = useWalletStore(state => state.isUnlocked);
  const lockWallet = useWalletStore(state => state.lockWallet);
  
  const timerRef = useRef(null);

  useEffect(() => {
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

    resetTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    let lastReset = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset > 1000) {
        lastReset = now;
        resetTimer();
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [isUnlocked, timeoutMinutes, lockWallet, navigate]);
}
