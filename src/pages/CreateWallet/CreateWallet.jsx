import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../store/useWalletStore.js';
import { validatePasswordStrength } from '../../vault/crypto.service.js';
import PasswordInput from '../../components/PasswordInput.jsx';

export default function CreateWallet() {
  const navigate = useNavigate();
  const { createWallet, confirmWallet, isLoading, error, clearError } = useWalletStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState(null); // Se llena tras crear
  const [hasSaved, setHasSaved] = useState(false);
  const [localError, setLocalError] = useState('');

  // Validaciones
  const validation = validatePasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isFormValid = validation.valid && passwordsMatch;

  const handleCreate = async () => {
    setLocalError('');
    clearError();
    if (!isFormValid) return;
    
    try {
      const mnemonicGenerated = await createWallet(password);
      setMnemonic(mnemonicGenerated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmBackup = () => {
  if (hasSaved) {
    confirmWallet(); // Guarda en localStorage
    
    // HIGIENE DE MEMORIA: Eliminar la semilla de la RAM
    setMnemonic(null);
    setPassword('');
    setConfirmPassword('');
    
    navigate('/dashboard');
  }
};

  // --- FLUJO 1: MOSTRAR CONTRASEÑA ---
  if (!mnemonic) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/welcome')} className="text-gray-400 hover:text-white mb-6">← Atrás</button>
          <h1 className="text-3xl font-bold mb-2">Crea una contraseña</h1>
          <p className="text-gray-400 mb-8 text-sm">
            Crea una contraseña para cifrar tu billetera en este dispositivo. La necesitarás cada vez que la desbloquees.
          </p>

          {(error || localError) && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mb-4 text-sm">
              {localError || error}
            </div>
          )}

          <PasswordInput 
            label="Contraseña" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Mínimo 12 caracteres"
            isValid={validation.valid}
          />
          <PasswordInput 
            label="Confirmar Contraseña" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            placeholder="Repite la contraseña"
            isValid={passwordsMatch}
          />

          {/* Requisitos */}
          <div className="bg-gray-900 p-4 rounded-lg mb-6">
            <p className="text-xs text-gray-400 mb-2">Requisitos de la contraseña:</p>
            <ul className="text-xs space-y-1">
              {validation.errors.length === 0 ? (
                <li className="text-green-400">✓ Todos los requisitos cumplidos</li>
              ) : (
                validation.errors.map((err, i) => (
                  <li key={i} className="text-red-400">✗ {err}</li>
                ))
              )}
              {!passwordsMatch && password.length > 0 && (
                <li className="text-red-400">✗ Las contraseñas no coinciden</li>
              )}
            </ul>
          </div>

          <button
            onClick={handleCreate}
            disabled={!isFormValid || isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creando billetera...' : 'Crear Billetera'}
          </button>
        </div>
      </div>
    );
  }

  // --- FLUJO 2: MOSTRAR SEMILLA ---
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center text-yellow-400">⚠️ Guarda tu frase secreta</h1>
        <p className="text-gray-400 mb-6 text-sm text-center">
          Anota estas 24 palabras en un lugar seguro. Es la única forma de recuperar tu billetera.
        </p>

        <div className="bg-gray-900 border border-yellow-600/50 rounded-xl p-4 mb-6 grid grid-cols-3 gap-2">
          {mnemonic.split(' ').map((word, i) => (
            <div key={i} className="bg-gray-800 p-2 rounded text-center text-sm">
              <span className="text-gray-500 mr-1">{i + 1}.</span>
              {word}
            </div>
          ))}
        </div>

        <label className="flex items-center space-x-3 mb-6 cursor-pointer p-3 bg-gray-900 rounded-lg border border-gray-800 hover:border-purple-500 transition-colors">
          <input
            type="checkbox"
            checked={hasSaved}
            onChange={(e) => setHasSaved(e.target.checked)}
            className="w-5 h-5 accent-purple-600 rounded"
          />
          <span className="text-sm">He guardado mis 24 palabras en un lugar seguro</span>
        </label>

        <button
          onClick={handleConfirmBackup}
          disabled={!hasSaved}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirmar y Continuar
        </button>
      </div>
    </div>
  );
          }
