import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Clipboard, BookUser, ArrowUpRight, X, CheckCircle2, UserPlus, AlertCircle } from 'lucide-react';
import { isAddress } from 'viem';
import { useWalletStore } from '../../store/useWalletStore.js';
import { useAddressBookStore } from '../../store/useAddressBookStore.js';
import { fetchTokenPrices } from '../../services/price.service.js';
import { unlockWallet } from '../../vault/walletVault.js';
import AccountAvatar from '../../components/AccountAvatar.jsx';
import AddressModal from '../../components/AddressModal.jsx';

export default function Send() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    activeAccount, trackedTokens, vaultBlob, 
    sendNativeTransaction, sendERC20Token, 
    fetchActiveAccountBalance, fetchERC20Balance 
  } = useWalletStore();
  const { contacts } = useAddressBookStore();

  // Estados de UI
  const [selectedToken, setSelectedToken] = useState({ address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18 });
  const [tokenBalance, setTokenBalance] = useState('0.0000');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isFiatMode, setIsFiatMode] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados de Modales
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const allTokens = [{ address: 'native', symbol: 'ETH', name: 'Ethereum', decimals: 18 }, ...trackedTokens];

  // 1. Cargar datos iniciales
  useEffect(() => {
    const addressFromBook = searchParams.get('address');
    if (addressFromBook) setRecipient(addressFromBook);

    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      const foundToken = allTokens.find(t => t.address === tokenFromUrl);
      if (foundToken) setSelectedToken(foundToken);
    }

    const loadPrices = async () => {
      const tokenAddrs = ['native', ...trackedTokens.map(t => t.address)];
      const fetchedPrices = await fetchTokenPrices(tokenAddrs, 'usd');
      setPrices(fetchedPrices);
    };
    loadPrices();
  }, [searchParams, trackedTokens]);

  // 2. Cargar el balance real cada vez que cambia el token
  useEffect(() => {
    const loadBalance = async () => {
      if (selectedToken.address === 'native') {
        const bal = await fetchActiveAccountBalance();
        setTokenBalance(bal);
      } else {
        const bal = await fetchERC20Balance(selectedToken.address);
        setTokenBalance(bal);
      }
    };
    loadBalance();
  }, [selectedToken, activeAccount?.address]);

  // 3. Cálculos
  const currentPrice = prices[selectedToken.symbol] || 0;
  
  const getTokenAmount = () => {
    if (!amount) return 0;
    return isFiatMode ? (parseFloat(amount) / currentPrice) : parseFloat(amount);
  };

  const getFiatAmount = () => {
    if (!amount) return 0;
    return isFiatMode ? parseFloat(amount) : (parseFloat(amount) * currentPrice);
  };

  const tokenAmount = getTokenAmount();
  const fiatAmount = getFiatAmount();

  // 4. Validaciones
  const isValidAddress = isAddress(recipient);
  const isKnownContact = contacts.some(c => c.address.toLowerCase() === recipient.toLowerCase());
  
  // NUEVA VALIDACIÓN: El monto no debe superar el saldo (usamos un margen de error muy pequeño para decimales flotantes)
  const availableBalance = parseFloat(tokenBalance) || 0;
  const isInsufficientFunds = tokenAmount > (availableBalance + 0.000001);

  // 5. Manejar Pegar y Max
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipient(text);
    } catch (e) { alert('No se pudo leer el portapapeles'); }
  };

  const handleMax = async () => {
    const bal = parseFloat(tokenBalance);
    if (selectedToken.address === 'native') {
      const max = Math.max(0, bal - 0.001); // Reservar gas
      setAmount(isFiatMode ? (max * currentPrice).toFixed(2) : max.toString());
    } else {
      setAmount(isFiatMode ? (bal * currentPrice).toFixed(2) : tokenBalance);
    }
  };

  // 6. Ejecutar Envío
  const executeSend = async () => {
    setIsLoading(true);
    try {
      let result;
      if (selectedToken.address === 'native') {
        result = await sendNativeTransaction(recipient, tokenAmount.toString(), false);
      } else {
        result = await sendERC20Token(selectedToken.address, recipient, tokenAmount.toString(), false);
      }
      
      if (result.success) {
        alert(`✅ Transacción enviada.\nHash: ${result.hash}`);
        navigate('/dashboard');
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setShowPasswordModal(false);
      setPassword('');
    }
  };

  const handleSendClick = () => {
    // Doble verificación de seguridad
    if (!isValidAddress || tokenAmount <= 0 || isInsufficientFunds) return;
    
    if (!isKnownContact) {
      setShowPasswordModal(true);
    } else {
      executeSend();
    }
  };

  const handleConfirmPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    try {
      await unlockWallet(vaultBlob, password); // Verifica contraseña
      executeSend();
    } catch (err) {
      setPasswordError('Contraseña incorrecta. Intenta de nuevo.');
    }
  };

  const handleGoToBook = () => {
    navigate(`/address-book?returnTo=send&token=${selectedToken.address}`);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-24">
      
      {/* HEADER */}
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
        
        {/* ÁREA CENTRAL */}
        <div className="flex-1 flex flex-col items-center justify-center my-8 relative">
          <div className="flex items-center justify-center w-full relative">
            <div className="absolute left-0 flex flex-col space-y-2">
              <button onClick={handleMax} className="bg-gray-900 text-xs font-bold px-3 py-2 rounded-full border border-white/10 hover:bg-gray-800">
                MAX
              </button>
              <button 
                onClick={() => setIsFiatMode(!isFiatMode)} 
                className={`text-xs font-bold px-3 py-2 rounded-full border transition-colors ${isFiatMode ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-900 border-white/10 text-gray-400'}`}
              >
                USD
              </button>
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
            <p className="text-gray-400 font-medium">
              {isFiatMode ? `~ ${tokenAmount.toFixed(4)} ${selectedToken.symbol}` : `~ $${fiatAmount.toFixed(2)} USD`}
            </p>
            {/* MENSAJE DE ERROR POR FONDOS INSUFICIENTES */}
            {isInsufficientFunds && (
              <p className="text-red-400 text-xs font-bold mt-1 flex items-center justify-center gap-1">
                <AlertCircle size={12} /> Saldo insuficiente
              </p>
            )}
          </div>
        </div>

        {/* TARJETA DE CONFIGURACIÓN */}
        <div className="bg-gray-900 rounded-3xl border border-white/5 overflow-hidden">
          <button 
            onClick={() => setShowTokenModal(true)}
            className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="font-bold text-purple-400">{selectedToken.symbol[0]}</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">{selectedToken.symbol}</p>
                <p className="text-xs text-gray-400">Balance: {tokenBalance}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
               <span className="text-sm text-gray-400">${currentPrice.toFixed(2)}</span>
               <ChevronDown size={16} className="text-gray-500" />
            </div>
          </button>

          {/* Fila: Dirección */}
          <div className="p-4">
            <div className="flex items-center space-x-3">
              {isValidAddress ? (
                <AccountAvatar address={recipient} size={40} />
              ) : (
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-500">
                  <ArrowUpRight size={20} />
                </div>
              )}
              
              <div className="flex-1">
                <input 
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Dirección de destino (0x...)"
                  className="w-full bg-transparent outline-none text-sm font-mono placeholder-gray-500"
                />
                {!isKnownContact && isValidAddress && (
                  <button 
                    onClick={() => setShowAddressModal(true)}
                    className="text-xs text-purple-400 mt-1 flex items-center gap-1 hover:text-purple-300"
                  >
                    <UserPlus size={12} /> Guardar en libreta
                  </button>
                )}
              </div>

              <div className="flex space-x-1">
                <button onClick={handlePaste} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg">
                  <Clipboard size={16} />
                </button>
                <button onClick={handleGoToBook} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg">
                  <BookUser size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* BOTÓN DE ENVÍO */}
        <div className="mt-8 mb-4">
          <button 
            onClick={handleSendClick}
            disabled={!isValidAddress || tokenAmount <= 0 || isLoading || isInsufficientFunds}
            className={`w-full font-bold py-4 rounded-2xl transition-all ${
              isValidAddress && tokenAmount > 0 && !isLoading && !isInsufficientFunds
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Procesando...' : 'Enviar'}
          </button>
        </div>

      </main>

      {/* MODAL: SELECCIÓN DE TOKEN */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/80 flex flex-col justify-end z-50">
          <div className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl p-6 h-[60vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Seleccionar Token</h2>
              <button onClick={() => setShowTokenModal(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {allTokens.map(token => (
                <button
                  key={token.address}
                  onClick={() => { setSelectedToken(token); setShowTokenModal(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${selectedToken.address === token.address ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold">{token.symbol[0]}</div>
                    <span className="font-bold text-sm">{token.symbol}</span>
                  </div>
                  {selectedToken.address === token.address && <CheckCircle2 size={16} className="text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONTRASEÑA */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2 text-center">Dirección Nueva</h2>
            <p className="text-xs text-gray-400 text-center mb-6">
              Estás enviando a una dirección que no está en tu libreta. Ingresa tu contraseña para autorizar.
            </p>
            {passwordError && <p className="text-red-400 text-xs text-center mb-2">{passwordError}</p>}
            <form onSubmit={handleConfirmPassword} className="space-y-4">
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña maestra"
                className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                autoFocus
              />
              <div className="flex space-x-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl text-sm font-bold">Cancelar</button>
                <button type="submit" disabled={!password} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-sm font-bold">Autorizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GUARDAR DIRECCIÓN */}
      <AddressModal 
        isOpen={showAddressModal} 
        onClose={() => setShowAddressModal(false)} 
        contactToEdit={{ address: recipient, label: '', note: '', isFavorite: false }} 
      />

    </div>
  );
}
