import { useMemo, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import { oportunitatiProduse, riscIngrediente, scoruriProduse, verificaReguli } from '../lib/scoruri';
import { oportunitati } from '../lib/decizii';
import { fmtInt, fmtPct } from '../lib/engine';
import { Gol, Insigna, T, Td, Th, Titlu, cx } from '../lib/ui';

type Prioritate = { rang: number; titlu: string; sursa: string; motiv: string; valoare: number | null; unde: string };

export default function OpportunityBoard() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [detaliu, setDetaliu] = useState<string | null>(null);

  const opProduse = useMemo(() => oportunitatiProduse(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const opGenerale = useMemo(() => oportunitati(state, ctx, sel.luna, 20), [state, ctx, sel.luna]);
  const riscuri = useMemo(() => riscIngrediente(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const sanatate = useMemo(() => scoruriProduse(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const reguli = useMemo(() => verificaReguli(state, ctx, sel.luna), [state, ctx, sel.luna]);

  const reducereFC = useMemo(() => opGenerale
    .filter(o => (o.categorie === 'FOOD_COST' || o.categorie === 'INGREDIENT') && (o.impactLunar ?? 0) > 0)
    .slice(0, 10), [opGenerale]);
  const cresterePprofit = useMemo(() => opGenerale
    .filter(o => (o.categorie === 'PROFIT' || o.categorie === 'PROMOVARE' || o.categorie === 'MENIU') && (o.impactLunar ?? 0) > 0)
    .slice(0, 10), [opGenerale]);
  const produseRisc = useMemo(() => [...sanatate].sort((a, b) => a.scor - b.scor).slice(0, 10), [sanatate]);
  const ingredienteRisc = useMemo(() => riscuri.slice(0, 10), [riscuri]);

  // prioritizarea globală după valoarea estimată
  const prioritati = useMemo<Prioritate[]>(() => {
    const toate: Omit<Prioritate, 'rang'>[] = [
      ...opGenerale.filter(o => (o.impactLunar ?? 0) > 0).map(o => ({
        titlu: o.titlu, sursa: 'Opportunity Finder', motiv: o.detaliu,
        valoare: (o.impactAnual ?? 0), unde: o.unde,
      })),
      ...opProduse.filter(o => (o.impactAnual ?? 0) > 0).map(o => ({
        titlu: `${o.denumire}: ${o.tip === 'REFORMULARE' ? 'reformulare' : o.tip === 'PROMOVARE' ? 'promovare' : o.tip === 'CRESTERE' ? 'susținere a creșterii' : 'analiză de portofoliu'}`,
        sursa: 'Product Opportunity Engine', motiv: o.motiv,
        valoare: o.impactAnual ?? 0, unde: 'Health & Risk → Product Health Score',
      })),
      ...ingredienteRisc.filter(r => r.nivel === 'RIDICAT').map(r => ({
        titlu: `${r.nume}: acoperire de risc (contract sau sursă alternativă)`,
        sursa: 'Ingredient Risk Analyzer',
        motiv: `Risc ${r.scor.toFixed(0)}/100 — prezent în ${r.nrProduse} produse, ${fmtInt(r.cheltuialaAnuala)} lei/an. O scumpire de 10% costă ${fmtInt(r.riscAnual)} lei/an.`,
        valoare: r.riscAnual, unde: 'Supplier Intelligence',
      })),
    ];
    const unice = new Map<string, Omit<Prioritate, 'rang'>>();
    for (const t of toate) if (!unice.has(t.titlu)) unice.set(t.titlu, t);
    return [...unice.values()].sort((a, b) => (b.valoare ?? 0) - (a.valoare ?? 0)).slice(0, 12)
      .map((t, i) => ({ ...t, rang: i + 1 }));
  }, [opGenerale, opProduse, ingredienteRisc]);

  const totalAnual = prioritati.reduce((s, p) => s + Math.max(0, p.valoare ?? 0), 0);

  const Lista = ({ titlu, sub, randuri }: {
    titlu: string; sub: string;
    randuri: { cheie: string; nume: string; detaliu: string; valoare: string; rau?: boolean }[];
  }) => (
    <div className="rounded-md border bg-card p-4">
      <div className="font-display text-sm font-extrabold">{titlu}</div>
      <div className="mb-2 text-xs text-muted-foreground">{sub}</div>
      {randuri.length === 0 ? <div className="text-sm text-muted-foreground">Nimic de raportat.</div> : (
        <ol className="space-y-1.5">
          {randuri.map((r, i) => (
            <li key={r.cheie} className="border-b pb-1.5 text-sm last:border-b-0">
              <div className="flex items-baseline gap-2">
                <span className="num text-xs text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 font-semibold">{r.nume}</span>
                <span className={cx('num shrink-0 font-semibold', r.rau ? 'text-danger' : 'text-ok')}>{r.valoare}</span>
              </div>
              <div className="ml-5 text-xs text-muted-foreground">{r.detaliu}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <div>
      <Titlu actiuni={
        <span className="rounded-md border bg-card px-3 py-1.5 text-sm">
          Valoare identificată: <b className="num text-ok">{fmtInt(totalAnual)} lei/an</b>
          {reguli.incalcari.length > 0 && <> · <b className="num text-danger">{reguli.incalcari.length}</b> reguli încălcate</>}
        </span>
      }>Executive Opportunity Board — {sel.luna}</Titlu>

      <Titlu>Prioritizare după valoarea estimată</Titlu>
      {prioritati.length === 0 ? <Gol titlu="Nicio oportunitate cuantificabilă" /> : (
        <T dens>
          <thead><tr><Th>#</Th><Th>Acțiune</Th><Th>Sursa</Th><Th dr>Valoare / an</Th><Th>Se execută în</Th></tr></thead>
          <tbody>
            {prioritati.map(p => (
              <tr key={p.titlu} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetaliu(detaliu === p.titlu ? null : p.titlu)}>
                <Td className="num text-muted-foreground">{p.rang}</Td>
                <Td>
                  <div className="font-semibold">{p.titlu}</div>
                  {detaliu === p.titlu && <div className="mt-1 text-xs text-muted-foreground">{p.motiv}</div>}
                </Td>
                <Td className="text-xs text-muted-foreground">{p.sursa}</Td>
                <Td dr className="font-semibold text-ok">+{fmtInt(p.valoare)} lei</Td>
                <Td className="text-xs text-muted-foreground">{p.unde}</Td>
              </tr>
            ))}
          </tbody>
        </T>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">Click pe o linie pentru motivul complet. Valorile sunt anualizate din impactul lunar calculat pe volumele reale din PMIX.</p>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Lista titlu="Top 10 — reducerea Food Cost" sub="reformulări, gramaje, furnizori"
          randuri={reducereFC.map(o => ({ cheie: o.id, nume: o.titlu, detaliu: o.unde, valoare: `+${fmtInt(o.impactAnual)} lei/an` }))} />
        <Lista titlu="Top 10 — creșterea profitului" sub="preț, promovare, optimizări de meniu"
          randuri={cresterePprofit.map(o => ({ cheie: o.id, nume: o.titlu, detaliu: o.unde, valoare: `+${fmtInt(o.impactAnual)} lei/an` }))} />
        <Lista titlu="Top 10 produse cu risc" sub="cel mai mic Product Health Score"
          randuri={produseRisc.map(h => ({
            cheie: h.cod, nume: h.denumire,
            detaliu: `FC ${fmtPct(h.fc)} · marjă ${fmtPct(h.marja)} · ${fmtInt(h.buc)} buc · ${h.explicatie.impact}`,
            valoare: `${h.scor.toFixed(0)}/100`, rau: h.scor < 65,
          }))} />
        <Lista titlu="Top ingrediente cu impact financiar" sub="expunerea rețelei la o scumpire de 10%"
          randuri={ingredienteRisc.map(r => ({
            cheie: r.cod, nume: r.nume,
            detaliu: `${r.nrProduse} produse · ${fmtInt(r.cheltuialaAnuala)} lei/an · risc ${r.scor.toFixed(0)}/100`,
            valoare: `−${fmtInt(r.riscAnual)} lei/an`, rau: true,
          }))} />
      </div>

      {reguli.incalcari.length > 0 && (
        <>
          <Titlu>Reguli de business încălcate</Titlu>
          <div className="grid gap-2 md:grid-cols-2">
            {reguli.incalcari.slice(0, 6).map((i, idx) => (
              <div key={idx} className="rounded-md border border-l-4 border-l-danger bg-card p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Insigna fel="EXCLUS">{i.regula.nume}</Insigna>
                  <span className="font-semibold">{i.subiect}</span>
                </div>
                <div className="mt-1 text-muted-foreground">{i.mesaj}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
