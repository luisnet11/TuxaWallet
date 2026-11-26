import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { parseEther, parseUnits, isAddress, encodeFunctionData, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  createNewWallet,
  importWalletFromMnemonic,
  unlockWallet,
  addAccountToWallet,
  deriveAccount,
} from '../vault/walletVault.js';
import { getTuxaPublicClient, createTuxaWalletClient, ERC20_ABI } from '../services/viemClient.js';
import { DEFAULT_TOKENS } from '../config/tokens.config.js';
import { isNativeToken } from '../utils/tokenHelpers.js';

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
      pendingWallet: null,
      fiatCurrency: 'usd',
      
      // ESTADOS PARA GESTIÓN DE TOKENS
      favoriteTokens: [],
      hiddenTokens: [],

      setFiatCurrency: (currency) => set({ fiatCurrency: currency }),

      toggleFavoriteToken: (address) => {
        const lower = address.toLowerCase();
        set((state) => {
          const isFav = state.favoriteTokens.includes(lower);
          return {
            favoriteTokens: isFav 
              ? state.favoriteTokens.filter(a => a !== lower) 
              : [...state.favoriteTokens, lower]
          };
        });
      },

      toggleHideToken: (address) => {
        const lower = address.toLowerCase();
        set((state) => {
          const isHidden = state.hiddenTokens.includes(lower);
          return {
            hiddenTokens: isHidden 
              ? state.hiddenTokens.filter(a => a !== lower) 
              : [...state.hiddenTokens, lower]
          };
        });
      },

      createWallet: async (password) => {
        set({ isLoading: true, error: null });
        try {
          const { vaultBlob, mnemonic } = await createNewWallet(password, 24);
          const accountsWithNames = vaultBlob.accounts.map((acc, i) => ({ ...acc, name: `Cuenta ${i}` }));
          const updatedBlob = { ...vaultBlob, accounts: accountsWithNames };
          set({ pendingWallet: updatedBlob, mnemonicSession: mnemonic, isLoading: false });
          return mnemonic;
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      confirmWallet: () => {
        const { pendingWallet, mnemonicSession } = get();
        if (pendingWallet && mnemonicSession) {
          set({
            vaultBlob: pendingWallet, pendingWallet: null, isUnlocked: true,
            activeAccount: pendingWallet.accounts[0], trackedTokens: DEFAULT_TOKENS,
          });
        }
      },

      importExistingWallet: async (mnemonic, password) => {
        set({ isLoading: true, error: null });
        try {
          const { vaultBlob, mnemonic: cleanMnemonic } = await importWalletFromMnemonic(mnemonic, password);
          const accountsWithNames = vaultBlob.accounts.map((acc, i) => ({ ...acc, name: `Cuenta ${i}` }));
          const updatedBlob = { ...vaultBlob, accounts: accountsWithNames };
          set({
            vaultBlob: updatedBlob, isUnlocked: true, mnemonicSession: cleanMnemonic,
            activeAccount: updatedBlob.accounts[0], trackedTokens: DEFAULT_TOKENS, isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      unlockExistingWallet: async (password) => {
        const { vaultBlob, trackedTokens } = get();
        if (!vaultBlob) throw new Error('No hay billetera.');
        set({ isLoading: true, error: null });
        try {
          const { mnemonic } = await unlockWallet(vaultBlob, password);
          const accountsWithNames = vaultBlob.accounts.map((acc, i) => ({ ...acc, name: acc.name || `Cuenta ${i}` }));
          const updatedBlob = { ...vaultBlob, accounts: accountsWithNames };
          set({
            vaultBlob: updatedBlob, isUnlocked: true, mnemonicSession: mnemonic,
            activeAccount: updatedBlob.accounts[0], isLoading: false,
            trackedTokens: trackedTokens.length === 0 ? DEFAULT_TOKENS : trackedTokens,
          });
        } catch (err) {
          set({ isLoading: false, error: 'Contraseña incorrecta o datos corruptos.' });
          throw err;
        }
      },

      lockWallet: () => set({ isUnlocked: false, mnemonicSession: null, activeAccount: null, error: null }),

      resetWallet: () => set({ 
        vaultBlob: null, isUnlocked: false, mnemonicSession: null, activeAccount: null, 
        trackedTokens: [], pendingWallet: null, fiatCurrency: 'usd', 
        favoriteTokens: [], hiddenTokens: [], error: null 
      }),

      addNewAccount: () => {
        const { vaultBlob, mnemonicSession, isLoading, isUnlocked } = get();
        if (isLoading) return;
        if (!isUnlocked || !mnemonicSession) { set({ error: 'Billetera bloqueada.' }); return; }
        set({ isLoading: true, error: null });
        try {
          const nextIndex = vaultBlob.accounts.length;
          const updatedBlob = addAccountToWallet(vaultBlob, mnemonicSession, nextIndex);
          const newAccounts = updatedBlob.accounts.map((acc, i) => ({ ...acc, name: acc.name || `Cuenta ${i}` }));
          set({
            vaultBlob: { ...updatedBlob, accounts: newAccounts },
            activeAccount: newAccounts[nextIndex], isLoading: false,
          });
        } catch (err) { set({ isLoading: false, error: err.message }); }
      },

      setActiveAccount: (accountIndex) => {
        const { vaultBlob } = get();
        const account = vaultBlob.accounts.find((a) => a.index === accountIndex);
        if (account) set({ activeAccount: account, error: null });
      },

      updateAccountName: (accountIndex, newName) => {
        const { vaultBlob, activeAccount } = get();
        if (!vaultBlob) return;
        const updatedAccounts = vaultBlob.accounts.map(acc => acc.index === accountIndex ? { ...acc, name: newName } : acc);
        set({
          vaultBlob: { ...vaultBlob, accounts: updatedAccounts },
          activeAccount: activeAccount?.index === accountIndex ? { ...activeAccount, name: newName } : activeAccount
        });
      },

      getMnemonicForBackup: async (password) => {
        const { vaultBlob } = get();
        if (!vaultBlob) throw new Error('No hay billetera.');
        try {
          const { mnemonic } = await unlockWallet(vaultBlob, password);
          return mnemonic;
        } catch (err) { throw new Error('Contraseña incorrecta.'); }
      },

      addTrackedToken: (tokenData) => {
        const { trackedTokens } = get();
        if (trackedTokens.find(t => t.address.toLowerCase() === tokenData.address.toLowerCase())) {
          throw new Error('El token ya está en tu lista.');
        }
        
        // Guardamos el logoURI si viene (del JSON o importación manual)
        const newToken = { 
          ...tokenData, 
          verified: false,
          logoURI: tokenData.logoURI || null 
        };
        
        set({ trackedTokens: [...trackedTokens, newToken] });
        return newToken;
      },

      estimateGasFee: async (tokenAddress, toAddress, amount) => {
        try {
          const { activeAccount, mnemonicSession, trackedTokens } = get();
          if (!activeAccount || !mnemonicSession) return { feeEth: '0', isFree: true };
          
          const publicClient = getTuxaPublicClient();
          const { privateKey } = deriveAccount(mnemonicSession, activeAccount.index);
          const account = privateKeyToAccount(privateKey);

          let txParams = { account, to: toAddress, type: 'legacy' };

          if (isNativeToken(tokenAddress)) {
            txParams.value = parseEther(amount.toString());
          } else {
            const token = trackedTokens.find(t => t.address === tokenAddress);
            if (!token) return { feeEth: '0', isFree: true };
            const parsedAmount = parseUnits(amount.toString(), token.decimals);
            txParams.to = tokenAddress;
            txParams.data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [toAddress, parsedAmount] });
          }

          const gasLimit = await publicClient.estimateGas(txParams);
          const gasPrice = await publicClient.getGasPrice();
          
          const feeWei = gasLimit * gasPrice;
          const feeEth = formatEther(feeWei);

          if (Number(feeEth) < 0.00001 || gasPrice === 0n) {
             return { feeEth: '0.0000', isFree: true };
          }

          return { feeEth: Number(feeEth).toFixed(6), isFree: false };
        } catch (error) {
          return { feeEth: '0.0000', isFree: true };
        }
      },

      sendNativeTransaction: async (toAddress, amountEther, dryRun = false) => {
        const { isUnlocked, mnemonicSession, activeAccount, isLoading } = get();
        if (isLoading) return;
        if (!isUnlocked || !mnemonicSession) { set({ error: 'Billetera bloqueada.' }); return; }
        if (!isAddress(toAddress)) { set({ error: 'Dirección inválida.' }); throw new Error('Dirección inválida.'); }

        set({ isLoading: true, error: null });
        try {
          const { privateKey } = deriveAccount(mnemonicSession, activeAccount.index);
          const account = privateKeyToAccount(privateKey);
          const walletClient = createTuxaWalletClient(account);
          const publicClient = getTuxaPublicClient();

          const baseTx = { to: toAddress, value: parseEther(amountEther), type: 'legacy' };
          const preparedTx = await publicClient.prepareTransactionRequest({ ...baseTx, account, chain: walletClient.chain });

          if (dryRun) {
            const signedTx = await walletClient.signTransaction(preparedTx);
            set({ isLoading: false });
            return { success: true, hash: signedTx, message: `✅ Firma exitosa.` };
          } else {
            const hash = await walletClient.sendTransaction(preparedTx);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const gasUsed = receipt.gasUsed;
            const effectiveGasPrice = receipt.effectiveGasPrice || 0n;
            const feeWei = gasUsed * effectiveGasPrice;
            const feeEth = formatEther(feeWei);

            set({ isLoading: false });
            return { 
              success: receipt.status === 'success', 
              hash, 
              feeEth: Number(feeEth) < 0.00001 ? '0.0000' : Number(feeEth).toFixed(6),
              status: receipt.status
            };
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
        if (!isAddress(toAddress)) { set({ error: 'Dirección inválida.' }); throw new Error('Dirección inválida.'); }

        const token = trackedTokens.find(t => t.address === tokenAddress);
        if (!token) throw new Error('Token no encontrado.');

        set({ isLoading: true, error: null });
        try {
          const { privateKey } = deriveAccount(mnemonicSession, activeAccount.index);
          const account = privateKeyToAccount(privateKey);
          const walletClient = createTuxaWalletClient(account);
          const publicClient = getTuxaPublicClient();

          const parsedAmount = parseUnits(amount, token.decimals);
          const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [toAddress, parsedAmount] });
          const preparedTx = await publicClient.prepareTransactionRequest({ to: tokenAddress, data, account, type: 'legacy' });

          if (dryRun) {
            const signedTx = await walletClient.signTransaction(preparedTx);
            set({ isLoading: false });
            return { success: true, hash: signedTx, message: `✅ Firma ERC-20 exitosa.` };
          } else {
            const hash = await walletClient.sendTransaction(preparedTx);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const gasUsed = receipt.gasUsed;
            const effectiveGasPrice = receipt.effectiveGasPrice || 0n;
            const feeWei = gasUsed * effectiveGasPrice;
            const feeEth = formatEther(feeWei);

            set({ isLoading: false });
            return { 
              success: receipt.status === 'success', 
              hash, 
              feeEth: Number(feeEth) < 0.00001 ? '0.0000' : Number(feeEth).toFixed(6),
              status: receipt.status
            };
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
      version: 1, 
      migrate: (persistedState, version) => {
        if (version === 0 && persistedState.trackedTokens) {
          persistedState.trackedTokens = persistedState.trackedTokens.filter(t => t.address.toLowerCase() !== '0x5a524251df27a25ac6b9964a93e1c23ad692688d');
        }
        return persistedState;
      },
      partialize: (state) => ({ 
        vaultBlob: state.vaultBlob, 
        trackedTokens: state.trackedTokens, 
        fiatCurrency: state.fiatCurrency,
        favoriteTokens: state.favoriteTokens,
        hiddenTokens: state.hiddenTokens
      }),
    }
  )
);
