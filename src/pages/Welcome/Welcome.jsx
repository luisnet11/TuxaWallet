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
          <img
            src="/logo.png"
            alt="Tuxachain Logo"
            className="h-12 w-auto object-contain select-none"
            draggable="false"
            loading="eager"
          />
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

        <div className="mt-auto pt-8">
          <img
            src="/mascot.png"
            alt="Tuxachain Mascot"
            className="w-64 h-64 mx-auto object-contain select-none"
            draggable="false"
            loading="eager"
          />
        </div>
      </main>

      <WalletOptionsModal ref={modalRef} flow={flow} onSelectSeedPhrase={handleSeedPhrase} />
    </div>
  );
}
