/**
 * TUXAWALLET — Cola de aprobaciones del provider (window.tuxachain).
 * Una sola solicitud activa; una nueva rechaza la anterior. Se rechaza todo al bloquear.
 */
import { create } from 'zustand';

export const useApprovalStore = create((set, get) => ({
  pending: null, // { id, title, origin, lines: [[k, v]], resolve }

  request: ({ title, origin, lines }) =>
    new Promise((resolve) => {
      get().pending?.resolve(false);
      set({ pending: { id: crypto.randomUUID(), title, origin, lines, resolve } });
    }),

  settle: (approved) => {
    const p = get().pending;
    if (!p) return;
    set({ pending: null });
    p.resolve(Boolean(approved));
  },
}));
