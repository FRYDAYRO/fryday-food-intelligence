import { useMemo, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import type { LinieReteta, Scenariu, Schimbare, UMCod } from '../lib/types';
import {
  aplicaInDate, aplicaScenariu, impactRetea, kpiProdus, versiuneActiva, volumeLuna,
  fmtInt, fmtLei, fmtPP, fmtPct,
} from '../lib/engine';
import { Btn, Camp, Gol, In, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';
import LiniiEditor from './shared/LiniiEditor';
import { simuleaza, type RezultatSimulare } from '../lib/simulare';
import type { AjustareMix } from '../lib/types';

const TIPURI: { v: Schimbare['tip']; l: string }[] = [
  { v: 'GRAMAJ', l: 'Modificare gramaj' },
  { v: 'ELIMINA_LINIE', l: 'Eliminare ingredient' },
  { v: 'ADAUGA_LINIE', l: 'Adăugare ingredient' },
  { v: 'INGREDIENT', l: 'Înlocuire ingredient' },
  { v: 'PRET_INGREDIENT', l: 'Modificare cost ingredient' },
  { v: 'FURNIZOR', l: 'Schimbare furnizor' },
  { v: 'PRET_VANZARE', l: 'Modificare preț de vânzare' },
  { v: 'PRODUS_NOU', l: 'Produs nou' },
  { v: 'COMBO_NOU', l: 'Combo nou' },
  { v: 'ELIMINA_PRODUS', l: 'Eliminare produs din meniu' },
];

type KpiP = ReturnType<typeof kpiProdus>;

function descrieSchimbare(s: Schimbare, st: ReturnType<typeof useStore>['state']): string {
  const numeComp = (c: string) => st.ingrediente.find(i => i.cod === c)?.denumire ?? st.retete.find(r => r.cod === c)?.denumire ?? c;
  const numeRet = (c: string) => st.retete.find(r => r.cod === c)?.denumire ?? c;
  const numeProd = (c: string) => st.produse.find(p => p.cod === c)?.denumire ?? c;
  const linia = (reteta: string, idx: number) => {
    const r = st.retete.find(x => x.cod === reteta);
    const l = r ? versiuneActiva(r).linii[idx] : undefined;
    return l ? `${numeComp(l.comp)} (${l.cant} ${l.um})` : `linia ${idx + 1}`;
  };
  switch (s.tip) {
    case 'GRAMAJ': return `${numeRet(s.reteta)}: ${linia(s.reteta, s.linie)} → ${s.cantNoua}`;
    case 'ELIMINA_LINIE': return `${numeRet(s.reteta)}: se elimină ${linia(s.reteta, s.linie)}`;
    case 'ADAUGA_LINIE': return `${numeRet(s.reteta)}: se adaugă ${numeComp(s.linieNoua.comp)} ${s.linieNoua.cant} ${s.linieNoua.um}`;
    case 'INGREDIENT': return `${numeRet(s.reteta)}: ${linia(s.reteta, s.linie)} → ${numeComp(s.compNoua)}`;
    case 'PRET_INGREDIENT': return `${numeComp(s.ingredient)}: preț nou ${fmtLei(s.pretNou)} lei`;
    case 'FURNIZOR': return `${numeComp(s.ingredient)} → furnizorul ${st.furnizori.find(f => f.cod === s.furnizorNou)?.nume ?? s.furnizorNou} (${fmtLei(s.pretNou)} lei)`;
    case 'PRET_VANZARE': return `${numeProd(s.produs)} (${s.canal === 'INSTORE' ? 'InStore' : 'Delivery'}): preț ${fmtLei(s.pretNou)} lei`;
    case 'ELIMINA_PRODUS': return `Elimină „${numeProd(s.produs)}" din meniu`
      + (s.redistribuire?.length ? ` (${s.redistribuire.map(r => `${r.pct}% → ${numeProd(r.produs)}`).join(', ')})` : ' (fără redistribuirea volumului)');
    case 'COMBO_NOU': return `Combo nou „${s.denumire}" (${s.componente.map(c => `${c.cant}× ${numeProd(c.cod)}`).join(' + ')}) la ${fmtLei(s.pretInstore)} lei`;
    case 'PRODUS_NOU': return `Produs nou „${s.denumire}" · ${s.bucInstore + s.bucDelivery} buc/lună estimate`;
  }
}

// ————————————————————————————————— Tab 1: Simulare & Impact
function TabSimulare() {
  const { state, ctx: ctx0, update } = useStore();
  const { sel } = useSel();

  const [activ, setActiv] = useState<string | null>(state.scenarii[0]?.id ?? null);
  const [numeNou, setNumeNou] = useState('');
  const [confApl, setConfApl] = useState(false);
  const scenariu = state.scenarii.find(s => s.id === activ) ?? null;

  const [tip, setTip] = useState<Schimbare['tip']>('GRAMAJ');
  const [fReteta, setFReteta] = useState(state.retete[0]?.cod ?? '');
  const [fLinie, setFLinie] = useState(0);
  const [fVal, setFVal] = useState('');
  const [fComp, setFComp] = useState('');
  const [fUm, setFUm] = useState<UMCod>('g');
  const [fCanalL, setFCanalL] = useState<LinieReteta['canal']>('AMBELE');
  const [fProdus, setFProdus] = useState(state.produse[0]?.cod ?? '');
  const [fCanal, setFCanal] = useState<'INSTORE' | 'DELIVERY'>('INSTORE');
  const [fIng, setFIng] = useState(state.ingrediente[0]?.cod ?? '');
  const [fOferta, setFOferta] = useState('');
  const [pn, setPn] = useState({ cod: 'PN01', denumire: '', pretIn: '', pretDlv: '', bucIn: '600', bucDlv: '300' });
  const [pnLinii, setPnLinii] = useState<LinieReteta[]>([]);
  const [elimRedistr, setElimRedistr] = useState({ produs: '', pct: '50' });
  const [cb, setCb] = useState({ cod: 'CB01', denumire: '', p1: '', p2: '', pretIn: '', pretDlv: '', bucIn: '400', bucDlv: '200' });

  const retetaSel = state.retete.find(r => r.cod === fReteta);
  const liniiSel = retetaSel ? versiuneActiva(retetaSel).linii : [];
  const componente = useMemo(() => [
    ...state.ingrediente.map(i => ({ cod: i.cod, nume: i.denumire, tip: i.tip === 'PACKAGING' ? 'AMBALAJ' as const : 'INGREDIENT' as const })),
    ...state.retete.filter(r => r.tip === 'SEMIPREPARAT').map(r => ({ cod: r.cod, nume: `${r.denumire} (SP)`, tip: 'SEMIPREPARAT' as const })),
  ], [state.ingrediente, state.retete]);

  const adauga = () => {
    if (!scenariu) return;
    let s: Schimbare | null = null;
    if (tip === 'GRAMAJ' && fVal) s = { tip, reteta: fReteta, linie: fLinie, cantNoua: Number(fVal) };
    if (tip === 'ELIMINA_LINIE') s = { tip, reteta: fReteta, linie: fLinie };
    if (tip === 'ADAUGA_LINIE' && fComp && fVal) {
      const c = componente.find(x => x.cod === fComp)!;
      s = { tip, reteta: fReteta, linieNoua: { comp: c.cod, tipComp: c.tip, cant: Number(fVal), um: fUm, canal: fCanalL } };
    }
    if (tip === 'INGREDIENT' && fComp) {
      const c = componente.find(x => x.cod === fComp)!;
      s = { tip, reteta: fReteta, linie: fLinie, compNoua: c.cod, tipCompNoua: c.tip };
    }
    if (tip === 'PRET_INGREDIENT' && fVal) s = { tip, ingredient: fIng, pretNou: Number(fVal) };
    if (tip === 'FURNIZOR' && fOferta) {
      const [furn, pret] = fOferta.split('|');
      s = { tip, ingredient: fIng, furnizorNou: furn, pretNou: Number(pret) };
    }
    if (tip === 'PRET_VANZARE' && fVal) s = { tip, produs: fProdus, canal: fCanal, pretNou: Number(fVal) };
    if (tip === 'PRODUS_NOU' && pn.denumire && pn.pretIn && pnLinii.length) {
      s = {
        tip, cod: pn.cod || 'PN01', denumire: pn.denumire, tva: state.setari.tvaImplicit,
        pretInstore: Number(pn.pretIn), pretDelivery: Number(pn.pretDlv || pn.pretIn),
        linii: pnLinii, bucInstore: Number(pn.bucIn) || 0, bucDelivery: Number(pn.bucDlv) || 0,
      };
    }
    if (tip === 'ELIMINA_PRODUS') {
      s = {
        tip, produs: fProdus,
        redistribuire: elimRedistr.produs && Number(elimRedistr.pct) > 0
          ? [{ produs: elimRedistr.produs, pct: Number(elimRedistr.pct) }] : undefined,
      };
    }
    if (tip === 'COMBO_NOU' && cb.denumire && cb.p1 && cb.p2 && cb.pretIn) {
      s = {
        tip, cod: cb.cod || 'CB01', denumire: cb.denumire, categorie: 'Meniuri',
        componente: [{ cod: cb.p1, cant: 1 }, { cod: cb.p2, cant: 1 }],
        pretInstore: Number(cb.pretIn), pretDelivery: Number(cb.pretDlv || cb.pretIn),
        tva: state.setari.tvaImplicit,
        bucInstore: Number(cb.bucIn) || 0, bucDelivery: Number(cb.bucDlv) || 0,
      };
    }
    if (!s) return;
    update(st => ({ ...st, scenarii: st.scenarii.map(x => x.id === scenariu.id ? { ...x, schimbari: [...x.schimbari, s!] } : x) }));
    setFVal(''); setFComp('');
  };

  const rezultat = useMemo(() => {
    if (!scenariu || !scenariu.schimbari.length) return null;
    const { ctx: ctx1, ctxBaza, produseNoi, preturiVanzare } = aplicaScenariu(state, scenariu.schimbari, { peIstoric: true });
    const retea = impactRetea(state, ctxBaza, ctx1, produseNoi, preturiVanzare, sel.luna);
    const vol = volumeLuna(state, sel.luna);
    const randuri: {
      cod: string; denumire: string; nou: boolean; bucIn: number; bucDlv: number; impactLunar: number;
      canale: { canal: 'INSTORE' | 'DELIVERY'; c0: KpiP; c1: KpiP; buc: number }[];
    }[] = [];
    for (const [cod, p1] of ctx1.produse) {
      const eNou = produseNoi.some(x => x.produs.cod === cod);
      const pnn = produseNoi.find(x => x.produs.cod === cod);
      const v = vol.get(cod) ?? { bucIn: 0, bucDlv: 0, netIn: 0, netDlv: 0 };
      const bucIn = eNou ? (pnn?.bucInstore ?? 0) : v.bucIn;
      const bucDlv = eNou ? (pnn?.bucDelivery ?? 0) : v.bucDlv;
      const canale = (['INSTORE', 'DELIVERY'] as const).map(canal => ({
        canal,
        c0: eNou ? null : kpiProdus(cod, canal, ctx0),
        c1: kpiProdus(cod, canal, ctx1),
        buc: canal === 'INSTORE' ? bucIn : bucDlv,
      }));
      const afectat = eNou || canale.some(x =>
        Math.abs((x.c1?.cost?.total ?? 0) - (x.c0?.cost?.total ?? 0)) > 0.0005 ||
        Math.abs((x.c1?.net ?? 0) - (x.c0?.net ?? 0)) > 0.0005);
      if (!afectat) continue;
      const impactLunar = canale.reduce((s2, x) => s2 + ((x.c1?.profit ?? 0) - (x.c0?.profit ?? 0)) * x.buc, 0);
      randuri.push({ cod, denumire: p1.denumire, nou: eNou, bucIn, bucDlv, impactLunar, canale });
    }
    randuri.sort((a, b) => Math.abs(b.impactLunar) - Math.abs(a.impactLunar));
    const profitNouLunar = produseNoi.reduce((s2, x) => {
      const kIn = kpiProdus(x.produs.cod, 'INSTORE', ctx1);
      const kDlv = kpiProdus(x.produs.cod, 'DELIVERY', ctx1);
      return s2 + (kIn?.profit ?? 0) * x.bucInstore + (kDlv?.profit ?? 0) * x.bucDelivery;
    }, 0);
    return { retea, randuri, produseNoi, profitNouLunar };
  }, [scenariu, state, ctx0, sel.luna]);

  const aplicaReal = () => {
    if (!scenariu) return;
    update(st => {
      const dupa = aplicaInDate(st, scenariu);
      return {
        ...dupa,
        scenarii: dupa.scenarii.map(x => x.id === scenariu.id ? { ...x, aplicat: new Date().toISOString().slice(0, 10) } : x),
      };
    });
    setConfApl(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
      <div>
        <div className="mb-2 text-sm font-bold">Simulări (istoric)</div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <In placeholder="Nume simulare nouă" value={numeNou} onChange={e => setNumeNou(e.target.value)} />
            <Btn disabled={!numeNou.trim()} onClick={() => {
              const id = `S${Date.now().toString(36)}`;
              update(s => ({ ...s, scenarii: [{ id, nume: numeNou.trim(), creat: new Date().toISOString().slice(0, 10), schimbari: [] }, ...s.scenarii] }));
              setActiv(id); setNumeNou('');
            }}>+</Btn>
          </div>
          <div className="space-y-1 rounded-md border bg-card p-2">
            {state.scenarii.length === 0 && <div className="px-2 py-1 text-sm text-muted-foreground">Nicio simulare — creează una.</div>}
            {state.scenarii.map(s => (
              <div key={s.id} className={cx('flex items-center justify-between gap-1 rounded px-2 py-1.5 text-sm', activ === s.id ? 'bg-primary/15 font-semibold' : 'hover:bg-muted')}>
                <button className="flex-1 truncate text-left" onClick={() => { setActiv(s.id); setConfApl(false); }}>
                  {s.nume}<span className="num ml-1.5 text-xs text-muted-foreground">({s.schimbari.length})</span>
                </button>
                {s.aplicat && <Insigna fel="ok">aplicat</Insigna>}
                <button className="text-danger" title="Șterge simularea" onClick={() => update(st => ({ ...st, scenarii: st.scenarii.filter(x => x.id !== s.id) }))}>✕</button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Simulările rulează pe o copie a modelului — datele reale nu se modifică până la confirmare. Impactul e calculat pe mixul lunii {sel.luna}.</p>
        </div>
      </div>

      <div>
        {!scenariu ? <Gol titlu="Creează sau alege o simulare" /> : (
          <>
            <div className="rounded-md border bg-card p-4">
              <div className="grid items-end gap-2 md:grid-cols-[200px_1fr_auto]">
                <Camp eticheta="Tip modificare">
                  <Sel value={tip} onChange={e => setTip(e.target.value as Schimbare['tip'])}>
                    {TIPURI.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </Sel>
                </Camp>

                {(tip === 'GRAMAJ' || tip === 'INGREDIENT' || tip === 'ELIMINA_LINIE' || tip === 'ADAUGA_LINIE') && (
                  <div className="grid gap-2 md:grid-cols-3">
                    <Camp eticheta="Rețeta">
                      <Sel value={fReteta} onChange={e => { setFReteta(e.target.value); setFLinie(0); }}>
                        {state.retete.map(r => <option key={r.cod} value={r.cod}>{r.denumire}</option>)}
                      </Sel>
                    </Camp>
                    {tip !== 'ADAUGA_LINIE' && (
                      <Camp eticheta="Linia">
                        <Sel value={fLinie} onChange={e => setFLinie(Number(e.target.value))}>
                          {liniiSel.map((l, i) => <option key={i} value={i}>{componente.find(c => c.cod === l.comp)?.nume ?? l.comp} · {l.cant} {l.um}</option>)}
                        </Sel>
                      </Camp>
                    )}
                    {tip === 'GRAMAJ' && <Camp eticheta={`Cantitate nouă (${liniiSel[fLinie]?.um ?? ''})`}><In type="number" step="any" value={fVal} onChange={e => setFVal(e.target.value)} /></Camp>}
                    {tip === 'INGREDIENT' && (
                      <Camp eticheta="Componenta nouă">
                        <Sel value={fComp} onChange={e => setFComp(e.target.value)}>
                          <option value="">— alege —</option>
                          {componente.map(c => <option key={c.cod} value={c.cod}>{c.nume}</option>)}
                        </Sel>
                      </Camp>
                    )}
                    {tip === 'ADAUGA_LINIE' && (
                      <>
                        <Camp eticheta="Componenta">
                          <Sel value={fComp} onChange={e => setFComp(e.target.value)}>
                            <option value="">— alege —</option>
                            {componente.map(c => <option key={c.cod} value={c.cod}>{c.nume}</option>)}
                          </Sel>
                        </Camp>
                        <div className="grid grid-cols-3 gap-2">
                          <Camp eticheta="Cant."><In type="number" step="any" value={fVal} onChange={e => setFVal(e.target.value)} /></Camp>
                          <Camp eticheta="UM">
                            <Sel value={fUm} onChange={e => setFUm(e.target.value as UMCod)}>
                              {(['g', 'kg', 'ml', 'l', 'buc'] as UMCod[]).map(u => <option key={u}>{u}</option>)}
                            </Sel>
                          </Camp>
                          <Camp eticheta="Canal">
                            <Sel value={fCanalL} onChange={e => setFCanalL(e.target.value as LinieReteta['canal'])}>
                              <option value="AMBELE">Ambele</option><option value="INSTORE">InStore</option><option value="DELIVERY">Delivery</option>
                            </Sel>
                          </Camp>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {(tip === 'PRET_INGREDIENT' || tip === 'FURNIZOR') && (
                  <div className="grid gap-2 md:grid-cols-2">
                    <Camp eticheta="Ingredient / ambalaj">
                      <Sel value={fIng} onChange={e => { setFIng(e.target.value); setFOferta(''); }}>
                        {state.ingrediente.map(i => <option key={i.cod} value={i.cod}>{i.denumire}</option>)}
                      </Sel>
                    </Camp>
                    {tip === 'PRET_INGREDIENT'
                      ? <Camp eticheta="Preț net nou (lei/UM bază)"><In type="number" step="0.01" value={fVal} onChange={e => setFVal(e.target.value)} /></Camp>
                      : (
                        <Camp eticheta="Oferta de furnizor (din Prețuri Furnizori)">
                          <Sel value={fOferta} onChange={e => setFOferta(e.target.value)}>
                            <option value="">— alege oferta —</option>
                            {state.pretFurnizori.filter(o => o.ingredient === fIng).map(o => (
                              <option key={`${o.furnizor}|${o.pret}`} value={`${o.furnizor}|${o.pret}`}>
                                {state.furnizori.find(f => f.cod === o.furnizor)?.nume ?? o.furnizor} — {o.pret} lei
                              </option>
                            ))}
                          </Sel>
                        </Camp>
                      )}
                  </div>
                )}

                {tip === 'ELIMINA_PRODUS' && (
                  <div className="grid gap-2 md:grid-cols-3">
                    <Camp eticheta="Produsul scos din meniu">
                      <Sel value={fProdus} onChange={e => setFProdus(e.target.value)}>
                        {state.produse.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                      </Sel>
                    </Camp>
                    <Camp eticheta="Volumul se transferă către (opțional)">
                      <Sel value={elimRedistr.produs} onChange={e => setElimRedistr({ ...elimRedistr, produs: e.target.value })}>
                        <option value="">— se pierde complet —</option>
                        {state.produse.filter(p => p.cod !== fProdus).map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                      </Sel>
                    </Camp>
                    <Camp eticheta="Procent transferat"><In type="number" value={elimRedistr.pct} onChange={e => setElimRedistr({ ...elimRedistr, pct: e.target.value })} /></Camp>
                  </div>
                )}
                {tip === 'COMBO_NOU' && (
                  <div className="grid gap-2 md:grid-cols-4">
                    <Camp eticheta="Cod"><In value={cb.cod} onChange={e => setCb({ ...cb, cod: e.target.value })} /></Camp>
                    <Camp eticheta="Denumire combo"><In value={cb.denumire} onChange={e => setCb({ ...cb, denumire: e.target.value })} placeholder="ex. Combo Wrap & Cartofi" /></Camp>
                    <Camp eticheta="Componenta 1">
                      <Sel value={cb.p1} onChange={e => setCb({ ...cb, p1: e.target.value })}>
                        <option value="">— alege —</option>
                        {state.produse.filter(p => p.tip !== 'COMBO').map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                      </Sel>
                    </Camp>
                    <Camp eticheta="Componenta 2">
                      <Sel value={cb.p2} onChange={e => setCb({ ...cb, p2: e.target.value })}>
                        <option value="">— alege —</option>
                        {state.produse.filter(p => p.tip !== 'COMBO').map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                      </Sel>
                    </Camp>
                    <Camp eticheta="Preț InStore"><In type="number" step="0.1" value={cb.pretIn} onChange={e => setCb({ ...cb, pretIn: e.target.value })} /></Camp>
                    <Camp eticheta="Preț Delivery"><In type="number" step="0.1" value={cb.pretDlv} onChange={e => setCb({ ...cb, pretDlv: e.target.value })} /></Camp>
                    <Camp eticheta="Buc/lună InStore"><In type="number" value={cb.bucIn} onChange={e => setCb({ ...cb, bucIn: e.target.value })} /></Camp>
                    <Camp eticheta="Buc/lună Delivery"><In type="number" value={cb.bucDlv} onChange={e => setCb({ ...cb, bucDlv: e.target.value })} /></Camp>
                  </div>
                )}
                {tip === 'PRET_VANZARE' && (
                  <div className="grid gap-2 md:grid-cols-3">
                    <Camp eticheta="Produs">
                      <Sel value={fProdus} onChange={e => setFProdus(e.target.value)}>
                        {state.produse.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                      </Sel>
                    </Camp>
                    <Camp eticheta="Canal">
                      <Sel value={fCanal} onChange={e => setFCanal(e.target.value as 'INSTORE' | 'DELIVERY')}>
                        <option value="INSTORE">InStore</option><option value="DELIVERY">Delivery</option>
                      </Sel>
                    </Camp>
                    <Camp eticheta="Preț brut nou (lei)"><In type="number" step="0.1" value={fVal} onChange={e => setFVal(e.target.value)} /></Camp>
                  </div>
                )}

                {tip === 'PRODUS_NOU' && (
                  <div className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-5">
                      <Camp eticheta="Denumire"><In value={pn.denumire} onChange={e => setPn({ ...pn, denumire: e.target.value })} /></Camp>
                      <Camp eticheta="Preț InStore"><In type="number" step="0.1" value={pn.pretIn} onChange={e => setPn({ ...pn, pretIn: e.target.value })} /></Camp>
                      <Camp eticheta="Preț Delivery"><In type="number" step="0.1" value={pn.pretDlv} onChange={e => setPn({ ...pn, pretDlv: e.target.value })} /></Camp>
                      <Camp eticheta="Buc/lună InStore"><In type="number" value={pn.bucIn} onChange={e => setPn({ ...pn, bucIn: e.target.value })} /></Camp>
                      <Camp eticheta="Buc/lună Delivery"><In type="number" value={pn.bucDlv} onChange={e => setPn({ ...pn, bucDlv: e.target.value })} /></Camp>
                    </div>
                    <LiniiEditor linii={pnLinii} componente={componente} onChange={setPnLinii} />
                  </div>
                )}

                <Btn onClick={adauga}>Adaugă</Btn>
              </div>
            </div>

            {scenariu.schimbari.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {scenariu.schimbari.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                    <Insigna fel="info">{TIPURI.find(t => t.v === s.tip)?.l}</Insigna>
                    <span className="flex-1">{descrieSchimbare(s, state)}</span>
                    {!scenariu.aplicat && (
                      <button className="text-danger" title="Elimină"
                        onClick={() => update(st => ({ ...st, scenarii: st.scenarii.map(x => x.id === scenariu.id ? { ...x, schimbari: x.schimbari.filter((_, j) => j !== i) } : x) }))}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {rezultat && (
              <>
                <Rezumat scenariu={scenariu} rezultat={rezultat} luna={sel.luna} />
                <PanouSimulare rez={simuleaza(state, ctx0, { schimbari: scenariu.schimbari, mix: scenariu.mix, luna: sel.luna })} />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {scenariu.aplicat ? (
                    <Insigna fel="ok">Aplicat în datele reale la {scenariu.aplicat} — rețetele au primit versiuni noi, prețurile intrări datate</Insigna>
                  ) : !confApl ? (
                    <Btn onClick={() => setConfApl(true)}>Aplică în datele reale…</Btn>
                  ) : (
                    <>
                      <span className="text-sm">Confirmi? Rețetele modificate primesc <b>versiuni noi</b> (istoric păstrat), prețurile de ingredient intrări valabile de azi, iar prețurile de vânzare se actualizează.</span>
                      <Btn onClick={aplicaReal}>Da, aplică</Btn>
                      <Btn varianta="discret" onClick={() => setConfApl(false)}>Nu încă</Btn>
                    </>
                  )}
                </div>

                <Titlu>Produse afectate — înainte → după</Titlu>
                {rezultat.randuri.length === 0 ? <Gol titlu="Nicio schimbare de cost sau preț detectată" /> : (
                  <T dens>
                    <thead><tr><Th>Produs</Th><Th>Canal</Th><Th dr>Buc/lună</Th><Th dr>Cost</Th><Th dr>FC %</Th><Th dr>Profit/buc</Th><Th dr>Marjă</Th><Th dr>Impact lei/lună</Th></tr></thead>
                    <tbody>
                      {rezultat.randuri.flatMap(r => r.canale.map((c, i) => {
                        const d = (a: number | null | undefined, b: number | null | undefined, f: (x: number | null) => string) =>
                          a == null && b == null ? '—' : `${f(a ?? null)} → ${f(b ?? null)}`;
                        const dP = ((c.c1?.profit ?? 0) - (c.c0?.profit ?? 0)) * c.buc;
                        return (
                          <tr key={`${r.cod}-${c.canal}`}>
                            {i === 0 && <Td className="align-top font-semibold">{r.denumire}{r.nou && <span className="ml-1.5"><Insigna fel="ok">NOU</Insigna></span>}</Td>}
                            {i !== 0 && <Td />}
                            <Td>{c.canal === 'INSTORE' ? 'InStore' : 'Delivery'}</Td>
                            <Td dr>{fmtInt(c.buc)}</Td>
                            <Td dr>{d(c.c0?.cost?.total, c.c1?.cost?.total, x => fmtLei(x))}</Td>
                            <Td dr>{d(c.c0?.fc, c.c1?.fc, x => fmtPct(x))}</Td>
                            <Td dr>{d(c.c0?.profit, c.c1?.profit, x => fmtLei(x))}</Td>
                            <Td dr>{d(c.c0?.marja, c.c1?.marja, x => fmtPct(x))}</Td>
                            <Td dr className={dP > 0.5 ? 'text-ok' : dP < -0.5 ? 'text-danger' : ''}>{dP >= 0 ? '+' : ''}{fmtInt(dP)}</Td>
                          </tr>
                        );
                      }))}
                    </tbody>
                  </T>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ————————————————————————————————— Product Impact Summary (cerința 6)
function Rezumat({ scenariu, rezultat, luna }: {
  scenariu: Scenariu;
  rezultat: { retea: ReturnType<typeof impactRetea>; produseNoi: { produs: { cod: string; denumire: string } }[]; profitNouLunar: number; randuri: unknown[] };
  luna: string;
}) {
  const { state } = useStore();
  const { inainte, dupa } = rezultat.retea;
  const dFc = dupa.fc != null && inainte.fc != null ? dupa.fc - inainte.fc : null;
  const dProfit = dupa.profit - inainte.profit;
  const dNet = dupa.net - inainte.net;
  const contributie = rezultat.produseNoi.length && dupa.profit > 0 ? (rezultat.profitNouLunar / dupa.profit) * 100 : null;

  const verdict = [
    dFc != null ? `Food Cost teoretic ${dFc <= 0 ? 'scade' : 'crește'} cu ${fmtPP(Math.abs(dFc)).replace('+', '')}` : null,
    `profitul ${dProfit >= 0 ? 'crește' : 'scade'} cu ${fmtInt(Math.abs(dProfit))} lei/lună (${fmtInt(Math.abs(dProfit) * 12)} lei/an)`,
    dNet !== 0 ? `vânzările se ajustează cu ${dNet >= 0 ? '+' : '−'}${fmtInt(Math.abs(dNet))} lei/lună` : null,
  ].filter(Boolean).join(', ');

  return (
    <div className="mt-4 rounded-md border-2 border-primary/50 bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-display text-base font-extrabold">Product Impact Summary</div>
        <div className="text-xs text-muted-foreground">estimat pe mixul de vânzări al lunii {luna}, toată rețeaua FRYDAY</div>
      </div>

      <div className="mt-2 text-sm">
        <span className="font-semibold">Ce s-a modificat:</span>{' '}
        {scenariu.schimbari.map(s => descrieSchimbare(s, state)).join(' · ')}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded border bg-muted/30 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Food Cost rețea</div>
          <div className="num mt-0.5 text-lg font-semibold">{fmtPct(inainte.fc)} → {fmtPct(dupa.fc)}</div>
          <div className={cx('num text-sm font-bold', dFc != null && dFc > 0 ? 'text-danger' : 'text-ok')}>{fmtPP(dFc)}</div>
        </div>
        <div className="rounded border bg-muted/30 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Profit / lună</div>
          <div className="num mt-0.5 text-lg font-semibold">{fmtInt(inainte.profit)} → {fmtInt(dupa.profit)} lei</div>
          <div className={cx('num text-sm font-bold', dProfit >= 0 ? 'text-ok' : 'text-danger')}>{dProfit >= 0 ? '+' : ''}{fmtInt(dProfit)} lei</div>
        </div>
        <div className="rounded border bg-muted/30 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Profit / an (run-rate)</div>
          <div className="num mt-0.5 text-lg font-semibold">{fmtInt(dupa.profit * 12)} lei</div>
          <div className={cx('num text-sm font-bold', dProfit >= 0 ? 'text-ok' : 'text-danger')}>{dProfit >= 0 ? '+' : ''}{fmtInt(dProfit * 12)} lei</div>
        </div>
        <div className="rounded border bg-muted/30 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{contributie != null ? 'Contribuția produsului nou' : 'Vânzări nete / lună'}</div>
          {contributie != null ? (
            <>
              <div className="num mt-0.5 text-lg font-semibold">{fmtPct(contributie)}</div>
              <div className="num text-sm text-muted-foreground">{fmtInt(rezultat.profitNouLunar)} lei/lună din profitul rețelei</div>
            </>
          ) : (
            <>
              <div className="num mt-0.5 text-lg font-semibold">{fmtInt(dupa.net)} lei</div>
              <div className="num text-sm text-muted-foreground">{dNet >= 0 ? '+' : ''}{fmtInt(dNet)} lei față de azi</div>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 border-t pt-2 text-sm"><b>Concluzie:</b> {verdict}.</p>
    </div>
  );
}

// ————————————————————————————————— Panoul Business Simulation: răspunsurile complete
function PanouSimulare({ rez }: { rez: RezultatSimulare }) {
  const semn = (n: number) => (n >= 0 ? '+' : '');
  return (
    <div className="mt-4">
      <div className="rounded-md border-2 border-primary/50 bg-card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-display text-base font-extrabold">Business Simulation — răspunsurile complete</div>
          <div className="text-xs text-muted-foreground">calculat pe volumele reale din PMIX ({rez.luna}), fără a modifica datele</div>
        </div>
        <div className="mt-2 grid gap-x-6 gap-y-2 md:grid-cols-2">
          {rez.raspunsuri.map((r, i) => (
            <div key={i} className="border-b pb-1.5 last:border-b-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.intrebare}</div>
              <div className="num text-sm">{r.raspuns}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Food Cost</div>
          <div className="num mt-0.5 text-lg font-semibold">{fmtPct(rez.fc0)} → {fmtPct(rez.fc1)}</div>
          <div className={cx('num text-sm font-bold', (rez.dFcPP ?? 0) > 0 ? 'text-danger' : 'text-ok')}>{fmtPP(rez.dFcPP)}</div>
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prime Cost (Food + Labor)</div>
          {rez.prime0 != null ? <>
            <div className="num mt-0.5 text-lg font-semibold">{fmtPct(rez.prime0)} → {fmtPct(rez.prime1)}</div>
            <div className={cx('num text-sm font-bold', (rez.dPrimePP ?? 0) > 0 ? 'text-danger' : 'text-ok')}>{fmtPP(rez.dPrimePP)}</div>
          </> : <div className="mt-0.5 text-sm text-muted-foreground">fără cost de personal în lună</div>}
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Profit / lună</div>
          <div className="num mt-0.5 text-lg font-semibold">{fmtInt(rez.profit1)} lei</div>
          <div className={cx('num text-sm font-bold', rez.dProfitLunar >= 0 ? 'text-ok' : 'text-danger')}>{semn(rez.dProfitLunar)}{fmtInt(rez.dProfitLunar)} lei</div>
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Impact / an</div>
          <div className={cx('num mt-0.5 text-lg font-semibold', rez.dProfitAnual >= 0 ? 'text-ok' : 'text-danger')}>{semn(rez.dProfitAnual)}{fmtInt(rez.dProfitAnual)} lei</div>
          <div className="num text-sm text-muted-foreground">run-rate 12 luni</div>
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vânzări nete</div>
          <div className="num mt-0.5 text-lg font-semibold">{fmtInt(rez.net1)} lei</div>
          <div className="num text-sm text-muted-foreground">{semn(rez.net1 - rez.net0)}{fmtInt(rez.net1 - rez.net0)} · {fmtInt(rez.buc1)} buc</div>
        </div>
      </div>

      {rez.afectate.length > 0 && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
          <div>
            <div className="mb-2 text-sm font-bold">Produse afectate ({rez.afectate.length})</div>
            <T dens>
              <thead><tr><Th>Produs</Th><Th>Cauza</Th><Th dr>Bucăți</Th><Th dr>FC %</Th><Th dr>Profit</Th><Th dr>Δ profit</Th><Th dr>Mix vânzări</Th></tr></thead>
              <tbody>
                {rez.afectate.map(r => (
                  <tr key={r.cod}>
                    <Td>{r.denumire}</Td>
                    <Td><Insigna fel={r.motiv === 'NOU' ? 'ok' : r.motiv === 'ELIMINAT' ? 'EXCLUS' : r.motiv === 'PRET' ? 'FOOD' : r.motiv === 'VOLUM' ? 'info' : 'warn'}>
                      {r.motiv === 'NOU' ? 'produs nou' : r.motiv === 'ELIMINAT' ? 'eliminat' : r.motiv === 'PRET' ? 'preț' : r.motiv === 'COST' ? 'cost' : r.motiv === 'VOLUM' ? 'volum' : 'mixt'}
                    </Insigna></Td>
                    <Td dr>{fmtInt(r.buc0)} → {fmtInt(r.buc1)}</Td>
                    <Td dr>{fmtPct(r.fc0)} → {fmtPct(r.fc1)}</Td>
                    <Td dr>{fmtInt(r.profit1)}</Td>
                    <Td dr className={cx('font-semibold', r.dProfit >= 0 ? 'text-ok' : 'text-danger')}>{semn(r.dProfit)}{fmtInt(r.dProfit)}</Td>
                    <Td dr>{fmtPct(r.mix0)} → {fmtPct(r.mix1)}</Td>
                  </tr>
                ))}
              </tbody>
            </T>
          </div>
          <div>
            <div className="mb-2 text-sm font-bold">Categorii afectate</div>
            <T dens>
              <thead><tr><Th>Categorie</Th><Th dr>FC %</Th><Th dr>Δ profit</Th><Th dr>Mix vânzări</Th></tr></thead>
              <tbody>
                {(rez.categoriiAfectate.length ? rez.categoriiAfectate : rez.categorii).map(c => (
                  <tr key={c.categorie}>
                    <Td>{c.categorie}</Td>
                    <Td dr>{fmtPct(c.fc0)} → {fmtPct(c.fc1)}</Td>
                    <Td dr className={cx('font-semibold', c.dProfit >= 0 ? 'text-ok' : 'text-danger')}>{semn(c.dProfit)}{fmtInt(c.dProfit)}</Td>
                    <Td dr>{fmtPct(c.mixVanzari0)} → {fmtPct(c.mixVanzari1)}</Td>
                  </tr>
                ))}
              </tbody>
            </T>
          </div>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————— Scenariul de mix (volume definite de utilizator)
function TabMix() {
  const { state, ctx, update } = useStore();
  const { sel } = useSel();
  const [activ, setActiv] = useState<string | null>(state.scenarii[0]?.id ?? null);
  const scenariu = state.scenarii.find(s => s.id === activ) ?? state.scenarii[0] ?? null;
  const mix = scenariu?.mix ?? [];

  const setMix = (m: AjustareMix[]) => {
    if (!scenariu) return;
    update(st => ({ ...st, scenarii: st.scenarii.map(x => x.id === scenariu.id ? { ...x, mix: m } : x) }));
  };

  const rez = useMemo(() => scenariu ? simuleaza(state, ctx, { schimbari: scenariu.schimbari, mix: scenariu.mix, luna: sel.luna }) : null,
    [scenariu, state, ctx, sel.luna]);

  if (!scenariu) return <Gol titlu="Creează întâi o simulare" sub="Scenariile de mix se atașează unei simulări create în tabul Scenariu & impact." />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Camp eticheta="Simularea">
          <Sel value={scenariu.id} onChange={e => setActiv(e.target.value)}>
            {state.scenarii.map(s => <option key={s.id} value={s.id}>{s.nume}</option>)}
          </Sel>
        </Camp>
        <p className="pb-1.5 text-xs text-muted-foreground">
          Introdu cum se schimbă volumele („burgerul +10%, cola −20%") și vezi efectul asupra Food Cost, Prime Cost și profitului. Costurile rămân cele din scenariu.
        </p>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="space-y-1.5">
          {mix.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <Sel className="h-8 flex-1" value={m.produs}
                onChange={e => setMix(mix.map((x, j) => j === i ? { ...x, produs: e.target.value } : x))}>
                {state.produse.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
              </Sel>
              <In type="number" step="1" className="h-8 w-24 text-right" value={m.deltaPct}
                onChange={e => setMix(mix.map((x, j) => j === i ? { ...x, deltaPct: Number(e.target.value) } : x))} />
              <span className="text-sm text-muted-foreground">% volum</span>
              <button className="text-danger" title="Șterge" onClick={() => setMix(mix.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <Btn varianta="linie" className="mt-2 h-8" onClick={() => setMix([...mix, { produs: state.produse[0].cod, deltaPct: 10 }])}>
          + Ajustare de volum
        </Btn>
      </div>

      {rez && (mix.length > 0 || scenariu.schimbari.length > 0) && <PanouSimulare rez={rez} />}
    </div>
  );
}

// ————————————————————————————————— Tab 3: Comparația simulărilor (cerința 7)
function TabComparatie() {
  const { state, ctx: ctx0 } = useStore();
  const { sel } = useSel();
  const [alese, setAlese] = useState<Set<string>>(new Set(state.scenarii.slice(0, 3).map(s => s.id)));

  const randuri = useMemo(() => state.scenarii.filter(s => alese.has(s.id)).map(s => {
    if (!s.schimbari.length) return { s, r: null };
    const { ctx: ctx1, ctxBaza, produseNoi, preturiVanzare } = aplicaScenariu(state, s.schimbari, { peIstoric: true });
    return { s, r: impactRetea(state, ctxBaza, ctx1, produseNoi, preturiVanzare, sel.luna) };
  }), [state, ctx0, alese, sel.luna]);

  if (state.scenarii.length === 0) return <Gol titlu="Nu există simulări de comparat" sub="Creează simulări în tabul „Simulare & impact”." />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {state.scenarii.map(s => (
          <button key={s.id}
            onClick={() => setAlese(a => { const n = new Set(a); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
            className={cx('rounded-md border px-3 py-1.5 text-sm font-semibold', alese.has(s.id) ? 'border-primary bg-primary/15' : 'bg-card hover:bg-muted')}>
            {s.nume}{s.aplicat && ' ✓'}
          </button>
        ))}
      </div>
      <T>
        <thead><tr><Th>Simulare</Th><Th dr>Modificări</Th><Th dr>FC rețea după</Th><Th dr>Δ FC</Th><Th dr>Δ Profit / lună</Th><Th dr>Δ Profit / an</Th><Th dr>Δ Vânzări / lună</Th><Th>Status</Th></tr></thead>
        <tbody>
          {randuri.map(({ s, r }) => {
            const dFc = r && r.dupa.fc != null && r.inainte.fc != null ? r.dupa.fc - r.inainte.fc : null;
            const dP = r ? r.dupa.profit - r.inainte.profit : null;
            const dN = r ? r.dupa.net - r.inainte.net : null;
            return (
              <tr key={s.id}>
                <Td className="font-semibold">{s.nume}<div className="text-xs font-normal text-muted-foreground">{s.creat}</div></Td>
                <Td dr>{s.schimbari.length}</Td>
                <Td dr>{fmtPct(r?.dupa.fc ?? null)}</Td>
                <Td dr className={dFc != null && dFc > 0 ? 'text-danger' : dFc != null ? 'text-ok' : ''}>{fmtPP(dFc)}</Td>
                <Td dr className={dP != null && dP < 0 ? 'text-danger' : dP != null ? 'text-ok' : ''}>{dP != null ? `${dP >= 0 ? '+' : ''}${fmtInt(dP)}` : '—'}</Td>
                <Td dr>{dP != null ? `${dP >= 0 ? '+' : ''}${fmtInt(dP * 12)}` : '—'}</Td>
                <Td dr>{dN != null ? `${dN >= 0 ? '+' : ''}${fmtInt(dN)}` : '—'}</Td>
                <Td>{s.aplicat ? <Insigna fel="ok">aplicat {s.aplicat}</Insigna> : <Insigna fel="info">simulare</Insigna>}</Td>
              </tr>
            );
          })}
        </tbody>
      </T>
      <p className="mt-2 text-xs text-muted-foreground">Toate simulările sunt evaluate pe aceeași bază: mixul de vânzări al lunii {sel.luna}, întreaga rețea. Referința „înainte" este starea reală curentă.</p>
    </div>
  );
}

// ————————————————————————————————— shell-ul modulului
export default function BusinessSimulation() {
  const [tab, setTab] = useState<'sim' | 'mix' | 'comp'>('sim');
  return (
    <div>
      <Titlu>Business Simulation Engine</Titlu>
      <p className="-mt-2 mb-3 text-sm text-muted-foreground">
        Testează orice decizie înainte de implementare: preț, gramaj, ingredient, furnizor, produs nou, combo nou, eliminare din meniu sau mutări de volum.
        Motorul răspunde la Food Cost, Prime Cost, profit lunar și anual, produsele și categoriile afectate și mixul de vânzări — pe o copie a datelor.
      </p>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border bg-card p-1">
        {([['sim', 'Scenariu & impact'], ['mix', 'Scenariu de mix'], ['comp', 'Comparația simulărilor']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx('rounded px-3 py-1.5 text-sm font-semibold', tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{l}</button>
        ))}
      </div>
      {tab === 'sim' && <TabSimulare />}
      {tab === 'mix' && <TabMix />}
      {tab === 'comp' && <TabComparatie />}
    </div>
  );
}
