import { create } from 'zustand';
import { fetchBalances } from '../services/balances.service.js';

const TTL_MS = 15_000;
const ERROR_TTL_MS = 5_000;
const inflight = new Map();

const tokensSig = (tokens) => tokens.map((t) => t.address.toLowerCase()).sort().join(',');
const mergeItem = (next, prev) => next.status === 'ok' ? next : { ...next, value: prev?.value ?? null, stale: prev?.value != null };

export const useBalanceStore = create((set, get) => ({
  byAccount: {},

  refresh: (address, tokens, { force = false } = {}) => {
    const key = address.toLowerCase();
    const sig = tokensSig(tokens);
    const prev = get().byAccount[key];

    const ttl = prev?.status === 'error' ? ERROR_TTL_MS : TTL_MS;
    if (!force && prev?.sig === sig && Date.now() - (prev.lastAttempt ?? 0) < ttl) {
      return Promise.resolve(prev);
    }

    const flightKey = `${key}|${sig}`;
    if (inflight.has(flightKey)) return inflight.get(flightKey);

    set((s) => ({
      byAccount: {
        ...s.byAccount,
        [key]: {
          native: null, tokens: {}, fetchedAt: 0, lastAttempt: 0, sig: '',
          ...(prev ?? {}),
          status: prev?.fetchedAt ? 'refreshing' : 'loading',
        },
      },
    }));

    const p = fetchBalances(address, tokens)
      .then((res) => {
        const old = get().byAccount[key];
        const native = mergeItem(res.native, old?.native);
        const tokenItems = Object.fromEntries(
          Object.entries(res.tokens).map(([a, it]) => [a, mergeItem(it, old?.tokens?.[a])])
        );
        const anyOk = native.status === 'ok' || Object.values(tokenItems).some((i) => i.status === 'ok');
        
        const entry = {
          native, tokens: tokenItems, sig, lastAttempt: Date.now(),
          fetchedAt: anyOk ? res.fetchedAt : old?.fetchedAt ?? 0,
          status: anyOk ? 'ready' : 'error',
        };
        set((s) => ({ byAccount: { ...s.byAccount, [key]: entry } }));
        return entry;
      })
      .finally(() => inflight.delete(flightKey));

    inflight.set(flightKey, p);
    return p;
  },

  reset: () => {
    inflight.clear();
    set({ byAccount: {} });
  },
}));
