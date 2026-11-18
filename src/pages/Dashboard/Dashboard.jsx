import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Eye, EyeOff, ArrowUpRight, ArrowDownLeft, 
  Zap, Home, Activity, Settings, Coins, Copy, Check, 
  ChevronDown, Plus, WifiOff 
} from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore.js';
import { fetchTransactionHistory } from '../../services/history.service.js';
import { fetchSponsoredGasStatus } from '../../services/gas.service.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import { TUXACHAIN_EXPLORER_URL } from '../../services/tuxachain.config.js';
import TransactionIcon from '../../components/TransactionIcon.jsx';
import AccountAvatar from '../../components/AccountAvatar.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    activeAccount, vaultBlob, lockWallet, fetchActiveAccountBalance, 
    trackedTokens, fetchERC20Balance, setActiveAccount, addNewAccount, isUnlocked 
  } = useWalletStore();

  const [ethBalance, setEthBalance] = useState('0.0000');
  const [tokenBalances, setTokenBalances] = useState({});
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState([]);
  const [gasStatus, setGasStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeAccount?.address) return;
    let isCancelled = false;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const results = await Promise.allSettled([
          fetchActiveAccountBalance(),
          Promise.all(trackedTokens.map(token => fetchERC20Balance(token.address))),
          fetchTokenPrices(['native', ...trackedTokens.map(t => t.address)], 'usd'),
          fetchTransactionHistory(activeAccount.address),
          fetchSponsoredGasStatus(activeAccount.address)
        ]);

        if (isCancelled) return;

        if (results[0].status === 'fulfilled') setEthBalance(results[0].value);
        
        if (results[1].status === 'fulfilled') {
          const newBalances = {};
          trackedTokens.forEach((token, i) => {
            newBalances[token.symbol] = results[1].value[i];
          });
          setTokenBalances(newBalances);
        }

        if (results[2].status === 'fulfilled') setPrices(results[2].value);

        if (results[3].status === 'fulfilled') {
          const realHistory = results[3].value;
          if (realHistory.length > 0) {
            setHistory(realHistory.slice(0, 3));
          } else if (import.meta.env.DEV) {
             setHistory([
              { hash: '0x123', type: 'send', method: 'Transferencia', amount: '0.5', symbol: 'ETH', timestamp: new Date().toISOString(), isSender: true, status: 'ok', to: '0x8a...12f' }
             ]);
          } else {
            setHistory([]);
          }
        }

        if (results[4].status === 'fulfilled') setGasStatus(results[4].value);

      } catch (error) {
        console.error("Error cargando datos", error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadData();
    return () => { isCancelled = true; };
  }, [activeAccount?.address, trackedTokens.length]);

  if (!isUnlocked) return null;

  const calculateTotalUsd = () => {
    let total = 0;
    const ethPrice = prices['ETH'] || 0;
    total += parseFloat(ethBalance) * ethPrice;

    trackedTokens.forEach(token => {
      const bal = parseFloat(tokenBalances[token.symbol] || '0');
      const price = prices[token.symbol] || 0;
      total += bal * price;
    });

    return total.toFixed(2);
  };

  const totalUsd = calculateTotalUsd();
  const truncatedAddress = activeAccount?.address ? `${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}` : '';

  const handleCopyAddress = () => {
    if (activeAccount?.address) {
      navigator.clipboard.writeText(activeAccount.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderGasThermometer = () => {
    if (!gasStatus) return null;
    
    if (!gasStatus.success) {
      return (
        <div className="relative bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center justify-center h-full w-28">
          <div className="absolute top-2 right-2 text-yellow-500" title="Sin conexión con API. Red gratis por defecto.">
            <WifiOff size={12} />
          </div>
          <Zap size={24} className="text-green-400 mb-2" />
          <span className="text-xs font-bold text-green-400 text-center">Gas Gratis</span>
          <div className="w-full bg-gray-700/50 h-1.5 rounded-full mt-2">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      );
    }

    if (gasStatus.data?.tier === 'Unlimited') {
      return (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center justify-center h-full w-28">
          <Zap size={24} className="text-green-400 mb-2" />
          <span className="text-xs font-bold text-green-400 text-center">Gas Gratis</span>
          <div className="w-full bg-gray-700/50 h-1.5 rounded-full mt-2">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      );
    }

    const remaining = gasStatus.data.remainingFreeTransactions || 0;
    const percent = Math.min((remaining / 50) * 100, 100);

    return (
      <div className="bg-gray-900/50 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center h-full w-28">
        <Zap size={24} className="text-yellow-400 mb-2" />
        <span className="text-xs font-bold text-white text-center">{remaining} tx</span>
        <div className="w-full bg-gray-700/50 h-1.5 rounded-full mt-2">
          <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-24">
      
      {/* HEADER */}
      <header className="p-4 flex justify-between items-center bg-gray-950 z-20 relative">
        <div className="relative" ref={menuRef}>
          <button 
            className="flex items-center space-x-3 p-1 rounded-lg hover:bg-white/5 transition-colors text-left"
            onClick={() => setShowAccountMenu(!showAccountMenu)}
          >
            <AccountAvatar address={activeAccount?.address} size={40} />
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                Cuenta Activa <ChevronDown size={12} />
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-mono">{truncatedAddress}</p>
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleCopyAddress(); }}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </div>
              </div>
            </div>
          </button>

          {/* Menú Desplegable */}
          {showAccountMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {vaultBlob?.accounts.map((acc) => (
                  <button 
                    key={acc.index}
                    onClick={() => { setActiveAccount(acc.index); setShowAccountMenu(false); }}
                    className={`w-full text-left flex items-center space-x-3 p-2 rounded-lg transition-colors ${activeAccount?.index === acc.index ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-white/5'}`}
                  >
                    <AccountAvatar address={acc.address} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Cuenta {acc.index}</p>
                      <p className="text-xs text-gray-400 truncate">{acc.address}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t border-white/10 p-2 flex flex-col space-y-1">
                <button 
                  onClick={() => { addNewAccount(); setShowAccountMenu(false); }}
                  className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-purple-400 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  <span>Crear nueva cuenta</span>
                </button>
                <button 
                  onClick={() => { navigate('/address-book'); setShowAccountMenu(false); }}
                  className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <span>📖 Libreta de direcciones</span>
                </button>
              </div>
            </div>
          )}
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
          <div className="flex justify-between items-stretch mb-2">
            <div className="flex flex-col justify-center">
              <p className="text-purple-200 text-sm font-medium mb-1 flex items-center gap-2">
                Saldo Total
                <button onClick={() => setHideBalance(!hideBalance)} className="text-purple-300 hover:text-white">
                  {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </p>
              <div className="flex items-end space-x-2">
                <h2 className="text-4xl font-bold tracking-tight">
                  {hideBalance ? '****' : `$${totalUsd}`}
                </h2>
              </div>
            </div>
            
            <div>
              {isLoading ? (
                <div className="bg-gray-700/50 animate-pulse h-full w-28 rounded-xl"></div>
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
                <a 
                  key={tx.hash || index} 
                  href={`${TUXACHAIN_EXPLORER_URL}/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-3 flex items-center justify-between transition-colors"
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
                </a>
              ))
            )}
          </div>
        </div>

      </main>

      {/* BOTTOM NAVIGATION (Fija) */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-950 border-t border-white/10 p-4 flex justify-around items-center z-50">
        <button className="flex flex-col items-center space-y-1 text-purple-400">
          <Home size={20} />
          <span className="text-[10px] font-medium">Inicio</span>
        </button>
        <button onClick={() => navigate('/activities')} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <Activity size={20} />
          <span className="text-[10px] font-medium">Actividades</span>
        </button>
        <button onClick={() => navigate('/settings')} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <Settings size={20} />
          <span className="text-[10px] font-medium">Ajustes</span>
        </button>
      </nav>
    </div>
  );
          }
