import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWalletStore } from '../../store/useWalletStore.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 60 * 1000; // 60 segundos

export default function UnlockWallet() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unlockExistingWallet, resetWallet, isLoading, error, clearError } = useWalletStore();

  const [password, setPassword] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [localError, setLocalError] = useState('');
  
  // Estados de Rate Limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Ruta de retorno
  const from = location.state?.from?.pathname || '/dashboard';

  // Cargar bloqueo persistente al montar
  useEffect(() => {
    const storedLockout = localStorage.getItem('tuxa_lockout_until');
    const storedAttempts = localStorage.getItem('tuxa_failed_attempts');
    
    if (storedLockout && Number(storedLockout) > Date.now()) {
      setLockoutUntil(Number(storedLockout));
    }
    if (storedAttempts) {
      setFailedAttempts(Number(storedAttempts));
    }
  }, []);

  // Temporizador para la cuenta regresiva
  useEffect(() => {
    if (lockoutUntil <= Date.now()) return;

    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(0);
        setFailedAttempts(0);
        localStorage.removeItem('tuxa_lockout_until');
        localStorage.removeItem('tuxa_failed_attempts');
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    if (!password || lockoutUntil > Date.now()) return;

    try {
      await unlockExistingWallet(password);
      // Éxito: Limpiar contadores
      localStorage.removeItem('tuxa_lockout_until');
      localStorage.removeItem('tuxa_failed_attempts');
      navigate(from, { replace: true });
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('tuxa_failed_attempts', newAttempts.toString());

      if (newAttempts >= MAX_ATTEMPTS) {
        const unlockTime = Date.now() + LOCKOUT_TIME_MS;
        setLockoutUntil(unlockTime);
        setTimeLeft(60);
        localStorage.setItem('tuxa_lockout_until', unlockTime.toString());
        setLocalError('Demasiados intentos fallidos. Billetera bloqueada temporalmente.');
      }
    }
  };

  const handleReset = () => {
    resetWallet();
    setShowResetModal(false);
    localStorage.removeItem('tuxa_lockout_until');
    localStorage.removeItem('tuxa_failed_attempts');
    navigate('/welcome');
  };

  const isLockedOut = lockoutUntil > Date.now();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0b2e] to-[#0f0518] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <div className={`w-20 h-20 ${isLockedOut ? 'bg-red-500/20 border-red-500/30' : 'bg-purple-500/20 border-purple-500/30'} border rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-colors`}>
            <span className="text-4xl">{isLockedOut ? '🚫' : '🔒'}</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center">
          {isLockedOut ? 'Bloqueado temporalmente' : 'Bienvenido de nuevo'}
        </h1>
        <p className="text-gray-400 mb-8 text-sm text-center">
          {isLockedOut 
            ? `Por seguridad, espera ${timeLeft} segundos antes de intentar de nuevo.`
            : 'Ingresa tu contraseña para desbloquear TuxaWallet.'}
        </p>

        {(error || localError) && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm text-center backdrop-blur-md">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-5">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLockedOut ? "Bloqueado" : "Contraseña maestra"}
              disabled={isLockedOut}
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500 backdrop-blur-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!password || isLoading || isLockedOut}
            className={`w-full font-bold py-4 rounded-xl transition-all ${
              isLockedOut 
                ? 'bg-red-900/50 text-red-300 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:shadow-none'
            }`}
          >
            {isLoading ? 'Verificando...' : isLockedOut ? `Espera ${timeLeft}s` : 'Desbloquear'}
          </button>
        </form>

        <div className="mt-12 text-center">
          <button
            onClick={() => setShowResetModal(true)}
            disabled={isLockedOut}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors underline decoration-gray-700 underline-offset-4 disabled:opacity-50"
          >
            He perdido mi contraseña / Borrar billetera
          </button>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a0b2e] border border-red-900/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">¿Borrar billetera?</h2>
            <p className="text-sm text-gray-400 mb-6">
              Esta acción eliminará la billetera de este dispositivo. <strong>Si no tienes tu frase semilla guardada, perderás acceso a tus fondos para siempre.</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
          }
