import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Clipboard, BookUser, ArrowUpRight, AlertCircle, QrCode } from 'lucide-react';
import { isAddress } from 'viem';
import { useWalletStore } from '../../store/useWalletStore.js';
import { useAddressBookStore } from '../../store/useAddressBookStore.js';
import { useBalances } from '../../hooks/useBalances.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import { formatTokenAmount } from '../../utils/formatBalance.js';
import AccountAvatar from '../../components/AccountAvatar.jsx';
import AddressModal from '../../components/AddressModal.jsx';
import QrScannerModal from '../../components/QrScannerModal.jsx';
import ConfirmTxModal from '../../components/ConfirmTxModal.jsx';
import TxResultModal from '../../components/TxResultModal.jsx';

export default function Send() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeAccount, trackedTokens, sendNativeTransaction, sendERC20Token, estimateGasFee } = useWalletStore();
  const { contacts } = useAddressBookStore();
  const { entry } = useBalances();

  const [selectedToken, setSelectedToken] = useState({ address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18 });
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isFiatMode, setIsFiatMode] = useState(false);
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados de Modales
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  
  // Estados de Gas y Resultado
  const [gasEstimate, setGasEstimate] = useState({ feeEth: '0.0000', isFree: true });
  const [txResult, setTxResult] = useState(null);

  const allTokens = [{ address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18 }, ...trackedTokens];
  const tokenKey = trackedTokens.map(t => t.address.toLowerCase()).join(',');

  useEffect(() => {
    const addressFromBook = searchParams.get('address');
    if (addressFromBook) setRecipient(addressFromBook);
    
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      const foundToken = allTokens.find(t => t.address.toLowerCase() === tokenFromUrl.toLowerCase());
      if (foundToken) setSelectedToken(foundToken);
    }
    
    const loadPrices = async () => {
      const tokenAddrs = ['native', ...trackedTokens.map(t => t.address)];
      const fetchedPrices = await fetchTokenPrices(tokenAddrs, 'usd');
      setPrices(fetchedPrices);
    };
    loadPrices();
  }, [searchParams, tokenKey]);

  // ESTIMACIÓN DE GAS
  useEffect(() => {
    const calcGas = async () => {
      if (!amount || parseFloat(amount) <= 0 || !isAddress(recipient)) {
        setGasEstimate({ feeEth: '0.0000', isFree: true });
        return;
      }
      
      const tokenAmount = isFiatMode ? (parseFloat(amount) / (prices[selectedToken.symbol] || 1)) : parseFloat(amount);
      const gas = await estimateGasFee(selectedToken.address, recipient, tokenAmount);
      setGasEstimate(gas);
    };
    
    const timer = setTimeout(calcGas, 500);
    return () => clearTimeout(timer);
  }, [amount, recipient, selectedToken, isFiatMode, prices]);

  const currentItem = selectedToken.address === 'native' ? entry?.native : entry?.tokens?.[selectedToken.address.toLowerCase()];
  const balanceFormatted = formatTokenAmount(currentItem?.value, selectedToken.decimals);
  const availableBalance = currentItem?.value ? Number(currentItem.value) / Math.pow(10, selectedToken.decimals) : 0;
  const currentPrice = prices[selectedToken.symbol] || 0;

  const tokenAmount = !amount ? 0 : (isFiatMode ? (parseFloat(amount) / currentPrice) : parseFloat(amount));
  const fiatAmount = !amount ? 0 : (isFiatMode ? parseFloat(amount) : (parseFloat(amount) * currentPrice));
  
  const isValidAddress = isAddress(recipient);
  const isInsufficientFunds = tokenAmount > (availableBalance + 0.000001);

  const handlePaste = async () => {
    try { const text = await navigator.clipboard.readText(); setRecipient(text); } catch (e) { alert('No se pudo leer el portapapeles'); }
  };

  const handleMax = async () => {
    if (selectedToken.address === 'native') {
      const max = Math.max(0, availableBalance - 0.001); // Reservar gas
      setAmount(isFiatMode ? (max * currentPrice).toFixed(2) : max.toString());
    } else {
      setAmount(isFiatMode ? (availableBalance * currentPrice).toFixed(2) : availableBalance.toString());
    }
  };

  // PASO 1: Abrir Confirmación
  const handleFirstSendClick = () => {
    if (!isValidAddress || tokenAmount <= 0 || isInsufficientFunds) return;
    setShowConfirmModal(true);
  };

  // PASO 2: Ejecutar Transacción Real
  const executeSend = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    try {
      let result;
      if (selectedToken.address === 'native') {
        result = await sendNativeTransaction(recipient, tokenAmount.toString(), false);
      } else {
        result = await sendERC20Token(selectedToken.address, recipient, tokenAmount.toString(), false);
      }
      
      setTxResult(result);
      setShowResultModal(true);
      
    } catch (err) {
      setTxResult({ success: false, hash: 'Error de red', feeEth: '0', message: err.message });
      setShowResultModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToBook = () => navigate(`/address-book?returnTo=send&token=${selectedToken.address}${recipient ? `&address=${recipient}` : ''}`);
  const handleGoToAssets = () => navigate(`/assets?returnTo=send${recipient ? `&address=${recipient}` : ''}`);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-24">
      <header className="p-4 flex items-center justify-between bg-gray-950 z-10">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center space-x-2 bg-gray-900 px-4 py-2 rounded-xl">
          <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-purple-400">{selectedToken.symbol[0]}</span>
          </div>
          <span className="font-bold text-sm">{selectedToken.name}</span>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-4 overflow-y-auto flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center my-8 relative">
          <div className="flex items-center justify-center w-full relative">
            <div className="absolute left-0 flex flex-col space-y-2">
              <button onClick={handleMax} className="bg-gray-900 text-xs font-bold px-3 py-2 rounded-full border border-white/10 hover:bg-gray-800">MAX</button>
              <button onClick={() => setIsFiatMode(!isFiatMode)} className={`text-xs font-bold px-3 py-2 rounded-full border transition-colors ${isFiatMode ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-900 border-white/10 text-gray-400'}`}>USD</button>
            </div>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0" 
              className={`text-6xl font-bold bg-transparent text-center outline-none w-full max-w-[200px] placeholder-gray-700 ${isInsufficientFunds ? 'text-red-400' : 'text-white'}`} 
              autoFocus 
            />
          </div>
          <div className="text-center mt-2">
            <p className="text-gray-400 font-medium">{isFiatMode ? `~ ${tokenAmount.toFixed(4)} ${selectedToken.symbol}` : `~ $${fiatAmount.toFixed(2)} USD`}</p>
            {isInsufficientFunds && <p className="text-red-400 text-xs font-bold mt-1 flex items-center justify-center gap-1"><AlertCircle size={12} /> Saldo insuficiente</p>}
          </div>
        </div>

        <div className="bg-gray-900 rounded-3xl border border-white/5 overflow-hidden">
          <button onClick={handleGoToAssets} className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center"><span className="font-bold text-purple-400">{selectedToken.symbol[0]}</span></div>
              <div className="text-left">
                <p className="font-bold text-sm">{selectedToken.symbol}</p>
                <p className="text-xs text-gray-400">Balance: {balanceFormatted}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
               <span className="text-sm text-gray-400">${currentPrice.toFixed(2)}</span>
               <ChevronDown size={16} className="text-gray-500" />
            </div>
          </button>

          <div className="p-4">
            <div className="flex items-center space-x-3">
              {isValidAddress ? <AccountAvatar address={recipient} size={40} /> : <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-500"><ArrowUpRight size={20} /></div>}
              <div className="flex-1">
                <input 
                  type="text" 
                  value={recipient} 
                  onChange={(e) => setRecipient(e.target.value)} 
                  placeholder="Dirección de destino (0x...)" 
                  className="w-full bg-transparent outline-none text-sm font-mono placeholder-gray-500" 
                />
              </div>
              <div className="flex space-x-1">
                <button onClick={handlePaste} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg"><Clipboard size={16} /></button>
                <button onClick={() => setShowQrModal(true)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg"><QrCode size={16} /></button>
                <button onClick={handleGoToBook} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg"><BookUser size={16} /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 px-2 text-xs">
          <span className="text-gray-500">Costo de red estimado:</span>
          <span className="font-bold text-gray-300">{gasEstimate.isFree ? 'Gratis' : `~ ${gasEstimate.feeEth} ETH`}</span>
        </div>

        <div className="mt-4 mb-4">
          <button 
            onClick={handleFirstSendClick}
            disabled={!isValidAddress || tokenAmount <= 0 || isLoading || isInsufficientFunds}
            className={`w-full font-bold py-4 rounded-2xl transition-all ${
              isValidAddress && tokenAmount > 0 && !isLoading && !isInsufficientFunds
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Procesando...' : 'Revisar Envío'}
          </button>
        </div>
      </main>

      {/* MODALES */}
      <AddressModal 
        isOpen={showAddressModal} 
        onClose={() => setShowAddressModal(false)} 
        prefilledAddress={recipient} 
      />
      
      <QrScannerModal 
        isOpen={showQrModal} 
        onClose={() => setShowQrModal(false)} 
        onScan={(addr) => setRecipient(addr)} 
      />
      
      <ConfirmTxModal 
        isOpen={showConfirmModal} 
        onClose={() => setShowConfirmModal(false)} 
        token={selectedToken} 
        amount={tokenAmount.toFixed(4)} 
        recipient={recipient} 
        gasFee={gasEstimate}
        onConfirm={executeSend} 
      />

      <TxResultModal 
        isOpen={showResultModal} 
        onClose={() => { setShowResultModal(false); navigate('/dashboard'); }} 
        result={txResult} 
        tokenSymbol={selectedToken.symbol} 
        amount={tokenAmount.toFixed(4)} 
        recipient={recipient} 
      />
    </div>
  );
                                        }
