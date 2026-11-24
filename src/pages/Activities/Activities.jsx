import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, SlidersHorizontal, RefreshCw, AlertCircle } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore.js';
import { useTransactionStore } from '../../store/useTransactionStore.js';
import { fetchTransactionHistory } from '../../services/history.service.js';
import TransactionIcon from '../../components/TransactionIcon.jsx';
import TransactionDetailModal from '../../components/TransactionDetailModal.jsx';
import FilterModal from '../../components/FilterModal.jsx';

function getDateGroup(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Activities() {
  const navigate = useNavigate();
  const { activeAccount } = useWalletStore();
  const { transactions: cachedTxs, addTransactions } = useTransactionStore();
  
  const addressKey = activeAccount?.address?.toLowerCase();

  // Estados
  const [isLoading, setIsLoading] = useState(!cachedTxs[addressKey]?.length);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextPage, setNextPage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Modales
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [filters, setFilters] = useState({ type: 'all', status: 'all' });

  // Obtener las transacciones del cache o del estado local
  const displayTxs = cachedTxs[addressKey] || [];

  // 1. Carga Inicial (Caché + Actualización en segundo plano)
  const loadInitial = async (isRefresh = false) => {
    if (!addressKey) return;
    if (isRefresh) setIsRefreshing(true);
    else if (!displayTxs.length) setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await fetchTransactionHistory(addressKey);
      
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        // Guardamos en el store persistente
        addTransactions(addressKey, result.data);
        setNextPage(result.nextPage);
      }
    } catch (e) {
      setErrorMsg('Error inesperado al conectar con el explorador.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitial(false);
  }, [addressKey]); // Se ejecuta al montar o cambiar de cuenta

  // 2. Paginación
  const handleLoadMore = async () => {
    if (!nextPage || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchTransactionHistory(addressKey, nextPage);
      if (result.error) setErrorMsg(result.error);
      else {
        addTransactions(addressKey, result.data);
        setNextPage(result.nextPage);
      }
    } catch (e) {
      setErrorMsg('Error al cargar más transacciones.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 3. Filtrado y Agrupación por fecha
  const groupedTransactions = useMemo(() => {
    let filtered = displayTxs.filter(tx => {
      // Filtro de Estado
      if (filters.status !== 'all' && tx.status !== filters.status) return false;
      
      // Filtro de Tipo
      if (filters.type !== 'all') {
        if (filters.type === 'send' && !tx.isSender) return false;
        if (filters.type === 'receive' && tx.isSender) return false;
        if (filters.type === 'swap' && tx.type !== 'swap') return false;
        if (filters.type === 'bridge' && tx.type !== 'bridge') return false;
        if (filters.type === 'approve' && tx.type !== 'approve') return false;
      }
      return true;
    });

    const groups = {};
    filtered.forEach(tx => {
      const group = getDateGroup(tx.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(tx);
    });

    return groups;
  }, [displayTxs, filters]);

  if (!activeAccount) return null;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-10">
      
      {/* HEADER */}
      <header className="p-4 flex items-center justify-between bg-gray-950 z-20 sticky top-0 border-b border-white/5">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Actividades</h1>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => loadInitial(true)} 
            disabled={isRefreshing}
            className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin text-purple-400' : ''} />
          </button>
          <button onClick={() => setShowFilterModal(true)} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors relative">
            <SlidersHorizontal size={20} className={filters.type !== 'all' || filters.status !== 'all' ? 'text-purple-400' : ''} />
            {(filters.type !== 'all' || filters.status !== 'all') && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 overflow-y-auto mt-4">
        {/* MENSAJE DE ERROR */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="shrink-0" /> 
            <div>
              <p className="font-bold">Problema de conexión</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
             {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-900 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm">No hay transacciones para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
              <div key={dateLabel}>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{dateLabel}</h3>
                <div className="space-y-2">
                  {txs.map((tx, index) => (
                    <button 
                      key={`${tx.hash}-${index}`}
                      onClick={() => setSelectedTx(tx)} // <-- Abre el modal
                      className="w-full bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-3 flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <TransactionIcon type={tx.type} />
                        <div>
                          <p className="font-bold text-sm capitalize">{tx.method}</p>
                          <p className="text-xs text-gray-400">
                            {tx.isSender ? 'Para: ' : 'De: '} 
                            {tx.isSender 
                              ? (tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : 'Desconocido') 
                              : (tx.from ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}` : 'Desconocido')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${tx.isSender ? 'text-white' : 'text-green-400'}`}>
                          {tx.isSender ? '-' : '+'}{tx.amount} {tx.symbol}
                        </p>
                        <p className={`text-xs ${tx.status === 'ok' ? 'text-gray-400' : 'text-red-400'}`}>
                          {tx.status === 'ok' ? 'Confirmada' : 'Fallida'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {/* PAGINACIÓN */}
            {nextPage && (
              <div className="pt-4 pb-8 flex justify-center">
                <button 
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="bg-gray-900 hover:bg-gray-800 text-purple-400 border border-purple-500/20 px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isLoadingMore ? <RefreshCw size={16} className="animate-spin" /> : null}
                  <span>{isLoadingMore ? 'Cargando...' : 'Cargar más'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALES */}
      <FilterModal 
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        currentFilters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
      />

      <TransactionDetailModal 
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        tx={selectedTx}
      />
    </div>
  );
      }
