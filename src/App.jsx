import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from './store/useWalletStore.js';
import { injectTuxaProvider } from './services/walletProvider.js';

// Páginas
import Welcome from './pages/Welcome/Welcome.jsx';
import CreateWallet from './pages/CreateWallet/CreateWallet.jsx';
import ImportWallet from './pages/ImportWallet/ImportWallet.jsx';
import UnlockWallet from './pages/UnlockWallet/UnlockWallet.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import AddressBook from './pages/AddressBook/AddressBook.jsx'; // <-- NUEVO IMPORT

export default function App() {
  const { vaultBlob, isUnlocked } = useWalletStore();

  useEffect(() => {
    injectTuxaProvider();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/create-wallet" element={<CreateWallet />} />
        <Route path="/import-wallet" element={<ImportWallet />} />
        
        {/* Ruta de Desbloqueo */}
        <Route 
          path="/unlock" 
          element={vaultBlob ? <UnlockWallet /> : <Navigate to="/welcome" replace />} 
        />

        {/* Rutas Protegidas (Requieren sesión activa) */}
        <Route 
          path="/dashboard" 
          element={isUnlocked ? <Dashboard /> : <Navigate to="/unlock" replace />} 
        />
        <Route 
          path="/address-book" 
          element={isUnlocked ? <AddressBook /> : <Navigate to="/unlock" replace />} 
        />

        {/* Ruta Raíz: Redirección automática basada en el estado */}
        <Route 
          path="*" 
          element={
            !vaultBlob 
              ? <Navigate to="/welcome" replace /> 
              : (!isUnlocked ? <Navigate to="/unlock" replace /> : <Navigate to="/dashboard" replace />)
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
