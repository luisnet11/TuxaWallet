import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clipboard, AlertCircle, CheckCircle2, Search, Link as LinkIcon } from 'lucide-react';
import { isAddress, formatUnits } from 'viem';
import { useWalletStore } from '../../store/useWalletStore.js';
import { getTuxaPublicClient, ERC20_ABI } from '../../services/viemClient.js';
import TokenIcon from '../../components/TokenIcon.jsx';

// URL de tu repositorio JSON
const TOKEN_LIST_URL = 'https://raw.githubusercontent.com/luisnet11/TuxaWallet/main/tokenlist.json';

export default function ImportToken() {
  const navigate = useNavigate();
  const { addTrackedToken, trackedTokens } = useWalletStore();

  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'custom'
  
  // Estados para Descubrir
  const [officialTokens, setOfficialTokens] = useState([]);
  const [isFetchingList, setIsFetchingList] = useState(false);
  const [listError, setListError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Personalizado
  const [customAddress, setCustomAddress] = useState('');
  const [customLogo, setCustomLogo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customTokenData, setCustomTokenData] = useState(null);
  const [customError, setCustomError] = useState('');

  // 1. Cargar la lista oficial de GitHub
  useEffect(() => {
    if (activeTab !== 'discover' || officialTokens.length > 0) return;

    const fetchList = async () => {
      setIsFetchingList(true);
      setListError('');
      try {
        const res = await fetch(TOKEN_LIST_URL);
        if (!res.ok) throw new Error('No se pudo cargar la lista oficial');
        const data = await res.json();
        setOfficialTokens(data.tokens || []);
      } catch (err) {
        setListError('Error de conexión con el repositorio de tokens.');
      } finally {
        setIsFetchingList(false);
      }
    };
    fetchList();
  }, [activeTab]);

  const filteredOfficial = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return officialTokens.filter(t => 
      t.name.toLowerCase().includes(term) || 
      t.symbol.toLowerCase().includes(term) || 
      t.address.toLowerCase().includes(term)
    );
  }, [officialTokens, searchTerm]);

  // 2. Funciones de Importación Personalizada
  const fetchCustomToken = async (addr) => {
    if (!isAddress(addr)) return;
    setIsLoading(true);
    setCustomError('');
    setCustomTokenData(null);

    try {
      const client = getTuxaPublicClient();
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'name' }),
        client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'symbol' }),
        client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'decimals' }),
        client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'totalSupply' })
      ]);

      setCustomTokenData({ address: addr, name, symbol, decimals, totalSupply: formatUnits(totalSupply, decimals) });
    } catch (err) {
      setCustomError('No se pudo leer el contrato. Verifica que sea un token ERC-20.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomAddressChange = (e) => {
    const val = e.target.value;
    setCustomAddress(val);
    setCustomTokenData(null);
    setCustomError('');
    if (isAddress(val)) fetchCustomToken(val);
  };

  const handleImportOfficial = (token) => {
    try {
      addTrackedToken(token);
      navigate('/assets');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleImportCustom = () => {
    if (!customTokenData) return;
    try {
      addTrackedToken({
        ...customTokenData,
        logoURI: customLogo.trim() || null // Guardamos el link del logo si existe
      });
      navigate('/assets');
    } catch (err) {
      setCustomError(err.message);
    }
  };

  const isAlreadyTracked = (addr) => trackedTokens.some(t => t.address.toLowerCase() === addr.toLowerCase());

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative">
      
      {/* HEADER */}
      <header className="p-4 flex items-center space-x-3 bg-gray-950 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1">Importar Token</h1>
      </header>

      {/* TABS */}
      <div className="flex px-4 border-b border-white/10">
        <button 
          onClick={() => setActiveTab('discover')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'discover' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500'}`}
        >
          Descubrir
        </button>
        <button 
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'custom' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500'}`}
        >
          Personalizado
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4">
        
        {/* PESTAÑA: DESCUBRIR */}
        {activeTab === 'discover' && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text"
                placeholder="Buscar token oficial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            {listError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{listError}</div>}
            
            {isFetchingList ? (
               <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="space-y-2">
                {filteredOfficial.map((token) => {
                  const alreadyTracked = isAlreadyTracked(token.address);
                  return (
                    <div key={token.address} className="bg-gray-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <TokenIcon address={token.address} symbol={token.symbol} logoURI={token.logoURI} size={40} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-sm">{token.symbol}</p>
                            {token.type === 'bridged' && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Puentado</span>}
                            {token.type === 'native' && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Nativo</span>}
                          </div>
                          <p className="text-xs text-gray-400">{token.name}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleImportOfficial(token)}
                        disabled={alreadyTracked}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${alreadyTracked ? 'bg-gray-800 text-gray-500' : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/40'}`}
                      >
                        {alreadyTracked ? 'Importado' : 'Importar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: PERSONALIZADO */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-400">
              Pega la dirección del contrato (ERC-20) para importar un token de forma manual.
            </p>

            {customError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2"><AlertCircle size={16}/> {customError}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Dirección del Contrato</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={customAddress}
                    onChange={handleCustomAddressChange}
                    placeholder="0x..."
                    className="w-full bg-gray-900 border border-white/10 rounded-xl p-4 pr-12 text-sm font-mono focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                  <button 
                    onClick={async () => {
                      const text = await navigator.clipboard.readText();
                      setCustomAddress(text);
                      if (isAddress(text)) fetchCustomToken(text);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg"
                  >
                    <Clipboard size={18} />
                  </button>
                </div>
              </div>

              {isLoading && <div className="text-center text-purple-400 text-sm animate-pulse">Buscando datos del token...</div>}

              {customTokenData && !isLoading && (
                <>
                  <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center space-x-4 mb-4">
                      <TokenIcon address={customTokenData.address} symbol={customTokenData.symbol} logoURI={customLogo} size={48} />
                      <div>
                        <h3 className="font-bold text-lg">{customTokenData.name}</h3>
                        <p className="text-sm text-gray-400">{customTokenData.symbol}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm border-t border-white/5 pt-4">
                      <div className="flex justify-between"><span className="text-gray-500">Decimales</span><span className="font-mono">{customTokenData.decimals}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Suministro Total</span><span className="font-mono">{parseFloat(customTokenData.totalSupply).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                      <LinkIcon size={12} /> Link del Logo (Opcional, IPFS o URL)
                    </label>
                    <input 
                      type="text" 
                      value={customLogo} 
                      onChange={(e) => setCustomLogo(e.target.value)} 
                      placeholder="https://... o ipfs://..."
                      className="w-full bg-gray-900 border border-white/10 rounded-xl p-3 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="flex items-start space-x-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-200">Asegúrate de confiar en el emisor. Cualquiera puede crear un token con el mismo nombre.</p>
                  </div>

                  <button 
                    onClick={handleImportCustom}
                    disabled={isAlreadyTracked(customTokenData.address)}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 size={20} />
                    <span>{isAlreadyTracked(customTokenData.address) ? 'Ya importado' : 'Importar Token'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
    }
