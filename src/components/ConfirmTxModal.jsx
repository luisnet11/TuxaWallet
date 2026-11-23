import { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore.js';
import { useAddressBookStore } from '../store/useAddressBookStore.js';
import { unlockWallet } from '../vault/walletVault.js';
import AccountAvatar from './AccountAvatar.jsx';

export default function ConfirmTxModal({ isOpen, onClose, token, amount, recipient, gasFee, onConfirm }) {
  const { vaultBlob } = useWalletStore();
  const { contacts } = useAddressBookStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const isKnownContact = contacts.some(c => c.address.toLowerCase() === recipient.toLowerCase());
  const truncatedRecipient = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isKnownContact) {
      setIsVerifying(true);
      try {
        await unlockWallet(vaultBlob, password);
      } catch (err) {
        setError('Contraseña incorrecta. Intenta de nuevo.');
        setIsVerifying(false);
        return;
      }
      setIsVerifying(false);
    }
    
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-end md:justify-center items-center z-[60]">
      
      <div className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl md:rounded-3xl p-6 shadow-2xl border-t md:border border-white/10 relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 md:hidden"></div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Revisar Transacción</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20}/>
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <h1 className="text-4xl font-bold mb-2">{amount} <span className="text-2xl text-gray-400">{token.symbol}</span></h1>
          <div className="flex items-center space-x-2 bg-gray-950 px-4 py-2 rounded-full border border-white/5">
            <span className="text-xs text-gray-500">Para:</span>
            <AccountAvatar address={recipient} size={20} />
            <span className="font-mono text-sm text-gray-300">{truncatedRecipient}</span>
          </div>
        </div>

        <div className="bg-gray-950 rounded-2xl p-4 mb-6 border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Red</span>
            <span className="font-medium text-white">Tuxachain</span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3">
            <span className="text-gray-400">Costo estimado de red</span>
            <span className="font-bold text-green-400">{gasFee.isFree ? 'Gratis (Subsidiado)' : `~ ${gasFee.feeEth} ETH`}</span>
          </div>
        </div>

        {!isKnownContact && (
          <div className="mb-6">
            <div className="flex items-start space-x-2 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-3">
              <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-200">
                Estás enviando a una dirección nueva. Ingresa tu contraseña para autorizar esta operación.
              </p>
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña maestra"
              className="w-full bg-gray-950 border border-red-500/30 rounded-xl p-4 text-sm focus:ring-1 focus:ring-red-500 outline-none transition-all"
            />
            {error && <p className="text-red-400 text-xs mt-2 font-bold">{error}</p>}
          </div>
        )}

        <button 
          onClick={handleConfirm}
          disabled={(!isKnownContact && !password) || isVerifying}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:shadow-none"
        >
          {isVerifying ? 'Verificando...' : 'Confirmar y Enviar'}
        </button>
      </div>
    </div>
  );
      }
