import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Edit2, Check, Eye, EyeOff, 
  Key, Globe, User, AlertTriangle, X 
} from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore.js';
import AccountAvatar from '../../components/AccountAvatar.jsx';

export default function Settings() {
  const navigate = useNavigate();
  const { 
    vaultBlob, activeAccount, setActiveAccount, updateAccountName, 
    fiatCurrency, setFiatCurrency, getMnemonicForBackup 
  } = useWalletStore();

  // Estados para editar nombre
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState('');

  // Estados para Fiat
  const [fiat, setFiat] = useState(fiatCurrency);

  // Estados para Semilla (Backup)
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [password, setPassword] = useState('');
  const [seedError, setSeedError] = useState('');
  const [revealedMnemonic, setRevealedMnemonic] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSaveName = (index) => {
    if (editName.trim()) {
      updateAccountName(index, editName.trim());
    }
    setEditingIndex(null);
  };

  const handleChangeFiat = (currency) => {
    setFiat(currency);
    setFiatCurrency(currency);
  };

  const handleRevealSeed = async (e) => {
    e.preventDefault();
    setSeedError('');
    setIsVerifying(true);
    try {
      const mnemonic = await getMnemonicForBackup(password);
      setRevealedMnemonic(mnemonic);
      setPassword('');
    } catch (err) {
      setSeedError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const closeSeedModal = () => {
    setShowSeedModal(false);
    setRevealedMnemonic('');
    setPassword('');
    setSeedError('');
  };

  const FIAT_OPTIONS = [
    { id: 'usd', label: 'USD - Dólar Estadounidense' },
    { id: 'eur', label: 'EUR - Euro' },
    { id: 'ves', label: 'VES - Bolívar Venezolano' },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-10">
      
      {/* HEADER */}
      <header className="p-4 flex items-center space-x-3 bg-gray-950 z-10 sticky top-0 border-b border-white/5">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Ajustes</h1>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        
        {/* SECCIÓN 1: GENERAL (MONEDA FIAT) */}
        <section className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Globe size={18} className="text-purple-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">General</h2>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4">
            <p className="text-sm text-gray-400 mb-3">Moneda para mostrar saldos</p>
            <div className="space-y-2">
              {FIAT_OPTIONS.map(opt => (
                <button 
                  key={opt.id}
                  onClick={() => handleChangeFiat(opt.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${fiat === opt.id ? 'bg-purple-600/20 border border-purple-500/30 text-white' : 'bg-gray-950 text-gray-400 hover:bg-gray-800'}`}
                >
                  <span>{opt.label}</span>
                  {fiat === opt.id && <Check size={16} className="text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: MIS CUENTAS */}
        <section className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <User size={18} className="text-purple-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Mis Cuentas</h2>
          </div>
          <div className="space-y-2">
            {vaultBlob?.accounts.map((acc) => (
              <div 
                key={acc.index}
                className={`bg-gray-900 border rounded-2xl p-4 flex items-center justify-between transition-colors ${activeAccount?.index === acc.index ? 'border-purple-500/50' : 'border-white/5'}`}
              >
                <div className="flex items-center space-x-3 flex-1" onClick={() => setActiveAccount(acc.index)}>
                  <AccountAvatar address={acc.address} size={36} />
                  <div className="flex-1">
                    {editingIndex === acc.index ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-gray-950 border border-white/10 rounded px-2 py-1 text-sm w-full outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleSaveName(acc.index)} className="text-green-400"><Check size={16}/></button>
                      </div>
                    ) : (
                      <p className="font-bold text-sm">{acc.name || `Cuenta ${acc.index}`}</p>
                    )}
                    <p className="text-xs text-gray-400 font-mono">{acc.address.slice(0, 8)}...{acc.address.slice(-6)}</p>
                  </div>
                </div>
                
                {activeAccount?.index === acc.index && (
                   <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-1 rounded-full font-bold">Activa</span>
                )}
                <button 
                  onClick={() => { setEditingIndex(acc.index); setEditName(acc.name || `Cuenta ${acc.index}`); }}
                  className="p-2 ml-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN 3: SEGURIDAD */}
        <section className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Key size={18} className="text-red-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Seguridad</h2>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <h3 className="font-bold text-red-400 mb-1">Frase Semilla</h3>
            <p className="text-xs text-gray-400 mb-3">
              La frase semilla es la llave maestra de tu billetera. Nunca la compartas con nadie.
            </p>
            <button 
              onClick={() => setShowSeedModal(true)}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <Eye size={18} />
              <span>Revelar Frase Semilla</span>
            </button>
          </div>
        </section>

      </main>

      {/* MODAL DE LA SEMILLA */}
      {showSeedModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Frase Semilla</h2>
              <button onClick={closeSeedModal} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            
            {!revealedMnemonic ? (
              <form onSubmit={handleRevealSeed} className="space-y-4">
                <div className="flex items-start space-x-2 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                  <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-200">
                    Asegúrate de estar en un lugar privado. Cualquier persona que vea estas palabras podrá robar tus fondos.
                  </p>
                </div>
                <div>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña maestra"
                    className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                    autoFocus
                  />
                  {seedError && <p className="text-red-400 text-xs mt-1">{seedError}</p>}
                </div>
                <button 
                  type="submit" 
                  disabled={!password || isVerifying}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isVerifying ? 'Verificando...' : 'Verificar y Revelar'}
                </button>
              </form>
            ) : (
              <div>
                <div className="bg-gray-950 border border-red-500/30 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-3 gap-2">
                    {revealedMnemonic.split(' ').map((word, i) => (
                      <div key={i} className="bg-gray-800 p-1.5 rounded text-center text-xs font-mono">
                        <span className="text-gray-500 mr-1">{i + 1}.</span>{word}
                      </div>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={closeSeedModal}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Ocultar y Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
            }
