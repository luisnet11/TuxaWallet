import { useState, useEffect } from 'react';
import { useWalletStore } from './store/useWalletStore.js';
import { validatePasswordStrength } from './vault/crypto.service.js';
import { injectTuxaProvider } from './services/walletProvider.js';
import Onboarding from './pages/Onboarding/Onboarding.jsx';

const styles = {
  container: { padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 },
  card: { border: '1px solid #ccc', borderRadius: '8px', padding: '15px', marginBottom: '15px', background: '#fafafa' },
  input: { width: '100%', padding: '8px', margin: '8px 0', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' },
  button: { padding: '10px 15px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', marginTop: '5px' },
  buttonDanger: { padding: '10px 15px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' },
  buttonBlue: { padding: '10px 15px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' },
  buttonGreen: { padding: '10px 15px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' },
  error: { color: 'red', fontSize: '0.9em', marginTop: '5px' },
  mnemonicBox: { background: '#fff3cd', border: '1px solid #ffeeba', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', wordSpacing: '4px' },
  codeBox: { background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', wordBreak: 'break-all', fontSize: '0.85em', marginTop: '10px' }
};

export default function App() {
  const hasVault = useWalletStore((s) => Boolean(s.vaultBlob));
  const [onboardingDone, setOnboardingDone] = useState(hasVault);

  if (!onboardingDone) {
    return <Onboarding onComplete={() => setOnboardingDone(true)} />;
  }
  return <WalletDebugPanel />;
}

function WalletDebugPanel() {
  const {
    isUnlocked, vaultBlob, activeAccount, isLoading, error, trackedTokens,
    createWallet, unlockExistingWallet, lockWallet, addNewAccount, setActiveAccount,
    fetchActiveAccountBalance, sendNativeTransaction, addTrackedToken, fetchERC20Balance, sendERC20Token, clearError
  } = useWalletStore();

  const [password, setPassword] = useState('');
  const [newMnemonic, setNewMnemonic] = useState(null);
  const [balance, setBalance] = useState(null);
  const [localError, setLocalError] = useState('');
  
  // Estados para Tokens
  const [importTokenAddr, setImportTokenAddr] = useState('');
  const [tokenBalances, setTokenBalances] = useState({}); // { "0x...": "100.5" }
  const [tokenToSend, setTokenToSend] = useState('');
  const [tokenSendTo, setTokenSendTo] = useState('');
  const [tokenSendAmount, setTokenSendAmount] = useState('');
  const [txResult, setTxResult] = useState(null);

  useEffect(() => { injectTuxaProvider(); }, []);

  // ... (handleCreate, handleUnlock, handleLock se mantienen de tu versión anterior)
  const handleCreate = async () => {
    setLocalError(''); const check = validatePasswordStrength(password);
    if (!check.valid) return setLocalError(check.errors.join(' '));
    try { const m = await createWallet(password); setNewMnemonic(m); setPassword(''); } catch (err) { console.error(err); }
  };
  const handleUnlock = async () => {
    setLocalError(''); try { await unlockExistingWallet(password); setPassword(''); } catch (err) { console.error(err); }
  };
  const handleLock = () => { lockWallet(); setNewMnemonic(null); setBalance(null); setTxResult(null); setTokenBalances({}); };

  // --- LÓGICA DE TOKENS ---
  const handleImportToken = async () => {
    if (!importTokenAddr) return;
    try {
      const token = await addTrackedToken(importTokenAddr);
      alert(`Token importado: ${token.name} (${token.symbol}) con ${token.decimals} decimales.`);
      setImportTokenAddr('');
    } catch (err) { setLocalError(err.message); }
  };

  const handleCheckTokenBalance = async (addr) => {
    setTokenBalances(prev => ({ ...prev, [addr]: 'Consultando...' }));
    const bal = await fetchERC20Balance(addr);
    setTokenBalances(prev => ({ ...prev, [addr]: bal }));
  };

  const handleSendToken = async (dryRun) => {
    setTxResult(null); setLocalError('');
    if (!tokenToSend || !tokenSendTo || !tokenSendAmount) return setLocalError('Llena todos los campos del token.');
    try {
      const res = await sendERC20Token(tokenToSend, tokenSendTo, tokenSendAmount, dryRun);
      setTxResult(res);
    } catch (err) {
      setTxResult({ success: false, message: err.message });
    }
  };

  const handleSendNative = async (dryRun) => {
    setTxResult(null); setLocalError('');
    if (!tokenSendTo || !tokenSendAmount) return setLocalError('Ingresa dirección y monto.');
    try {
      const res = await sendNativeTransaction(tokenSendTo, tokenSendAmount, dryRun);
      setTxResult(res);
    } catch (err) { setTxResult({ success: false, message: err.message }); }
  };

  return (
    <div style={styles.container}>
      <h1>TuxaWallet — Pruebas (Tokens ERC-20)</h1>

      {(error || localError) && (
        <div style={styles.error}><strong>Error:</strong> {localError || error}<button onClick={() => { clearError(); setLocalError(''); }} style={{ marginLeft: '10px' }}>X</button></div>
      )}

      {isLoading && <div style={styles.card}><p>⏳ Procesando... espera.</p></div>}

      {!isUnlocked && !isLoading && (
        <div style={styles.card}>
          <h2>{vaultBlob ? 'Desbloquear Billetera' : 'Crear Nueva Billetera'}</h2>
          <input type="password" placeholder="Contraseña maestra" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
          {vaultBlob ? <button style={styles.button} onClick={handleUnlock}>Desbloquear</button> : <button style={styles.button} onClick={handleCreate}>Crear Billetera</button>}
        </div>
      )}

      {isUnlocked && !isLoading && (
        <>
          {newMnemonic && (
            <div style={styles.card}>
              <h3 style={{ color: 'red' }}>⚠️ Anota estas 24 palabras</h3>
              <div style={styles.mnemonicBox}>{newMnemonic}</div>
              <button style={{ ...styles.button, background: '#555' }} onClick={() => setNewMnemonic(null)}>Ya las guardé</button>
            </div>
          )}

          <div style={styles.card}>
            <h2>Cuenta Activa (Índice: {activeAccount?.index})</h2>
            <p><strong>Dirección:</strong> <br/><code style={{ wordBreak: 'break-all' }}>{activeAccount?.address}</code></p>
            <div style={{ marginTop: '10px', padding: '10px', background: '#eef', borderRadius: '4px' }}>
              <strong>Saldo ETH:</strong> {balance !== null ? <span>{balance} ETH</span> : <span>---</span>}
              <br/><button style={styles.button} onClick={async () => { setBalance('...'); setBalance(await fetchActiveAccountBalance()); }}>Consultar Saldo ETH</button>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Cuentas Derivadas</h3>
            <ul>{vaultBlob?.accounts.map((acc) => <li key={acc.index}>Cuenta {acc.index}: {acc.address.slice(0, 8)}...{acc.address.slice(-6)} <button onClick={() => setActiveAccount(acc.index)}>Activar</button></li>)}</ul>
            <button style={styles.button} onClick={addNewAccount}>+ Añadir Cuenta</button>
          </div>

          {/* --- TARJETA TOKENS ERC-20 --- */}
          <div style={{...styles.card, borderColor: '#f57c00', background: '#fff3e0'}}>
            <h3 style={{ color: '#f57c00', marginTop: 0 }}>🪙 Tokens ERC-20 (Auto-Decimales)</h3>
            <p style={{ fontSize: '0.85em', color: '#555' }}>Pega la dirección de contrato de un token (ej. USDC, WNEAR) para detectar sus decimales automáticamente.</p>
            
            <input type="text" placeholder="Dirección del contrato del token (0x...)" value={importTokenAddr} onChange={(e) => setImportTokenAddr(e.target.value)} style={styles.input} />
            <button style={{ ...styles.button, background: '#f57c00' }} onClick={handleImportToken}>Importar Token</button>

            <ul style={{ marginTop: '15px' }}>
              {trackedTokens.map(t => (
                <li key={t.address} style={{ marginBottom: '10px', background: '#fff', padding: '10px', borderRadius: '4px' }}>
                  <strong>{t.symbol}</strong> ({t.name}) - {t.decimals} decimales<br/>
                  <code style={{ fontSize: '0.8em' }}>{t.address}</code><br/>
                  <span>Balance: <strong>{tokenBalances[t.address] || '---'}</strong></span>
                  <button style={{ marginLeft: '10px' }} onClick={() => handleCheckTokenBalance(t.address)}>Consultar</button>
                  <button style={{ marginLeft: '5px', background: '#1976d2', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '4px' }} onClick={() => setTokenToSend(t.address)}>Seleccionar para Enviar</button>
                </li>
              ))}
            </ul>
          </div>

          {/* --- TARJETA ENVÍO --- */}
          <div style={{...styles.card, borderColor: '#2e7d32', background: '#f1f8e9'}}>
            <h3 style={{ color: '#2e7d32', marginTop: 0 }}>💸 Enviar Activos</h3>
            
            <input type="text" placeholder="Dirección destino (0x...)" value={tokenSendTo} onChange={(e) => setTokenSendTo(e.target.value)} style={styles.input} />
            <input type="number" placeholder="Monto (ej: 0.1)" value={tokenSendAmount} onChange={(e) => setTokenSendAmount(e.target.value)} style={styles.input} />
            
            <div style={{ marginBottom: '10px' }}>
              <button style={styles.buttonGreen} onClick={() => handleSendNative(true)}>Probar ETH (Dry Run)</button>
              <button style={styles.buttonGreen} onClick={() => handleSendNative(false)}>Enviar ETH (Real)</button>
            </div>

            <div style={{ padding: '10px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}>
              <strong>Envío de Token Seleccionado:</strong> {tokenToSend || '(Ninguno)'}<br/>
              <button style={{ ...styles.buttonBlue, marginTop: '10px' }} onClick={() => handleSendToken(true)}>Probar Token (Dry Run)</button>
              <button style={{ ...styles.buttonBlue, marginTop: '10px' }} onClick={() => handleSendToken(false)}>Enviar Token (Real)</button>
            </div>

            {txResult && <div style={styles.codeBox}><strong>{txResult.success ? '✅ ' : '❌ '}</strong>{txResult.message}{txResult.hash && <p>Hash: {txResult.hash}</p>}</div>}
          </div>

          <div style={{ marginTop: '20px' }}><button style={styles.buttonDanger} onClick={handleLock}>Bloquear Billetera</button></div>
        </>
      )}
    </div>
  );
}
