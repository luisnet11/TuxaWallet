import { useState, useEffect } from 'react';
import { X, AlertCircle, Clipboard, QrCode } from 'lucide-react';
import { useAddressBookStore } from '../store/useAddressBookStore.js';
import { useWalletStore } from '../store/useWalletStore.js';
import { isAddress } from 'viem';
import QrScannerModal from './QrScannerModal.jsx';

// NUEVA PROP: prefilledAddress
export default function AddressModal({ isOpen, onClose, contactToEdit, prefilledAddress }) {
  const { addContact, updateContact } = useAddressBookStore();
  const { activeAccount } = useWalletStore();
  
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Lógica corregida: diferencia entre editar y crear con dirección pre-llenada
  useEffect(() => {
    if (contactToEdit) {
      setLabel(contactToEdit.label);
      setAddress(contactToEdit.address);
      setNote(contactToEdit.note);
    } else {
      setLabel(''); 
      setAddress(prefilledAddress || ''); 
      setNote('');
    }
    setError('');
  }, [contactToEdit, prefilledAddress, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!isAddress(address)) {
      setError('La dirección ingresada no es una dirección EVM válida.');
      return;
    }

    if (activeAccount && address.toLowerCase() === activeAccount.address.toLowerCase()) {
      setError('No puedes guardar tu propia dirección activa.');
      return;
    }

    try {
      if (contactToEdit) {
        updateContact(contactToEdit.id, { label, address, note });
      } else {
        addContact({ label, address, note }); // Ahora sí creará el contacto
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text);
      setError('');
    } catch (e) {
      setError('No se pudo leer el portapapeles.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-end md:justify-center items-center z-[80]">
      
      <div className="bg-gray-900 w-full max-w-md mx-auto rounded-t-3xl md:rounded-3xl p-6 shadow-2xl border-t md:border border-white/10 relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 md:hidden"></div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{contactToEdit ? 'Editar Contacto' : 'Añadir Dirección'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-lg text-xs mb-4 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Etiqueta (Nombre)</label>
            <input 
              type="text" 
              value={label} 
              onChange={(e) => setLabel(e.target.value)} 
              placeholder="Ej. Juan, Mi Exchange..."
              className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Dirección EVM (0x...)</label>
            <div className="relative">
              <input 
                type="text" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="0x..."
                className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 pr-20 text-sm focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                disabled={!!contactToEdit} // Solo se bloquea si estamos editando
              />
              {!contactToEdit && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex space-x-1">
                  <button 
                    type="button"
                    onClick={handlePaste}
                    className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
                  >
                    <Clipboard size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
                  >
                    <QrCode size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nota (Opcional)</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Ej. Billetera de ahorros"
              rows={2}
              className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm focus:ring-1 focus:ring-purple-500 outline-none resize-none"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors mt-2"
          >
            Guardar Contacto
          </button>
        </form>
      </div>

      <QrScannerModal 
        isOpen={showQrModal} 
        onClose={() => setShowQrModal(false)} 
        onScan={(scannedAddress) => {
          setAddress(scannedAddress);
          setShowQrModal(false);
        }} 
      />
    </div>
  );
    }
