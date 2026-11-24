import { useState } from 'react';
import { X, Check } from 'lucide-react';

const TYPES = [
  { id: 'all', label: 'Todas' },
  { id: 'send', label: 'Enviar' },
  { id: 'receive', label: 'Recibir' },
  { id: 'swap', label: 'Swap' },
  { id: 'bridge', label: 'Puente' },
  { id: 'approve', label: 'Aprobado' },
];

const STATUSES = [
  { id: 'all', label: 'Todos' },
  { id: 'ok', label: 'Confirmado / Completado' },
  { id: 'error', label: 'Fallido' },
];

export default function FilterModal({ isOpen, onClose, currentFilters, onApply }) {
  const [type, setType] = useState(currentFilters.type || 'all');
  const [status, setStatus] = useState(currentFilters.status || 'all');

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({ type, status });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-end md:justify-center items-center z-[80]"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl md:rounded-3xl p-6 shadow-2xl border-t md:border border-white/10 relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 md:hidden"></div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Filtrar Actividad</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* FILTRO POR TIPO */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Tipo de Operación</h3>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex items-center space-x-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  type === t.id 
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-400' 
                    : 'bg-gray-950 border-white/10 text-gray-400 hover:bg-gray-800'
                }`}
              >
                <span>{t.label}</span>
                {type === t.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* FILTRO POR ESTADO */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Estado de la Transacción</h3>
          <div className="flex flex-col space-y-2">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
                  status === s.id 
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-400' 
                    : 'bg-gray-950 border-white/10 text-gray-400 hover:bg-gray-800'
                }`}
              >
                <span>{s.label}</span>
                {status === s.id && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleApply}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
            }
