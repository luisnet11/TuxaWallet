import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useTransactionStore = create(
  persist(
    (set, get) => ({
      // Estructura: { "0xDireccion": [tx1, tx2, ...] }
      transactions: {},

      addTransactions: (address, newTxs) => {
        if (!address) return;
        const key = address.toLowerCase();
        const currentTxs = get().transactions[key] || [];
        
        // Fusionar y eliminar duplicados por hash
        const combined = [...newTxs, ...currentTxs];
        const uniqueMap = new Map();
        combined.forEach(tx => uniqueMap.set(tx.hash, tx));
        
        // Ordenar por fecha descendente y limitar a 100 para no saturar el localStorage
        const sortedAndLimited = Array.from(uniqueMap.values())
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 100);

        set((state) => ({
          transactions: {
            ...state.transactions,
            [key]: sortedAndLimited
          }
        }));
      },

      clearTransactions: (address) => {
        if (!address) return;
        const key = address.toLowerCase();
        set((state) => {
          const newTxs = { ...state.transactions };
          delete newTxs[key];
          return { transactions: newTxs };
        });
      }
    }),
    {
      name: 'tuxawallet-transactions-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
