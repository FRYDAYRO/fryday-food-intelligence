import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState } from './types';
import { genereazaSeed, stareGoala } from './seed';
import { genereazaSeedNBO } from './seed-nbo';
import { VERSIUNE_REGULI_29, imbinaReguli } from './fc-clasificare';
// Baza reală FRYDAY, încorporată în aplicație: nomenclator, rețete și prețuri pe canal.
// Vânzările NU sunt incluse — se importă periodic (PMIX / Sales Mix 4.7).
import bazaFryday from '../date/baza-fryday.json';

/**
 * Aplicația pornește GOALĂ. Nu există date „de bază": rețetarul, nomenclatorul, prețurile
 * și rapoartele intră exclusiv prin import, iar fiecare cifră are astfel o proveniență.
 * O bază încorporată ar fi arătat cifre pe care nimeni nu le-a încărcat — și, la prima
 * încărcare reală, importurile s-ar fi adăugat peste ele, amestecând analizele.
 *
 * Setul FRYDAY încorporat rămâne disponibil, dar numai cerut explicit: cu VITE_CU_BAZA=1
 * la build, sau încărcat din Setări. Implicit, adresa publică nu expune nimic.
 */
const CU_BAZA = import.meta.env?.VITE_CU_BAZA === '1';
export const bazaInitiala = (): AppState =>
  CU_BAZA ? migreaza(structuredClone(bazaFryday) as unknown as AppState) : stareGoala();
import { buildCtx, type Ctx } from './engine';

const KEY = 'fryday:ffi:v1';
const KEY_SERVER = 'fryday:server';   // { url, token, utilizator } — configurat din Setări

export interface ConfigServer { url: string; token: string; utilizator: { email: string; rol: string; locatie?: string | null; nume?: string | null } }

export function configServer(): ConfigServer | null {
  try {
    const raw = window.localStorage?.getItem(KEY_SERVER);
    return raw ? JSON.parse(raw) as ConfigServer : null;
  } catch { return null; }
}
export function setConfigServer(c: ConfigServer | null): void {
  try {
    if (c) window.localStorage?.setItem(KEY_SERVER, JSON.stringify(c));
    else window.localStorage?.removeItem(KEY_SERVER);
  } catch { /* fără localStorage, serverul nu poate fi folosit */ }
}

/** Autentificare pe serverul comun; întoarce configurația de păstrat. */
export async function autentifica(url: string, email: string, parola: string): Promise<ConfigServer> {
  const r = await fetch(`${url.replace(/\/$/, '')}/api/autentificare`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, parola }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.eroare ?? 'Autentificare eșuată');
  return { url: url.replace(/\/$/, ''), token: d.token, utilizator: d.utilizator };
}

interface Store {
  state: AppState;
  ctx: Ctx;                 // contextul de calcul, memorat o singură dată per schimbare de stare
  update: (fn: (s: AppState) => AppState) => void;
  reset: () => void;
  incarcaSet: (set: 'DEMO' | 'NBO' | 'GOL' | 'FRYDAY') => void;
  atribuieAlias: (denumire: string, codProdus: string) => void;
  renuntaNemapat: (denumire: string) => void;
  persistent: boolean;
  serverStare: { revizie: number; filtrat: boolean; eroare?: string } | null;
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
  p.nemapate = p.nemapate ?? [];
  p.waste = p.waste ?? [];
  p.inventar = p.inventar ?? [];
  // colecțiile de bază: un instantaneu vechi sau incomplet nu trebuie să rupă aplicația
  p.locatii = p.locatii ?? [];
  p.furnizori = p.furnizori ?? [];
  p.ingrediente = p.ingrediente ?? [];
  p.produse = p.produse ?? [];
  p.retete = p.retete ?? [];
  p.vanzari = p.vanzari ?? [];
  p.linii29 = p.linii29 ?? [];
  p.materiale29 = p.materiale29 ?? [];
  p.importuri = p.importuri ?? [];
  p.versiuniImport = p.versiuniImport ?? [];
  p.istoricPreturi = p.istoricPreturi ?? [];
  p.auditImport = p.auditImport ?? [];
  p.auditAcces = p.auditAcces ?? [];
  // regulile deja salvate (inclusiv cele adăugate de om) rămân neatinse și în față;
  // implicitele noi intră doar în urma lor, ca vocabularul să fie același ca în punte —
  // o singură dată pe versiune de listă: ce a șters omul după aceea rămâne șters
  if (p.reguliImplicite !== VERSIUNE_REGULI_29) {
    p.reguli = imbinaReguli(p.reguli ?? [], d.reguli);
    p.reguliImplicite = VERSIUNE_REGULI_29;
  } else {
    p.reguli = p.reguli ?? [];
  }
  p.tinte = p.tinte ?? d.tinte;
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

  const [serverStare, setServerStare] = useState<{ revizie: number; filtrat: boolean; eroare?: string } | null>(null);
  const revizie = useRef(0);

  useEffect(() => {
    (async () => {
      // dacă e configurat un server comun, el e sursa de adevăr — nu stocarea din browser
      const cfg = configServer();
      if (cfg) {
        try {
          const r = await fetch(`${cfg.url}/api/stare`, { headers: { authorization: `Bearer ${cfg.token}` } });
          const d = await r.json();
          if (!r.ok) throw new Error(d?.eroare ?? `HTTP ${r.status}`);
          revizie.current = d.revizie ?? 0;
          setServerStare({ revizie: d.revizie ?? 0, filtrat: !!d.filtrat });
          setPersistent(true);
          setState(d.stare ? migreaza(d.stare as AppState) : bazaInitiala());
          return;
        } catch (e) {
          // serverul nu răspunde: continuăm local, dar spunem clar de ce
          setServerStare({ revizie: 0, filtrat: false, eroare: String((e as Error)?.message ?? e) });
        }
      }
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
      // prima pornire: baza FRYDAY (rețete + prețuri), fără vânzări și fără date demo
      setState(bazaInitiala());
    })();
  }, []);

  const salveaza = useCallback((s: AppState) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const cfg = configServer();
      if (cfg) {
        try {
          const r = await fetch(`${cfg.url}/api/stare`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.token}` },
            body: JSON.stringify({ stare: s, revizie: revizie.current }),
          });
          const d = await r.json();
          if (r.status === 409) {
            setServerStare({ revizie: d.revizieServer ?? 0, filtrat: false,
              eroare: 'Altcineva a salvat între timp. Reîncarcă pagina ca să iei versiunea lui, apoi reaplică modificarea.' });
            return;
          }
          if (!r.ok) throw new Error(d?.eroare ?? `HTTP ${r.status}`);
          revizie.current = d.revizie;
          setServerStare({ revizie: d.revizie, filtrat: false });
          setPersistent(true);
          return;
        } catch (e) {
          setServerStare({ revizie: revizie.current, filtrat: false, eroare: String((e as Error)?.message ?? e) });
          setPersistent(false);
          return;
        }
      }
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

  /**
   * Leagă o denumire din POS de un produs din nomenclator. Aliasul se salvează pe produs,
   * deci la următoarele importuri potrivirea se face singură — nu trebuie repetată alocarea.
   */
  const atribuieAlias = useCallback((denumire: string, codProdus: string) => {
    update(s => ({
      ...s,
      produse: s.produse.map(p => p.cod !== codProdus ? p
        : { ...p, aliasuri: [...new Set([...(p.aliasuri ?? []), denumire])] }),
      nemapate: s.nemapate.filter(n => n.denumire !== denumire),
    }));
  }, [update]);

  const renuntaNemapat = useCallback((denumire: string) => {
    update(s => ({ ...s, nemapate: s.nemapate.filter(n => n.denumire !== denumire) }));
  }, [update]);

  const reset = useCallback(() => {
    // resetarea readuce baza FRYDAY (rețete + prețuri), fără vânzări — nu setul demo
    const s = bazaInitiala();
    setState(s);
    salveaza(s);
  }, [salveaza]);

  const incarcaSet = useCallback((set: 'DEMO' | 'NBO' | 'GOL' | 'FRYDAY') => {
    const s = set === 'FRYDAY' ? bazaInitiala()
      : set === 'NBO' ? genereazaSeedNBO() : set === 'GOL' ? stareGoala() : genereazaSeed();
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

  return <StoreCtx.Provider value={{ state, ctx: ctx!, update, reset, incarcaSet, atribuieAlias, renuntaNemapat, persistent, serverStare }}>{children}</StoreCtx.Provider>;
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
