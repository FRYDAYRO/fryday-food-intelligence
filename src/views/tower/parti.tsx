/**
 * Piesele comune ale turnului de control. Toate sunt PURE: primesc cifre deja calculate
 * de motoare (prin `lib/fc-tower`) și doar le desenează. Nicio formulă de business aici.
 */
import type { ReactNode } from 'react';
import { fmtLei, fmtPP, fmtPct } from '../../lib/engine';
import { cx } from '../../lib/ui';
import type {
  KpiTower, PunteTower, RandGrupBridge, RandTabelMagazin, SemnalCalitate, NivelDrill, NodDrill,
} from '../../lib/fc-tower';

/** O cifră care lipsește se scrie „—" și își spune motivul; nu devine niciodată 0. */
export function Valoare({ v, unitate, zecimale }: { v: number | null; unitate: 'PCT' | 'RON' | 'PP'; zecimale?: number }) {
  if (v === null) return <span className="text-muted-foreground">—</span>;
  if (unitate === 'RON') return <>{fmtLei(v, zecimale ?? 0)}</>;
  if (unitate === 'PP') return <>{fmtPP(v)}</>;
  return <>{fmtPct(v, zecimale ?? 1)}</>;
}

const TON: Record<string, string> = {
  ok: 'text-emerald-700', rau: 'text-red-700', atentie: 'text-orange-700', neutru: 'text-muted-foreground',
};

/** Delta: pp pentru procente, lei pentru sume. Cele două nu se amestecă niciodată. */
export function Delta({ k }: { k: KpiTower }) {
  if (k.deltaPp !== null) {
    return <span className={cx('num', TON[k.ton])}>{fmtPP(k.deltaPp)} vs perioada de comparație</span>;
  }
  if (k.deltaRON !== null) {
    return (
      <span className={cx('num', TON[k.ton])}>
        {k.deltaRON > 0 ? '+' : ''}{fmtLei(k.deltaRON, 0)}
        {k.deltaPct !== null && ` (${k.deltaPct > 0 ? '+' : ''}${fmtPct(k.deltaPct, 1)})`}
      </span>
    );
  }
  return <span className="text-muted-foreground">fără comparație</span>;
}

export function CardKpi({ k }: { k: KpiTower }) {
  return (
    <div className="rounded-md border bg-card px-4 py-3" data-kpi={k.id}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{k.eticheta}</div>
      <div className="num mt-1 text-2xl font-semibold leading-tight">
        {k.valoare === null
          ? <span className="text-base font-medium text-muted-foreground">indisponibil</span>
          : <Valoare v={k.valoare} unitate={k.unitate} />}
      </div>
      <div className="mt-0.5 text-xs">
        {k.indisponibilDe ? <span className="text-muted-foreground">{k.indisponibilDe}</span> : <Delta k={k} />}
      </div>
      {k.nota && <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{k.nota}</div>}
    </div>
  );
}

export function RandKpiuri({ kpiuri }: { kpiuri: KpiTower[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" data-zona="kpi">
      {kpiuri.map(k => <CardKpi key={k.id} k={k} />)}
    </div>
  );
}

// ————————————————————————————————————————————————————————— puntea

const LATIME_MIN = 2;

function BaraGrup({ g, total, activ, onClick }: {
  g: RandGrupBridge; total: number; activ: boolean; onClick: () => void;
}) {
  const pct = total > 0 ? Math.max(LATIME_MIN, (Math.abs(g.lei) / total) * 100) : 0;
  return (
    <button type="button" onClick={onClick} data-grup={g.grup}
      aria-pressed={activ}
      className={cx('flex w-full items-center gap-3 rounded px-2 py-1.5 text-left transition-colors hover:bg-muted/60',
        activ && 'bg-muted')}>
      <span className="w-40 shrink-0 text-sm font-semibold">{g.eticheta}</span>
      <span className="h-3 flex-1 overflow-hidden rounded-sm bg-muted">
        <span className={cx('block h-full', g.inFoodCost ? 'bg-primary' : 'bg-muted-foreground/50')}
          style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <span className="num w-28 shrink-0 text-right text-sm">{fmtLei(g.lei, 0)}</span>
      <span className="num w-20 shrink-0 text-right text-sm text-muted-foreground">
        <Valoare v={g.pp} unitate="PP" />
      </span>
      <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">{g.nrMateriale} materiale</span>
    </button>
  );
}

export function Punte({ p, activ, onAlege }: {
  p: PunteTower; activ: string | null; onAlege: (grup: string) => void;
}) {
  if (!p.disponibil) {
    return (
      <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground" data-zona="punte">
        Puntea nu e disponibilă pe această selecție. {p.motiv}
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-card p-4" data-zona="punte">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-bold">Puntea FC — din ce se compune consumul raportat</h3>
        <span className="text-xs text-muted-foreground">încredere {p.confidenta ?? '—'}/100</span>
      </div>
      <div className="space-y-0.5">
        {p.grupuri.map(g => (
          <BaraGrup key={g.grup} g={g} total={p.totalLei} activ={activ === g.grup} onClick={() => onAlege(g.grup)} />
        ))}
      </div>
      <div className="mt-3 space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span className="font-semibold">Total consum 2.9</span>
          <span className="num font-semibold">{fmtLei(p.totalLei, 0)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>din care intră în Food Cost</span>
          <span className="num">{fmtLei(p.totalFoodCostLei, 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>FC teoretic declarat de 2.9</span>
          <span className="num">{p.tintaTeoreticaLei === null
            ? <span className="text-muted-foreground">nedeclarat</span>
            : fmtLei(p.tintaTeoreticaLei, 0)}</span>
        </div>
        {p.diferentaFataDeTinta !== null && (
          <div className="flex justify-between font-semibold">
            <span>Diferență față de teoreticul declarat</span>
            <span className="num">{fmtLei(p.diferentaFataDeTinta, 0)}</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{p.notaTinta}</p>
    </div>
  );
}

/** Materialele care compun un grup — al doilea pas al drill-down-ului pe punte. */
export function MaterialeGrup({ g }: { g: RandGrupBridge }) {
  const contributii = g.componente.flatMap(c => c.contributii).sort((a, b) => b.lei - a.lei).slice(0, 25);
  if (!contributii.length) {
    return <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Grupul nu are materiale în perioada selectată.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-md border bg-card" data-zona="materiale">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Material</th><th className="px-3 py-2">Categorie sursă</th>
            <th className="px-3 py-2">Restaurant</th><th className="px-3 py-2 text-right">Lei</th>
            <th className="px-3 py-2 text-right">pp</th><th className="px-3 py-2">De ce aici</th>
          </tr>
        </thead>
        <tbody>
          {contributii.map(c => (
            <tr key={`${c.material}|${c.locatie ?? ''}|${c.perioadaSursa}`} className="border-t align-top">
              <td className="px-3 py-1.5"><b>{c.denumire}</b><span className="ml-1 text-xs text-muted-foreground">{c.material}</span></td>
              <td className="px-3 py-1.5 text-xs">{c.categorieBruta}</td>
              <td className="px-3 py-1.5 text-xs">{c.locatie ?? <span className="text-muted-foreground">fără restaurant</span>}</td>
              <td className="num px-3 py-1.5 text-right">{fmtLei(c.lei, 0)}</td>
              <td className="num px-3 py-1.5 text-right"><Valoare v={c.pp} unitate="PP" /></td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">{c.motiv}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ————————————————————————————————————————————————————————— restaurante

const INSIGNA_STATUS: Record<RandTabelMagazin['status'], string> = {
  OK: 'border-emerald-200 bg-emerald-100 text-emerald-900',
  ATENTIE: 'border-orange-200 bg-orange-100 text-orange-900',
  RISC: 'border-red-200 bg-red-100 text-red-800',
  FARA_DATE: 'border-stone-300 bg-stone-200 text-stone-700',
};

export function TabelMagazine({ randuri, excluse, baza, onAlege }: {
  randuri: RandTabelMagazin[]; excluse: RandTabelMagazin[]; baza: string;
  onAlege: (locatie: string) => void;
}) {
  return (
    <div data-zona="magazine">
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Restaurant</th>
              <th className="px-3 py-2 text-right">FC rețetar</th>
              <th className="px-3 py-2 text-right">FC NBO</th>
              <th className="px-3 py-2 text-right">Variație</th>
              <th className="px-3 py-2 text-right">Food</th>
              <th className="px-3 py-2 text-right">Paper</th>
              <th className="px-3 py-2 text-right">Normalizat</th>
              <th className="px-3 py-2 text-right">Operațional</th>
              <th className="px-3 py-2 text-right">Neexplicat</th>
              <th className="px-3 py-2 text-right">Trend</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {randuri.map(r => (
              <tr key={r.locatie} className="cursor-pointer border-t hover:bg-muted/40"
                data-magazin={r.locatie} onClick={() => onAlege(r.locatie)}>
                <td className="px-3 py-1.5 font-semibold">{r.locatie}</td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={r.recipeFcPct} unitate="PCT" /></td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={r.nboFcPct} unitate="PCT" /></td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={r.varianceRON} unitate="RON" /></td>
                <td className="num px-3 py-1.5 text-right">{fmtLei(r.foodRON, 0)}</td>
                <td className="num px-3 py-1.5 text-right">{fmtLei(r.paperRON, 0)}</td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={r.normalizedRON} unitate="RON" /></td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={r.operationalRON} unitate="RON" /></td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={r.unexplainedRON} unitate="RON" /></td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={r.trendPp} unitate="PP" /></td>
                <td className="px-3 py-1.5">
                  <span title={r.motivStatus}
                    className={cx('inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold', INSIGNA_STATUS[r.status])}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">Ordonat după: {baza}</p>
      {excluse.length > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Excluse din ordonare (metrica lipsește, nu e zero): {excluse.map(e => e.locatie).join(', ')}
        </p>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————— drill-down

export function Firimituri({ pasi, onSalt }: { pasi: { eticheta: string; index: number }[]; onSalt: (i: number) => void }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm" data-zona="firimituri" aria-label="Drill-down">
      {pasi.map((p, i) => (
        <span key={`${p.eticheta}-${p.index}`} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground">→</span>}
          <button type="button" onClick={() => onSalt(p.index)}
            className={cx('rounded px-1.5 py-0.5 font-semibold hover:bg-muted',
              i === pasi.length - 1 ? 'text-foreground' : 'text-primary')}>
            {p.eticheta}
          </button>
        </span>
      ))}
    </nav>
  );
}

export function TabelDrill({ nivel, onCoboara }: { nivel: NivelDrill; onCoboara: (n: NodDrill) => void }) {
  return (
    <div data-zona="drill" data-treapta={nivel.treapta}>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{nivel.urmatoarea ?? 'Element'}</th>
              <th className="px-3 py-2 text-right">Lei</th>
              <th className="px-3 py-2 text-right">% din nivel</th>
              <th className="px-3 py-2">Observație</th>
            </tr>
          </thead>
          <tbody>
            {nivel.noduri.map(n => (
              <tr key={n.cheie} className={cx('border-t', n.areCopii && 'cursor-pointer hover:bg-muted/40')}
                data-nod={n.cheie} onClick={() => n.areCopii && onCoboara(n)}>
                <td className="px-3 py-1.5 font-semibold">{n.eticheta}</td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={n.lei} unitate="RON" /></td>
                <td className="num px-3 py-1.5 text-right"><Valoare v={n.pct} unitate="PCT" /></td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">{n.nota ?? ''}</td>
              </tr>
            ))}
            {nivel.noduri.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                {nivel.motiv ?? 'Nimic de arătat pe acest nivel.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">Se numără: {nivel.baza}</p>
    </div>
  );
}

// ————————————————————————————————————————————————————————— calitatea datelor

const NIVEL_SEMNAL: Record<SemnalCalitate['nivel'], string> = {
  BLOCANT: 'border-red-200 bg-red-50 text-red-900',
  ATENTIE: 'border-orange-200 bg-orange-50 text-orange-900',
  INFO: 'border-sky-200 bg-sky-50 text-sky-900',
};

export function Semnale({ semnale, titlu = 'Calitatea datelor', onSectiune }: {
  semnale: SemnalCalitate[]; titlu?: string; onSectiune?: (s: SemnalCalitate) => void;
}) {
  if (!semnale.length) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm" data-zona="calitate">
        Nicio problemă de date semnalată pe această selecție.
      </div>
    );
  }
  return (
    <div className="space-y-1.5" data-zona="calitate">
      <h3 className="text-sm font-bold">{titlu}</h3>
      {semnale.map((s, i) => (
        <div key={`${s.cod}-${i}`} data-semnal={s.cod}
          className={cx('rounded-md border px-3 py-2 text-sm', NIVEL_SEMNAL[s.nivel])}>
          <div className="flex flex-wrap items-baseline gap-2">
            <b>{s.titlu}</b>
            <span className="text-[11px] font-semibold uppercase tracking-wide">{s.nivel}</span>
            {s.nrElemente > 1 && <span className="text-xs">{s.nrElemente} elemente</span>}
            {onSectiune && (
              <button type="button" onClick={() => onSectiune(s)}
                className="ml-auto text-xs font-semibold underline underline-offset-2">
                mergi la {s.sectiune}
              </button>
            )}
          </div>
          <div className="mt-0.5 text-xs leading-snug opacity-90">{s.detaliu}</div>
          {s.exemple.length > 0 && (
            <div className="mt-1 text-[11px] opacity-80">ex.: {s.exemple.join(', ')}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ————————————————————————————————————————————————————————— utilitare de layout

export function Sectiune({ titlu, sub, actiuni, children }: {
  titlu: string; sub?: string; actiuni?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-display text-lg font-bold tracking-tight">{titlu}</h2>
        {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
        {actiuni && <div className="ml-auto flex items-center gap-2">{actiuni}</div>}
      </div>
      {children}
    </section>
  );
}

export function Indisponibil({ titlu, motiv }: { titlu: string; motiv?: string }) {
  return (
    <div className="rounded-md border border-dashed bg-card p-6 text-center" data-zona="indisponibil">
      <div className="font-semibold">{titlu}</div>
      {motiv && <div className="mt-1 text-sm text-muted-foreground">{motiv}</div>}
    </div>
  );
}
