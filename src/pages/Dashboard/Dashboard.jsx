import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, RefreshCw, ArrowUpRight, ArrowDownLeft, Coins, Home } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore.js';
import { fetchTransactionHistory } from '../../services/history.service.js';
import TransactionIcon from '../../components/TransactionIcon.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    activeAccount, 
    lockWallet, 
    fetchActiveAccountBalance, 
    trackedTokens, 
    fetchERC20Balance,
    isUnlocked 
  } = useWalletStore();

  const [ethBalance, setEthBalance] = useState('0.0000');
  const [tokenBalances, setTokenBalances] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isUnlocked) {
      navigate('/unlock');
    }
  }, [isUnlocked, navigate]);

  const loadData = async () => {
    setIsRefreshing(true);
    setIsLoadingHistory(true);

    // 1. Cargar Saldo ETH
    const bal = await fetchActiveAccountBalance();
    setEthBalance(bal);
    
    // 2. Cargar Saldos de Tokens
    const newTokenBalances = {};
    for (const token of trackedTokens) {
      newTokenBalances[token.address] = await fetchERC20Balance(token.address);
    }
    setTokenBalances(newTokenBalances);

    // 3. Cargar Historial
    const realHistory = await fetchTransactionHistory(activeAccount?.address);
    
    // --- INICIO BLOQUE DE PRUEBA (MOCK DATA) ---
    // Si no hay historial real, inyectamos datos falsos para ver la UI.
    if (realHistory.length === 0) {
      setHistory([
        { hash: '0x123a', type: 'send', method: 'Transfer', amount: '0.5', symbol: 'ETH', timestamp: new Date().toISOString(), isSender: true, status: 'ok' },
        { hash: '0x456b', type: 'token_receive', method: 'Transfer', amount: '150.00', symbol: 'USDC', timestamp: new Date(Date.now() - 86400000).toISOString(), isSender: false, status: 'ok' },
        { hash: '0x789c', type: 'swap', method: 'Swap', amount: '10.0', symbol: 'NEAR', timestamp: new Date(Date.now() - 172800000).toISOString(), isSender: true, status: 'ok' }
      ]);
    } else {
      setHistory(realHistory);
    }
    // --- FIN BLOQUE DE PRUEBA ---

    setIsRefreshing(false);
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    loadData();
  }, [activeAccount?.address]);

  const handleLock = () => {
    lockWallet();
    navigate('/unlock');
  };

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = () => alert('Pantalla de Enviar en construcción...');
  const handleReceive = () => alert('Pantalla de Recibir en construcción...');

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      
      {/* HEADER */}
      <header className="p-4 flex justify-between items-center z-10 border-b border-white/5 bg-gray-900/30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
            {activeAccount?.address.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-400">Cuenta Activa</p>
            <p className="text-sm font-mono">{truncateAddress(activeAccount?.address)}</p>
          </div>
        </div>
        <button 
          onClick={handleLock}
          className="p-2 bg-white/5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <Lock size={20} />
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 z-10 overflow-y-auto pb-24">
        
        {/* TARJETA PRINCIPAL DE SALDO */}
        <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-3xl p-6 shadow-[0_10px_40px_rgba(147,51,234,0.3)] border border-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full filter blur-2xl transform translate-x-10 -translate-y-10"></div>
          <p className="text-purple-200 text-sm font-medium mb-1">Saldo Total en Tuxachain</p>
          <div className="flex items-end space-x-2 mb-6">
            <h2 className="text-4xl font-bold tracking-tight">{ethBalance}</h2>
            <span className="text-purple-300 font-medium mb-1">ETH</span>
          </div>
          <button 
            onClick={loadData}
            disabled={isRefreshing}
            className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Saldo'}</span>
          </button>
        </div>

        {/* ACCIONES RÁPIDAS */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button onClick={handleSend} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors group">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-sm font-medium">Enviar</span>
          </button>
          <button onClick={handleReceive} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors group">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownLeft size={24} />
            </div>
            <span className="text-sm font-medium">Recibir</span>
          </button>
        </div>

        {/* LISTA DE TOKENS */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Tus Tokens</h3>
          </div>
          {trackedTokens.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-gray-400 text-sm">No tienes tokens importados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trackedTokens.map((token) => (
                <div key={token.address} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-purple-400"><Coins size={20} /></div>
                    <div><p className="font-bold text-sm">{token.symbol}</p><p className="text-xs text-gray-400">{token.name}</p></div>
                  </div>
                  <div className="text-right"><p className="font-bold">{tokenBalances[token.address] || '...'}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- NUEVA SECCIÓN: HISTORIAL --- */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Actividad Reciente</h3>
          </div>

          {isLoadingHistory ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="animate-spin text-purple-500" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-sm">No hay transacciones recientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((tx, index) => (
                <div key={tx.hash || index} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Aquí usamos el componente que creaste */}
                    <TransactionIcon type={tx.type} />
                    <div>
                      <p className="font-bold text-sm capitalize">{tx.method || tx.type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-400">{formatDate(tx.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${tx.isSender ? 'text-white' : 'text-green-400'}`}>
                      {tx.isSender ? '-' : '+'}{tx.amount} {tx.symbol}
                    </p>
                    <p className={`text-xs ${tx.status === 'ok' ? 'text-gray-400' : 'text-red-400'}`}>
                      {tx.status === 'ok' ? 'Completado' : 'Fallido'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="absolute bottom-0 w-full bg-gray-900/80 backdrop-blur-lg border-t border-white/10 p-4 flex justify-around items-center z-20">
        <button className="flex flex-col items-center space-y-1 text-purple-400"><Home size={20} /><span className="text-[10px] font-medium">Inicio</span></button>
        <button onClick={handleSend} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors"><ArrowUpRight size={20} /><span className="text-[10px] font-medium">Enviar</span></button>
        <button onClick={handleReceive} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors"><ArrowDownLeft size={20} /><span className="text-[10px] font-medium">Recibir</span></button>
      </nav>
    </div>
  );
    }
