import { useMemo, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import type { Clasa29 } from '../lib/types';
import { clasifica, fcPerioada, fmtInt, fmtPP, fmtPct } from '../lib/engine';
import { Btn, Gol, In, Insigna, Sel, T, Td, Th, Titlu } from '../lib/ui';

export default function FoodCost() {
  const { state, ctx, update } = useStore();
  const { sel } = useSel();
  const [pattern, setPattern] = useState('');
  const [clasa, setClasa] = useState<Clasa29>('EXCLUS');

  const rezRetea = useMemo(() => fcPerioada(state, ctx, sel.luna, 'RETEA'), [state, ctx, sel.luna]);
  const rezLoc = useMemo(() => state.locatii.map(l => fcPerioada(state, ctx, sel.luna, l.cod))
    .filter(r => r.net > 0)
    .sort((a, b) => (b.fcCurat ?? b.fcTeoreticAcoperit ?? -1) - (a.fcCurat ?? a.fcTeoreticAcoperit ?? -1)), [state, ctx, sel.luna]);
  const clasament = useMemo(() => {
    const cuFc = rezLoc.filter(r => (r.fcCurat ?? r.fcTeoreticAcoperit) != null);
    const sub = cuFc.filter(r => r.abatere != null && r.abatere <= 0).length;
    return { total: cuFc.length, sub, peste: cuFc.length - sub,
      slab: cuFc[0], bun: cuFc[cuFc.length - 1] };
  }, [rezLoc]);
  const numeLoc = (cod: string) => state.locatii.find(l => l.cod === cod)?.nume ?? cod;

  const linii = useMemo(() => state.linii29
    .filter(l => l.perioada === sel.luna && (sel.locatie === 'RETEA' || l.locatie === sel.locatie))
    .map(l => ({ ...l, cls: clasifica(l.categorie, state.reguli) }))
    .sort((a, b) => b.valoare - a.valoare), [state.linii29, state.reguli, sel.luna, sel.locatie]);

  const totaluri = useMemo(() => {
    const t = { FOOD: 0, PAPER: 0, EXCLUS: 0 };
    for (const l of linii) t[l.cls.clasa] += l.valoare;
    return t;
  }, [linii]);

  return (
    <div>
      <Titlu>Food Cost Engine — {sel.luna}</Titlu>
      {clasament.total > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md border bg-card px-4 py-2.5 text-sm">
          <span><b className="text-ok">{clasament.sub}</b> restaurante sub țintă · <b className={clasament.peste ? 'text-danger' : ''}>{clasament.peste}</b> peste</span>
          {clasament.bun && <span>cel mai bun: <b>{numeLoc(clasament.bun.locatie)}</b> ({fmtPct(clasament.bun.fcCurat ?? clasament.bun.fcTeoreticAcoperit)})</span>}
          {clasament.slab && clasament.slab !== clasament.bun && <span>cel mai slab: <b>{numeLoc(clasament.slab.locatie)}</b> ({fmtPct(clasament.slab.fcCurat ?? clasament.slab.fcTeoreticAcoperit)})</span>}
        </div>
      )}
      <T>
        <thead><tr><Th>Nivel</Th><Th dr>Vânzări nete</Th><Th dr>FC teoretic (pe partea acoperită)</Th><Th dr>Acoperire</Th><Th dr>FC Curat</Th><Th dr>FC operațional</Th><Th dr>Paper Cost</Th><Th dr>Variance</Th><Th dr>Pierdere 2.9 (lei)</Th><Th dr>Țintă</Th><Th dr>Abatere</Th></tr></thead>
        <tbody>
          {[rezRetea, ...rezLoc].map((r, idx) => {
            const nume = r.locatie === 'RETEA' ? 'Rețea (toate locațiile)' : state.locatii.find(l => l.cod === r.locatie)?.nume ?? r.locatie;
            const ok = r.abatere != null && r.abatere <= 0;
            return (
              <tr key={r.locatie} className={r.locatie === 'RETEA' ? 'bg-muted/40 font-semibold' : ''}>
                <Td>{r.locatie !== 'RETEA' && rezLoc.length > 1 && <span className="mr-1.5 text-xs text-muted-foreground">#{idx}</span>}{nume}</Td>
                <Td dr>{fmtInt(r.net)}</Td>
                <Td dr>{fmtPct(r.fcTeoreticAcoperit)}</Td>
                <Td dr className={(r.acoperire ?? 100) < 95 ? 'text-danger font-semibold' : ''}>{fmtPct(r.acoperire, 1)}</Td>
                <Td dr>{fmtPct(r.fcCurat)}</Td>
                <Td dr>{fmtPct(r.fcOp)}</Td>
                <Td dr>{fmtPct(r.fcPaper)}</Td>
                <Td dr className={r.variancePP != null && r.variancePP > 2 ? 'text-danger' : ''}>{fmtPP(r.variancePP)}</Td>
                <Td dr className={r.varianceLei != null && r.varianceLei > 0 ? 'text-danger font-semibold' : ''}>{r.are29 && r.varianceLei != null ? fmtInt(r.varianceLei) : '—'}</Td>
                <Td dr>{fmtPct(r.tinta)}</Td>
                <Td dr className={r.abatere == null ? '' : ok ? 'text-ok' : 'text-danger'}>{fmtPP(r.abatere)}</Td>
              </tr>
            );
          })}
        </tbody>
      </T>
      <p className="mt-2 text-xs text-muted-foreground">
        FC teoretic = rețete × mixul vândut · FC operațional = tot consumul din 2.9 · <b>FC Curat</b> = 2.9 fără excluderi (doar Food & Paper) · FC teoretic se raportează la vânzările produselor care au rețetă, nu la totalul vânzărilor — altfel produsele fără rețetă ar dilua artificial procentul. Paper Cost = ambalajele PAPER din 2.9 / vânzări nete (teoretic dacă 2.9 lipsește) · Variance = Curat − Teoretic · <b>Pierdere 2.9</b> = consumul Curat − costul teoretic, în lei: partea de consum pe care rețetele nu o explică (waste, porționare, erori). Numitor: {rezRetea.numitor}. Clasamentul e ordonat de la cel mai mare Food Cost la cel mai mic.
      </p>

      {rezRetea.netDelivery > 0 && (
        <div className="mt-6">
          <Titlu>Economia Delivery — comision agregator {state.setari.comisionDeliveryPct ?? 0}%</Titlu>
          <T dens>
            <thead><tr><Th>Nivel</Th><Th dr>Net Delivery (acoperit)</Th><Th dr>Comision (lei)</Th><Th dr>FC Delivery aparent</Th><Th dr>FC Delivery real</Th><Th dr>Diferența</Th><Th dr>Profit real (total)</Th></tr></thead>
            <tbody>
              {[rezRetea, ...rezLoc].filter(r => r.netDelivery > 0).map(r => (
                <tr key={r.locatie} className={r.locatie === 'RETEA' ? 'bg-muted/40 font-semibold' : ''}>
                  <Td>{r.locatie === 'RETEA' ? 'Rețea' : numeLoc(r.locatie)}</Td>
                  <Td dr>{fmtInt(r.netDelivery)}</Td>
                  <Td dr className="text-danger">−{fmtInt(r.comisionLei)}</Td>
                  <Td dr>{fmtPct(r.fcDeliveryAparent)}</Td>
                  <Td dr className="font-semibold">{fmtPct(r.fcRealDelivery)}</Td>
                  <Td dr>{r.fcRealDelivery != null && r.fcDeliveryAparent != null ? fmtPP(r.fcRealDelivery - r.fcDeliveryAparent) : '—'}</Td>
                  <Td dr>{r.profitReal != null ? fmtInt(r.profitReal) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </T>
          <p className="mt-1.5 text-xs text-muted-foreground">
            FC aparent = cost / net · FC real = cost / (net − comision): procentul pe banii care chiar rămân după agregator.
            Profitul real = net acoperit − cost − comision, pe toate canalele. Comisionul se schimbă din Setări.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div>
          <Titlu>Detaliu raport 2.9 — {sel.locatie === 'RETEA' ? 'toate locațiile' : state.locatii.find(l => l.cod === sel.locatie)?.nume}</Titlu>
          {linii.length === 0 ? <Gol titlu="Nu există date 2.9 pentru selecție" sub="Importă raportul NBO 2.9 din modulul Importuri." /> : (
            <>
              <T dens>
                <thead><tr><Th>Categorie de cheltuială</Th><Th>Locație</Th><Th dr>Valoare (lei)</Th><Th>Clasificare</Th></tr></thead>
                <tbody>
                  {linii.map((l, i) => (
                    <tr key={i}>
                      <Td>{l.categorie}</Td>
                      <Td>{l.locatie}</Td>
                      <Td dr>{fmtInt(l.valoare)}</Td>
                      <Td>
                        <Insigna fel={l.cls.clasa}>{l.cls.clasa}</Insigna>
                        {l.cls.auto && <span className="ml-1.5 align-middle"><Insigna fel="warn">auto — definește o regulă</Insigna></span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </T>
              <div className="num mt-2 flex flex-wrap gap-4 text-sm">
                <span>Food: <b>{fmtInt(totaluri.FOOD)}</b> lei</span>
                <span>Paper: <b>{fmtInt(totaluri.PAPER)}</b> lei</span>
                <span className="text-danger">Exclus: <b>{fmtInt(totaluri.EXCLUS)}</b> lei</span>
                <span className="ml-auto">Curat = Food + Paper = <b>{fmtInt(totaluri.FOOD + totaluri.PAPER)}</b> lei</span>
              </div>
            </>
          )}
        </div>

        <div>
          <Titlu>Reguli de clasificare</Titlu>
          <div className="rounded-md border bg-card p-3">
            <div className="space-y-1.5">
              {state.reguli.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="num flex-1 truncate rounded bg-muted px-2 py-1">conține „{r.pattern}"</span>
                  <Insigna fel={r.clasa}>{r.clasa}</Insigna>
                  <button className="text-danger" title="Șterge regula"
                    onClick={() => update(s => ({ ...s, reguli: s.reguli.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              {state.reguli.length === 0 && <div className="text-sm text-muted-foreground">Nicio regulă — totul e clasificat FOOD implicit.</div>}
            </div>
            <div className="mt-3 flex gap-2 border-t pt-3">
              <In placeholder="text din categorie (ex. uniforme)" value={pattern} onChange={e => setPattern(e.target.value)} />
              <Sel value={clasa} onChange={e => setClasa(e.target.value as Clasa29)}>
                <option value="EXCLUS">EXCLUS</option><option value="PAPER">PAPER</option><option value="FOOD">FOOD</option>
              </Sel>
              <Btn disabled={!pattern.trim()} onClick={() => {
                update(s => ({ ...s, reguli: [...s.reguli, { pattern: pattern.trim(), clasa }] }));
                setPattern('');
              }}>Adaugă</Btn>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Categoriile care conțin textul regulii primesc clasa respectivă. <b>EXCLUS</b> = nu aparține Food & Paper Cost (uniforme, consumabile administrative etc.) și iese automat din FC Curat. Recalcularea este instantă.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
