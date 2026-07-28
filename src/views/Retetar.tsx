import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import type { LinieReteta, UMCod } from '../lib/types';
import { buildCtx, costLinieLa, costProdus, kpiProdus, versiuneActiva, fmtLei, fmtPct } from '../lib/engine';
import { Btn, Gol, In, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';

export default function Retetar() {
  const { state, ctx, update } = useStore();
  const [selCod, setSelCod] = useState<string | null>(state.retete.find(r => r.tip === 'PRODUS')?.cod ?? null);
  const [draft, setDraft] = useState<LinieReteta[] | null>(null);
  const [nota, setNota] = useState('');
  const [istoric, setIstoric] = useState(false);

  const reteta = state.retete.find(r => r.cod === selCod) ?? null;
  const vAct = reteta ? versiuneActiva(reteta) : null;
  const linii = draft ?? vAct?.linii ?? [];
  const produs = reteta?.tip === 'PRODUS' ? state.produse.find(p => p.cod === reteta.cod) : undefined;

  // context temporar cu draftul aplicat, pentru costul live
  const ctxLive = useMemo(() => {
    if (!reteta || !draft) return ctx;
    const retete = state.retete.map(r => r.cod !== reteta.cod ? r : {
      ...r, versiuni: r.versiuni.map(v => v.nr === r.activa ? { ...v, linii: draft } : v),
    });
    return buildCtx({ ...state, retete });
  }, [ctx, draft, reteta, state]);

  const alege = (cod: string) => { setSelCod(cod); setDraft(null); setNota(''); setIstoric(false); };

  const componente = useMemo(() => [
    ...state.ingrediente.filter(i => i.activ).map(i => ({ cod: i.cod, nume: `${i.denumire} (${i.tip === 'PACKAGING' ? 'ambalaj' : 'ingredient'})`, tip: i.tip === 'PACKAGING' ? 'AMBALAJ' as const : 'INGREDIENT' as const })),
    ...state.retete.filter(r => r.tip === 'SEMIPREPARAT').map(r => ({ cod: r.cod, nume: `${r.denumire} (semipreparat)`, tip: 'SEMIPREPARAT' as const })),
  ], [state.ingrediente, state.retete]);

  const seteaza = (i: number, patch: Partial<LinieReteta>) => {
    const l = [...linii];
    l[i] = { ...l[i], ...patch };
    setDraft(l);
  };

  const salveaza = () => {
    if (!reteta || !draft) return;
    update(s => ({
      ...s,
      retete: s.retete.map(r => {
        if (r.cod !== reteta.cod) return r;
        const nr = (r.versiuni[r.versiuni.length - 1]?.nr ?? 0) + 1;
        const vNoua = {
          nr, data: new Date().toISOString().slice(0, 10),
          nota: nota.trim() || `Modificare manuală`,
          linii: draft, randament: versiuneActiva(r).randament,
        };
        return { ...r, versiuni: [...r.versiuni, vNoua], activa: nr };
      }),
    }));
    setDraft(null); setNota('');
  };

  const kpiIn = reteta?.tip === 'PRODUS' && produs ? kpiProdusLive('INSTORE') : null;
  const kpiDlv = reteta?.tip === 'PRODUS' && produs ? kpiProdusLive('DELIVERY') : null;
  function kpiProdusLive(canal: 'INSTORE' | 'DELIVERY') {
    if (!reteta) return null;
    return kpiProdus(reteta.cod, canal, ctxLive);
  }
  const costSP = reteta?.tip === 'SEMIPREPARAT'
    ? (() => {
        const v = vAct!;
        let tot = 0;
        for (const l of linii) tot += costLinieLa(l, ctxLive).total;
        return { lot: tot, perUM: v.randament && v.randament.cant > 0 ? tot / v.randament.cant : tot, um: v.randament?.um ?? 'kg' };
      })()
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[290px_1fr]">
      <div>
        <Titlu>Rețetar</Titlu>
        <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-md border bg-card p-2">
          {(['PRODUS', 'SEMIPREPARAT'] as const).map(tip => (
            <div key={tip}>
              <div className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {tip === 'PRODUS' ? 'Produse finite' : 'Semipreparate'}
              </div>
              {state.retete.filter(r => r.tip === tip).map(r => {
                const k = r.tip === 'PRODUS' ? kpiProdus(r.cod, 'INSTORE', ctx) : null;
                return (
                  <button key={r.cod} onClick={() => alege(r.cod)}
                    className={cx('flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm',
                      selCod === r.cod ? 'bg-primary/15 font-semibold' : 'hover:bg-muted')}>
                    <span className="truncate">{r.denumire}</span>
                    <span className="num ml-2 shrink-0 text-xs text-muted-foreground">
                      {k?.fc != null ? fmtPct(k.fc) : `v${r.activa}`}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div>
        {!reteta || !vAct ? <Gol titlu="Alege o rețetă din listă" /> : (
          <div>
            <Titlu actiuni={
              <div className="flex gap-2">
                <Btn varianta="linie" onClick={() => setIstoric(!istoric)}>{istoric ? 'Înapoi la editor' : `Istoric (${reteta.versiuni.length} versiuni)`}</Btn>
              </div>
            }>
              {reteta.denumire} <span className="ml-2 align-middle"><Insigna fel="info">v{reteta.activa} activă</Insigna></span>
            </Titlu>

            {istoric ? (
              <T>
                <thead><tr><Th>Versiune</Th><Th>Data</Th><Th>Notă</Th><Th dr>Linii</Th><Th /></tr></thead>
                <tbody>
                  {[...reteta.versiuni].reverse().map(v => (
                    <tr key={v.nr} className={v.nr === reteta.activa ? 'bg-primary/10' : ''}>
                      <Td className="num font-semibold">v{v.nr}</Td><Td>{v.data}</Td><Td>{v.nota ?? '—'}</Td><Td dr>{v.linii.length}</Td>
                      <Td>{v.nr !== reteta.activa && (
                        <Btn varianta="linie" className="h-7 px-2 text-xs" onClick={() =>
                          update(s => ({ ...s, retete: s.retete.map(r => r.cod === reteta.cod ? { ...r, activa: v.nr } : r) }))
                        }>Activează</Btn>
                      )}</Td>
                    </tr>
                  ))}
                </tbody>
              </T>
            ) : (
              <>
                {reteta.tip === 'SEMIPREPARAT' && vAct.randament && (
                  <p className="mb-2 text-sm text-muted-foreground">
                    Randament lot: <b className="num">{vAct.randament.cant} {vAct.randament.um}</b> — pierderile de procesare sunt capturate de randament (§3.3).
                  </p>
                )}
                <T dens>
                  <thead><tr><Th>Componentă</Th><Th>Tip</Th><Th dr>Cantitate</Th><Th>UM</Th><Th dr>Pierdere %</Th><Th>Canal</Th><Th dr>Cost linie</Th><Th /></tr></thead>
                  <tbody>
                    {linii.map((l, i) => (
                      <tr key={i}>
                        <Td>
                          <Sel value={l.comp} onChange={e => {
                            const c = componente.find(x => x.cod === e.target.value)!;
                            seteaza(i, { comp: c.cod, tipComp: c.tip });
                          }} className="h-8 max-w-[240px]">
                            {componente.map(c => <option key={c.cod} value={c.cod}>{c.nume}</option>)}
                          </Sel>
                        </Td>
                        <Td>{l.tipComp === 'AMBALAJ' ? <Insigna fel="PAPER">Paper</Insigna> : l.tipComp === 'SEMIPREPARAT' ? <Insigna fel="info">SP</Insigna> : <Insigna fel="FOOD">Food</Insigna>}</Td>
                        <Td dr><In type="number" step="any" value={l.cant} onChange={e => seteaza(i, { cant: Number(e.target.value) })} className="h-8 w-20 text-right" /></Td>
                        <Td>
                          <Sel value={l.um} onChange={e => seteaza(i, { um: e.target.value as UMCod })} className="h-8">
                            {(['g', 'kg', 'ml', 'l', 'buc'] as UMCod[]).map(u => <option key={u}>{u}</option>)}
                          </Sel>
                        </Td>
                        <Td dr><In type="number" step="any" value={l.pierdere ?? ''} placeholder="—" onChange={e => seteaza(i, { pierdere: e.target.value === '' ? undefined : Number(e.target.value) })} className="h-8 w-16 text-right" /></Td>
                        <Td>
                          <Sel value={l.canal} onChange={e => seteaza(i, { canal: e.target.value as LinieReteta['canal'] })} className="h-8">
                            <option value="AMBELE">Ambele</option><option value="INSTORE">InStore</option><option value="DELIVERY">Delivery</option>
                          </Sel>
                        </Td>
                        <Td dr>{fmtLei(costLinieLa(l, ctxLive).total)}</Td>
                        <Td><button className="text-danger" title="Șterge linia" onClick={() => setDraft(linii.filter((_, j) => j !== i))}>✕</button></Td>
                      </tr>
                    ))}
                  </tbody>
                </T>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Btn varianta="linie" onClick={() => setDraft([...linii, { comp: componente[0].cod, tipComp: componente[0].tip, cant: 0, um: 'g', canal: 'AMBELE' }])}>+ Linie nouă</Btn>
                  {draft && (
                    <>
                      <In placeholder="Nota versiunii (ex. gramaj mărit)" value={nota} onChange={e => setNota(e.target.value)} className="max-w-xs" />
                      <Btn onClick={salveaza}>Salvează ca versiunea v{(reteta.versiuni[reteta.versiuni.length - 1]?.nr ?? 0) + 1}</Btn>
                      <Btn varianta="discret" onClick={() => { setDraft(null); setNota(''); }}>Renunță la modificări</Btn>
                    </>
                  )}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {reteta.tip === 'PRODUS' && produs ? (['INSTORE', 'DELIVERY'] as const).map(canal => {
                    const c = costProdus(reteta.cod, canal, ctxLive, '9999-12-31');
                    const k = canal === 'INSTORE' ? kpiIn : kpiDlv;
                    const pret = canal === 'INSTORE' ? produs.pretInstore : produs.pretDelivery;
                    return (
                      <div key={canal} className="rounded-md border bg-card p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{canal === 'INSTORE' ? 'InStore' : 'Delivery'}</div>
                        <div className="num mt-1 text-2xl font-semibold">{fmtLei(c?.total)} lei <span className="text-sm font-normal text-muted-foreground">cost/porție</span></div>
                        <div className="num mt-1 text-xs text-muted-foreground">Food {fmtLei(c?.food)} + Paper {fmtLei(c?.paper)} · preț brut {fmtLei(pret)} lei</div>
                        <div className="mt-2 flex gap-4 border-t pt-2 text-sm">
                          <div>FC% <b className="num">{fmtPct(k?.fc ?? null)}</b></div>
                          <div>Profit <b className="num">{fmtLei(k?.profit ?? null)} lei</b></div>
                          <div>Marjă <b className="num">{fmtPct(k?.marja ?? null)}</b></div>
                        </div>
                      </div>
                    );
                  }) : costSP && (
                    <div className="rounded-md border bg-card p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cost semipreparat</div>
                      <div className="num mt-1 text-2xl font-semibold">{fmtLei(costSP.perUM)} lei/{costSP.um}</div>
                      <div className="num mt-1 text-xs text-muted-foreground">Cost lot: {fmtLei(costSP.lot)} lei · randament {vAct.randament?.cant} {costSP.um}</div>
                    </div>
                  )}
                  {draft && <div className="rounded-md border border-dashed bg-primary/5 p-4 text-sm">Modificările sunt <b>nesalvate</b> — costul afișat este cel al draftului. Salvarea creează o versiune nouă; istoricul rămâne intact.</div>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
