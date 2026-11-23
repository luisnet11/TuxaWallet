import { CheckCircle2, XCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { TUXACHAIN_EXPLORER_URL } from '../services/tuxachain.config.js';

export default function TxResultModal({ isOpen, onClose, result, tokenSymbol, amount, recipient }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !result) return null;

  const isSuccess = result.success;
  const truncatedRecipient = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-end md:justify-center items-center z-[70]">
      
      <div className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl md:rounded-3xl p-6 shadow-2xl border-t md:border border-white/10 relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200 text-center">
        
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 md:hidden"></div>

        <div className="flex justify-center mb-4">
          {isSuccess ? (
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} className="text-green-400" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
              <XCircle size={48} className="text-red-400" />
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-1">{isSuccess ? '¡Envío Exitoso!' : 'Transacción Fallida'}</h2>
        <p className="text-gray-400 text-sm mb-4">{isSuccess ? 'Se ha completado el envío' : 'La red rechazó la transacción'}</p>

        <h1 className="text-3xl font-bold mb-2">{amount} {tokenSymbol}</h1>
        <p className="text-sm text-gray-400 font-mono mb-6">Para: {truncatedRecipient}</p>

        <div className="bg-gray-950 rounded-xl p-4 mb-4 text-left border border-white/5">
          <p className="text-xs text-gray-500 mb-1">Hash de la Transacción</p>
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm text-gray-300 truncate mr-2">{result.hash}</p>
            <button onClick={handleCopy} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
             <span className="text-xs text-gray-500">Costo de red:</span>
             <span className="text-xs font-bold text-gray-300">{result.feeEth === '0.0000' ? 'Gratis' : `${result.feeEth} ETH`}</span>
          </div>
        </div>

        <div className="space-y-2">
          <a 
            href={`${TUXACHAIN_EXPLORER_URL}/tx/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <span>Ver en el Explorador</span>
            <ExternalLink size={16} />
          </a>
          <button onClick={onClose} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
