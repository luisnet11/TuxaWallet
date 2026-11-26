import { X, Star, EyeOff, AlertCircle } from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore.js';
import TokenIcon from './TokenIcon.jsx';

export default function TokenActionModal({ isOpen, onClose, token }) {
  const { favoriteTokens, toggleFavoriteToken, toggleHideToken, error, clearError } = useWalletStore();

  if (!isOpen || !token) return null;

  const isFavorite = favoriteTokens.includes(token.address.toLowerCase());

  const handleToggleFavorite = () => {
    clearError();
    toggleFavoriteToken(token.address);
    
    // Comprobar si hubo un error (límite alcanzado)
    const currentError = useWalletStore.getState().error;
    if (currentError) {
      // No cerramos el modal, mostramos el error
      return;
    }
    
    onClose();
  };

  const handleHide = () => {
    toggleHideToken(token.address);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-end md:justify-center items-center z-[80]"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl md:rounded-3xl p-6 shadow-2xl border-t md:border border-white/10 relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 md:hidden"></div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <TokenIcon address={token.address} symbol={token.symbol} logoURI={token.logoURI} size={32} />
            <h2 className="text-xl font-bold">{token.symbol}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* MENSAJE DE ERROR (Por límite de favoritos) */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <button 
            onClick={handleToggleFavorite}
            className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gray-950 hover:bg-gray-800 border border-white/5 transition-colors text-left"
          >
            <Star size={20} className={isFavorite ? "text-yellow-400" : "text-gray-400"} fill={isFavorite ? "currentColor" : "none"} />
            <span className="font-medium text-white">{isFavorite ? 'Quitar de Favoritos' : 'Fijar en Dashboard'}</span>
          </button>

          <button 
            onClick={handleHide}
            className="w-full flex items-center space-x-3 p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors text-left"
          >
            <EyeOff size={20} className="text-red-400" />
            <div>
              <span className="block font-medium text-red-400">Ocultar Token</span>
              <span className="text-xs text-red-300/70">Desaparecerá de la lista. Podrás volver a importarlo si lo necesitas.</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
