import { useEffect, useMemo } from 'react';
import { useWalletStore } from '../store/useWalletStore.js';
import { useBalanceStore } from '../store/useBalanceStore.js';

export function useBalances() {
  const address = useWalletStore((s) => s.activeAccount?.address);
  const trackedTokens = useWalletStore((s) => s.trackedTokens);
  
  // Excluimos el token fantasma de ETH ERC-20
  const tokens = useMemo(() => 
    trackedTokens.filter(t => t.address.toLowerCase() !== '0x5a524251df27a25ac6b9964a93e1c23ad692688d'), 
  [trackedTokens]);

  const { refresh, byAccount } = useBalanceStore();
  
  const entry = address ? byAccount[address.toLowerCase()] : null;
  
  const isInitialLoading = !entry || entry.status === 'loading';
  const isRefreshing = entry?.status === 'refreshing';

  useEffect(() => {
    if (address) {
      refresh(address, tokens);
    }
  }, [address, tokens, refresh]);

  return {
    entry,
    isInitialLoading,
    isRefreshing,
    refetch: () => address && refresh(address, tokens, { force: true }),
  };
}
