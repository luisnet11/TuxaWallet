import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WalletOptionsModal from './components/WalletOptionsModal.jsx';

const FLOW_ROUTES = {
  create: '/create-wallet',
  import: '/import-wallet',
};

export default function Welcome() {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const [flow, setFlow] = useState('create');

  const openModal = (selectedFlow) => {
    setFlow(selectedFlow);
    modalRef.current?.showModal();
  };

  const handleSeedPhrase = () => {
    modalRef.current?.close();
    navigate(FLOW_ROUTES[flow]);
  };

  return (
    <div className="min-h-dvh overflow-hidden bg-base-100 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklch,var(--color-primary)_32%,transparent),_transparent_65%)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-14">
        <div className="flex items-center justify-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30">
            <svg
              viewBox="0 0 24 24"
              className="size-5 text-primary-content"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10v-6L12 2.5Z" />
              <path d="m8.75 12 2.25 2.25 4.25-4.5" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Tuxa<span className="text-secondary">Wallet</span>
          </span>
        </div>

        <section className="mt-12 text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance">
            Bienvenido a <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">TuxaWallet</span>
          </h1>
          <p className="mt-3 text-base text-base-content/65 text-pretty">
            Tu puerta de entrada a la red Tuxachain
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-3">
          <button type="button" className="btn btn-primary btn-lg btn-block shadow-lg shadow-primary/25" onClick={() => openModal('create')}>
            Crear una billetera nueva
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block btn-soft"
            onClick={() => openModal('import')}
          >
            Ya tengo una billetera
          </button>
        </div>

        <div className="relative mt-auto flex justify-center pt-8">
          <div className="pointer-events-none absolute bottom-6 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
          <img
            src="/images/tuxa-penguin.png"
            alt="Tux, la mascota pingüino poligonal de TuxaWallet"
            width={280}
            height={280}
            className="relative w-64 max-w-full select-none [mask-image:radial-gradient(circle,black_55%,transparent_72%)]"
            draggable={false}
          />
        </div>
      </main>

      <WalletOptionsModal ref={modalRef} flow={flow} onSelectSeedPhrase={handleSeedPhrase} />
    </div>
  );
}
