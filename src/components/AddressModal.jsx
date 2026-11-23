import { useState, useEffect } from 'react';
import { X, AlertCircle, Clipboard, QrCode } from 'lucide-react';
import { useAddressBookStore } from '../store/useAddressBookStore.js';
import { useWalletStore } from '../store/useWalletStore.js';
import { isAddress } from 'viem';
import QrScannerModal from './QrScannerModal.jsx'; // <-- IMPORTAMOS EL ESCÁNER

export default function AddressModal({ isOpen, onClose, contactToEdit }) {
  const { addContact, updateContact } = useAddressBookStore();
  const { activeAccount } = useWalletStore();
  
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [showQrModal, setShowQrModal] = useState(false); // <-- ESTADO PARA EL QR

  // Cargar datos si estamos editando
  useEffect(() => {
    if (contactToEdit) {
      setLabel(contactToEdit.label);
      setAddress(contactToEdit.address);
      setNote(contactToEdit.note);
    } else {
      setLabel(''); setAddress(''); setNote('');
    }
    setError('');
  }, [contactToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // 1. Validar que sea una dirección EVM real (EIP-55)
    if (!isAddress(address)) {
      setError('La dirección ingresada no es una dirección EVM válida.');
      return;
    }

    // 2. Validar que no sea la dirección del usuario actual
    if (activeAccount && address.toLowerCase() === activeAccount.address.toLowerCase()) {
      setError('No puedes guardar tu propia dirección activa.');
      return;
    }

    try {
      if (contactToEdit) {
        updateContact(contactToEdit.id, { label, address, note });
      } else {
        addContact({ label, address, note });
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{contactToEdit ? 'Editar Contacto' : 'Añadir Dirección'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
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
                disabled={!!contactToEdit} // No permitir cambiar la dirección al editar
              />
              {/* BOTONES DE PEGAR Y QR (Solo si no estamos editando) */}
              {!contactToEdit && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex space-x-1">
                  <button 
                    type="button"
                    onClick={handlePaste}
                    className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
                    title="Pegar dirección"
                  >
                    <Clipboard size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
                    title="Escanear QR"
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

      {/* MODAL DEL ESCÁNER QR INTEGRADO */}
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
