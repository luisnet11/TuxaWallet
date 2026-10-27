import { useState, useEffect } from 'react';
import { useWalletStore } from './store/useWalletStore.js';
import { validatePasswordStrength } from './vault/crypto.service.js';
import { injectTuxaProvider } from './services/walletProvider.js';

const styles = {
  container: { padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 },
  card: { border: '1px solid #ccc', borderRadius: '8px', padding: '15px', marginBottom: '15px', background: '#fafafa' },
  input: { width: '100%', padding: '8px', margin: '8px 0', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' },
  button: { padding: '10px 15px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', marginTop: '5px' },
  buttonDanger: { padding: '10px 15px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' },
  buttonBlue: { padding: '10px 15px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' },
  error: { color: 'red', fontSize: '0.9em', marginTop: '5px' },
  mnemonicBox: { background: '#fff3cd', border: '1px solid #ffeeba', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', wordSpacing: '4px' }
};

export default function App() {
  const {
    isUnlocked, vaultBlob, activeAccount, isLoading, error,
    createWallet, unlockExistingWallet, lockWallet, addNewAccount,
    fetchActiveAccountBalance, clearError
  } = useWalletStore();

  const [password, setPassword] = useState('');
  const [newMnemonic, setNewMnemonic] = useState(null);
  const [balance, setBalance] = useState(null);
  const [localError, setLocalError] = useState('');
  const [dappResult, setDappResult] = useState('');

  // Inyectar el provider al arrancar la app (simula una extensión de navegador)
  useEffect(() => {
    injectTuxaProvider();
  }, []);

  const handleCreate = async () => {
    setLocalError('');
    setBalance(null);
    const check = validatePasswordStrength(password);
    if (!check.valid) {
      setLocalError(check.errors.join(' '));
      return;
    }
    try {
      const mnemonic = await createWallet(password);
      setNewMnemonic(mnemonic);
      setPassword('');
    } catch (err) { console.error(err); }
  };

  const handleUnlock = async () => {
    setLocalError('');
    setBalance(null);
    try {
      await unlockExistingWallet(password);
      setPassword('');
    } catch (err) { console.error(err); }
  };

  const handleLock = () => {
    lockWallet();
    setNewMnemonic(null);
    setBalance(null);
    setDappResult('');
  };

  // --- SIMULADOR DE DAPP ---
  const simulateDappConnect = async () => {
    setDappResult('Conectando...');
    try {
      // Simula lo que haría una DApp: window.ethereum.request
      const accounts = await window.tuxachain.request({ method: 'eth_requestAccounts' });
      setDappResult(`DApp conectada con éxito. Cuentas: ${accounts.join(', ')}`);
    } catch (err) {
      setDappResult(`Error DApp: ${err.message}`);
    }
  };

  const simulateDappSign = async () => {
    setDappResult('Firmando mensaje...');
    try {
      const msg = "Hola desde la DApp de prueba";
      const accounts = await window.tuxachain.request({ method: 'eth_requestAccounts' });
      const sig = await window.tuxachain.request({ 
        method: 'personal_sign', 
        params: [msg, accounts[0]] 
      });
      setDappResult(`Firma exitosa: ${sig.slice(0, 30)}...`);
    } catch (err) {
      setDappResult(`Error DApp: ${err.message}`);
    }
  };

  return (
    <div style={styles.container}>
      <h1>TuxaWallet — Pruebas</h1>

      {(error || localError) && (
        <div style={styles.error}>
          <strong>Error:</strong> {localError || error}
          <button onClick={() => { clearError(); setLocalError(''); }} style={{ marginLeft: '10px' }}>X</button>
        </div>
      )}

      {isLoading && (
        <div style={styles.card}>
          <p>⏳ Derivando claves (PBKDF2 600k iteraciones)... Por favor espera.</p>
        </div>
      )}

      {!isUnlocked && !isLoading && (
        <div style={styles.card}>
          <h2>{vaultBlob ? 'Desbloquear Billetera' : 'Crear Nueva Billetera'}</h2>
          <p style={{ fontSize: '0.8em', color: '#666' }}>
            Contraseña requerida: min 12 caracteres, mayúscula, minúscula, número y símbolo.
          </p>
          <input
            type="password"
            placeholder="Contraseña maestra"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          {vaultBlob ? (
            <button style={styles.button} onClick={handleUnlock}>Desbloquear</button>
          ) : (
            <button style={styles.button} onClick={handleCreate}>Crear Billetera</button>
          )}
        </div>
      )}

      {isUnlocked && !isLoading && (
        <>
          {newMnemonic && (
            <div style={styles.card}>
              <h3 style={{ color: 'red' }}>⚠️ Anota estas 24 palabras</h3>
              <div style={styles.mnemonicBox}>{newMnemonic}</div>
              <button style={{ ...styles.button, background: '#555', marginTop: '10px' }} onClick={() => setNewMnemonic(null)}>
                Ya las he guardado
              </button>
            </div>
          )}

          <div style={styles.card}>
            <h2>Cuenta Activa (Índice: {activeAccount?.index})</h2>
            <p><strong>Dirección:</strong> <br/><code style={{ wordBreak: 'break-all' }}>{activeAccount?.address}</code></p>
            
            <div style={{ marginTop: '10px', padding: '10px', background: '#eef', borderRadius: '4px' }}>
              <strong>Saldo en Tuxachain:</strong> <br/>
              {balance !== null ? (
                <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{balance} ETH</span>
              ) : (
                <span>---</span>
              )}
              <br/>
              <button style={styles.button} onClick={async () => {
                setBalance('Consultando...');
                const bal = await fetchActiveAccountBalance();
                setBalance(bal);
              }}>Consultar Saldo en Red</button>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Cuentas Derivadas</h3>
            <ul>
              {vaultBlob?.accounts.map((acc) => (
                <li key={acc.index} style={{ marginBottom: '5px' }}>
                  Cuenta {acc.index}: {acc.address.slice(0, 8)}...{acc.address.slice(-6)}
                </li>
              ))}
            </ul>
            <button style={styles.button} onClick={addNewAccount}>+ Añadir Nueva Cuenta</button>
          </div>

          {/* SIMULADOR DE DAPP */}
          <div style={{...styles.card, borderColor: '#1976d2', background: '#e3f2fd'}}>
            <h3 style={{ color: '#1976d2', marginTop: 0 }}>🔌 Simulador de DApp (EIP-1193)</h3>
            <p style={{ fontSize: '0.9em' }}>Prueba cómo una DApp externa interactúa con TuxaWallet.</p>
            
            <div style={{ marginBottom: '10px' }}>
              <button style={styles.buttonBlue} onClick={simulateDappConnect}>Simular Conexión DApp</button>
              <button style={styles.buttonBlue} onClick={simulateDappSign}>Simular Firma de Mensaje</button>
            </div>

            {dappResult && (
              <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #90caf9', wordBreak: 'break-all', fontSize: '0.9em' }}>
                <strong>Respuesta del Provider:</strong><br/>
                {dappResult}
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px' }}>
            <button style={styles.buttonDanger} onClick={handleLock}>Bloquear Billetera</button>
          </div>
        </>
      )}
    </div>
  );
}
