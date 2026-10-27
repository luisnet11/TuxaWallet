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
import { parseEther, parseUnits, formatUnits, formatEther, isAddress } from 'viem';
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
      vaultBlob: null,
      isUnlocked: false,
      mnemonicSession: null,
      activeAccount: null,
      isLoading: false,
      error: null,
      trackedTokens: [],
      
      // Guardado temporal para el flujo de creación
      pendingWallet: null,

      // 1. Preparar la billetera (No guarda en localStorage aún)
      createWallet: async (password) => {
        set({ isLoading: true, error: null });
        try {
          const { vaultBlob, mnemonic } = await createNewWallet(password, 24);
          set({
            pendingWallet: vaultBlob,
            mnemonicSession: mnemonic,
            isLoading: false,
          });
          return mnemonic;
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      // 2. El usuario confirma que anotó las palabras. AHORA sí guardamos.
      confirmWallet: () => {
        const { pendingWallet, mnemonicSession } = get();
        if (pendingWallet && mnemonicSession) {
          set({
            vaultBlob: pendingWallet,
            pendingWallet: null,
            isUnlocked: true,
            activeAccount: pendingWallet.accounts[0],
          });
        }
      },

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

      unlockExistingWallet: async (password) => {
        const { vaultBlob } = get();
        if (!vaultBlob) throw new Error('No hay billetera.');

        set({ isLoading: true, error: null });
        try {
          const { mnemonic } = await unlockWallet(vaultBlob, password);
          set({
            isUnlocked: true,
            mnemonicSession: mnemonic,
            activeAccount: vaultBlob.accounts[0],
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false, error: 'Contraseña incorrecta o datos corruptos.' });
          throw err;
        }
      },

      lockWallet: () => {
        set({
          isUnlocked: false,
          mnemonicSession: null,
          activeAccount: null,
          error: null,
        });
      },

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
          const updatedBlob = addAccountToWallet(vaultBlob, mnemonicSession, nextIndex);
          set({
            vaultBlob: updatedBlob,
            activeAccount: updatedBlob.accounts[nextIndex],
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false, error: err.message });
        }
      },

      setActiveAccount: (accountIndex) => {
        const { vaultBlob } = get();
        const account = vaultBlob.accounts.find((a) => a.index === accountIndex);
        if (account) set({ activeAccount: account, error: null });
      },

      fetchActiveAccountBalance: async () => {
        const { activeAccount } = get();
        if (!activeAccount) return '0';
        try {
          const client = getTuxaPublicClient();
          const balanceWei = await client.getBalance({ address: activeAccount.address });
          // CORRECCIÓN: Usar formatEther para no perder precisión
          return formatEther(balanceWei);
        } catch (err) {
          console.error(err);
          return '0';
        }
      },

      addTrackedToken: async (tokenAddress) => {
        const { trackedTokens } = get();
        if (trackedTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase())) {
          throw new Error('El token ya está agregado.');
        }

        set({ isLoading: true, error: null });
        try {
          const client = getTuxaPublicClient();
          const [name, symbol, decimals] = await Promise.all([
            client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'name' }),
            client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'symbol' }),
            client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals' }),
          ]);

          const newToken = { address: tokenAddress, name, symbol, decimals };
          set({ trackedTokens: [...trackedTokens, newToken], isLoading: false });
          return newToken;
        } catch (err) {
          set({ isLoading: false, error: 'Dirección de token inválida o no compatible con ERC-20.' });
          throw err;
        }
      },

      fetchERC20Balance: async (tokenAddress) => {
        const { activeAccount, trackedTokens } = get();
        if (!activeAccount) return '0';
        const token = trackedTokens.find(t => t.address === tokenAddress);
        if (!token) return '0';

        try {
          const client = getTuxaPublicClient();
          const balanceWei = await client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [activeAccount.address],
          });
          return formatUnits(balanceWei, token.decimals);
        } catch (err) {
          console.error(err);
          return '0';
        }
      },

      sendNativeTransaction: async (toAddress, amountEther, dryRun = false) => {
        const { isUnlocked, mnemonicSession, activeAccount, isLoading } = get();
        if (isLoading) return;
        if (!isUnlocked || !mnemonicSession) {
          set({ error: 'Billetera bloqueada.' });
          return;
        }
        // CORRECCIÓN: Validar dirección
        if (!isAddress(toAddress)) {
          set({ error: 'Dirección de destino inválida.' });
          throw new Error('Dirección de destino inválida.');
        }

        set({ isLoading: true, error: null });
        try {
          const { privateKey } = deriveAccount(mnemonicSession, activeAccount.index);
          const account = privateKeyToAccount(privateKey);
          const walletClient = createTuxaWalletClient(account);
          const publicClient = getTuxaPublicClient();

          const baseTx = { to: toAddress, value: parseEther(amountEther), type: 'legacy' };
          const preparedTx = await publicClient.prepareTransactionRequest({
            ...baseTx, account, chain: walletClient.chain,
          });

          if (dryRun) {
            const signedTx = await walletClient.signTransaction(preparedTx);
            set({ isLoading: false });
            return { success: true, hash: signedTx, message: `✅ Firma exitosa (Dry Run).` };
          } else {
            const hash = await walletClient.sendTransaction(preparedTx);
            set({ isLoading: false });
            return { success: true, hash, message: `✅ Transacción enviada.` };
          }
        } catch (err) {
          const errorMsg = err.shortMessage || err.message || 'Error al enviar transacción.';
          set({ isLoading: false, error: errorMsg });
          throw err;
        }
      },

      sendERC20Token: async (tokenAddress, toAddress, amount, dryRun = false) => {
        const { isUnlocked, mnemonicSession, activeAccount, trackedTokens } = get();
        if (!isUnlocked || !mnemonicSession) throw new Error('Billetera bloqueada.');
        // CORRECCIÓN: Validar dirección
        if (!isAddress(toAddress)) {
          set({ error: 'Dirección de destino inválida.' });
          throw new Error('Dirección de destino inválida.');
        }

        const token = trackedTokens.find(t => t.address === tokenAddress);
        if (!token) throw new Error('Token no encontrado en la lista.');

        set({ isLoading: true, error: null });
        try {
          const { privateKey } = deriveAccount(mnemonicSession, activeAccount.index);
          const account = privateKeyToAccount(privateKey);
          const walletClient = createTuxaWalletClient(account);

          const parsedAmount = parseUnits(amount, token.decimals);
          const tx = {
            address: tokenAddress, abi: ERC20_ABI, functionName: 'transfer',
            args: [toAddress, parsedAmount], account, type: 'legacy',
          };

          if (dryRun) {
            const signedTx = await walletClient.signTransaction(tx);
            set({ isLoading: false });
            return { success: true, hash: signedTx, message: `✅ Firma ERC-20 (${token.symbol}) exitosa (Dry Run).` };
          } else {
            const hash = await walletClient.writeContract(tx);
            set({ isLoading: false });
            return { success: true, hash, message: `✅ Transferencia de ${token.symbol} enviada.` };
          }
        } catch (err) {
          const errorMsg = err.shortMessage || err.message || 'Error al enviar token.';
          set({ isLoading: false, error: errorMsg });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tuxawallet-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ vaultBlob: state.vaultBlob, trackedTokens: state.trackedTokens }),
    }
  )
);
