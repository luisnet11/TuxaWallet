import { useState } from 'react';
import { useWalletStore } from '../../store/useWalletStore.js';
import BrandHeader from './components/BrandHeader.jsx';
import CreateWalletForm from './components/CreateWalletForm.jsx';
import ImportWalletForm from './components/ImportWalletForm.jsx';
import MnemonicDisplay from './components/MnemonicDisplay.jsx';

const TABS = [
  { id: 'create', label: 'Crear Nueva Billetera' },
  { id: 'import', label: 'Importar Billetera' },
];

export default function Onboarding({ onComplete = () => {} }) {
  const createWallet = useWalletStore((s) => s.createWallet);
  const importExistingWallet = useWalletStore((s) => s.importExistingWallet);
  const isLoading = useWalletStore((s) => s.isLoading);
  const storeError = useWalletStore((s) => s.error);
  const clearError = useWalletStore((s) => s.clearError);

  const [activeTab, setActiveTab] = useState('create');
  const [createdMnemonic, setCreatedMnemonic] = useState(null);

  const switchTab = (tabId) => {
    if (isLoading || tabId === activeTab) return;
    clearError?.();
    setActiveTab(tabId);
  };

  const handleContinue = () => {
    setCreatedMnemonic(null);
    onComplete();
  };

  return (
    <div className="min-h-dvh bg-base-100 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklch,var(--color-primary)_28%,transparent),_transparent_60%)]">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
        <BrandHeader />

        <div className="card border border-base-300 bg-base-100/80 shadow-xl shadow-black/30 backdrop-blur">
          <div className="card-body gap-6 p-5">
            {createdMnemonic ? (
              <MnemonicDisplay mnemonic={createdMnemonic} onContinue={handleContinue} />
            ) : (
              <>
                <div role="tablist" aria-label="Modo de configuración" className="tabs tabs-box grid grid-cols-2 bg-base-200">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`tab-${tab.id}`}
                      aria-selected={activeTab === tab.id}
                      aria-controls={`panel-${tab.id}`}
                      className={`tab h-11 text-xs font-medium sm:text-sm ${activeTab === tab.id ? 'tab-active' : ''}`}
                      onClick={() => switchTab(tab.id)}
                      disabled={isLoading}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                  {activeTab === 'create' ? (
                    <CreateWalletForm
                      createWallet={createWallet}
                      isLoading={isLoading}
                      storeError={storeError}
                      onCreated={setCreatedMnemonic}
                    />
                  ) : (
                    <ImportWalletForm
                      importExistingWallet={importExistingWallet}
                      isLoading={isLoading}
                      storeError={storeError}
                      onImported={onComplete}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-base-content/45 text-pretty">
          Tus llaves se cifran localmente. TuxaWallet nunca envía tu frase de recuperación a ningún servidor.
        </p>
      </main>
    </div>
  );
}
