import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../store/useWalletStore.js';
import { getTuxaPublicClient } from '../services/viemClient.js';
import { Loader2, CheckCircle2, XCircle, X, ArrowRight } from 'lucide-react';

export default function PendingTransactions() {
  const navigate = useNavigate();
  const { pendingTransactions, removePendingTransaction } = useWalletStore();
  const [recentlyFinished, setRecentlyFinished] = useState(null);

  // Polling de las transacciones pendientes
  useEffect(() => {
    if (pendingTransactions.length === 0) return;

    const client = getTuxaPublicClient();
    const interval = setInterval(async () => {
      for (const tx of pendingTransactions) {
        try {
          const receipt = await client.getTransactionReceipt({ hash: tx.hash });
          if (receipt) {
            // La transacción terminó
            removePendingTransaction(tx.hash);
            if (receipt.status === 'success') {
              setRecentlyFinished({ ...tx, status: 'success' });
            } else {
              setRecentlyFinished({ ...tx, status: 'error' });
            }
            // Opcional: Recargar balances aquí si fuera necesario
          }
        } catch (e) {
          // Si el recibo no existe aún, Viem lanza un error (TransactionReceiptNotFoundError)
          // Ignoramos y seguimos esperando.
        }
      }
    }, 4000); // Polling cada 4 segundos

    return () => clearInterval(interval);
  }, [pendingTransactions, removePendingTransaction]);

  // Si hay una tx recién terminada, mostrarla brevemente
  if (recentlyFinished) {
    return (
      <div className="mt-6 mb-2 bg-gray-900 border border-white/10 rounded-2xl p-4 shadow-lg animate-in slide-in-from-top-2 relative">
        <button onClick={() => setRecentlyFinished(null)} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white"><X size={16}/></button>
        <div className="flex items-center space-x-3">
          {recentlyFinished.status === 'success' ? <CheckCircle2 size={24} className="text-green-400" /> : <XCircle size={24} className="text-red-400" />}
          <div>
            <p className="font-bold text-white text-sm">
              {recentlyFinished.status === 'success' ? '¡Transacción confirmada!' : 'Transacción fallida'}
            </p>
            <p className="text-xs text-gray-400">{recentlyFinished.amount} {recentlyFinished.symbol}</p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay pendientes, no mostrar nada
  if (pendingTransactions.length === 0) return null;

  return (
    <div className="mt-6 mb-2 bg-gray-900 border border-white/10 rounded-2xl p-4 shadow-lg animate-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-bold text-white">Actividad en curso</h3>
          <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
            <Loader2 size={10} className="animate-spin" /> <span>PULSE</span>
          </span>
        </div>
        <span className="text-xs text-gray-500">1 de {pendingTransactions.length} en curso</span>
      </div>

      <div className="bg-gray-950 rounded-xl p-3 border border-white/5">
        <p className="text-xs text-gray-400 mb-1">Transacción Pendiente:</p>
        <p className="font-bold text-sm text-white mb-3">Envío de {pendingTransactions[0].amount} {pendingTransactions[0].symbol}</p>
        
        {/* Barra de progreso visual (falsa, ya que no sabemos el % exacto, pero da feedback) */}
        <div className="flex items-center space-x-1 mb-2">
          <CheckCircle2 size={16} className="text-green-400" />
          <div className="h-0.5 flex-1 bg-green-400"></div>
          <Loader2 size={16} className="text-yellow-400 animate-spin" />
          <div className="h-0.5 flex-1 bg-gray-700"></div>
          <div className="w-4 h-4 rounded-full border border-gray-600 bg-gray-800"></div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 font-medium px-1">
          <span>Enviada</span>
          <span className="text-yellow-400">En red</span>
          <span>Confirmada</span>
        </div>
      </div>

      <button onClick={() => navigate('/activities')} className="w-full mt-3 text-xs text-purple-400 font-medium flex items-center justify-center">
        Ver Historial Completo <ArrowRight size={12} className="ml-1" />
      </button>
    </div>
  );
        }
