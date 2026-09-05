/**
 * Waste 2.8 față de Usage Actual și Inv Adj — cele trei părți, potrivirea pe linie, drill-down la
 * evenimente și drumul de declarații. Nicio regulă aici: validarea și scrierea sunt în lib/declaratii.
 */
import { useState } from 'react';
import { fmtLei } from '../../lib/engine';
import type { ReconciliationFC } from '../../lib/fc-core';
import type { LiniePotrivire } from '../../lib/atribuire-waste';
import {
  ETICHETA_INCLUDERE, ETICHETA_TEMEI, adaugaDeclaratie, cantitateDisponibila, declaratiiLiniei,
  eComparabila, retrageDeclaratie, valideazaDeclaratie,
} from '../../lib/declaratii';
import { Btn, In, Insigna, Sel } from '../../lib/ui';
import type { DeclaratieIncludere, Includere, TemeiIncludere } from '../../lib/types';
import { useTower } from './context';

const POTRIVIRE: Record<string, { text: string; fel: 'ok' | 'warn' | 'EXCLUS' }> = {
  EXACTA: { text: 'exactă', fel: 'ok' },
  COMPATIBILA_CU_PRECIZIA: { text: 'compatibilă cu precizia', fel: 'ok' },
  DIFERENTA_REALA: { text: 'diferență reală', fel: 'warn' },
  FARA_EVENIMENT_28: { text: 'Adj fără eveniment 2.8', fel: 'warn' },
  FARA_CORESPONDENT_29: { text: 'fără corespondent 2.9', fel: 'warn' },
  FARA_COLOANA_ADJ: { text: 'fără coloana Adj', fel: 'warn' },
  UM_DIFERITA: { text: 'UM diferită', fel: 'EXCLUS' },
};

export function AtribuireWaste({ rec }: { rec: ReconciliationFC }) {
  const { state, update } = useTower();
  const w = rec.waste;
  const pasW = rec.pasi.find(p => p.id === 'WASTE');
  const pasN = rec.pasi.find(p => p.id === 'WASTE_NERECONCILIAT');
  const card = (titlu: string, valoare: string, sub: string) => (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{titlu}</div>
      <div className="num mt-1 text-xl font-semibold">{valoare}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
  return (
    <div className="space-y-3" data-zona="atribuire-waste">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {card('Inclus în Usage Actual', fmtLei(w.inclusLei, 2), pasW?.disponibil ? 'scade Neexplicatul (pas EXPLICAT)' : 'nimic demonstrat: Neexplicatul nu se mișcă')}
        {card('Exclus prin ajustare', fmtLei(w.exclusLei, 2), 'nu e în Usage Actual; nu se scade')}
        {card('Nedeterminat', fmtLei(w.nedeterminatLei, 2), `${pasN?.nrRanduri ?? 0} rânduri nereconciliate${w.vechi.randuri ? `, din care ${w.vechi.randuri} vechi (${fmtLei(w.vechi.leiDeterminabil, 2)} la preț determinabil)` : ''}`)}
        {card('Adj 2.9 fără eveniment 2.8', fmtLei(w.ajustariFaraEveniment.leiEstimat, 2), `${w.ajustariFaraEveniment.coduri} coduri · estimare la Cost per Unit, nu waste`)}
      </div>
      <div className="rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
        {w.disponibil
          ? <>Evaluările rămân separate: 2.8 la Extension tipărit, 2.9 la Cost per Unit. Rezidualul zero al punții nu dovedește atribuirea:
              {' '}atribuirea este {w.atribuireCompleta ? <b>completă</b> : <b>incompletă</b>}
              {w.potrivire && <> · acoperire pe coduri: {w.potrivire.coduri.ambele} cu Adj și evenimente, {w.potrivire.coduri.doarAdj} doar Adj, {w.potrivire.coduri.doarEvenimente} doar 2.8</>}.</>
          : <>Potrivirea cu Inv Adj nu se poate face: {w.motiv}</>}
      </div>
      {w.potrivire && w.potrivire.linii.length > 0 && (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Restaurant · fereastră</th>
                <th className="px-3 py-2">Material · UM</th>
                <th className="px-3 py-2 text-right">Adj 2.9</th>
                <th className="px-3 py-2 text-right">Qty 2.8</th>
                <th className="px-3 py-2">Potrivire</th>
                <th className="px-3 py-2 text-right">Adj × CPU</th>
                <th className="px-3 py-2 text-right">Σ 2.8</th>
                <th className="px-3 py-2 text-right">Inclus</th>
                <th className="px-3 py-2 text-right">Exclus</th>
                <th className="px-3 py-2 text-right">Nedeterminat</th>
                <th className="px-3 py-2">Declarații</th>
              </tr>
            </thead>
            <tbody>
              {w.potrivire.linii.map(l => {
                const p = POTRIVIRE[l.potrivire] ?? { text: l.potrivire, fel: 'warn' as const };
                return (
                  <tr key={`${l.locatie ?? ''}|${l.fereastra.de}|${l.material}|${l.um}`} className="border-t align-top">
                    <td className="px-3 py-1.5 text-xs">{l.locatie ?? 'fără restaurant'}<div className="text-muted-foreground">{l.fereastra.de} → {l.fereastra.la}</div></td>
                    <td className="px-3 py-1.5"><b>{l.denumire}</b> <span className="text-xs text-muted-foreground">{l.material} · {l.um}</span>
                      {l.coduri28.length > 1 && <div className="text-[11px] text-muted-foreground">coduri 2.8: {l.coduri28.join(', ')}</div>}
                      {l.nrEvenimente > 0 && (
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer text-muted-foreground">{l.nrEvenimente} evenimente · {l.motive.map(m => `${m.motiv} ${m.cant}`).join(', ')}</summary>
                          <ul className="mt-1 space-y-0.5">
                            {l.evenimente.map((e, i) => (
                              <li key={i} className="text-muted-foreground">
                                {e.motiv} · {e.utilizator ?? '—'} · {e.cant} {e.um} × {e.costUnitar} = {e.lei} lei
                                {e.sursa && <> · {e.sursa.fisier}{e.rand !== undefined ? `, rândul ${e.rand}` : ''}</>}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="num px-3 py-1.5 text-right">{l.adj === null ? '—' : l.adj}</td>
                    <td className="num px-3 py-1.5 text-right">{l.cant28}{l.diferenta !== null && l.diferenta !== 0 && <span className="ml-1 text-xs text-muted-foreground">({l.diferenta > 0 ? '+' : ''}{l.diferenta})</span>}</td>
                    <td className="px-3 py-1.5 text-xs"><Insigna fel={p.fel}>{p.text}</Insigna>
                      {l.declaratiiNeaplicate > 0 && <div className="text-muted-foreground">{l.declaratiiNeaplicate} declarații neaplicate</div>}
                      {l.declaratiiPlafonate > 0 && <div className="text-muted-foreground">{l.declaratiiPlafonate} declarații plafonate</div>}</td>
                    <td className="num px-3 py-1.5 text-right">{l.leiEstimat29 === null ? '—' : fmtLei(l.leiEstimat29, 2)}</td>
                    <td className="num px-3 py-1.5 text-right">{fmtLei(l.lei28, 2)}</td>
                    <td className="num px-3 py-1.5 text-right">{l.parti.INCLUS_IN_USAGE.lei ? fmtLei(l.parti.INCLUS_IN_USAGE.lei, 2) : '—'}</td>
                    <td className="num px-3 py-1.5 text-right">{l.parti.EXCLUS_PRIN_AJUSTARE.lei ? fmtLei(l.parti.EXCLUS_PRIN_AJUSTARE.lei, 2) : '—'}</td>
                    <td className="num px-3 py-1.5 text-right">{fmtLei(l.parti.NEDETERMINAT.lei, 2)}</td>
                    <td className="px-3 py-1.5 text-xs">
                      <Declaratii l={l} existente={declaratiiLiniei(state, l)}
                        onAdauga={d => update(s => adaugaDeclaratie(s, d))} onRetrage={d => update(s => retrageDeclaratie(s, d))} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TEMEIURI = Object.keys(ETICHETA_TEMEI) as TemeiIncludere[];

function Declaratii({ l, existente, onAdauga, onRetrage }: {
  l: LiniePotrivire; existente: DeclaratieIncludere[];
  onAdauga: (d: DeclaratieIncludere) => void; onRetrage: (d: DeclaratieIncludere) => void;
}) {
  const [includere, setIncludere] = useState<Exclude<Includere, 'NEDETERMINAT'>>('EXCLUS_PRIN_AJUSTARE');
  const [cant, setCant] = useState<string>('');
  const [temei, setTemei] = useState<TemeiIncludere>('DECLARATIE_UTILIZATOR');
  const [sursa, setSursa] = useState('');
  const [erori, setErori] = useState<string[]>([]);
  const disponibil = cantitateDisponibila(l, includere);
  const propunere = cant === '' ? disponibil : Number(cant.replace(',', '.'));
  const declara = () => {
    const d: DeclaratieIncludere = { locatie: l.locatie, fereastra: l.fereastra, material: l.material, includere, cant: propunere, temei, sursa };
    const e = valideazaDeclaratie(l, d);
    setErori(e);
    if (!e.length) { onAdauga(d); setCant(''); setSursa(''); }
  };
  return (
    <div className="space-y-1" data-zona="declaratii">
      {existente.map((d, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1">
          <Insigna fel={d.includere === 'INCLUS_IN_USAGE' ? 'ok' : 'info'}>{ETICHETA_INCLUDERE[d.includere]}</Insigna>
          <span className="num">{d.cant} {l.um}</span>
          <span className="text-muted-foreground">· {ETICHETA_TEMEI[d.temei]} · {d.sursa}</span>
          <button type="button" className="text-muted-foreground underline" onClick={() => onRetrage(d)} data-actiune="retrage">retrage</button>
        </div>
      ))}
      {eComparabila(l)
        ? (
          <details>
            <summary className="cursor-pointer text-muted-foreground">declară statut (rămas nedeterminat: {l.parti.NEDETERMINAT.cant} {l.um})</summary>
            <div className="mt-1 grid gap-1">
              <Sel data-camp="includere" value={includere} onChange={e => setIncludere(e.target.value as Exclude<Includere, 'NEDETERMINAT'>)}>
                <option value="EXCLUS_PRIN_AJUSTARE">{ETICHETA_INCLUDERE.EXCLUS_PRIN_AJUSTARE}</option>
                <option value="INCLUS_IN_USAGE">{ETICHETA_INCLUDERE.INCLUS_IN_USAGE}</option>
              </Sel>
              <In data-camp="cant" type="text" inputMode="decimal" placeholder={`cantitate (max ${disponibil} ${l.um})`} value={cant} onChange={e => setCant(e.target.value)} />
              <Sel data-camp="temei" value={temei} onChange={e => setTemei(e.target.value as TemeiIncludere)}>
                {TEMEIURI.map(x => <option key={x} value={x}>{ETICHETA_TEMEI[x]}</option>)}
              </Sel>
              <In data-camp="sursa" type="text" placeholder="sursa: document / verificare / persoană și dată" value={sursa} onChange={e => setSursa(e.target.value)} />
              <Btn data-actiune="declara" onClick={declara}>Declară {propunere} {l.um}</Btn>
              {erori.map((e, i) => <div key={i} className="text-red-700">{e}</div>)}
            </div>
          </details>
        )
        : <span className="text-muted-foreground">fără comparație validă: nicio declarație nu poate da statut</span>}
    </div>
  );
}
