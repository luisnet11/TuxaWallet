import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isAddress, getAddress } from 'viem';

export const useAddressBookStore = create(
  persist(
    (set, get) => ({
      contacts: [],

      // Añadir un contacto (Aplica checksum EIP-55)
      addContact: (contact) => {
        const { contacts } = get();
        
        // Validar dirección
        if (!isAddress(contact.address)) {
          throw new Error('Dirección EVM inválida.');
        }
        
        // Normalizar con checksum
        const normalizedAddress = getAddress(contact.address);

        // Evitar duplicados
        if (contacts.some(c => c.address.toLowerCase() === normalizedAddress.toLowerCase())) {
          throw new Error('Esta dirección ya está en tu libreta.');
        }

        const newContact = {
          id: crypto.randomUUID(),
          label: contact.label.trim() || 'Sin nombre',
          address: normalizedAddress,
          note: contact.note?.trim() || '',
          isFavorite: contact.isFavorite || false,
        };

        set({ contacts: [newContact, ...contacts] });
        return newContact;
      },

      // Actualizar un contacto existente
      updateContact: (id, updatedData) => {
        const { contacts } = get();
        const normalizedAddress = updatedData.address ? getAddress(updatedData.address) : undefined;

        set({
          contacts: contacts.map((c) => 
            c.id === id ? { ...c, ...updatedData, address: normalizedAddress || c.address } : c
          )
        });
      },

      // Eliminar un contacto
      removeContact: (id) => {
        set({ contacts: get().contacts.filter((c) => c.id !== id) });
      },

      // Alternar Favorito
      toggleFavorite: (id) => {
        set({
          contacts: get().contacts.map((c) => 
            c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
          )
        });
      }
    }),
    {
      name: 'tuxawallet-addressbook',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
