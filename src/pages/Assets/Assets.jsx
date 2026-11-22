import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, SlidersHorizontal, Plus, Coins, UserPlus } from 'lucide-react';
import { isAddress } from 'viem';
import { useWalletStore } from '../../store/useWalletStore.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import { formatTokenAmount, formatUsd, toUsdNumber } from '../../utils/formatBalance.js'; // Usamos las utilidades

export default function Assets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const addressParam = searchParams.get('address'); 
  
  const { trackedTokens, fiatCurrency } = useWalletStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [hideZero, setHideZero] = useState(false);
  const [balances, setBalances] = useState({});
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // FILTRO DE SEGURIDAD
  const cleanTrackedTokens = useMemo(() => {
    return trackedTokens.filter(t => t.address.toLowerCase() !== '0x5a524251df27a25ac6b9964a93e1c23ad692688d');
  }, [trackedTokens]);

  useEffect(() => {
    const loadAssets = async () => {
      setIsLoading(true);
      try {
        // Ya no llamamos a fetchActiveAccountBalance ni fetchERC20Balance del store principal
        // Podríamos usar el useBalanceStore, pero para simplificar esta vista, haremos fetch directo temporal
        // Nota: En una refactorización futura, Assets también usará useBalances.
        
        // Como el store principal ya no tiene las funciones, solo mostraremos los precios por ahora
        // (El balance real se maneja en el Dashboard con useBalances)
        
        const tokenAddrs = ['native', ...cleanTrackedTokens.map(t => t.address)];
        const fetchedPrices = await fetchTokenPrices(tokenAddrs, fiatCurrency);
        setPrices(fetchedPrices);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAssets();
  }, [cleanTrackedTokens, fiatCurrency]);

  const allTokens = useMemo(() => {
    return [
      { address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
      ...cleanTrackedTokens
    ];
  }, [cleanTrackedTokens]);

  const filteredTokens = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allTokens.filter(t => {
      const matchesSearch = t.symbol.toLowerCase().includes(term) || 
                            t.name.toLowerCase().includes(term) || 
                            t.address.toLowerCase().includes(term);
      return matchesSearch;
    });
  }, [allTokens, searchTerm]);

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
          onClick={() => setHideZero(!hideZero)}
          className={`p-2 rounded-lg transition-colors ${hideZero ? 'bg-purple-600/20 text-purple-400' : 'bg-gray-900 text-gray-400 hover:text-white'}`}
        >
          <SlidersHorizontal size={20} />
        </button>
        
        <button onClick={() => navigate('/import-token')} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 px-4 overflow-y-auto pb-10">
        <div className="space-y-3 mt-4">
          {isLoading ? (
            [1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-900 animate-pulse rounded-2xl"></div>)
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm mb-4">No se encontraron tokens.</p>
              {isValidAddressSearch && !isAlreadyTracked && (
                <button onClick={() => navigate('/import-token')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center space-x-2 mx-auto transition-colors">
                  <UserPlus size={18} /><span>Importar este contrato</span>
                </button>
              )}
            </div>
          ) : (
            filteredTokens.map((token) => {
              const price = prices[token.symbol] || 0;
              return (
                <button 
                  key={token.address}
                  onClick={() => handleTokenClick(token)}
                  className="w-full bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                      <Coins size={20} className="text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">{token.symbol}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {token.address === 'native' ? 'Token Nativo' : `${token.address.slice(0, 6)}...${token.address.slice(-4)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">--</p>
                    <p className="text-xs text-gray-400">{formatUsd(price)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
