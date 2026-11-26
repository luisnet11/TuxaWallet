import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      <button onClick={() => navigate('/send')} className="bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors">
        <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
          <ArrowUpRight size={24} />
        </div>
        <span className="text-sm font-medium">Enviar</span>
      </button>
      <button onClick={() => navigate('/receive')} className="bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors">
        <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
          <ArrowDownLeft size={24} />
        </div>
        <span className="text-sm font-medium">Recibir</span>
      </button>
    </div>
  );
}
