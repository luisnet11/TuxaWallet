import { useState } from 'react';
import { validatePasswordStrength } from '../../../vault/crypto.service.js';
import PasswordFields from './PasswordFields.jsx';
import ErrorAlert from './ErrorAlert.jsx';

export default function CreateWalletForm({ createWallet, isLoading, storeError, onCreated }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (password !== confirmPassword) {
      setErrors(['Las contraseñas no coinciden.']);
      return;
    }
    const { valid, errors: strengthErrors } = validatePasswordStrength(password);
    if (!valid) {
      setErrors(strengthErrors);
      return;
    }

    try {
      const mnemonic = await createWallet(password);
      setPassword('');
      setConfirmPassword('');
      onCreated(mnemonic);
    } catch (err) {
      setErrors([err?.message || 'No se pudo crear la billetera.']);
    }
  };

  const shownErrors = errors.length > 0 ? errors : storeError ? [storeError] : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <p className="text-sm text-base-content/70 leading-relaxed">
        Crea una contraseña para cifrar tu billetera en este dispositivo. La necesitarás cada vez que
        la desbloquees.
      </p>

      <PasswordFields
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirmPassword}
        disabled={isLoading}
      />

      <ErrorAlert messages={shownErrors} />

      <button
        type="submit"
        className="btn btn-primary btn-lg btn-block"
        disabled={isLoading || !password || !confirmPassword}
      >
        {isLoading && <span className="loading loading-spinner" aria-hidden="true" />}
        {isLoading ? 'Creando billetera…' : 'Crear Billetera'}
      </button>
    </form>
  );
}
