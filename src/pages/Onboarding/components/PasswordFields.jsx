import { useId } from 'react';

const REQUIREMENTS = [
  { label: 'Mínimo 12 caracteres', test: (p) => p.length >= 12 },
  { label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p) => /[0-9]/.test(p) },
  { label: 'Un símbolo especial', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  passwordLabel = 'Contraseña',
  disabled = false,
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="fieldset">
        <label htmlFor={`${id}-pw`} className="fieldset-legend">
          {passwordLabel}
        </label>
        <input
          id={`${id}-pw`}
          type="password"
          className="input input-lg w-full bg-base-200"
          placeholder="••••••••••••"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          aria-describedby={hintId}
          disabled={disabled}
        />
      </fieldset>

      <fieldset className="fieldset">
        <label htmlFor={`${id}-confirm`} className="fieldset-legend">
          Confirmar contraseña
        </label>
        <input
          id={`${id}-confirm`}
          type="password"
          className={`input input-lg w-full bg-base-200 ${mismatch ? 'input-error' : ''}`}
          placeholder="••••••••••••"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          aria-invalid={mismatch}
          disabled={disabled}
        />
        {mismatch && <p className="label text-error">Las contraseñas no coinciden.</p>}
      </fieldset>

      <ul id={hintId} className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-box bg-base-200/60 p-3 text-xs">
        {REQUIREMENTS.map(({ label, test }) => {
          const ok = test(password);
          return (
            <li
              key={label}
              className={`flex items-center gap-1.5 ${ok ? 'text-success' : 'text-base-content/55'}`}
            >
              <span aria-hidden="true">{ok ? '✓' : '○'}</span>
              <span>{label}</span>
              <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
