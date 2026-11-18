import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // <-- AÑADIDO useSearchParams
import { Search, ChevronLeft, Plus, Edit2, Trash2, Star } from 'lucide-react';
import { useAddressBookStore } from '../../store/useAddressBookStore.js';
import AccountAvatar from '../../components/AccountAvatar.jsx';
import AddressModal from '../../components/AddressModal.jsx';

export default function AddressBook() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // <-- LEER PARAMS
  const { contacts, removeContact, toggleFavorite } = useAddressBookStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);

  const filteredContacts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return contacts
      .filter(c => 
        c.label.toLowerCase().includes(term) || 
        c.address.toLowerCase().includes(term) || 
        c.note.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });
  }, [contacts, searchTerm]);

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleEdit = (e, contact) => {
    e.stopPropagation();
    setContactToEdit(contact);
    setIsModalOpen(true);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de eliminar este contacto?')) {
      removeContact(id);
    }
  };

  const handleFavorite = (e, id) => {
    e.stopPropagation();
    toggleFavorite(id);
  };

  const handleSelectContact = (address) => {
    // PRESERVAR EL TOKEN SI VENIMOS DE LA PANTALLA DE ENVÍO
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      navigate(`/send?address=${address}&token=${tokenParam}`);
    } else {
      navigate(`/send?address=${address}`);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-950 text-white flex flex-col relative pb-24">
      <header className="p-4 flex items-center space-x-3 bg-gray-950 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1">Libreta</h1>
        <button onClick={() => { setContactToEdit(null); setIsModalOpen(true); }} className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors">
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 px-4 overflow-y-auto">
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="space-y-3">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">No se encontraron contactos.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div 
                key={contact.id}
                onClick={() => handleSelectContact(contact.address)}
                className="bg-gray-900 border border-white/5 rounded-2xl p-3 flex items-center space-x-3 cursor-pointer hover:bg-gray-800 transition-colors group"
              >
                <div className="relative">
                  <AccountAvatar address={contact.address} size={40} />
                  <button 
                    onClick={(e) => handleFavorite(e, contact.id)}
                    className={`absolute -top-1 -right-1 p-1 rounded-full bg-gray-800 border border-gray-700 ${contact.isFavorite ? 'text-yellow-400' : 'text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity'}`}
                  >
                    <Star size={10} fill={contact.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{contact.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{truncateAddress(contact.address)}</p>
                  {contact.note && <p className="text-xs text-gray-500 truncate mt-0.5">{contact.note}</p>}
                </div>

                <div className="flex flex-col space-y-2">
                  <button onClick={(e) => handleEdit(e, contact)} className="text-gray-400 hover:text-purple-400 p-1">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => handleDelete(e, contact.id)} className="text-gray-400 hover:text-red-400 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-gradient-to-t from-gray-950 to-transparent z-20">
        <button 
          onClick={() => { setContactToEdit(null); setIsModalOpen(true); }}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>Añadir dirección</span>
        </button>
      </div>

      <AddressModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        contactToEdit={contactToEdit} 
      />
    </div>
  );
}
