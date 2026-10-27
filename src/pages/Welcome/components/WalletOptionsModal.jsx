import { forwardRef } from 'react';
import OptionCard from './OptionCard.jsx';

const COPY = {
  create: {
    title: 'Crear una billetera',
    description: 'Elige cómo quieres generar y proteger tu nueva billetera.',
    seedHint: 'Genera 24 palabras que solo tú conocerás.',
  },
  import: {
    title: 'Importar una billetera',
    description: 'Elige cómo quieres recuperar el acceso a tu billetera.',
    seedHint: 'Usa tus 12 o 24 palabras de recuperación.',
  },
};

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6" />
    </svg>
  );
}

const WalletOptionsModal = forwardRef(function WalletOptionsModal({ flow, onSelectSeedPhrase }, ref) {
  const copy = COPY[flow];

  return (
    <dialog ref={ref} className="modal modal-bottom sm:modal-middle" aria-labelledby="wallet-options-title">
      <div className="modal-box mx-auto w-full max-w-md border border-base-300 bg-base-200 p-0 shadow-2xl shadow-black/50">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-base-content/20 sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-4 px-6 pt-5 sm:pt-6">
          <div>
            <h2 id="wallet-options-title" className="text-xl font-semibold tracking-tight">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-base-content/60 text-pretty">{copy.description}</p>
          </div>
          <form method="dialog">
            <button type="submit" className="btn btn-circle btn-ghost btn-sm" aria-label="Cerrar">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-3 px-6 pt-5 pb-8 sm:pb-6">
          <OptionCard
            icon={<KeyIcon />}
            title="Por frase secreta de recuperación"
            description={copy.seedHint}
            onClick={onSelectSeedPhrase}
          />
          <OptionCard
            icon={<UsersIcon />}
            title="Por red social / MPC"
            description="Accede sin frase usando cómputo multiparte."
            badge="Próximamente"
            disabled
          />
        </div>
      </div>

      <form method="dialog" className="modal-backdrop bg-black/60 backdrop-blur-sm">
        <button type="submit">Cerrar</button>
      </form>
    </dialog>
  );
});

export default WalletOptionsModal;
