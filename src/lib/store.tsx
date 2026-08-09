import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState } from './types';
import { genereazaDateReale } from './date-reale';
import { buildCtx, type Ctx } from './engine';

// v2: datele demo au fost înlocuite cu rapoartele reale (iulie 2026)
const KEY = 'fryday:ffi:v2';

interface Store {
  state: AppState;
  ctx: Ctx;                 // contextul de calcul, memorat o singură dată per schimbare de stare
  update: (fn: (s: AppState) => AppState) => void;
  reset: () => void;
  persistent: boolean;
}

const StoreCtx = createContext<Store | null>(null);

/* eslint-disable @typescript-eslint/no-explicit-any */
// Persistență: în artifact folosim window.storage; rulat local (Vite), cădem pe localStorage.
const storageLocal = {
  get: async (k: string) => {
    const v = localStorage.getItem(k);
    if (v == null) throw new Error('cheie inexistentă');
    return { key: k, value: v };
  },
  set: async (k: string, v: string) => { localStorage.setItem(k, v); return { key: k, value: v }; },
};

const storage = (): any => {
  if (typeof window === 'undefined') return undefined;
  return (window as any).storage ?? (typeof localStorage !== 'undefined' ? storageLocal : undefined);
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [persistent, setPersistent] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const st = storage();
        if (st) {
          const r = await st.get(KEY);
          if (r?.value) {
            const parsed = JSON.parse(r.value) as AppState;
            // migrare ușoară: câmpuri adăugate în versiuni noi primesc valori implicite
            const d = genereazaDateReale();
            parsed.setari = { ...d.setari, ...parsed.setari };
            parsed.scenarii = parsed.scenarii ?? [];
            parsed.salesReport = parsed.salesReport ?? [];
            parsed.pretFurnizori = parsed.pretFurnizori ?? d.pretFurnizori;
            parsed.rnd = parsed.rnd ?? [];
            parsed.labor = parsed.labor ?? d.labor;
            parsed.costuriOperare = parsed.costuriOperare ?? d.costuriOperare;
            parsed.reguliBusiness = parsed.reguliBusiness ?? d.reguliBusiness;
            setState(parsed);
            setPersistent(true);
            return;
          }
          setPersistent(true);
        }
      } catch { /* cheie inexistentă sau storage indisponibil */ }
      setState(genereazaDateReale());
    })();
  }, []);

  const salveaza = useCallback((s: AppState) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        const st = storage();
        if (st) { await st.set(KEY, JSON.stringify(s)); setPersistent(true); }
      } catch { setPersistent(false); }
    }, 500);
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      salveaza(next);
      return next;
    });
  }, [salveaza]);

  const reset = useCallback(() => {
    const s = genereazaDateReale();
    setState(s);
    salveaza(s);
  }, [salveaza]);

  const ctx = useMemo(() => (state ? buildCtx(state) : null), [state]);

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="font-display text-2xl font-black tracking-tight">FRYDAY <span className="text-primary">Food Intelligence</span></div>
          <div className="mt-2 text-sm text-muted-foreground">Se încarcă datele…</div>
        </div>
      </div>
    );
  }

  return <StoreCtx.Provider value={{ state, ctx: ctx!, update, reset, persistent }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('useStore în afara StoreProvider');
  return s;
}

// ---- selecția globală (Perioadă × Locație × Canal)
import type { Vedere } from './types';

export interface Selectie { luna: string; locatie: string | 'RETEA'; vedere: Vedere; }
export const SelCtx = createContext<{ sel: Selectie; setSel: (s: Selectie) => void }>({
  sel: { luna: '2026-07', locatie: 'NET', vedere: 'TOTAL' },
  setSel: () => undefined,
});
export const useSel = () => useContext(SelCtx);
