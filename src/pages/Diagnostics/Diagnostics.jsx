import { useState } from 'react';
import { useWalletStore } from '../../store/useWalletStore.js';

export default function Diagnostics() {
  const { activeAccount } = useWalletStore();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);
    
    const RPC = 'https://0x4e4542e3.rpc.aurora-cloud.dev';
    const ADDRESS = manualAddress || activeAccount?.address; 
    const WNEAR_ADDRESS = '0xc42c30ac6cc15fac9bd938618bcaa1a1fae8501d';

    const call = async (payload) => {
      try {
        const res = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const text = await res.text();
        let json; try { json = JSON.parse(text); } catch { json = text.slice(0, 160); }
        return { status: res.status, json };
      } catch (e) {
        return { status: 'RED/CORS', json: String(e) };
      }
    };

    const newResults = [];

    if (ADDRESS) {
      newResults.push({ prueba: 'Dirección Usada', status: 'OK', resultado: ADDRESS });
      
      // Prueba Nativa
      const bal = await call({ jsonrpc: '2.0', id: 2, method: 'eth_getBalance', params: [ADDRESS, 'latest'] });
      newResults.push({ prueba: 'Balance Nativo (ETH)', status: bal.status, resultado: bal.json?.result || 'Error' });

      // Prueba de wNEAR usando eth_call (balanceOf)
      // data = 0x70a08231 + address sin 0x
      const data = `0x70a08231000000000000000000000000${ADDRESS.slice(2)}`;
      const tokenBal = await call({ jsonrpc: '2.0', id: 4, method: 'eth_call', params: [{ to: WNEAR_ADDRESS, data }, 'latest'] });
      newResults.push({ prueba: 'wNEAR balanceOf (eth_call)', status: tokenBal.status, resultado: tokenBal.json?.result || JSON.stringify(tokenBal.json) });
    } else {
      newResults.push({ prueba: 'ALERTA', status: 'ERROR', resultado: 'No hay dirección activa ni manual.' });
    }

    setResults(newResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-xl font-bold mb-4">Diagnóstico RPC Tuxachain</h1>
      
      <div className="mb-4">
        <label className="text-xs text-gray-400 block mb-1">Dirección a probar:</label>
        <input 
          type="text" 
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          placeholder="0x..."
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm font-mono"
        />
      </div>

      <button 
        onClick={runDiagnostics} 
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl mb-6"
      >
        {loading ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
      </button>

      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className="bg-gray-900 p-3 rounded-lg border border-white/10 text-sm">
            <p className="font-bold text-purple-400">{r.prueba}</p>
            <p className="text-xs text-gray-400">Status: {r.status}</p>
            <p className="font-mono text-xs break-all mt-1">{r.resultado}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
