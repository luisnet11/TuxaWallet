import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { isAddress } from 'viem';
import { X, Camera, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';

export default function QrScannerModal({ isOpen, onClose, onScan }) {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'file'
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  
  const qrCodeRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Función de validación
  const handleDecodedText = (decodedText) => {
    // Verificamos si lo escaneado es una dirección EVM válida
    if (isAddress(decodedText)) {
      onScan(decodedText);
      onClose();
    } else {
      setError('El código QR no contiene una dirección EVM válida.');
    }
  };

  // Iniciar/Detener cámara
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'camera') {
      setIsScanning(true);
      setError('');

      // Pequeño delay para asegurar que el DOM del modal ya esté montado
      const timer = setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode('qr-reader-camera');
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' }, // Usar cámara trasera en móviles
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              // Éxito: Detener cámara y devolver dirección
              if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                  scannerRef.current.clear();
                  scannerRef.current = null;
                });
              }
              handleDecodedText(decodedText);
            },
            () => {
              // Errores de lectura continua (se ignoran para no llenar la consola)
            }
          );
        } catch (err) {
          console.error("Error al iniciar cámara:", err);
          setError('No se pudo acceder a la cámara. Verifica los permisos.');
          setIsScanning(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [activeTab, isOpen]);

  // Limpieza al cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
          scannerRef.current = null;
        }).catch(console.error);
      }
    }
  }, [isOpen]);

  // Manejar subida de archivo
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsScanning(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-file');
      scannerRef.current = html5QrCode;
      
      const decodedText = await html5QrCode.scanFile(file, true);
      
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      
      handleDecodedText(decodedText);
    } catch (err) {
      console.error("Error al leer el archivo:", err);
      setError('No se pudo leer un código QR válido en la imagen.');
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-[100]">
      {/* HEADER DEL MODAL */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">Escanear QR</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* PESTAÑAS */}
      <div className="flex bg-gray-900 border-b border-white/10">
        <button 
          onClick={() => setActiveTab('camera')}
          className={`flex-1 py-3 flex items-center justify-center space-x-2 text-sm font-bold transition-colors ${activeTab === 'camera' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Camera size={18} /> <span>Cámara</span>
        </button>
        <button 
          onClick={() => { setActiveTab('file'); setError(''); setIsScanning(false); }}
          className={`flex-1 py-3 flex items-center justify-center space-x-2 text-sm font-bold transition-colors ${activeTab === 'file' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <ImageIcon size={18} /> <span>Subir Imagen</span>
        </button>
      </div>

      {/* CUERPO DEL MODAL */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 bg-gray-950">
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2 mb-6 max-w-sm w-full">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        {/* VISTA DE CÁMARA */}
        {activeTab === 'camera' && (
          <div className="w-full max-w-sm flex flex-col items-center">
            {isScanning && !error && <p className="text-gray-400 text-sm mb-4">Apunta la cámara al código QR</p>}
            <div 
              id="qr-reader-camera" 
              className="w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-[0_0_30px_rgba(147,51,234,0.2)]"
            ></div>
          </div>
        )}

        {/* VISTA DE ARCHIVO */}
        {activeTab === 'file' && (
          <div className="w-full max-w-sm flex flex-col items-center">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square bg-gray-900 hover:bg-gray-800 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center space-y-4 transition-colors"
            >
              {isScanning ? (
                <RefreshCw size={40} className="text-purple-500 animate-spin" />
              ) : (
                <>
                  <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center">
                    <ImageIcon size={40} className="text-purple-400" />
                  </div>
                  <span className="text-gray-300 font-medium">Toca para buscar una imagen</span>
                  <span className="text-xs text-gray-500 text-center px-4">Asegúrate de que el código QR sea claro y esté centrado.</span>
                </>
              )}
            </button>

            {/* Contenedor oculto necesario para que html5-qrcode procese el archivo */}
            <div id="qr-reader-file" className="hidden"></div>
          </div>
        )}

      </div>
    </div>
  );
            }
