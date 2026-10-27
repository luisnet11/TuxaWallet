/**
 * ============================================================================
 *  TUXAWALLET — Estado Global (Zustand)
 * ============================================================================
 *  Archivo:   src/store/useWalletStore.js
 *  Propósito: Gestionar el estado de la sesión, la persistencia del Vault
 *             Blob cifrado y la orquestación del walletVault.js.
 *
 *  DISEÑO DE SEGURIDAD:
 *  - Solo el `vaultBlob` cifrado se persiste en localStorage.
 *  - La frase semilla (`mnemonicSession`) y las llaves privadas viven en
 *    RAM. Al llamar a `lockWallet()`, se sobrescriben con null.
 *  - Estado `isLoading` para evitar congelamientos en UI móvil durante
 *    la derivación PBKDF2 (600k iteraciones ~0.5s en móviles).
 * ============================================================================
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  createNewWallet,
  unlockWallet,
  addAccountToWallet,
  deriveAccount,
} from '../vault/walletVault.js';
import { getTuxaPublicClient } from '../services/viemClient.js';

export const useWalletStore = create(
  persist(
    (set, get) => ({
      /* -----------------------------------------------------------------
       * ESTADO INICIAL
       * -------------------------------------------------------------- */
      vaultBlob: null,       // JSON cifrado persistido en localStorage
      isUnlocked: false,     // Sesión activa o no
      mnemonicSession: null, // ⚠️ SOLO en RAM. Se borra al bloquear.
      activeAccount: null,   // { index, address }
      isLoading: false,      // Control de UI durante operaciones lentas
      error: null,           // Mensajes de error para la UI

      /* -----------------------------------------------------------------
       * ACCIONES
       * -------------------------------------------------------------- */

      /**
       * Crea una billetera nueva.
       * Devuelve el mnemonic al llamador para que la UI lo muestre.
       */
      createWallet: async (password) => {
        set({ isLoading: true, error: null });
        try {
          // 1. Generar y cifrar la billetera (default 24 palabras)
          const { vaultBlob, mnemonic } = await createNewWallet(password, 24);

          // 2. Guardar en el estado (Zustand persistirá solo vaultBlob)
          set({
            vaultBlob,
            isUnlocked: true,
            mnemonicSession: mnemonic,
            activeAccount: vaultBlob.accounts[0],
            isLoading: false,
          });

          return mnemonic;
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      /**
       * Desbloquea una billetera existente con contraseña.
       */
      unlockExistingWallet: async (password) => {
        const { vaultBlob } = get();
        if (!vaultBlob) {
          set({ error: 'No hay billetera para desbloquear.' });
          throw new Error('No hay billetera para desbloquear.');
        }

        set({ isLoading: true, error: null });
        try {
          // 1. Descifrar semilla con la contraseña
          const { mnemonic } = await unlockWallet(vaultBlob, password);

          // 2. Activar sesión en memoria
          set({
            isUnlocked: true,
            mnemonicSession: mnemonic,
            activeAccount: vaultBlob.accounts[0],
            isLoading: false,
          });
        } catch (err) {
          // El error de crypto.service.js es genérico por seguridad
          set({
            isLoading: false,
            error: 'Contraseña incorrecta o datos corruptos.',
          });
          throw err;
        }
      },

      /**
       * Bloquea la billetera. Borra la semilla de la RAM.
       */
      lockWallet: () => {
        // Sobrescribir referencias sensibles para forzar GC
        set({
          isUnlocked: false,
          mnemonicSession: null,
          activeAccount: null,
          error: null,
        });
      },

      /**
       * Añade una nueva cuenta derivada de la misma semilla.
       */
      addNewAccount: () => {
        const { vaultBlob, mnemonicSession, isLoading, isUnlocked } = get();
        
        if (isLoading) return;
        if (!isUnlocked || !mnemonicSession) {
          set({ error: 'Billetera bloqueada.' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const nextIndex = vaultBlob.accounts.length;
          const updatedBlob = addAccountToWallet(
            vaultBlob,
            mnemonicSession,
            nextIndex
          );

          set({
            vaultBlob: updatedBlob,
            activeAccount: updatedBlob.accounts[nextIndex],
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false, error: err.message });
        }
      },

      /**
       * Cambia la cuenta activa (sin salir de la sesión).
       */
      setActiveAccount: (accountIndex) => {
        const { vaultBlob } = get();
        const account = vaultBlob.accounts.find((a) => a.index === accountIndex);
        if (account) {
          set({ activeAccount: account, error: null });
        }
      },

      /**
       * Obtiene el balance on-chain de la cuenta activa usando Viem.
       * Retorna el balance en formato string legible.
       */
      fetchActiveAccountBalance: async () => {
        const { activeAccount } = get();
        if (!activeAccount) return '0';

        try {
          const client = getTuxaPublicClient();
          const balanceWei = await client.getBalance({
            address: activeAccount.address,
          });
          // Convertir de Wei (BigInt) a ETH legible
          const eth = Number(balanceWei) / 1e18;
          return eth.toFixed(6);
        } catch (err) {
          console.error('[TuxaWallet] Error al consultar balance:', err);
          return '0';
        }
      },

      /**
       * Limpia el estado de error (para la UI).
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'tuxawallet-storage', // clave en localStorage
      storage: createJSONStorage(() => localStorage),

      /**
       * ⚠️ CRÍTICO: Solo persistir el vaultBlob.
       * El mnemonicSession y la cuenta activa NUNCA deben tocar el disco.
       */
      partialize: (state) => ({
        vaultBlob: state.vaultBlob,
      }),
    }
  )
);
