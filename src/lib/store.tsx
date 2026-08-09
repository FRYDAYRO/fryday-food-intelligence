import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState } from './types';
import { genereazaSeed, stareGoala } from './seed';
import { genereazaSeedNBO } from './seed-nbo';
import { buildCtx, type Ctx } from './engine';

const KEY = 'fryday:ffi:v1';

interface Store {
  state: AppState;
  ctx: Ctx;                 // contextul de calcul, memorat o singură dată per schimbare de stare
  update: (fn: (s: AppState) => AppState) => void;
  reset: () => void;
  incarcaSet: (set: 'DEMO' | 'NBO' | 'GOL') => void;
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

// Completează câmpurile adăugate în versiuni mai noi, ca o stare veche să se deschidă fără erori.
export function migreaza(brut: unknown): AppState {
  const p = brut as AppState;
  const d = genereazaSeed();
  p.setari = { ...d.setari, ...p.setari };
  p.scenarii = p.scenarii ?? [];
  p.salesReport = p.salesReport ?? [];
  p.pretFurnizori = p.pretFurnizori ?? d.pretFurnizori;
  p.rnd = p.rnd ?? [];
  p.labor = p.labor ?? d.labor;
  p.costuriOperare = p.costuriOperare ?? d.costuriOperare;
  p.reguliBusiness = p.reguliBusiness ?? d.reguliBusiness;
  return p;
}

/** Verifică sumar că un fișier chiar este un instantaneu FRYDAY. */
export function validInstantaneu(brut: unknown): brut is AppState {
  const p = brut as Partial<AppState>;
  return !!p && Array.isArray(p.produse) && Array.isArray(p.retete)
    && Array.isArray(p.ingrediente) && Array.isArray(p.vanzari) && Array.isArray(p.locatii);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [persistent, setPersistent] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const st = storage();
        if (st) {
          setPersistent(true);   // backend disponibil; lipsa cheii nu înseamnă lipsa persistenței
          let r: { value?: string } | null = null;
          try { r = await st.get(KEY); } catch { r = null; }   // prima pornire: cheia nu există încă
          if (r?.value) {
            setState(migreaza(JSON.parse(r.value)));
            return;
          }
        }
      } catch { /* storage indisponibil în acest mediu */ }
      setState(stareGoala());   // pornire curată: datele demo se încarcă doar la cerere, din Setări
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
    const s = stareGoala();   // resetarea golește; setul demo se încarcă explicit din Setări
    setState(s);
    salveaza(s);
  }, [salveaza]);

  const incarcaSet = useCallback((set: 'DEMO' | 'NBO' | 'GOL') => {
    const s = set === 'NBO' ? genereazaSeedNBO() : set === 'GOL' ? stareGoala() : genereazaSeed();
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

  return <StoreCtx.Provider value={{ state, ctx: ctx!, update, reset, incarcaSet, persistent }}>{children}</StoreCtx.Provider>;
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
  sel: { luna: '2026-07', locatie: 'RETEA', vedere: 'TOTAL' },
  setSel: () => undefined,
});
export const useSel = () => useContext(SelCtx);
