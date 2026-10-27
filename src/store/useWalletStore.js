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
import { createNewWallet, unlockWallet, addAccountToWallet, deriveAccount } from '../vault/walletVault.js';
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
      trackedTokens: [], // Lista de tokens ERC-20 importados

      // ... (createWallet, unlockExistingWallet, lockWallet, addNewAccount se mantienen igual)
      createWallet: async (password) => {
        set({ isLoading: true, error: null });
        try {
          const { vaultBlob, mnemonic } = await createNewWallet(password, 24);
          set({ vaultBlob, isUnlocked: true, mnemonicSession: mnemonic, activeAccount: vaultBlob.accounts[0], isLoading: false });
          return mnemonic;
        } catch (err) { set({ isLoading: false, error: err.message }); throw err; }
      },
      unlockExistingWallet: async (password) => {
        const { vaultBlob } = get();
        if (!vaultBlob) throw new Error('No hay billetera.');
        set({ isLoading: true, error: null });
        try {
          const { mnemonic } = await unlockWallet(vaultBlob, password);
          set({ isUnlocked: true, mnemonicSession: mnemonic, activeAccount: vaultBlob.accounts[0], isLoading: false });
        } catch (err) { set({ isLoading: false, error: 'Contraseña incorrecta o datos corruptos.' }); throw err; }
      },
      lockWallet: () => set({ isUnlocked: false, mnemonicSession: null, activeAccount: null, error: null }),
      addNewAccount: () => {
        const { vaultBlob, mnemonicSession, isLoading, isUnlocked } = get();
        if (isLoading || !isUnlocked || !mnemonicSession) return;
        set({ isLoading: true });
        try {
          const nextIndex = vaultBlob.accounts.length;
          const updatedBlob = addAccountToWallet(vaultBlob, mnemonicSession, nextIndex);
          set({ vaultBlob: updatedBlob, activeAccount: updatedBlob.accounts[nextIndex], isLoading: false });
        } catch (err) { set({ isLoading: false, error: err.message }); }
      },
      setActiveAccount: (index) => {
        const account = get().vaultBlob?.accounts.find((a) => a.index === index);
        if (account) set({ activeAccount: account, error: null });
      },

      // --- NUEVO: DETECCIÓN AUTOMÁTICA DE TOKENS ---
      addTrackedToken: async (tokenAddress) => {
        const { trackedTokens } = get();
        if (trackedTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase())) {
          throw new Error('El token ya está agregado.');
        }
        
        set({ isLoading: true, error: null });
        try {
          const client = getTuxaPublicClient();
          // Leemos el contrato inteligente en paralelo
          const [name, symbol, decimals] = await Promise.all([
            client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'name' }),
            client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'symbol' }),
            client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals' })
          ]);

          const newToken = { address: tokenAddress, name, symbol, decimals };
          set({ trackedTokens: [...trackedTokens, newToken], isLoading: false });
          return newToken;
        } catch (err) {
          set({ isLoading: false, error: 'Dirección de token inválida o no compatible con ERC-20.' });
          throw err;
        }
      },

      // --- NUEVO: SALDO DE TOKEN ERC-20 ---
      fetchERC20Balance: async (tokenAddress) => {
        const { activeAccount, trackedTokens } = get();
        if (!activeAccount) return '0';
        const token = trackedTokens.find(t => t.address === tokenAddress);
        if (!token) return '0';

        try {
          const client = getTuxaPublicClient();
          const balanceWei = await client.readContract({
            address: tokenAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [activeAccount.address]
          });
          // Formateo dinámico usando los decimales del token
          return formatUnits(balanceWei, token.decimals);
        } catch (err) { console.error(err); return '0'; }
      },

      // --- NUEVO: ENVIAR TOKEN ERC-20 ---
      sendERC20Token: async (tokenAddress, toAddress, amount, dryRun = false) => {
        const { isUnlocked, mnemonicSession, activeAccount, trackedTokens } = get();
        if (!isUnlocked || !mnemonicSession) throw new Error('Billetera bloqueada.');
        
        const token = trackedTokens.find(t => t.address === tokenAddress);
        if (!token) throw new Error('Token no encontrado en la lista.');

        set({ isLoading: true, error: null });
        try {
          const { privateKey } = deriveAccount(mnemonicSession, activeAccount.index);
          const account = privateKeyToAccount(privateKey);
          const walletClient = createTuxaWalletClient(account);

          // Conversión dinámica usando los decimales del token
          const parsedAmount = parseUnits(amount, token.decimals);

          const tx = {
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [toAddress, parsedAmount],
            account,
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
          set({ isLoading: false, error: err.shortMessage || err.message });
          throw err;
        }
      },

      fetchActiveAccountBalance: async () => {
        const { activeAccount } = get();
        if (!activeAccount) return '0';
        try {
          const client = getTuxaPublicClient();
          const balanceWei = await client.getBalance({ address: activeAccount.address });
          return (Number(balanceWei) / 1e18).toFixed(6);
        } catch (err) { return '0'; }
      },
      
      // Mantengo sendNativeTransaction y clearError de la versión anterior
      sendNativeTransaction: async (toAddress, amountEther, dryRun = false) => {
        const { isUnlocked, mnemonicSession, activeAccount, isLoading } = get();
        if (isLoading || !isUnlocked || !mnemonicSession) return;
        set({ isLoading: true, error: null });
        try {
          const { privateKey } = deriveAccount(mnemonicSession, activeAccount.index);
          const account = privateKeyToAccount(privateKey);
          const walletClient = createTuxaWalletClient(account);
          const tx = { to: toAddress, value: parseEther(amountEther) };
          if (dryRun) {
            const signedTx = await walletClient.signTransaction(tx);
            set({ isLoading: false });
            return { success: true, hash: signedTx, message: "✅ Firma ETH exitosa (Dry Run)." };
          } else {
            const hash = await walletClient.sendTransaction(tx);
            set({ isLoading: false });
            return { success: true, hash, message: "✅ ETH enviado." };
          }
        } catch (err) { set({ isLoading: false, error: err.message }); throw err; }
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'tuxawallet-storage',
      storage: createJSONStorage(() => localStorage),
      // Persistimos el vaultBlob Y los tokens importados
      partialize: (state) => ({ vaultBlob: state.vaultBlob, trackedTokens: state.trackedTokens }),
    }
  )
);
