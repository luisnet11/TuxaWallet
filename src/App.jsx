import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from './store/useWalletStore.js';
import { injectTuxaProvider } from './services/walletProvider.js';
import Welcome from './pages/Welcome/Welcome.jsx';
import CreateWallet from './pages/CreateWallet/CreateWallet.jsx';
import ImportWallet from './pages/ImportWallet/ImportWallet.jsx';
// import Dashboard from './pages/Dashboard/Dashboard.jsx'; // Pendiente

export default function App() {
  const { isUnlocked } = useWalletStore();

  useEffect(() => {
    injectTuxaProvider();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/create-wallet" element={<CreateWallet />} />
        <Route path="/import-wallet" element={<ImportWallet />} />
        {/* <Route path="/dashboard" element={isUnlocked ? <Dashboard /> : <Navigate to="/welcome" />} /> */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
