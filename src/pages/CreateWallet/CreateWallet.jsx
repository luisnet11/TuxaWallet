import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../store/useWalletStore.js';
import { validatePasswordStrength } from '../../vault/crypto.service.js';
import PasswordInput from '../../components/PasswordInput.jsx';

export default function CreateWallet() {
  const navigate = useNavigate();
  const { createWallet, confirmWallet, isLoading, error, clearError, vaultBlob } = useWalletStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [localError, setLocalError] = useState('');

// SEGURIDAD: Solo comprobar al entrar a la página (montaje)
useEffect(() => {
  const currentVault = useWalletStore.getState().vaultBlob;
  if (currentVault) {
    alert('Ya tienes una billetera creada en este dispositivo. Por seguridad, no puedes crear otra sin borrar la actual.');
    navigate('/welcome');
  }
}, [navigate]);

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
      confirmWallet();
      // Higiene de memoria
      setMnemonic(null);
      setPassword('');
      setConfirmPassword('');
      navigate('/dashboard'); // Próximamente lo crearemos
    }
  };

  if (!mnemonic) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/welcome')} className="text-gray-400 hover:text-purple-400 mb-6 transition-colors">← Atrás</button>
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

          <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg mb-6">
            <p className="text-xs text-gray-400 mb-2 font-semibold">Requisitos de la contraseña:</p>
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
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creando billetera...' : 'Crear Billetera'}
          </button>
        </div>
      </div>
    );
  }

  // --- FLUJO 2: MOSTRAR SEMILLA (CON DISEÑO MORADO Y AJUSTE DE TEXTO) ---
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center text-yellow-400">⚠️ Guarda tu frase secreta</h1>
        <p className="text-gray-400 mb-6 text-sm text-center">
          Anota estas 24 palabras en un lugar seguro. Es la única forma de recuperar tu billetera.
        </p>

        {/* Grid de palabras con fondo morado oscuro y texto adaptable */}
        <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-3 mb-6 grid grid-cols-3 gap-2">
          {mnemonic.split(' ').map((word, i) => (
            <div key={i} className="bg-purple-900/50 p-2 rounded flex items-center justify-center">
              <span className="text-purple-400 text-xs mr-1 font-mono">{i + 1}.</span>
              <span className="text-white text-xs font-medium break-all">{word}</span>
            </div>
          ))}
        </div>

        <label className="flex items-center space-x-3 mb-6 cursor-pointer p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-purple-500 transition-colors">
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
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirmar y Continuar
        </button>
      </div>
    </div>
  );
}
