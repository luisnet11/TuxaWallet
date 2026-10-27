import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from './store/useWalletStore.js';
import { injectTuxaProvider } from './services/walletProvider.js';
import Welcome from './pages/Welcome/Welcome.jsx';
// import CreateWallet from './pages/CreateWallet/CreateWallet.jsx'; // Se añadirán después
// import ImportWallet from './pages/ImportWallet/ImportWallet.jsx'; // Se añadirán después
// import Dashboard from './pages/Dashboard/Dashboard.jsx'; // Se añadirán después

export default function App() {
  const { vaultBlob, isUnlocked } = useWalletStore();

  // Inyectar el provider al arrancar
  useEffect(() => {
    injectTuxaProvider();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta de Bienvenida (v0) */}
        <Route path="/welcome" element={<Welcome />} />
        
        {/* Rutas de Creación (v0 las generará pronto) */}
        {/* <Route path="/create-wallet" element={<CreateWallet />} /> */}
        {/* <Route path="/import-wallet" element={<ImportWallet />} /> */}
        
        {/* Ruta del Dashboard (v0 lo generará pronto) */}
        {/* <Route path="/dashboard" element={isUnlocked ? <Dashboard /> : <Navigate to="/welcome" />} /> */}

        {/* Ruta raíz: Redirigir según el estado */}
        <Route 
          path="*" 
          element={
            vaultBlob 
              ? <Navigate to="/welcome" replace /> // Si ya hay billetera, aquí iría el Desbloqueo
              : <Navigate to="/welcome" replace /> 
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
