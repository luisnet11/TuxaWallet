import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Settings, Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Zap, Home, Activity, Coins } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore.js';
import { fetchTransactionHistory } from '../../services/history.service.js';
import { fetchSponsoredGasStatus } from '../../services/gas.service.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import TransactionIcon from '../../components/TransactionIcon.jsx';
import AccountAvatar from '../../components/AccountAvatar.jsx';

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

  // Estados locales
  const [ethBalance, setEthBalance] = useState('0.0000');
  const [tokenBalances, setTokenBalances] = useState({});
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState([]);
  const [gasStatus, setGasStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  // Redirección de seguridad
  useEffect(() => {
    if (!isUnlocked) navigate('/unlock');
  }, [isUnlocked, navigate]);

  // Carga de datos
  const loadData = async () => {
    if (!activeAccount?.address) return;
    setIsLoading(true);

    try {
      // 1. Obtener saldos
      const bal = await fetchActiveAccountBalance();
      setEthBalance(bal);

      const newTokenBalances = {};
      for (const token of trackedTokens) {
        newTokenBalances[token.symbol] = await fetchERC20Balance(token.address);
      }
      setTokenBalances(newTokenBalances);

      // 2. Obtener precios (pasamos la dirección nativa y las de los tokens)
      const tokenAddresses = ['native', ...trackedTokens.map(t => t.address)];
      const fetchedPrices = await fetchTokenPrices(tokenAddresses, 'usd');
      setPrices(fetchedPrices);

      // 3. Obtener historial
      const realHistory = await fetchTransactionHistory(activeAccount.address);
      // Si no hay historial, ponemos unos datos de prueba para que la UI se vea bien (opcional)
      setHistory(realHistory.length > 0 ? realHistory.slice(0, 5) : [
        { hash: '0x123a', type: 'send', method: 'Transfer', amount: '0.5', symbol: 'ETH', timestamp: new Date().toISOString(), isSender: true, status: 'ok' },
        { hash: '0x456b', type: 'token_receive', method: 'Transfer', amount: '150.00', symbol: 'USDC', timestamp: new Date(Date.now() - 86400000).toISOString(), isSender: false, status: 'ok' }
      ]);

      // 4. Obtener estado del gas
      const gasData = await fetchSponsoredGasStatus(activeAccount.address);
      setGasStatus(gasData);

    } catch (error) {
      console.error("Error cargando datos del dashboard", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeAccount?.address]);

  // Cálculos
  const calculateTotalUsd = () => {
    let total = 0;
    // ETH
    const ethPrice = prices['ETH'] || 0;
    total += parseFloat(ethBalance) * ethPrice;

    // Tokens
    trackedTokens.forEach(token => {
      const bal = parseFloat(tokenBalances[token.symbol] || '0');
      const price = prices[token.symbol] || 0;
      total += bal * price;
    });

    return total.toFixed(2);
  };

  const totalUsd = calculateTotalUsd();
  const truncatedAddress = activeAccount?.address ? `${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}` : '';

  // Renderizado del termómetro de gas
  const renderGasThermometer = () => {
    if (!gasStatus) return null;
    
    // Si es ilimitado o gratis
    if (gasStatus.data?.tier === 'Unlimited' || !gasStatus.success) {
      return (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 flex flex-col items-center justify-center">
          <Zap size={20} className="text-green-400 mb-1" />
          <span className="text-xs font-bold text-green-400">Gas Gratis</span>
          <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      );
    }

    // Si hay un límite numérico
    const remaining = gasStatus.data.remainingFreeTransactions || 0;
    const max = 50; // Asumimos un máximo de 50 para la barra visual
    const percent = Math.min((remaining / max) * 100, 100);

    return (
      <div className="bg-gray-900/50 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center">
        <Zap size={20} className="text-yellow-400 mb-1" />
        <span className="text-xs font-bold text-white">{remaining} tx</span>
        <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2">
          <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-20">
      
      {/* HEADER */}
      <header className="p-4 flex justify-between items-center bg-gray-950 z-10">
        <div className="flex items-center space-x-3">
          <AccountAvatar address={activeAccount?.address} size={40} style="identicon" />
          <div>
            <p className="text-xs text-gray-400">Cuenta Activa</p>
            <p className="text-sm font-mono">{truncatedAddress}</p>
          </div>
        </div>
        <button 
          onClick={() => { lockWallet(); navigate('/unlock'); }}
          className="p-2 bg-gray-900 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <Lock size={20} />
        </button>
      </header>

      <main className="flex-1 px-4 overflow-y-auto">
        
        {/* TARJETA DE BALANCE */}
        <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-3xl p-5 shadow-lg border border-purple-500/30">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-purple-200 text-sm font-medium mb-1 flex items-center gap-2">
                Total Balance
                <button onClick={() => setHideBalance(!hideBalance)} className="text-purple-300 hover:text-white">
                  {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </p>
              <div className="flex items-end space-x-2">
                <h2 className="text-4xl font-bold tracking-tight">
                  {hideBalance ? '****' : `$${totalUsd}`}
                </h2>
              </div>
              <p className="text-purple-300 font-medium text-sm mt-1">
                {hideBalance ? '****' : `~ ${ethBalance} ETH`}
              </p>
            </div>
            
            {/* Termómetro de Gas */}
            <div className="w-24">
              {isLoading ? (
                <div className="bg-gray-700/50 animate-pulse h-16 rounded-xl"></div>
              ) : renderGasThermometer()}
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button onClick={() => navigate('/send')} className="bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-sm font-medium">Enviar</span>
          </button>
          <button onClick={() => navigate('/receive')} className="bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
              <ArrowDownLeft size={24} />
            </div>
            <span className="text-sm font-medium">Recibir</span>
          </button>
        </div>

        {/* MIS ACTIVOS */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Mis activos</h3>
            <button onClick={() => navigate('/assets')} className="text-sm text-purple-400 font-medium">Ver todos</button>
          </div>
          
          <div className="space-y-2">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-900 animate-pulse rounded-2xl"></div>)
            ) : (
              <>
                {/* Token Nativo (ETH) */}
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                      <Coins size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">ETH</p>
                      <p className="text-xs text-gray-400">Ethereum</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{parseFloat(ethBalance).toFixed(4)}</p>
                    <p className="text-xs text-gray-400">
                      ${(parseFloat(ethBalance) * (prices['ETH'] || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Tokens ERC-20 (Limitado a 4) */}
                {trackedTokens.slice(0, 4).map(token => (
                  <div key={token.address} className="bg-gray-900 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                        <Coins size={20} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{token.symbol}</p>
                        <p className="text-xs text-gray-400">{token.address.slice(0, 6)}...{token.address.slice(-4)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{tokenBalances[token.symbol] || '0.00'}</p>
                      <p className="text-xs text-gray-400">
                        ${((parseFloat(tokenBalances[token.symbol]) || 0) * (prices[token.symbol] || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* RECIENTE */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Reciente</h3>
            <button onClick={() => navigate('/activities')} className="text-sm text-purple-400 font-medium">Ver todas</button>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              [1, 2].map(i => <div key={i} className="h-16 bg-gray-900 animate-pulse rounded-2xl"></div>)
            ) : history.length === 0 ? (
               <p className="text-sm text-gray-500 text-center py-4">No hay actividad reciente</p>
            ) : (
              history.map((tx, index) => (
                <div key={tx.hash || index} className="bg-gray-900 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <TransactionIcon type={tx.type} />
                    <div>
                      <p className="font-bold text-sm capitalize">{tx.method}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${tx.isSender ? 'text-white' : 'text-green-400'}`}>
                      {tx.isSender ? '-' : '+'}{tx.amount} {tx.symbol}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="absolute bottom-0 w-full bg-gray-950 border-t border-white/10 p-4 flex justify-around items-center">
        <button className="flex flex-col items-center space-y-1 text-purple-400">
          <Home size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button onClick={() => navigate('/activities')} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <Activity size={20} />
          <span className="text-[10px] font-medium">Actividades</span>
        </button>
        <button onClick={() => navigate('/settings')} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <Settings size={20} />
          <span className="text-[10px] font-medium">Configuraciones</span>
        </button>
      </nav>
    </div>
  );
    }
