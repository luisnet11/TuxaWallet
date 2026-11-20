import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Copy, Check, Share2, AlertTriangle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useWalletStore } from '../../store/useWalletStore.js';

export default function Receive() {
  const navigate = useNavigate();
  const { activeAccount } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const address = activeAccount?.address || '';

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!address) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi dirección de TuxaWallet',
          text: `Recibe activos en la red Tuxachain. Mi dirección es: ${address}`,
        });
      } catch (err) {
        console.log('Compartir cancelado', err);
      }
    } else {
      // Fallback si el navegador no soporta Web Share API
      handleCopy();
      alert('Tu navegador no soporta compartir directo. La dirección ha sido copiada.');
    }
  };

  // Formatear la dirección en bloques de 4 para que sea más fácil de leer
  const formattedAddress = address ? address.match(/.{1,4}/g)?.join(' ') : '';

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative">
      
      {/* HEADER */}
      <header className="p-4 flex justify-end">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Recibir activos</h1>
          <p className="text-gray-400 text-sm">
            Esta es tu dirección única de cuenta.<br/>Compártela con alguien para recibir tokens.
          </p>
        </div>

        {/* CONTENEDOR DEL QR (Fondo blanco obligatorio para que los escáneres lo lean) */}
        <div className="bg-white p-4 rounded-3xl mb-8 shadow-[0_0_30px_rgba(147,51,234,0.2)]">
          <QRCode 
            value={address} 
            size={220}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H" // Nivel de corrección de errores alto
          />
        </div>

        {/* DIRECCIÓN DE TEXTO */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 w-full mb-8">
          <p className="text-center font-mono text-sm break-all text-gray-300 leading-relaxed">
            {formattedAddress}
          </p>
        </div>

        {/* ADVERTENCIA DE RED */}
        <div className="flex items-start space-x-2 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl w-full mb-8">
          <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-200">
            Envía solo activos de la red <strong>Tuxachain</strong> a esta dirección. De lo contrario, podrías perder tus fondos.
          </p>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="w-full space-y-3 mt-auto">
          <button 
            onClick={handleCopy}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            <span>{copied ? '¡Copiada!' : 'Copiar dirección'}</span>
          </button>
          
          <button 
            onClick={handleShare}
            className="w-full bg-gray-900 hover:bg-gray-800 border border-white/10 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center space-x-2"
          >
            <Share2 size={20} />
            <span>Compartir</span>
          </button>
        </div>

      </main>
    </div>
  );
        }
