import { useMemo, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import { categoriiCuPondere, simuleazaStrategie, type PargheiStrategie } from '../lib/strategie';
import { fmtInt, fmtPct, fmtPP } from '../lib/engine';
import { Btn, Camp, In, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';

const GOL: PargheiStrategie = { transferCategoriePct: 40, rampaPct: 70 };

export default function BusinessStrategy() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [p, setP] = useState<PargheiStrategie>(GOL);
  const [salvate, setSalvate] = useState<{ nume: string; p: PargheiStrategie }[]>([]);
  const [nume, setNume] = useState('');

  const categorii = useMemo(() => categoriiCuPondere(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const rez = useMemo(() => simuleazaStrategie(state, ctx, p, sel.luna), [state, ctx, p, sel.luna]);
  const comparate = useMemo(() => salvate.map(s => ({ nume: s.nume, r: simuleazaStrategie(state, ctx, s.p, sel.luna) })),
    [salvate, state, ctx, sel.luna]);

  const set = (patch: Partial<PargheiStrategie>) => setP({ ...p, ...patch });
  const activ = rez.pargheiAplicate.length > 0 || p.tvaNou != null || (p.restauranteNoi ?? 0) > 0;
  const dEbitda = rez.ebitda1 - rez.ebitda0;
  const semn = (n: number) => (n >= 0 ? '+' : '');

  return (
    <div>
      <Titlu actiuni={
        <div className="flex flex-wrap items-center gap-2">
          <In className="h-8 w-44" placeholder="Nume scenariu" value={nume} onChange={e => setNume(e.target.value)} />
          <Btn varianta="linie" className="h-8" disabled={!nume.trim() || !activ}
            onClick={() => { setSalvate([...salvate, { nume: nume.trim(), p }]); setNume(''); }}>Salvează scenariul</Btn>
          <Btn varianta="discret" className="h-8" onClick={() => setP(GOL)}>Resetează</Btn>
        </div>
      }>Business Strategy Simulator — {sel.luna}</Titlu>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Decizii la nivel de rețea, nu de produs: elimini o categorie, muți toate prețurile, schimbi TVA-ul, treci pe cei mai buni furnizori,
        reformulezi tot rețetarul, lansezi meniul din R&D sau deschizi restaurante noi. Rezultatul e un cont de profit complet, până la EBITDA.
      </p>

      {/* pârghiile */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 font-display text-sm font-extrabold">Meniu</div>
          <Camp eticheta="Elimină o categorie">
            <Sel value={p.eliminaCategorie ?? ''} onChange={e => set({ eliminaCategorie: e.target.value || undefined })}>
              <option value="">— nicio eliminare —</option>
              {categorii.map(c => <option key={c.categorie} value={c.categorie}>{c.eticheta}</option>)}
            </Sel>
          </Camp>
          {p.eliminaCategorie && (
            <Camp eticheta="Din volumul ei, cât preia restul meniului (%)">
              <In type="number" value={p.transferCategoriePct ?? 0} onChange={e => set({ transferCategoriePct: Number(e.target.value) })} />
            </Camp>
          )}
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!p.lanseazaMeniuRnD} onChange={e => set({ lanseazaMeniuRnD: e.target.checked })} />
            Lansează produsele aprobate în R&D Lab ({state.rnd.filter(v => v.status === 'APROBAT').length} disponibile)
          </label>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 font-display text-sm font-extrabold">Preț & fiscalitate</div>
          <Camp eticheta="Modifică toate prețurile (%)">
            <In type="number" step="0.5" value={p.pretGlobalPct ?? ''} placeholder="ex. 3"
              onChange={e => set({ pretGlobalPct: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </Camp>
          <Camp eticheta="Cotă nouă de TVA (%)">
            <In type="number" step="0.5" value={p.tvaNou ?? ''} placeholder={`actual ${state.setari.tvaImplicit}`}
              onChange={e => set({ tvaNou: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </Camp>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 font-display text-sm font-extrabold">Cost & aprovizionare</div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!p.furnizoriOptimi} onChange={e => set({ furnizoriOptimi: e.target.checked })} />
            Mută toate ingredientele pe cea mai bună ofertă
          </label>
          <Camp eticheta="Reformulează rețetele: −X% pe componenta cea mai scumpă">
            <In type="number" step="1" value={p.retetePct ?? ''} placeholder="ex. 5"
              onChange={e => set({ retetePct: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </Camp>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 font-display text-sm font-extrabold">Expansiune</div>
          <div className="grid grid-cols-2 gap-2">
            <Camp eticheta="Restaurante noi">
              <In type="number" value={p.restauranteNoi ?? ''} placeholder="0"
                onChange={e => set({ restauranteNoi: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </Camp>
            <Camp eticheta="Rampă vânzări (%)">
              <In type="number" value={p.rampaPct ?? 70} onChange={e => set({ rampaPct: Number(e.target.value) })} />
            </Camp>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Rețeaua are {state.locatii.length} restaurante. Vânzările noi intră cu rampă, chiria și utilitățile integral.</p>
        </div>
      </div>

      {!activ ? (
        <div className="mt-4 rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
          Alege cel puțin o pârghie pentru a vedea scenariul.
        </div>
      ) : (
        <>
          {/* rezumatul */}
          <div className="mt-4 rounded-md border-2 border-primary/50 bg-card p-4">
            <div className="font-display text-base font-extrabold">Scenariul simulat</div>
            <ul className="mt-1 list-inside list-disc text-sm">
              {rez.pargheiAplicate.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <p className="mt-2 border-t pt-2 text-[15px]"><b>Concluzie:</b> {rez.concluzie}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
            {[
              { e: 'Food Cost', v: `${fmtPct(rez.fc0)} → ${fmtPct(rez.fc1)}`, d: fmtPP((rez.fc1 ?? 0) - (rez.fc0 ?? 0)), rau: (rez.fc1 ?? 0) > (rez.fc0 ?? 0) },
              { e: 'Marjă brută', v: `${fmtPct(rez.marja0)} → ${fmtPct(rez.marja1)}`, d: fmtPP((rez.marja1 ?? 0) - (rez.marja0 ?? 0)), rau: (rez.marja1 ?? 0) < (rez.marja0 ?? 0) },
              { e: 'Prime Cost', v: `${fmtPct(rez.prime0)} → ${fmtPct(rez.prime1)}`, d: fmtPP((rez.prime1 ?? 0) - (rez.prime0 ?? 0)), rau: (rez.prime1 ?? 0) > (rez.prime0 ?? 0) },
              { e: 'EBITDA / lună', v: `${fmtInt(rez.ebitda1)} lei`, d: `${semn(dEbitda)}${fmtInt(dEbitda)} lei`, rau: dEbitda < 0 },
              { e: 'EBITDA / an', v: `${fmtInt(rez.ebitda1 * 12)} lei`, d: `${semn(dEbitda)}${fmtInt(dEbitda * 12)} lei`, rau: dEbitda < 0 },
            ].map(k => (
              <div key={k.e} className="rounded-md border bg-card px-3 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.e}</div>
                <div className="num mt-0.5 text-lg font-semibold">{k.v}</div>
                <div className={cx('num text-sm font-bold', k.rau ? 'text-danger' : 'text-ok')}>{k.d}</div>
              </div>
            ))}
          </div>

          {/* contul de profit */}
          <Titlu>Contul de profit — lunar</Titlu>
          <T dens>
            <thead><tr><Th>Linie</Th><Th dr>Azi (lei)</Th><Th dr>% vânzări</Th><Th dr>Scenariu (lei)</Th><Th dr>% vânzări</Th><Th dr>Δ lei/lună</Th><Th dr>Δ lei/an</Th></tr></thead>
            <tbody>
              {rez.cont.map(l => {
                const d = l.valoare1 - l.valoare0;
                const bun = l.esteCost ? d < 0 : d > 0;
                const gros = l.eticheta.includes('EBITDA') || l.eticheta.includes('Marjă') || l.eticheta.includes('Prime');
                return (
                  <tr key={l.eticheta} className={gros ? 'bg-muted/40 font-semibold' : ''}>
                    <Td>{l.eticheta}</Td>
                    <Td dr>{fmtInt(l.valoare0)}</Td>
                    <Td dr>{fmtPct(l.pct0)}</Td>
                    <Td dr>{fmtInt(l.valoare1)}</Td>
                    <Td dr>{fmtPct(l.pct1)}</Td>
                    <Td dr className={cx(Math.abs(d) > 0.5 && (bun ? 'text-ok' : 'text-danger'))}>{semn(d)}{fmtInt(d)}</Td>
                    <Td dr className={cx(Math.abs(d) > 0.5 && (bun ? 'text-ok' : 'text-danger'))}>{semn(d)}{fmtInt(d * 12)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </T>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Rețea: {rez.restaurante0} → {rez.restaurante1} restaurante. Vânzările nete și Food &amp; Paper vin din simularea pe produse; Labor și costurile de operare se scalează cu numărul de restaurante.
          </p>

          {rez.sim.afectate.length > 0 && (
            <>
              <Titlu>Cele mai afectate produse</Titlu>
              <T dens>
                <thead><tr><Th>Produs</Th><Th>Cauza</Th><Th dr>Bucăți</Th><Th dr>FC %</Th><Th dr>Δ profit / lună</Th><Th dr>Mix vânzări</Th></tr></thead>
                <tbody>
                  {[...rez.sim.afectate].sort((a, b) => Math.abs(b.dProfit) - Math.abs(a.dProfit)).slice(0, 8).map(r => (
                    <tr key={r.cod}>
                      <Td>{r.denumire}</Td>
                      <Td><Insigna fel={r.motiv === 'NOU' ? 'ok' : r.motiv === 'ELIMINAT' ? 'EXCLUS' : r.motiv === 'PRET' ? 'FOOD' : r.motiv === 'VOLUM' ? 'info' : 'warn'}>
                        {r.motiv === 'NOU' ? 'produs nou' : r.motiv === 'ELIMINAT' ? 'eliminat' : r.motiv === 'PRET' ? 'preț' : r.motiv === 'COST' ? 'cost' : r.motiv === 'VOLUM' ? 'volum' : 'mixt'}
                      </Insigna></Td>
                      <Td dr>{fmtInt(r.buc0)} → {fmtInt(r.buc1)}</Td>
                      <Td dr>{fmtPct(r.fc0)} → {fmtPct(r.fc1)}</Td>
                      <Td dr className={cx('font-semibold', r.dProfit >= 0 ? 'text-ok' : 'text-danger')}>{semn(r.dProfit)}{fmtInt(r.dProfit)}</Td>
                      <Td dr>{fmtPct(r.mix0)} → {fmtPct(r.mix1)}</Td>
                    </tr>
                  ))}
                </tbody>
              </T>
            </>
          )}

          <div className="mt-4 rounded-md border border-l-4 border-l-primary bg-card p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ipoteze și limite ale scenariului</div>
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {rez.avertismente.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        </>
      )}

      {comparate.length > 0 && (
        <>
          <Titlu>Compararea scenariilor</Titlu>
          <T dens>
            <thead><tr><Th>Scenariu</Th><Th dr>Vânzări</Th><Th dr>Food Cost</Th><Th dr>Prime Cost</Th><Th dr>EBITDA / lună</Th><Th dr>EBITDA / an</Th><Th dr>Δ EBITDA / an</Th><Th /></tr></thead>
            <tbody>
              <tr className="bg-muted/40">
                <Td className="font-semibold">Azi (fără schimbări)</Td>
                <Td dr>{fmtInt(rez.net0)}</Td><Td dr>{fmtPct(rez.fc0)}</Td><Td dr>{fmtPct(rez.prime0)}</Td>
                <Td dr>{fmtInt(rez.ebitda0)}</Td><Td dr>{fmtInt(rez.ebitda0 * 12)}</Td><Td dr>—</Td><Td />
              </tr>
              {comparate.map((c, i) => (
                <tr key={i}>
                  <Td className="font-semibold">{c.nume}</Td>
                  <Td dr>{fmtInt(c.r.net1)}</Td><Td dr>{fmtPct(c.r.fc1)}</Td><Td dr>{fmtPct(c.r.prime1)}</Td>
                  <Td dr>{fmtInt(c.r.ebitda1)}</Td><Td dr>{fmtInt(c.r.ebitda1 * 12)}</Td>
                  <Td dr className={cx('font-semibold', c.r.ebitda1 >= c.r.ebitda0 ? 'text-ok' : 'text-danger')}>
                    {semn((c.r.ebitda1 - c.r.ebitda0) * 12)}{fmtInt((c.r.ebitda1 - c.r.ebitda0) * 12)}
                  </Td>
                  <Td dr>
                    <button className="text-xs underline" onClick={() => setP(salvate[i].p)}>încarcă</button>
                    <button className="ml-2 text-danger" onClick={() => setSalvate(salvate.filter((_, j) => j !== i))}>✕</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </T>
        </>
      )}
    </div>
  );
}
