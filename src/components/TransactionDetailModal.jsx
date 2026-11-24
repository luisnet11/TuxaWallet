import { X, ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { TUXACHAIN_EXPLORER_URL } from '../services/tuxachain.config.js';

export default function TransactionDetailModal({ isOpen, onClose, tx }) {
  if (!isOpen || !tx) return null;

  const isSuccess = tx.status === 'ok';
  const isPending = tx.confirmations === 0;

  const truncate = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Desconocido';
  
  // Formatear Gas Price y Gas Used si es necesario
  const formatGas = (val) => Number(val).toLocaleString('es-ES');

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-end md:justify-center items-center z-[80]"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl md:rounded-3xl p-6 shadow-2xl border-t md:border border-white/10 relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 md:hidden"></div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Detalles de la Transacción</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* ESTADO Y MONTO PRINCIPAL */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            {isPending ? (
              <Clock size={48} className="text-yellow-400" />
            ) : isSuccess ? (
              <CheckCircle2 size={48} className="text-green-400" />
            ) : (
              <XCircle size={48} className="text-red-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold mb-1">{tx.isSender ? '-' : '+'}{tx.amount} {tx.symbol}</h1>
          <p className={`text-sm font-bold ${isPending ? 'text-yellow-400' : isSuccess ? 'text-green-400' : 'text-red-400'}`}>
            {isPending ? 'Pendiente' : isSuccess ? 'Confirmada' : 'Fallida'}
          </p>
        </div>

        {/* DATOS BÁSICOS */}
        <div className="bg-gray-950 rounded-2xl p-4 border border-white/5 space-y-3 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Tipo</span>
            <span className="font-bold text-gray-300 capitalize">{tx.method}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">De</span>
            <span className="font-mono text-gray-300">{truncate(tx.from)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Para</span>
            <span className="font-mono text-gray-300">{truncate(tx.to)}</span>
          </div>
        </div>

        {/* DATOS TÉCNICOS */}
        <div className="bg-gray-950 rounded-2xl p-4 border border-white/5 space-y-3 mb-6 text-xs">
          <p className="text-gray-400 font-bold uppercase tracking-wider mb-2">Datos Técnicos</p>
          <div className="flex justify-between">
            <span className="text-gray-500">Bloque</span>
            <span className="font-mono text-gray-300">{tx.blockNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Confirmaciones</span>
            <span className="font-mono text-gray-300">{tx.confirmations}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Gas Usado</span>
            <span className="font-mono text-gray-300">{formatGas(tx.gasUsed)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Gas Price</span>
            <span className="font-mono text-gray-300">{formatGas(tx.gasPrice)} wei</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Nonce</span>
            <span className="font-mono text-gray-300">{tx.nonce}</span>
          </div>
        </div>

        {/* BOTÓN AL EXPLORADOR */}
        <a 
          href={`${TUXACHAIN_EXPLORER_URL}/tx/${tx.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
        >
          <span>Ver en el Explorador</span>
          <ExternalLink size={18} />
        </a>
      </div>
    </div>
  );
}
