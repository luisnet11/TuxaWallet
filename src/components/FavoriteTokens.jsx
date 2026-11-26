import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../store/useWalletStore.js';
import { useBalances } from '../hooks/useBalances.js';
import { fetchTokenPrices } from '../services/price.service.js';
import { formatTokenAmount, formatUsd, toUsdNumber } from '../utils/formatBalance.js';
import TokenIcon from './TokenIcon.jsx';
import { ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

export default function FavoriteTokens() {
  const navigate = useNavigate();
  const { trackedTokens, favoriteTokens, fiatCurrency } = useWalletStore();
  const { entry } = useBalances();
  const [prices, setPrices] = useState({});

  useEffect(() => {
    let cancelled = false;
    const loadPrices = async () => {
      const addrs = ['native', ...trackedTokens.map(t => t.address)];
      const p = await fetchTokenPrices(addrs, fiatCurrency);
      if (!cancelled) setPrices(p);
    };
    loadPrices();
    return () => { cancelled = true; };
  }, [trackedTokens, fiatCurrency]);

  const displayTokens = useMemo(() => {
    const all = [{ address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18 }, ...trackedTokens];
    const favs = all.filter(t => favoriteTokens.includes(t.address.toLowerCase()));
    const list = favs.length > 0 ? favs : all.slice(0, 5);
    return list.slice(0, 6); 
  }, [trackedTokens, favoriteTokens]);

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="text-lg font-bold">Tus Tokens Favoritos</h3>
        <button onClick={() => navigate('/assets')} className="text-sm text-purple-400 font-medium flex items-center">
          Ver todos <ChevronRight size={16} />
        </button>
      </div>
      
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        {displayTokens.map((token, index) => {
          const isNative = token.address === 'native';
          const item = isNative ? entry?.native : entry?.tokens?.[token.address.toLowerCase()];
          const value = item?.value ?? null;
          
          const priceData = prices[token.symbol];
          const isTracked = priceData !== undefined && priceData.price !== undefined;
          
          const fiatBalance = value !== null && isTracked ? toUsdNumber(value, token.decimals, priceData.price) : null;
          
          return (
            <div 
              key={token.address} 
              onClick={() => navigate(`/assets`)}
              className={`flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors ${index !== displayTokens.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <TokenIcon address={token.address} symbol={token.symbol} logoURI={token.logoURI} size={36} />
                <div>
                  <p className="font-bold text-sm text-white">{token.name}</p>
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-gray-400">Precio:</span>
                    <span className="text-gray-300">
                      {isTracked ? `$${priceData.price.toLocaleString()}` : 'No rastreado'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-white">
                  {value === null ? '--' : formatTokenAmount(value, token.decimals)} {token.symbol}
                </p>
                <p className="text-xs font-medium text-gray-300">
                  {fiatBalance === null ? '--' : formatUsd(fiatBalance)}
                </p>
                
                {/* ESTADO NEUTRAL PARA NO RASTREADOS */}
                {isTracked ? (
                  <div className={`flex items-center justify-end space-x-1 text-[10px] font-bold ${priceData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {priceData.change24h >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    <span>{Math.abs(priceData.change24h).toFixed(2)}%</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-end space-x-1 text-[10px] font-bold text-gray-500">
                    <Minus size={10} />
                    <span>Sin datos</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
                }
