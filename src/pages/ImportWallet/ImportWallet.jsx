import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../store/useWalletStore.js';
import { validatePasswordStrength } from '../../vault/crypto.service.js';
import PasswordInput from '../../components/PasswordInput.jsx';

export default function ImportWallet() {
  const navigate = useNavigate();
  const { importExistingWallet, isLoading, error, clearError, vaultBlob } = useWalletStore();

  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // SEGURIDAD: Si ya hay una billetera, alertar y redirigir
  useEffect(() => {
    if (vaultBlob) {
      alert('Ya tienes una billetera creada en este dispositivo. Por seguridad, no puedes crear otra sin borrar la actual.');
      navigate('/welcome');
    }
  }, [vaultBlob, navigate]);

  const validation = validatePasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  
  const words = mnemonic.trim().split(/\s+/).filter(w => w.length > 0);
  const isValidWordCount = words.length === 12 || words.length === 24;

  const isFormValid = validation.valid && passwordsMatch && isValidWordCount;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMnemonic(text);
    } catch (err) {
      setLocalError('No se pudo acceder al portapapeles. Pega manualmente.');
    }
  };

  const handleImport = async () => {
    setLocalError('');
    clearError();
    if (!isFormValid) return;

    try {
      await importExistingWallet(mnemonic, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/welcome')} className="text-gray-400 hover:text-purple-400 mb-6 transition-colors">← Atrás</button>
        <h1 className="text-3xl font-bold mb-2">Importar billetera</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Ingresa tu frase de recuperación de 12 o 24 palabras.
        </p>

        {(error || localError) && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mb-4 text-sm">
            {localError || error}
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-medium text-gray-300">Frase secreta</label>
            <button onClick={handlePaste} className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
              Pegar del portapapeles
            </button>
          </div>
          <textarea
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            placeholder="Ingresa tus 12 o 24 palabras separadas por espacios..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500 resize-none font-mono text-sm"
          />
          <p className={`text-xs mt-1 ${isValidWordCount ? 'text-green-400' : 'text-gray-500'}`}>
            {words.length} palabras detectadas (se requieren 12 o 24).
          </p>
        </div>

        <PasswordInput 
          label="Nueva Contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Contraseña para cifrar en este dispositivo"
          isValid={validation.valid}
        />
        <PasswordInput 
          label="Confirmar Contraseña" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          placeholder="Repite la contraseña"
          isValid={passwordsMatch}
        />

        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg mb-6 mt-2">
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
          onClick={handleImport}
          disabled={!isFormValid || isLoading}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Importando billetera...' : 'Importar Billetera'}
        </button>
      </div>
    </div>
  );
}
