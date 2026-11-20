import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Lock, Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Zap, Home, Activity, Settings, Coins, Copy, Check, ChevronDown, Plus, WifiOff, RefreshCw } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore.js';
import { useBalances } from '../../hooks/useBalances.js';
import { useDelayedFlag } from '../../hooks/useDelayedFlag.js';
import { fetchTransactionHistory } from '../../services/history.service.js';
import { fetchSponsoredGasStatus } from '../../services/gas.service.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import { TUXACHAIN_EXPLORER_URL } from '../../services/tuxachain.config.js';
import { formatTokenAmount, formatUsd, toUsdNumber } from '../../utils/formatBalance.js';
import TransactionIcon from '../../components/TransactionIcon.jsx';
import AccountAvatar from '../../components/AccountAvatar.jsx';

const AssetRow = memo(function AssetRow({ symbol, subtitle, decimals, value, status, stale, price, isNative }) {
  const amount = formatTokenAmount(value, decimals);
  const usd = (value === null || price === null || price === undefined) ? null : toUsdNumber(value, decimals, price);
  const noContract = status === 'no-contract';
  
  return (
    <div className="bg-gray-900 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
          <Coins size={20} className={isNative ? 'text-purple-400' : 'text-gray-400'} />
        </div>
        <div>
          <p className="font-bold text-sm">{symbol}</p>
          <p className={`text-xs ${noContract ? 'text-yellow-400' : 'text-gray-400'}`}>
            {noContract ? 'No existe' : subtitle}
          </p>
        </div>
      </div>
      <div className={`text-right ${stale ? 'opacity-60' : ''}`} title={stale ? 'Valor desactualizado' : undefined}>
        <p className="font-bold text-sm">{noContract ? '--' : amount}</p>
        <p className="text-xs text-gray-400">{usd === null ? '--' : formatUsd(usd)}</p>
      </div>
    </div>
  );
});

export default function Dashboard() {
  const navigate = useNavigate();

  const { activeAccount, vaultBlob, lockWallet, trackedTokens, setActiveAccount, addNewAccount, isUnlocked } = useWalletStore(
    useShallow((s) => ({
      activeAccount: s.activeAccount, vaultBlob: s.vaultBlob, lockWallet: s.lockWallet,
      trackedTokens: s.trackedTokens, setActiveAccount: s.setActiveAccount, addNewAccount: s.addNewAccount, isUnlocked: s.isUnlocked,
    }))
  );

  const { entry, isInitialLoading, isRefreshing, refetch } = useBalances();
  const showSkeleton = useDelayedFlag(isInitialLoading, 200);

  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState(null);
  const [gasStatus, setGasStatus] = useState(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const tokens = useMemo(() => trackedTokens.filter(t => t.address.toLowerCase() !== '0x5a524251df27a25ac6b9964a93e1c23ad692688d'), [trackedTokens]);
  const tokenKey = tokens.map(t => t.address.toLowerCase()).join(',');

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowAccountMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTokenPrices(['native', ...tokens.map((t) => t.address)], 'usd')
      .then((p) => { if (!cancelled) setPrices(p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tokenKey]);

  useEffect(() => {
    const address = activeAccount?.address;
    if (!address) return undefined;
    let cancelled = false;
    setHistory(null);
    setGasStatus(null);
    
    fetchTransactionHistory(address).then((res) => { 
      if (!cancelled) setHistory(res && res.data ? res.data.slice(0, 3) : []); 
    });
    fetchSponsoredGasStatus(address).then((g) => { if (!cancelled) setGasStatus(g); });
    return () => { cancelled = true; };
  }, [activeAccount?.address]);

  const rows = useMemo(() => {
    const nativePrice = prices['ETH'] || 0;
    const nativeRow = { id: 'native', symbol: 'ETH', subtitle: 'Ethereum', decimals: 18, item: entry?.native, price: nativePrice, isNative: true };
    const tokenRows = tokens.map((t) => {
      const id = t.address.toLowerCase();
      return { id, symbol: t.symbol, decimals: t.decimals, subtitle: `${t.address.slice(0, 6)}...${t.address.slice(-4)}`, item: entry?.tokens?.[id], price: prices[t.symbol] || 0 };
    });
    return [nativeRow, ...tokenRows];
  }, [entry, tokens, prices]);

  const { totalUsd, isPartial } = useMemo(() => {
    let total = 0;
    let partial = false;
    for (const r of rows) {
      if (r.item?.status === 'no-contract') continue;
      if (!r.item || r.item.value === null) { partial = true; continue; }
      if (r.item.status !== 'ok') partial = true;
      if (r.item.value === 0n) continue;
      const usd = toUsdNumber(r.item.value, r.decimals, r.price);
      if (usd === null) { partial = true; continue; }
      total += usd;
    }
    return { totalUsd: total, isPartial: partial };
  }, [rows]);

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
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium">Cuenta {acc.index}</p><p className="text-xs text-gray-400 truncate">{acc.address}</p></div>
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

        <div className="grid grid-cols-2 gap-4 mt-6">
          <button onClick={() => navigate('/send')} className="bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors"><div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center"><ArrowUpRight size={24} /></div><span className="text-sm font-medium">Enviar</span></button>
          <button onClick={() => navigate('/receive')} className="bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors"><div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center"><ArrowDownLeft size={24} /></div><span className="text-sm font-medium">Recibir</span></button>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Mis activos</h3><button onClick={() => navigate('/assets')} className="text-sm text-purple-400 font-medium">Ver todos</button></div>
          <div className="space-y-2">
            {showSkeleton ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-900 animate-pulse rounded-2xl"></div>)
            ) : (
              rows.slice(0, 5).map((r) => (
                <AssetRow key={r.id} symbol={r.symbol} subtitle={r.subtitle} decimals={r.decimals} value={r.item?.value} status={r.item?.status} stale={r.item?.stale} price={r.price} isNative={r.isNative} />
              ))
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Reciente</h3><button onClick={() => navigate('/activities')} className="text-sm text-purple-400 font-medium">Ver todas</button></div>
          <div className="space-y-2">
            {showSkeleton || history === null ? (
              [1, 2].map(i => <div key={i} className="h-16 bg-gray-900 animate-pulse rounded-2xl"></div>)
            ) : history.length === 0 ? (
               <p className="text-sm text-gray-500 text-center py-4">No hay actividad reciente</p>
            ) : (
              history.map((tx, index) => (
                <a key={tx.hash || index} href={`${TUXACHAIN_EXPLORER_URL}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-3 flex items-center justify-between transition-colors">
                  <div className="flex items-center space-x-3">
                    <TransactionIcon type={tx.type} />
                    <div><p className="font-bold text-sm capitalize">{tx.method}</p><p className="text-xs text-gray-400">{tx.isSender ? 'Para: ' : 'De: '}{tx.isSender ? (tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : 'Desc.') : (tx.from ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}` : 'Desc.')}</p></div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${tx.isSender ? 'text-white' : 'text-green-400'}`}>{tx.isSender ? '-' : '+'}{tx.amount} {tx.symbol}</p>
                    <p className={`text-xs ${tx.status === 'ok' ? 'text-gray-400' : 'text-red-400'}`}>{tx.status === 'ok' ? 'Confirmada' : 'Fallida'}</p>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-950 border-t border-white/10 p-4 flex justify-around items-center z-50">
        <button className="flex flex-col items-center space-y-1 text-purple-400"><Home size={20} /><span className="text-[10px] font-medium">Inicio</span></button>
        <button onClick={() => navigate('/activities')} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors"><Activity size={20} /><span className="text-[10px] font-medium">Actividades</span></button>
        <button onClick={() => navigate('/settings')} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors"><Settings size={20} /><span className="text-[10px] font-medium">Ajustes</span></button>
      </nav>
    </div>
  );
                      }
