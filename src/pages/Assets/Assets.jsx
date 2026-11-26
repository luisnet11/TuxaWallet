import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, SlidersHorizontal, Plus, Coins, UserPlus, MoreVertical } from 'lucide-react';
import { isAddress } from 'viem';
import { useWalletStore } from '../../store/useWalletStore.js';
import { useBalances } from '../../hooks/useBalances.js';
import { useDelayedFlag } from '../../hooks/useDelayedFlag.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import { formatTokenAmount, formatUsd, toUsdNumber } from '../../utils/formatBalance.js';
import TokenIcon from '../../components/TokenIcon.jsx';
import TokenFilterModal from '../../components/TokenFilterModal.jsx';
import TokenActionModal from '../../components/TokenActionModal.jsx';

const LEGACY_ETH_ERC20 = '0x5a524251df27a25ac6b9964a93e1c23ad692688d';

export default function Assets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const addressParam = searchParams.get('address'); 
  
  const { trackedTokens, fiatCurrency, favoriteTokens, hiddenTokens } = useWalletStore();

  const { entry, isInitialLoading, isRefreshing, refetch } = useBalances();
  const showSkeleton = useDelayedFlag(isInitialLoading, 200);

  const [searchTerm, setSearchTerm] = useState('');
  const [prices, setPrices] = useState({});
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTokenForAction, setSelectedTokenForAction] = useState(null);
  const [sortOption, setSortOption] = useState('balance-desc');
  const [hideZero, setHideZero] = useState(false);

  const visibleTokens = useMemo(() => {
    return trackedTokens.filter(t => 
      t.address.toLowerCase() !== LEGACY_ETH_ERC20 && 
      !hiddenTokens.includes(t.address.toLowerCase())
    );
  }, [trackedTokens, hiddenTokens]);

  useEffect(() => {
    let cancelled = false;
    const loadPrices = async () => {
      const tokenAddrs = ['native', ...visibleTokens.map(t => t.address)];
      const fetchedPrices = await fetchTokenPrices(tokenAddrs, fiatCurrency);
      if (!cancelled) setPrices(fetchedPrices);
    };
    loadPrices();
    return () => { cancelled = true; };
  }, [visibleTokens, fiatCurrency]);

  const allTokens = useMemo(() => {
    return [
      { address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
      ...visibleTokens
    ];
  }, [visibleTokens]);

  const filteredAndSortedTokens = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    let result = allTokens.filter(t => {
      const matchesSearch = t.symbol.toLowerCase().includes(term) || 
                            t.name.toLowerCase().includes(term) || 
                            t.address.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (hideZero && entry) {
        const item = t.address === 'native' ? entry.native : entry.tokens[t.address.toLowerCase()];
        if (!item || item.value === 0n || item.value === null) return false;
      }

      return true;
    });

    // Ordenamiento (Favoritos primero)
    result.sort((a, b) => {
      const aFav = favoriteTokens.includes(a.address.toLowerCase());
      const bFav = favoriteTokens.includes(b.address.toLowerCase());
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      if (sortOption === 'name-asc') return a.symbol.localeCompare(b.symbol);
      if (sortOption === 'name-desc') return b.symbol.localeCompare(a.symbol);

      const getBal = (token) => {
        const item = token.address === 'native' ? entry?.native : entry?.tokens?.[token.address.toLowerCase()];
        return item?.value ? Number(item.value) / Math.pow(10, token.decimals) : 0;
      };

      const aBal = getBal(a);
      const bBal = getBal(b);

      if (sortOption === 'balance-desc') return bBal - aBal;
      if (sortOption === 'balance-asc') return aBal - bBal;

      return 0;
    });

    return result;
  }, [allTokens, searchTerm, hideZero, sortOption, favoriteTokens, entry]);

  const handleTokenClick = (token) => {
    if (returnTo === 'send') {
      const addrParam = addressParam ? `&address=${addressParam}` : '';
      navigate(`/send?token=${token.address}${addrParam}`);
    } else {
      alert(`Ver detalles de ${token.symbol} (Próximamente)`); 
    }
  };

  const isValidAddressSearch = isAddress(searchTerm);
  const isAlreadyTracked = allTokens.some(t => t.address.toLowerCase() === searchTerm.toLowerCase());

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative">
      
      <header className="p-4 flex items-center space-x-2 bg-gray-950 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Buscar token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
          />
        </div>

        <button 
          onClick={() => setShowFilterModal(true)}
          className={`p-2 rounded-lg transition-colors bg-gray-900 text-gray-400 hover:text-white`}
        >
          <SlidersHorizontal size={20} className={(sortOption !== 'balance-desc' || hideZero) ? 'text-purple-400' : ''} />
        </button>
        
        <button onClick={() => navigate('/import-token')} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 px-4 overflow-y-auto pb-10">
        
        <div className="flex justify-end items-center mb-2 mt-2">
          <button 
            onClick={refetch} 
            disabled={isRefreshing}
            className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 bg-purple-600/10 px-3 py-1.5 rounded-full"
          >
            <Coins size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar saldos'}</span>
          </button>
        </div>

        <div className="space-y-3">
          {showSkeleton ? (
            [1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-900 animate-pulse rounded-2xl"></div>)
          ) : filteredAndSortedTokens.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm mb-4">No se encontraron tokens.</p>
              {isValidAddressSearch && !isAlreadyTracked && (
                <button onClick={() => navigate('/import-token')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center space-x-2 mx-auto transition-colors">
                  <UserPlus size={18} /><span>Importar este contrato</span>
                </button>
              )}
            </div>
          ) : (
            filteredAndSortedTokens.map((token) => {
              const item = token.address === 'native' ? entry?.native : entry?.tokens?.[token.address.toLowerCase()];
              
              const value = item?.value ?? null;
              const status = item?.status;
              const price = prices[token.symbol] || 0;
              const noContract = status === 'no-contract';
              const isFavorite = favoriteTokens.includes(token.address.toLowerCase());

              const amountFormatted = formatTokenAmount(value, token.decimals);
              const usd = value === null || price === null ? null : toUsdNumber(value, token.decimals, price);

              return (
                <div 
                  key={token.address}
                  className="relative w-full bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl transition-colors flex items-center"
                >
                  <button 
                    onClick={() => handleTokenClick(token)}
                    className="flex-1 p-4 flex items-center justify-between text-left rounded-l-2xl"
                  >
                    <div className="flex items-center space-x-3">
                      {/* AQUÍ PASAMOS EL logoURI AL COMPONENTE */}
                      <TokenIcon address={token.address} symbol={token.symbol} logoURI={token.logoURI} size={40} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-sm">{token.symbol}</p>
                          {isFavorite && <span className="text-[10px] text-yellow-400">★</span>}
                        </div>
                        <p className={`text-xs ${noContract ? 'text-yellow-400' : 'text-gray-400'} font-mono`}>
                          {noContract ? 'No existe' : (token.address === 'native' ? 'Token Nativo' : `${token.address.slice(0, 6)}...${token.address.slice(-4)}`)}
                        </p>
                      </div>
                    </div>
                    <div className={`text-right mr-2 ${item?.stale ? 'opacity-60' : ''}`}>
                      <p className="font-bold text-sm">{noContract ? '--' : amountFormatted}</p>
                      <p className="text-xs text-gray-400">{usd === null ? '--' : formatUsd(usd)}</p>
                    </div>
                  </button>

                  <div className="pr-2 h-full flex items-center justify-center border-l border-white/5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedTokenForAction(token); }}
                      className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <TokenFilterModal 
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        currentSort={sortOption}
        hideZero={hideZero}
        onApply={({ sort, hideZero: hide }) => {
          setSortOption(sort);
          setHideZero(hide);
        }}
      />

      <TokenActionModal 
        isOpen={!!selectedTokenForAction}
        onClose={() => setSelectedTokenForAction(null)}
        token={selectedTokenForAction}
      />
    </div>
  );
    }
