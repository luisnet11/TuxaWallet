import { useState } from 'react';
import { validatePasswordStrength } from '../../../vault/crypto.service.js';
import PasswordFields from './PasswordFields.jsx';
import ErrorAlert from './ErrorAlert.jsx';

const VALID_WORD_COUNTS = [12, 24];

const normalizeMnemonic = (raw) => raw.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');

export default function ImportWalletForm({ importExistingWallet, isLoading, storeError, onImported }) {
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState([]);

  const normalized = normalizeMnemonic(mnemonicInput);
  const wordCount = normalized ? normalized.split(' ').length : 0;
  const wordCountOk = VALID_WORD_COUNTS.includes(wordCount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (!wordCountOk) {
      setErrors([`La frase debe tener 12 o 24 palabras (detectadas: ${wordCount}).`]);
      return;
    }
    if (password !== confirmPassword) {
      setErrors(['Las contraseñas no coinciden.']);
      return;
    }
    const { valid, errors: strengthErrors } = validatePasswordStrength(password);
    if (!valid) {
      setErrors(strengthErrors);
      return;
    }
    if (typeof importExistingWallet !== 'function') {
      setErrors(['La importación aún no está disponible en esta versión.']);
      return;
    }

    try {
      await importExistingWallet(normalized, password);
      setMnemonicInput('');
      setPassword('');
      setConfirmPassword('');
      onImported();
    } catch (err) {
      setErrors([err?.message || 'No se pudo importar la billetera. Revisa tu frase.']);
    }
  };

  const shownErrors = errors.length > 0 ? errors : storeError ? [storeError] : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <fieldset className="fieldset">
        <label htmlFor="import-mnemonic" className="fieldset-legend">
          Frase de recuperación
        </label>
        <textarea
          id="import-mnemonic"
          className="textarea h-32 w-full resize-none bg-base-200 font-mono text-sm leading-relaxed"
          placeholder="Pega tus 12 o 24 palabras separadas por espacios"
          value={mnemonicInput}
          onChange={(e) => setMnemonicInput(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={isLoading}
        />
        <p className={`label ${wordCount === 0 ? '' : wordCountOk ? 'text-success' : 'text-warning'}`}>
          {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'} · se aceptan 12 o 24
        </p>
      </fieldset>

      <PasswordFields
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirmPassword}
        passwordLabel="Nueva contraseña"
        disabled={isLoading}
      />

      <ErrorAlert messages={shownErrors} />

      <button
        type="submit"
        className="btn btn-primary btn-lg btn-block"
        disabled={isLoading || !mnemonicInput || !password || !confirmPassword}
      >
        {isLoading && <span className="loading loading-spinner" aria-hidden="true" />}
        {isLoading ? 'Importando…' : 'Importar Billetera'}
      </button>
    </form>
  );
}
