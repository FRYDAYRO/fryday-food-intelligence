import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import type { VariantaRnD } from '../lib/types';
import { aplicaInDate, aplicaScenariu, kpiProdus, fmtInt, fmtLei, fmtPct } from '../lib/engine';
import { Btn, Camp, Gol, In, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';
import LiniiEditor from './shared/LiniiEditor';

const STATUS: Record<VariantaRnD['status'], { fel: 'info' | 'FOOD' | 'ok'; nume: string }> = {
  CIORNA: { fel: 'info', nume: 'ciornă' },
  APROBAT: { fel: 'FOOD', nume: 'aprobat' },
  PUBLICAT: { fel: 'ok', nume: 'publicat' },
};

export default function RnDLab() {
  const { state, ctx, update } = useStore();
  const [activ, setActiv] = useState<string | null>(state.rnd[0]?.id ?? null);
  const [numeNou, setNumeNou] = useState('');
  const [comparaCu, setComparaCu] = useState(state.produse[0]?.cod ?? '');
  const [confPub, setConfPub] = useState(false);

  const v = state.rnd.find(x => x.id === activ) ?? null;

  const componente = useMemo(() => [
    ...state.ingrediente.filter(i => i.activ).map(i => ({ cod: i.cod, nume: `${i.denumire}${i.tip === 'PACKAGING' ? ' (ambalaj)' : ''}`, tip: i.tip === 'PACKAGING' ? 'AMBALAJ' as const : 'INGREDIENT' as const })),
    ...state.retete.filter(r => r.tip === 'SEMIPREPARAT').map(r => ({ cod: r.cod, nume: `${r.denumire} (SP)`, tip: 'SEMIPREPARAT' as const })),
  ], [state.ingrediente, state.retete]);

  const seteaza = (patch: Partial<VariantaRnD>) => {
    if (!v) return;
    update(s => ({ ...s, rnd: s.rnd.map(x => x.id === v.id ? { ...x, ...patch } : x) }));
  };

  // simulare live pe o copie a modelului (nu atinge datele reale)
  const sim = useMemo(() => {
    if (!v || !v.linii.length) return null;
    const { ctx: ctx1 } = aplicaScenariu(state, [{
      tip: 'PRODUS_NOU', cod: v.cod || 'RD-X', denumire: v.denumire || v.nume, tva: v.tva,
      pretInstore: v.pretInstore || 0, pretDelivery: v.pretDelivery || v.pretInstore || 0,
      linii: v.linii, bucInstore: v.bucInstore, bucDelivery: v.bucDelivery,
    }]);
    const kIn = kpiProdus(v.cod || 'RD-X', 'INSTORE', ctx1);
    const kDlv = kpiProdus(v.cod || 'RD-X', 'DELIVERY', ctx1);
    const profitLunar = (kIn?.profit ?? 0) * v.bucInstore + (kDlv?.profit ?? 0) * v.bucDelivery;
    const netLunar = (kIn?.net ?? 0) * v.bucInstore + (kDlv?.net ?? 0) * v.bucDelivery;
    return { kIn, kDlv, profitLunar, netLunar };
  }, [v, state]);

  const kComp = useMemo(() => comparaCu ? {
    in: kpiProdus(comparaCu, 'INSTORE', ctx), dlv: kpiProdus(comparaCu, 'DELIVERY', ctx),
  } : null, [comparaCu, ctx]);

  const toateVariantele = useMemo(() => state.rnd.map(x => {
    if (!x.linii.length) return { x, kIn: null, profitLunar: 0 };
    const { ctx: c1 } = aplicaScenariu(state, [{
      tip: 'PRODUS_NOU', cod: x.cod || `RD-${x.id}`, denumire: x.denumire || x.nume, tva: x.tva,
      pretInstore: x.pretInstore || 0, pretDelivery: x.pretDelivery || x.pretInstore || 0,
      linii: x.linii, bucInstore: x.bucInstore, bucDelivery: x.bucDelivery,
    }]);
    const kIn = kpiProdus(x.cod || `RD-${x.id}`, 'INSTORE', c1);
    const kDlv = kpiProdus(x.cod || `RD-${x.id}`, 'DELIVERY', c1);
    return { x, kIn, profitLunar: (kIn?.profit ?? 0) * x.bucInstore + (kDlv?.profit ?? 0) * x.bucDelivery };
  }), [state]);

  const publica = () => {
    if (!v || v.status !== 'APROBAT') return;
    update(s => {
      const dupa = aplicaInDate(s, {
        nume: `R&D: ${v.nume}`,
        schimbari: [{
          tip: 'PRODUS_NOU', cod: v.cod, denumire: v.denumire || v.nume, tva: v.tva,
          pretInstore: v.pretInstore, pretDelivery: v.pretDelivery || v.pretInstore,
          linii: v.linii, bucInstore: v.bucInstore, bucDelivery: v.bucDelivery,
        }],
      });
      return {
        ...dupa,
        produse: dupa.produse.map(p => p.cod === v.cod ? { ...p, denumire: v.denumire || v.nume, categorie: v.categorie || 'Produse noi' } : p),
        rnd: dupa.rnd.map(x => x.id === v.id ? { ...x, status: 'PUBLICAT' as const, publicat: new Date().toISOString().slice(0, 10) } : x),
      };
    });
    setConfPub(false);
  };

  const codOcupat = v ? state.produse.some(p => p.cod === v.cod) && v.status !== 'PUBLICAT' : false;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div>
        <Titlu>R&D Lab</Titlu>
        <div className="space-y-2">
          <div className="flex gap-2">
            <In placeholder="Variantă nouă (nume)" value={numeNou} onChange={e => setNumeNou(e.target.value)} />
            <Btn disabled={!numeNou.trim()} onClick={() => {
              const id = `R${Date.now().toString(36)}`;
              const nr = state.rnd.length + 1;
              update(s => ({
                ...s,
                rnd: [{
                  id, nume: numeNou.trim(), creat: new Date().toISOString().slice(0, 10), status: 'CIORNA',
                  cod: `RD${String(nr).padStart(2, '0')}`, denumire: numeNou.trim(), categorie: 'R&D',
                  pretInstore: 0, pretDelivery: 0, tva: s.setari.tvaImplicit,
                  linii: [], bucInstore: 600, bucDelivery: 300,
                }, ...s.rnd],
              }));
              setActiv(id); setNumeNou('');
            }}>+</Btn>
          </div>
          <div className="space-y-1 rounded-md border bg-card p-2">
            {state.rnd.length === 0 && <div className="px-2 py-1 text-sm text-muted-foreground">Niciun proiect R&D — creează o variantă.</div>}
            {state.rnd.map(x => (
              <div key={x.id} className={cx('flex items-center justify-between gap-1 rounded px-2 py-1.5 text-sm', activ === x.id ? 'bg-primary/15 font-semibold' : 'hover:bg-muted')}>
                <button className="flex-1 truncate text-left" onClick={() => { setActiv(x.id); setConfPub(false); }}>{x.nume}</button>
                <Insigna fel={STATUS[x.status].fel}>{STATUS[x.status].nume}</Insigna>
                {x.status !== 'PUBLICAT' && (
                  <button className="text-danger" title="Șterge varianta" onClick={() => update(s => ({ ...s, rnd: s.rnd.filter(y => y.id !== x.id) }))}>✕</button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Laboratorul rulează pe o copie a modelului de cost. Nimic nu intră în nomenclator până la aprobarea și publicarea variantei.</p>
        </div>
      </div>

      <div>
        {!v ? <Gol titlu="Alege sau creează o variantă R&D" /> : (
          <>
            <Titlu actiuni={
              <div className="flex flex-wrap items-center gap-2">
                <Btn varianta="linie" onClick={() => {
                  const id = `R${Date.now().toString(36)}`;
                  update(s => ({ ...s, rnd: [{ ...v, id, nume: `${v.nume} (v${state.rnd.filter(x => x.nume.startsWith(v.nume)).length + 1})`, status: 'CIORNA', publicat: undefined }, ...s.rnd] }));
                  setActiv(id);
                }}>Duplică varianta</Btn>
                {v.status === 'CIORNA' && <Btn disabled={!v.linii.length || !v.pretInstore} onClick={() => seteaza({ status: 'APROBAT' })}>Aprobă varianta</Btn>}
                {v.status === 'APROBAT' && !confPub && <Btn disabled={codOcupat} onClick={() => setConfPub(true)}>Publică în nomenclator…</Btn>}
                {v.status === 'APROBAT' && confPub && <>
                  <span className="text-sm">Confirmi? Produsul {v.cod} intră în nomenclator cu rețeta v1.</span>
                  <Btn onClick={publica}>Da, publică</Btn>
                  <Btn varianta="discret" onClick={() => setConfPub(false)}>Nu</Btn>
                </>}
                {v.status === 'PUBLICAT' && <Insigna fel="ok">Publicat la {v.publicat} — vizibil în Master Data & Rețetar</Insigna>}
              </div>
            }>{v.nume}</Titlu>
            {codOcupat && <p className="mb-2 text-sm text-danger">Codul {v.cod} există deja în nomenclator — schimbă codul înainte de publicare.</p>}

            <div className="rounded-md border bg-card p-4">
              <div className="grid gap-2 md:grid-cols-6">
                <Camp eticheta="Cod produs"><In value={v.cod} disabled={v.status === 'PUBLICAT'} onChange={e => seteaza({ cod: e.target.value.trim() })} /></Camp>
                <Camp eticheta="Denumire"><In value={v.denumire} onChange={e => seteaza({ denumire: e.target.value })} /></Camp>
                <Camp eticheta="Categorie"><In value={v.categorie} onChange={e => seteaza({ categorie: e.target.value })} /></Camp>
                <Camp eticheta="Preț InStore"><In type="number" step="0.1" value={v.pretInstore || ''} onChange={e => seteaza({ pretInstore: Number(e.target.value) })} /></Camp>
                <Camp eticheta="Preț Delivery"><In type="number" step="0.1" value={v.pretDelivery || ''} onChange={e => seteaza({ pretDelivery: Number(e.target.value) })} /></Camp>
                <Camp eticheta="TVA %"><In type="number" value={v.tva} onChange={e => seteaza({ tva: Number(e.target.value) })} /></Camp>
              </div>
              <div className="mt-3">
                <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Rețeta variantei</div>
                <LiniiEditor linii={v.linii} componente={componente} cuCanal
                  onChange={l => seteaza({ linii: l })} />
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <Camp eticheta="Volum estimat / lună — InStore (buc)"><In type="number" value={v.bucInstore} onChange={e => seteaza({ bucInstore: Number(e.target.value) || 0 })} /></Camp>
                <Camp eticheta="Volum estimat / lună — Delivery (buc)"><In type="number" value={v.bucDelivery} onChange={e => seteaza({ bucDelivery: Number(e.target.value) || 0 })} /></Camp>
              </div>
            </div>

            {sim && (
              <>
                <Titlu>Simulare Food Cost & profit</Titlu>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {(['INSTORE', 'DELIVERY'] as const).map(c => {
                    const k = c === 'INSTORE' ? sim.kIn : sim.kDlv;
                    return (
                      <div key={c} className="rounded-md border bg-card px-3 py-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c === 'INSTORE' ? 'InStore' : 'Delivery'}</div>
                        <div className="num mt-0.5 text-lg font-semibold">{fmtLei(k?.cost?.total ?? null)} lei · FC {fmtPct(k?.fc ?? null)}</div>
                        <div className="num text-xs text-muted-foreground">profit {fmtLei(k?.profit ?? null)} lei/buc · marjă {fmtPct(k?.marja ?? null)}</div>
                      </div>
                    );
                  })}
                  <div className="rounded-md border bg-card px-3 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Profit estimat / lună</div>
                    <div className="num mt-0.5 text-lg font-semibold">{fmtInt(sim.profitLunar)} lei</div>
                    <div className="num text-xs text-muted-foreground">{fmtInt(sim.profitLunar * 12)} lei/an · vânzări {fmtInt(sim.netLunar)} lei/lună</div>
                  </div>
                  <div className="rounded-md border bg-card px-3 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Compară cu produs existent</div>
                    <Sel className="mt-1 h-8 w-full" value={comparaCu} onChange={e => setComparaCu(e.target.value)}>
                      {state.produse.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                    </Sel>
                  </div>
                </div>

                {kComp && (
                  <T dens>
                    <thead><tr><Th /><Th dr>Cost InStore</Th><Th dr>FC % InStore</Th><Th dr>Profit/buc</Th><Th dr>Marjă</Th><Th dr>Cost Delivery</Th><Th dr>FC % Delivery</Th></tr></thead>
                    <tbody>
                      <tr className="bg-primary/10 font-semibold">
                        <Td>{v.denumire || v.nume} (variantă R&D)</Td>
                        <Td dr>{fmtLei(sim.kIn?.cost?.total ?? null)}</Td><Td dr>{fmtPct(sim.kIn?.fc ?? null)}</Td>
                        <Td dr>{fmtLei(sim.kIn?.profit ?? null)}</Td><Td dr>{fmtPct(sim.kIn?.marja ?? null)}</Td>
                        <Td dr>{fmtLei(sim.kDlv?.cost?.total ?? null)}</Td><Td dr>{fmtPct(sim.kDlv?.fc ?? null)}</Td>
                      </tr>
                      <tr>
                        <Td>{state.produse.find(p => p.cod === comparaCu)?.denumire}</Td>
                        <Td dr>{fmtLei(kComp.in?.cost?.total ?? null)}</Td><Td dr>{fmtPct(kComp.in?.fc ?? null)}</Td>
                        <Td dr>{fmtLei(kComp.in?.profit ?? null)}</Td><Td dr>{fmtPct(kComp.in?.marja ?? null)}</Td>
                        <Td dr>{fmtLei(kComp.dlv?.cost?.total ?? null)}</Td><Td dr>{fmtPct(kComp.dlv?.fc ?? null)}</Td>
                      </tr>
                    </tbody>
                  </T>
                )}
              </>
            )}

            {state.rnd.length > 1 && (
              <>
                <Titlu>Toate variantele — comparație</Titlu>
                <T dens>
                  <thead><tr><Th>Variantă</Th><Th>Status</Th><Th dr>Preț InStore</Th><Th dr>Cost InStore</Th><Th dr>FC %</Th><Th dr>Profit/buc</Th><Th dr>Profit/lună</Th></tr></thead>
                  <tbody>
                    {toateVariantele.map(({ x, kIn, profitLunar }) => (
                      <tr key={x.id} className={x.id === v.id ? 'bg-primary/10' : ''}>
                        <Td className="font-semibold">{x.nume}</Td>
                        <Td><Insigna fel={STATUS[x.status].fel}>{STATUS[x.status].nume}</Insigna></Td>
                        <Td dr>{fmtLei(x.pretInstore || null)}</Td>
                        <Td dr>{fmtLei(kIn?.cost?.total ?? null)}</Td>
                        <Td dr>{fmtPct(kIn?.fc ?? null)}</Td>
                        <Td dr>{fmtLei(kIn?.profit ?? null)}</Td>
                        <Td dr>{fmtInt(profitLunar)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </T>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
