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
import { parseEther, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  createNewWallet,
  importWalletFromMnemonic,
  unlockWallet,
  addAccountToWallet,
  deriveAccount,
} from '../vault/walletVault.js';
import { getTuxaPublicClient, createTuxaWalletClient, ERC20_ABI } from '../services/viemClient.js';

export const useWalletStore = create(
  persist(
    (set, get) => ({
      // ... (estado igual)

      createWallet: async (password) => { /* ... igual ... */ },
      
      // --- NUEVO: IMPORTAR BILLETERA ---
      importExistingWallet: async (mnemonic, password) => {
        set({ isLoading: true, error: null });
        try {
          const { vaultBlob, mnemonic: cleanMnemonic } = await importWalletFromMnemonic(mnemonic, password);
          set({
            vaultBlob,
            isUnlocked: true,
            mnemonicSession: cleanMnemonic,
            activeAccount: vaultBlob.accounts[0],
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      // ... (unlockExistingWallet, lockWallet, addNewAccount, setActiveAccount, fetchActiveAccountBalance, addTrackedToken, fetchERC20Balance, sendNativeTransaction, sendERC20Token, clearError se mantienen igual) ...
    }),
    {
      name: 'tuxawallet-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ vaultBlob: state.vaultBlob, trackedTokens: state.trackedTokens }),
    }
  )
);
