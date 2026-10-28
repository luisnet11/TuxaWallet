import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../store/useWalletStore.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    activeAccount, 
    lockWallet, 
    fetchActiveAccountBalance, 
    trackedTokens, 
    fetchERC20Balance,
    isUnlocked 
  } = useWalletStore();

  const [ethBalance, setEthBalance] = useState('0.0000');
  const [tokenBalances, setTokenBalances] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isUnlocked) {
      navigate('/unlock');
    }
  }, [isUnlocked, navigate]);

  const loadBalances = async () => {
    setIsRefreshing(true);
    const bal = await fetchActiveAccountBalance();
    setEthBalance(bal);
    
    const newTokenBalances = {};
    for (const token of trackedTokens) {
      newTokenBalances[token.address] = await fetchERC20Balance(token.address);
    }
    setTokenBalances(newTokenBalances);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadBalances();
  }, [activeAccount?.address]);

  const handleLock = () => {
    lockWallet();
    navigate('/unlock');
  };

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Funciones placeholder para los botones
  const handleSend = () => alert('Pantalla de Enviar en construcción...');
  const handleReceive = () => alert('Pantalla de Recibir en construcción...');

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col relative overflow-hidden">
      {/* Adornos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      
      {/* HEADER */}
      <header className="p-4 flex justify-between items-center z-10 border-b border-white/5 bg-gray-900/30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
            {activeAccount?.address.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-400">Cuenta Activa</p>
            <p className="text-sm font-mono">{truncateAddress(activeAccount?.address)}</p>
          </div>
        </div>
        <button 
          onClick={handleLock}
          className="p-2 bg-white/5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
          title="Bloquear billetera"
        >
          🔒
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 z-10 overflow-y-auto pb-24">
        
        {/* TARJETA PRINCIPAL DE SALDO */}
        <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-3xl p-6 shadow-[0_10px_40px_rgba(147,51,234,0.3)] border border-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full filter blur-2xl transform translate-x-10 -translate-y-10"></div>
          
          <p className="text-purple-200 text-sm font-medium mb-1">Saldo Total en Tuxachain</p>
          <div className="flex items-end space-x-2 mb-6">
            <h2 className="text-4xl font-bold tracking-tight">{ethBalance}</h2>
            <span className="text-purple-300 font-medium mb-1">ETH</span>
          </div>
          
          <button 
            onClick={loadBalances}
            disabled={isRefreshing}
            className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <span>{isRefreshing ? '⏳' : '🔄'}</span>
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Saldo'}</span>
          </button>
        </div>

        {/* ACCIONES RÁPIDAS (ENVIAR / RECIBIR) */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button 
            onClick={handleSend}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors group"
          >
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              ↗
            </div>
            <span className="text-sm font-medium">Enviar</span>
          </button>
          
          <button 
            onClick={handleReceive}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors group"
          >
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              ↙
            </div>
            <span className="text-sm font-medium">Recibir</span>
          </button>
        </div>

        {/* LISTA DE TOKENS */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Tus Tokens</h3>
            <button className="text-sm text-purple-400 hover:text-purple-300 font-medium">
              + Importar
            </button>
          </div>

          {trackedTokens.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-sm">No tienes tokens importados todavía.</p>
              <p className="text-xs text-gray-500 mt-1">Usa el botón de arriba para añadir un ERC-20.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trackedTokens.map((token) => (
                <div key={token.address} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-lg">
                      🪙
                    </div>
                    <div>
                      <p className="font-bold text-sm">{token.symbol}</p>
                      <p className="text-xs text-gray-400">{token.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{tokenBalances[token.address] || '...'}</p>
                    <p className="text-xs text-gray-400">{token.symbol}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="absolute bottom-0 w-full bg-gray-900/80 backdrop-blur-lg border-t border-white/10 p-4 flex justify-around items-center z-20">
        <button className="flex flex-col items-center space-y-1 text-purple-400">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Inicio</span>
        </button>
        <button onClick={handleSend} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <span className="text-xl">💸</span>
          <span className="text-[10px] font-medium">Enviar</span>
        </button>
        <button onClick={handleReceive} className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <span className="text-xl">📥</span>
          <span className="text-[10px] font-medium">Recibir</span>
        </button>
      </nav>
    </div>
  );
      }
