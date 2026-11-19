import { useApprovalStore } from '../store/useApprovalStore.js';

/** Confirmación obligatoria para conectar, firmar y enviar desde una DApp. Montar una vez en App. */
export default function ApprovalModal() {
  const pending = useApprovalStore((s) => s.pending);
  const settle = useApprovalStore((s) => s.settle);
  if (!pending) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]" role="dialog" aria-modal="true">
      <div className="bg-gray-900 border border-purple-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-1 text-center">{pending.title}</h2>
        <p className="text-xs text-gray-400 text-center mb-4 break-all">{pending.origin}</p>
        <div className="bg-gray-950 rounded-xl p-3 mb-5 space-y-1 text-xs font-mono text-gray-200 break-all max-h-48 overflow-y-auto">
          {pending.lines.map(([k, v]) => (
            <p key={k}><span className="text-gray-500">{k}: </span>{v}</p>
          ))}
        </div>
        <div className="flex space-x-2">
          <button onClick={() => settle(false)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl text-sm font-bold">
            Rechazar
          </button>
          <button onClick={() => settle(true)} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-sm font-bold">
            Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}
