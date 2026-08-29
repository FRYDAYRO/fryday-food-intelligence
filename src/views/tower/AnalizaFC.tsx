/**
 * Analiză FC — evoluția în timp și drill-down-ul Companie → Restaurant → Categorie →
 * Produs → Ingredient. Seria are exact perioadele cu date: nu se completează goluri.
 */
import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtLei, fmtPP, fmtPct } from '../../lib/engine';
import { Insigna } from '../../lib/ui';
import {
  nivelDrill, puncteGrafic, type CaleDrill, type NodDrill,
} from '../../lib/fc-tower';
import { useTower } from './context';
import { useAnaliza, useIngrediente, useSerie } from './date';
import { Firimituri, Indisponibil, Sectiune, TabelDrill, Valoare } from './parti';

function Comparatie() {
  const analiza = useAnaliza();
  const c = analiza.comparatie;
  if (!c) return null;
  if (!c.disponibil) {
    return (
      <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground" data-zona="comparatie">
        Comparația nu e disponibilă: {c.motivIndisponibil}
      </div>
    );
  }
  const linii: [string, string][] = [
    ['FC rețetar', fmtPP(c.recipeFc.deltaPp)],
    ['FC actual NBO', fmtPP(c.nboActualFc.deltaPp)],
    ['Explicat', fmtPP(c.explained.deltaPp)],
    ['Vânzări nete', c.sales.deltaRON !== null ? fmtLei(c.sales.deltaRON, 0) : '—'],
    ['Cost rețetar', c.recipeCost.deltaRON !== null ? fmtLei(c.recipeCost.deltaRON, 0) : '—'],
    ['Variație', c.variance.deltaRON !== null ? fmtLei(c.variance.deltaRON, 0) : '—'],
  ];
  return (
    <div className="rounded-md border bg-card p-3" data-zona="comparatie">
      <div className="mb-2 text-sm font-bold">
        Față de {c.perioadaPrecedenta?.cheie} <span className="font-normal text-muted-foreground">(pp pentru procente, lei pentru sume)</span>
      </div>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {linii.map(([et, v]) => (
          <div key={et} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{et}</span><span className="num">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Grafic() {
  const serie = useSerie();
  const puncte = puncteGrafic(serie);
  if (!puncte.length) {
    return <Indisponibil titlu="Fără serie" motiv="Nu există perioade cu vânzări în scopul selectat." />;
  }
  const date = puncte.map(p => ({
    perioada: p.cheie,
    'FC rețetar': p.fcRetetar !== null ? +p.fcRetetar.toFixed(2) : null,
    'FC actual NBO': p.fcNbo !== null ? +p.fcNbo.toFixed(2) : null,
  }));
  return (
    <div data-zona="grafic">
      <div className="h-64 rounded-md border bg-card p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={date}>
            <XAxis dataKey="perioada" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={v => (typeof v === 'number' ? `${v}%` : '—')} />
            <Line type="monotone" dataKey="FC rețetar" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="FC actual NBO" stroke="hsl(var(--ok))" strokeWidth={2} dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span>Punctele lipsă rămân goale — nu se interpolează.</span>
        {puncte.filter(p => p.partial).map(p => (
          <Insigna key={p.cheie} fel="warn">{p.cheie} parțială</Insigna>
        ))}
      </div>
    </div>
  );
}

function Drill() {
  const { sel } = useTower();
  const [cale, setCale] = useState<CaleDrill>({});
  const locatie = cale.locatie ?? (sel.scop === 'RESTAURANT' ? sel.locatie ?? undefined : undefined);
  const analiza = useAnaliza(locatie);
  const ingrediente = useIngrediente(locatie);
  const nivel = nivelDrill(analiza, cale, sel, ingrediente.disponibil ? ingrediente : null);

  const pasi = [
    { eticheta: sel.scop === 'COMPANIE' ? 'Companie' : (sel.locatie ?? 'Restaurant'), index: 0 },
    ...(cale.locatie ? [{ eticheta: cale.locatie, index: 1 }] : []),
    ...(cale.categorie ? [{ eticheta: cale.categorie, index: 2 }] : []),
    ...(cale.produs ? [{ eticheta: cale.produs, index: 3 }] : []),
  ];
  const salt = (i: number) => setCale(i === 0 ? {} : i === 1 ? { locatie: cale.locatie }
    : i === 2 ? { locatie: cale.locatie, categorie: cale.categorie } : cale);
  const coboara = (n: NodDrill) => setCale(
    n.treapta === 'RESTAURANT' ? { locatie: n.cheie }
      : n.treapta === 'CATEGORIE' ? { ...cale, categorie: n.cheie }
        : { ...cale, produs: n.cheie });

  return (
    <div className="space-y-2">
      <Firimituri pasi={pasi} onSalt={salt} />
      <TabelDrill nivel={nivel} onCoboara={coboara} />
    </div>
  );
}

function Clasamente() {
  const analiza = useAnaliza();
  if (!analiza.clasamente) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3" data-zona="clasamente">
      {analiza.clasamente.map(c => (
        <div key={c.criteriu} className="rounded-md border bg-card p-3" data-clasament={c.criteriu}>
          <div className="text-sm font-bold">{c.eticheta}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{c.baza}</div>
          <ol className="mt-2 space-y-0.5 text-sm">
            {c.randuri.slice(0, 5).map((r, i) => (
              <li key={r.locatie} className="flex justify-between">
                <span>{i + 1}. {r.locatie}</span>
                <span className="num">{c.criteriu.includes('FC') && !c.criteriu.includes('IMPACT')
                  ? fmtPct(r.valoare, 1) : fmtLei(r.valoare, 0)}</span>
              </li>
            ))}
            {c.randuri.length === 0 && <li className="text-muted-foreground">niciun restaurant cu această metrică</li>}
          </ol>
          {c.excluse.length > 0 && (
            <div className="mt-1.5 text-[11px] text-muted-foreground">excluse: {c.excluse.join(', ')}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AnalizaFC() {
  const analiza = useAnaliza();
  if (!analiza.disponibil) {
    return <Indisponibil titlu="Nu există date pe această selecție" motiv={analiza.motivIndisponibil} />;
  }
  return (
    <div className="space-y-6">
      <Sectiune titlu="Evoluția Food Cost" sub="ultimele perioade cu date, la granularitatea aleasă">
        <Grafic />
      </Sectiune>
      <Sectiune titlu="Comparația perioadei">
        <Comparatie />
      </Sectiune>
      <Sectiune titlu="Drill-down" sub="Companie → Restaurant → Categorie → Produs → Ingredient">
        <Drill />
      </Sectiune>
      <Sectiune titlu="Clasamente" sub="ordonate de motor, după metricile scrise sub fiecare titlu">
        <Clasamente />
      </Sectiune>
      <div className="text-[11px] text-muted-foreground">
        Acoperirea rețetelor: <Valoare v={analiza.metrici?.acoperirePct ?? null} unitate="PCT" /> din vânzările nete ale scopului.
      </div>
    </div>
  );
}
