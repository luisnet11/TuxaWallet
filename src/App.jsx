import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from './store/useWalletStore.js';
import { injectTuxaProvider } from './services/walletProvider.js';
import Welcome from './pages/Welcome/Welcome.jsx';
import CreateWallet from './pages/CreateWallet/CreateWallet.jsx';
import ImportWallet from './pages/ImportWallet/ImportWallet.jsx';
import UnlockWallet from './pages/UnlockWallet/UnlockWallet.jsx';
// import Dashboard from './pages/Dashboard/Dashboard.jsx'; // Pendiente

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
        
        {/* Ruta de Desbloqueo (si hay billetera pero está cerrada) */}
        <Route 
          path="/unlock" 
          element={vaultBlob ? <UnlockWallet /> : <Navigate to="/welcome" replace />} 
        />

        {/* Ruta del Dashboard (Próximamente) */}
        {/* <Route path="/dashboard" element={isUnlocked ? <Dashboard /> : <Navigate to="/unlock" replace />} /> */}

        {/* Ruta Raíz: Redirección automática basada en el estado */}
        <Route 
          path="*" 
          element={
            !vaultBlob 
              ? <Navigate to="/welcome" replace /> 
              : (!isUnlocked ? <Navigate to="/unlock" replace /> : <Navigate to="/welcome" replace />) // Temporal hasta que exista el Dashboard
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
