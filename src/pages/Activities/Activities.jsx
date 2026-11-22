import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, SlidersHorizontal, X, ExternalLink, RefreshCw } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore.js';
import { fetchTransactionHistory } from '../../services/history.service.js';
import { TUXACHAIN_EXPLORER_URL } from '../../services/tuxachain.config.js';
import TransactionIcon from '../../components/TransactionIcon.jsx';

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

  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextPage, setNextPage] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const loadInitial = async (isRefresh = false) => {
    if (!activeAccount?.address) return;
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const result = await fetchTransactionHistory(activeAccount.address);
      setTransactions(result.data || []);
      setNextPage(result.nextPage);
    } catch (e) {
      console.error(e);
      setTransactions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitial(false);
  }, [activeAccount?.address]);

  const handleLoadMore = async () => {
    if (!nextPage || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchTransactionHistory(activeAccount.address, nextPage);
      setTransactions(prev => [...prev, ...(result.data || [])]);
      setNextPage(result.nextPage);
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const groupedTransactions = useMemo(() => {
    const filtered = transactions.filter(tx => {
      if (filterType === 'sent') return tx.isSender;
      if (filterType === 'received') return !tx.isSender;
      return true;
    });

    const groups = {};
    filtered.forEach(tx => {
      const group = getDateGroup(tx.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(tx);
    });

    return groups;
  }, [transactions, filterType]);

  const openExplorer = (hash) => {
    window.open(`${TUXACHAIN_EXPLORER_URL}/tx/${hash}`, '_blank');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-10">
      
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
          <button onClick={() => setShowFilterModal(true)} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            <SlidersHorizontal size={20} className={filterType !== 'all' ? 'text-purple-400' : ''} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 overflow-y-auto mt-4">
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
                      onClick={() => openExplorer(tx.hash)}
                      className="w-full bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-3 flex items-center justify-between transition-colors group text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <TransactionIcon type={tx.type} />
                        <div>
                          <p className="font-bold text-sm capitalize flex items-center gap-2">
                            {tx.method}
                            <ExternalLink size={10} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
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

      {showFilterModal && (
        <div className="fixed inset-0 bg-black/80 flex flex-col justify-end z-50">
          <div className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Filtrar Actividad</h2>
              <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
            </div>
            
            <div className="space-y-2">
              {[
                { id: 'all', label: 'Todas las transacciones' },
                { id: 'sent', label: 'Solo enviadas' },
                { id: 'received', label: 'Solo recibidas' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => { setFilterType(option.id); setShowFilterModal(false); }}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${filterType === option.id ? 'bg-purple-600/20 border border-purple-500/30 text-purple-400' : 'bg-gray-950 text-gray-300 hover:bg-gray-800'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
