import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, SlidersHorizontal, Plus, Coins, UserPlus } from 'lucide-react';
import { isAddress } from 'viem';
import { useWalletStore } from '../../store/useWalletStore.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import AddressModal from '../../components/AddressModal.jsx';

export default function Assets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const addressParam = searchParams.get('address');
  
  const { trackedTokens, fetchERC20Balance, fetchActiveAccountBalance } = useWalletStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [hideZero, setHideZero] = useState(false);
  const [balances, setBalances] = useState({});
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  // FILTRO DE SEGURIDAD: Ignorar el contrato de ETH ERC-20
  const cleanTrackedTokens = useMemo(() => {
    return trackedTokens.filter(t => t.address.toLowerCase() !== '0x5a524251df27a25ac6b9964a93e1c23ad692688d');
  }, [trackedTokens]);

  useEffect(() => {
    const loadAssets = async () => {
      setIsLoading(true);
      try {
        const ethBal = await fetchActiveAccountBalance();
        const tokenBals = {};
        for (const token of cleanTrackedTokens) {
          tokenBals[token.address] = await fetchERC20Balance(token.address);
        }
        const tokenAddrs = ['native', ...cleanTrackedTokens.map(t => t.address)];
        const fetchedPrices = await fetchTokenPrices(tokenAddrs, 'usd');

        setBalances({ native: ethBal, ...tokenBals });
        setPrices(fetchedPrices);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAssets();
  }, [cleanTrackedTokens]);

  // Lista unificada usando los tokens limpios
  const allTokens = useMemo(() => {
    return [{ address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18 }, ...cleanTrackedTokens];
  }, [cleanTrackedTokens]);

// ... (el resto del código continúa igual) ...
