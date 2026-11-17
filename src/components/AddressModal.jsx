import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useAddressBookStore } from '../store/useAddressBookStore.js';
import { useWalletStore } from '../store/useWalletStore.js';
import { isAddress } from 'viem';

export default function AddressModal({ isOpen, onClose, contactToEdit }) {
  const { addContact, updateContact } = useAddressBookStore();
  const { activeAccount } = useWalletStore();
  
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{contactToEdit ? 'Editar Contacto' : 'Añadir Dirección'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-lg text-xs mb-4 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
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
            <input 
              type="text" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="0x..."
              className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm focus:ring-1 focus:ring-purple-500 outline-none font-mono"
              disabled={!!contactToEdit} // No permitir cambiar la dirección al editar
            />
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
    </div>
  );
            }
