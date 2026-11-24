import { useState } from 'react';
import { X, Check, ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowDownAZ, ArrowUpZA, DollarSign } from 'lucide-react';

export default function TokenFilterModal({ isOpen, onClose, currentSort, hideZero, onApply }) {
  const [selectedSort, setSelectedSort] = useState(currentSort || 'balance-desc');
  const [zeroHidden, setZeroHidden] = useState(hideZero || false);

  if (!isOpen) return null;

  const options = [
    { id: 'balance-desc', label: 'Mayor saldo', icon: <ArrowDownWideNarrow size={18} /> },
    { id: 'balance-asc', label: 'Menor saldo', icon: <ArrowUpNarrowWide size={18} /> },
    { id: 'name-asc', label: 'Nombre (A-Z)', icon: <ArrowDownAZ size={18} /> },
    { id: 'name-desc', label: 'Nombre (Z-A)', icon: <ArrowUpZA size={18} /> },
    { id: 'value-desc', label: 'Mayor valor (Próximamente)', icon: <DollarSign size={18} />, disabled: true },
  ];

  const handleApply = () => {
    onApply({ sort: selectedSort, hideZero: zeroHidden });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-end md:justify-center items-center z-[80]"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl md:rounded-3xl p-6 shadow-2xl border-t md:border border-white/10 relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 md:hidden"></div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Ordenar y Filtrar</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* OPCIONES DE ORDENAMIENTO */}
        <div className="space-y-2 mb-6">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => !opt.disabled && setSelectedSort(opt.id)}
              disabled={opt.disabled}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors border ${
                selectedSort === opt.id 
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-400' 
                  : 'bg-gray-950 border-white/10 text-gray-400 hover:bg-gray-800'
              } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-3">
                {opt.icon}
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              {selectedSort === opt.id && <Check size={16} />}
            </button>
          ))}
        </div>

        {/* TOGGLE OCULTAR SALDO CERO */}
        <div className="flex items-center justify-between bg-gray-950 p-4 rounded-xl border border-white/10 mb-8">
          <span className="text-sm font-medium text-gray-300">Ocultar tokens con saldo cero</span>
          <button 
            onClick={() => setZeroHidden(!zeroHidden)}
            className={`w-12 h-6 rounded-full transition-colors relative ${zeroHidden ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${zeroHidden ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>

        <button 
          onClick={handleApply}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
              }
