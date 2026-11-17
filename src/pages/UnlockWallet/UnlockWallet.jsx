import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // <-- NUEVO: useLocation
import { useWalletStore } from '../../store/useWalletStore.js';

export default function UnlockWallet() {
  const navigate = useNavigate();
  const location = useLocation(); // <-- NUEVO
  const { unlockExistingWallet, resetWallet, isLoading, error, clearError } = useWalletStore();

  const [password, setPassword] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [localError, setLocalError] = useState('');

  // NUEVA LÓGICA: Si venimos de una ruta protegida, volvemos allí. Si no, al dashboard.
  const from = location.state?.from?.pathname || '/dashboard';

  const handleUnlock = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    if (!password) return;

    try {
      await unlockExistingWallet(password);
      navigate(from, { replace: true }); // <-- Usamos la ruta guardada
    } catch (err) {
      // El error se maneja en el store
    }
  };

  const handleReset = () => {
    resetWallet();
    setShowResetModal(false);
    navigate('/welcome');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0b2e] to-[#0f0518] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-purple-500/20 border border-purple-500/30 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.3)]">
            <span className="text-4xl">🔒</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center">Bienvenido de nuevo</h1>
        <p className="text-gray-400 mb-8 text-sm text-center">
          Ingresa tu contraseña para desbloquear TuxaWallet.
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
              placeholder="Contraseña maestra"
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500 backdrop-blur-md transition-all"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!password || isLoading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:shadow-none"
          >
            {isLoading ? 'Verificando...' : 'Desbloquear'}
          </button>
        </form>

        <div className="mt-12 text-center">
          <button
            onClick={() => setShowResetModal(true)}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors underline decoration-gray-700 underline-offset-4"
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
