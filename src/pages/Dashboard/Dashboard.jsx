import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { 
  Lock, Eye, EyeOff, Zap, Copy, Check, 
  ChevronDown, Plus, WifiOff, RefreshCw 
} from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore.js';
import { useBalances } from '../../hooks/useBalances.js';
import { useDelayedFlag } from '../../hooks/useDelayedFlag.js';
import { fetchSponsoredGasStatus } from '../../services/gas.service.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import { toUsdNumber } from '../../utils/formatBalance.js';
import AccountAvatar from '../../components/AccountAvatar.jsx';

// Nuevos componentes modulares
import QuickActions from '../../components/QuickActions.jsx';
import BottomNav from '../../components/BottomNav.jsx';
import FavoriteTokens from '../../components/FavoriteTokens.jsx';
import PendingTransactions from '../../components/PendingTransactions.jsx';

export default function Dashboard() {
  const navigate = useNavigate();

  const { 
    activeAccount, vaultBlob, lockWallet, trackedTokens, 
    setActiveAccount, addNewAccount, isUnlocked, fiatCurrency 
  } = useWalletStore(
    useShallow((s) => ({
      activeAccount: s.activeAccount, vaultBlob: s.vaultBlob, lockWallet: s.lockWallet,
      trackedTokens: s.trackedTokens, setActiveAccount: s.setActiveAccount, 
      addNewAccount: s.addNewAccount, isUnlocked: s.isUnlocked, fiatCurrency: s.fiatCurrency
    }))
  );

  // Usamos el motor de saldos para calcular el total
  const { entry, isInitialLoading, isRefreshing, refetch } = useBalances();
  const showSkeleton = useDelayedFlag(isInitialLoading, 200);

  const [prices, setPrices] = useState({});
  const [gasStatus, setGasStatus] = useState(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const tokens = useMemo(() => trackedTokens.filter(t => t.address.toLowerCase() !== '0x5a524251df27a25ac6b9964a93e1c23ad692688d'), [trackedTokens]);
  const tokenKey = tokens.map(t => t.address.toLowerCase()).join(',');

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowAccountMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cargar precios para calcular el Total Balance
  useEffect(() => {
    let cancelled = false;
    fetchTokenPrices(['native', ...tokens.map((t) => t.address)], fiatCurrency)
      .then((p) => { if (!cancelled) setPrices(p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tokenKey, fiatCurrency]);

  // Cargar estado del Gas
  useEffect(() => {
    const address = activeAccount?.address;
    if (!address) return undefined;
    let cancelled = false;
    setGasStatus(null);
    
    fetchSponsoredGasStatus(address).then((g) => { if (!cancelled) setGasStatus(g); });
    return () => { cancelled = true; };
  }, [activeAccount?.address]);

  // Cálculo del saldo total en USD
  const { totalUsd, isPartial } = useMemo(() => {
    let total = 0;
    let partial = false;
    
    // Nativo (ETH)
    const nativeItem = entry?.native;
    const nativePrice = prices['ETH']?.price || 0;
    if (nativeItem?.value !== null && nativeItem?.value !== undefined) {
      const usd = toUsdNumber(nativeItem.value, 18, nativePrice);
      if (usd !== null) total += usd;
      if (nativeItem.status !== 'ok') partial = true;
    } else {
      partial = true;
    }

    // ERC-20 Tokens
    tokens.forEach(t => {
      const item = entry?.tokens?.[t.address.toLowerCase()];
      if (item?.status === 'no-contract') return;
      if (!item || item.value === null) { partial = true; return; }
      if (item.status !== 'ok') partial = true;
      
      const price = prices[t.symbol]?.price || 0;
      const usd = toUsdNumber(item.value, t.decimals, price);
      if (usd !== null) total += usd;
    });

    return { totalUsd: total, isPartial: partial };
  }, [entry, tokens, prices]);

  if (!isUnlocked) return null;
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
    if (!gasStatus.success || gasStatus.data?.tier === 'Unlimited') {
      return (
        <div className="relative bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center justify-center h-full w-28">
          {!gasStatus.success && <div className="absolute top-2 right-2 text-yellow-500"><WifiOff size={12} /></div>}
          <Zap size={24} className="text-green-400 mb-2" />
          <span className="text-xs font-bold text-green-400 text-center">Gas Gratis</span>
          <div className="w-full bg-gray-700/50 h-1.5 rounded-full mt-2"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div></div>
        </div>
      );
    }
    const remaining = gasStatus.data.remainingFreeTransactions || 0;
    const percent = Math.min((remaining / 50) * 100, 100);
    return (
      <div className="bg-gray-900/50 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center h-full w-28">
        <Zap size={24} className="text-yellow-400 mb-2" />
        <span className="text-xs font-bold text-white text-center">{remaining} tx</span>
        <div className="w-full bg-gray-700/50 h-1.5 rounded-full mt-2"><div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div></div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-24">
      
      {/* HEADER */}
      <header className="p-4 flex justify-between items-center bg-gray-950 z-20 relative">
        <div className="relative" ref={menuRef}>
          <button className="flex items-center space-x-3 p-1 rounded-lg hover:bg-white/5 transition-colors text-left" onClick={() => setShowAccountMenu(!showAccountMenu)}>
            <AccountAvatar address={activeAccount?.address} size={40} />
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1">Cuenta Activa <ChevronDown size={12} /></p>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-mono">{truncatedAddress}</p>
                <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); handleCopyAddress(); }} className="text-gray-400 hover:text-white cursor-pointer">
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </div>
              </div>
            </div>
          </button>

          {showAccountMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {vaultBlob?.accounts.map((acc) => (
                  <button key={acc.index} onClick={() => { setActiveAccount(acc.index); setShowAccountMenu(false); }} className={`w-full text-left flex items-center space-x-3 p-2 rounded-lg transition-colors ${activeAccount?.index === acc.index ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-white/5'}`}>
                    <AccountAvatar address={acc.address} size={28} />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium">{acc.name || `Cuenta ${acc.index}`}</p><p className="text-xs text-gray-400 truncate">{acc.address}</p></div>
                  </button>
                ))}
              </div>
              <div className="border-t border-white/10 p-2 flex flex-col space-y-1">
                <button onClick={() => { addNewAccount(); setShowAccountMenu(false); }} className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-purple-400 hover:bg-white/5 rounded-lg"><Plus size={16} /><span>Crear cuenta</span></button>
                <button onClick={() => { navigate('/address-book'); setShowAccountMenu(false); }} className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg"><span>📖 Libreta</span></button>
              </div>
            </div>
          )}
        </div>
        <button onClick={() => { lockWallet(); navigate('/unlock'); }} className="p-2 bg-gray-900 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"><Lock size={20} /></button>
      </header>

      <main className="flex-1 px-4 overflow-y-auto">
        
        {/* TARJETA DE BALANCE TOTAL */}
        <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-3xl p-5 shadow-lg border border-purple-500/30">
          <div className="flex justify-between items-stretch mb-2">
            <div className="flex flex-col justify-center">
              <p className="text-purple-200 text-sm font-medium mb-1 flex items-center gap-2">
                Saldo Total
                <button onClick={() => setHideBalance(!hideBalance)} className="text-purple-300 hover:text-white">{hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                <button onClick={refetch} disabled={isRefreshing} className="text-purple-300 hover:text-white ml-1"><RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /></button>
              </p>
              <div className="flex items-end space-x-2">
                <h2 className="text-4xl font-bold tracking-tight">{hideBalance ? '****' : `${isPartial ? '~' : ''}$${totalUsd.toFixed(2)}`}</h2>
              </div>
            </div>
            <div>{showSkeleton ? <div className="bg-gray-700/50 animate-pulse h-full w-28 rounded-xl"></div> : renderGasThermometer()}</div>
          </div>
        </div>

        {/* COMPONENTES MODULARES */}
        <PendingTransactions />
        <QuickActions />
        <FavoriteTokens />

      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (Ahora con pestaña Cartera) */}
      <BottomNav />
    </div>
  );
                                                    }
