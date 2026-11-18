import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useWalletStore } from './store/useWalletStore.js';
import { injectTuxaProvider } from './services/walletProvider.js';
import useAutoLock from './hooks/useAutoLock.js';

// Páginas
import Welcome from './pages/Welcome/Welcome.jsx';
import CreateWallet from './pages/CreateWallet/CreateWallet.jsx';
import ImportWallet from './pages/ImportWallet/ImportWallet.jsx';
import UnlockWallet from './pages/UnlockWallet/UnlockWallet.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import AddressBook from './pages/AddressBook/AddressBook.jsx';
import Send from './pages/Send/Send.jsx';
import Assets from './pages/Assets/Assets.jsx';

function ProtectedRoute({ children }) {
  const { isUnlocked } = useWalletStore();
  const location = useLocation();

  if (!isUnlocked) {
    return <Navigate to="/unlock" state={{ from: location }} replace />;
  }
  return children;
}

// Componente interno que SÍ tiene acceso al Router
function AppContent() {
  const { vaultBlob, isUnlocked } = useWalletStore();

  // Hook de auto-bloqueo ahora está DENTRO del Router
  useAutoLock(5);

  return (
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

      {/* Rutas Protegidas */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/address-book" element={<ProtectedRoute><AddressBook /></ProtectedRoute>} />
      <Route path="/send" element={<ProtectedRoute><Send /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />

      {/* Ruta Raíz y Catch-all */}
      <Route 
        path="*" 
        element={
          !vaultBlob 
            ? <Navigate to="/welcome" replace /> 
            : (!isUnlocked ? <Navigate to="/unlock" replace /> : <Navigate to="/dashboard" replace />)
        } 
      />
    </Routes>
  );
}

export default function App() {
  // Inyectamos el provider al arrancar
  useEffect(() => {
    injectTuxaProvider();
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
