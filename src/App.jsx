/**
 * ============================================================================
 *  TUXAWALLET — Panel de Pruebas End-to-End (TEMPORAL)
 * ============================================================================
 *  Archivo:   src/App.jsx
 *  Propósito: Validar el flujo completo de la billetera (crear, bloquear,
 *             desbloquear, derivar cuentas, consultar saldo) antes de que
 *             el chat de UI traiga el diseño definitivo.
 *
 *  ⚠️ ESTILOS INLINE BÁSICOS: No usar Tailwind ni daisyUI aquí. Solo
 *     lo mínimo para probar la lógica.
 * ============================================================================
 */

import { useState } from 'react';
import { useWalletStore } from './store/useWalletStore.js';
import { validatePasswordStrength } from './vault/crypto.service.js';

const styles = {
  container: { padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 },
  card: { border: '1px solid #ccc', borderRadius: '8px', padding: '15px', marginBottom: '15px', background: '#fafafa' },
  input: { width: '100%', padding: '8px', margin: '8px 0', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' },
  button: { padding: '10px 15px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', marginTop: '5px' },
  buttonDanger: { padding: '10px 15px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' },
  error: { color: 'red', fontSize: '0.9em', marginTop: '5px' },
  success: { color: 'green', fontWeight: 'bold' },
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

  // --- MANEJADORES ---

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
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlock = async () => {
    setLocalError('');
    setBalance(null);
    try {
      await unlockExistingWallet(password);
      setPassword('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLock = () => {
    lockWallet();
    setNewMnemonic(null);
    setBalance(null);
  };

  const handleAddAccount = () => {
    addNewAccount();
    setBalance(null);
  };

  const handleFetchBalance = async () => {
    setLocalError('');
    setBalance('Consultando RPC...');
    try {
      const bal = await fetchActiveAccountBalance();
      setBalance(bal);
    } catch (err) {
      setBalance('Error al consultar');
    }
  };

  // --- RENDERIZADO ---

  return (
    <div style={styles.container}>
      <h1>TuxaWallet — Pruebas End-to-End</h1>

      {/* Mostrar errores del store o locales */}
      {(error || localError) && (
        <div style={styles.error}>
          <strong>Error:</strong> {localError || error}
          <button onClick={() => { clearError(); setLocalError(''); }} style={{ marginLeft: '10px' }}>X</button>
        </div>
      )}

      {/* --- ESTADO 1: CARGANDO --- */}
      {isLoading && (
        <div style={styles.card}>
          <p>⏳ Derivando claves (PBKDF2 600k iteraciones)... Por favor espera.</p>
        </div>
      )}

      {/* --- ESTADO 2: BLOQUEADO --- */}
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

      {/* --- ESTADO 3: DESBLOQUEADO --- */}
      {isUnlocked && !isLoading && (
        <>
          {/* Alerta de respaldo de semilla (solo al crear) */}
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
              <button style={styles.button} onClick={handleFetchBalance}>Consultar Saldo en Red</button>
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
            <button style={styles.button} onClick={handleAddAccount}>+ Añadir Nueva Cuenta</button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button style={styles.buttonDanger} onClick={handleLock}>Bloquear Billetera</button>
          </div>
        </>
      )}
    </div>
  );
          }
