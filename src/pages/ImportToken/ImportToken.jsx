import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clipboard, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { isAddress, formatUnits } from 'viem';
import { useWalletStore } from '../../store/useWalletStore.js';
import { getTuxaPublicClient, ERC20_ABI } from '../../services/viemClient.js';

export default function ImportToken() {
  const navigate = useNavigate();
  const { addTrackedToken, trackedTokens } = useWalletStore();

  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState('');

  const isAlreadyTracked = trackedTokens.some(
    t => t.address.toLowerCase() === address.toLowerCase()
  );

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text);
      setTokenData(null);
      setError('');
      // Auto-fetch if valid
      if (isAddress(text)) {
        fetchTokenData(text);
      }
    } catch (e) {
      setError('No se pudo leer el portapapeles.');
    }
  };

  const fetchTokenData = async (contractAddress) => {
    if (!isAddress(contractAddress)) return;
    setIsLoading(true);
    setError('');
    setTokenData(null);

    try {
      const client = getTuxaPublicClient();
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        client.readContract({ address: contractAddress, abi: ERC20_ABI, functionName: 'name' }),
        client.readContract({ address: contractAddress, abi: ERC20_ABI, functionName: 'symbol' }),
        client.readContract({ address: contractAddress, abi: ERC20_ABI, functionName: 'decimals' }),
        client.readContract({ address: contractAddress, abi: ERC20_ABI, functionName: 'totalSupply' })
      ]);

      setTokenData({
        address: contractAddress,
        name,
        symbol,
        decimals,
        totalSupply: formatUnits(totalSupply, decimals)
      });
    } catch (err) {
      console.error(err);
      setError('No se pudo leer el contrato. Verifica que sea un token ERC-20 válido en Tuxachain.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (e) => {
    const val = e.target.value;
    setAddress(val);
    setTokenData(null);
    setError('');
    if (isAddress(val)) {
      fetchTokenData(val);
    }
  };

  const handleImport = () => {
    if (!tokenData) return;
    try {
      addTrackedToken(tokenData);
      navigate('/assets');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative">
      
      {/* HEADER CON BOTÓN ATRÁS */}
      <header className="p-4 flex items-center space-x-3 bg-gray-950 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1">Importar Token</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        
        <p className="text-sm text-gray-400 mb-6">
          Pega la dirección del contrato del token (ERC-20) para importarlo a tu billetera.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 mb-6">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        {/* INPUT DE DIRECCIÓN */}
        <div className="mb-6">
          <label className="text-xs text-gray-400 mb-2 block">Dirección del Contrato</label>
          <div className="relative">
            <input 
              type="text"
              value={address}
              onChange={handleAddressChange}
              placeholder="0x..."
              className="w-full bg-gray-900 border border-white/10 rounded-xl p-4 pr-12 text-sm font-mono focus:ring-1 focus:ring-purple-500 outline-none transition-all"
            />
            <button 
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
            >
              <Clipboard size={18} />
            </button>
          </div>
        </div>

        {/* ESTADO DE CARGA */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xs text-gray-400">Buscando datos del token...</p>
          </div>
        )}

        {/* VISTA PREVIA DEL TOKEN */}
        {tokenData && !isLoading && (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-xl font-bold text-purple-400">
                {tokenData.symbol[0]}
              </div>
              <div>
                <h3 className="font-bold text-lg">{tokenData.name}</h3>
                <p className="text-sm text-gray-400">{tokenData.symbol}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm border-t border-white/5 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Decimales</span>
                <span className="font-mono">{tokenData.decimals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Suministro Total</span>
                <span className="font-mono">{parseFloat(tokenData.totalSupply).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {isAlreadyTracked && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg text-yellow-500 text-xs text-center">
                Este token ya está en tu lista.
              </div>
            )}
          </div>
        )}

        {/* ADVERTENCIA DE SEGURIDAD */}
        {tokenData && !isLoading && (
          <div className="flex items-start space-x-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-6">
            <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-200">
              Asegúrate de que confías en el emisor de este token. Cualquier persona puede crear un token con el mismo nombre o símbolo que uno oficial.
            </p>
          </div>
        )}

        {/* BOTÓN DE IMPORTAR */}
        <div className="mt-auto">
          <button 
            onClick={handleImport}
            disabled={!tokenData || isLoading || isAlreadyTracked}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center space-x-2"
          >
            <CheckCircle2 size={20} />
            <span>Importar Token</span>
          </button>
        </div>

      </main>
    </div>
  );
}
