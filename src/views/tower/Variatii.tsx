/**
 * Variații — vederea de luni dimineață: ce s-a mișcat în FC de săptămâna trecută și de
 * luna trecută, și din ce anume vine mișcarea.
 *
 * Ecranul nu calculează nimic: compune `tablouVariatii`, care la rândul lui compune
 * motoarele canonice. Singura regulă vizuală proprie: pp, % și lei se scriu cu unitatea
 * lor, niciodată amestecate.
 */
import { fmtLei, fmtPP, fmtPct } from '../../lib/engine';
import { Insigna, cx } from '../../lib/ui';
import type { CadentaVariatii, MiscarePret, SemnalVariatie, Severitate } from '../../lib/fc-variatii';
import { useVariatii } from './date';
import { Indisponibil, Sectiune } from './parti';

const TON_SEVERITATE: Record<Severitate, 'ok' | 'warn' | 'EXCLUS' | 'info'> = {
  ALERTA: 'EXCLUS', ATENTIE: 'warn', INFO: 'info',
};

/** Cifra unui semnal, scrisă în unitatea ei — pp nu devine niciodată %. */
function ValoareSemnal({ s }: { s: SemnalVariatie }) {
  if (s.valoare === null || s.unitate === null) return null;
  const text = s.unitate === 'lei' ? fmtLei(s.valoare, 0)
    : s.unitate === 'pp' ? fmtPP(s.valoare)
      : `${s.valoare > 0 ? '+' : ''}${fmtPct(s.valoare, 1)}`;
  return <span className="num shrink-0 text-sm font-semibold">{text}</span>;
}

function Semnale({ semnale }: { semnale: SemnalVariatie[] }) {
  if (!semnale.length) {
    return (
      <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground" data-zona="semnale">
        Nicio mișcare peste praguri în perioadele încheiate.
      </div>
    );
  }
  return (
    <div className="space-y-1.5" data-zona="semnale">
      {semnale.map((s, k) => (
        <div key={`${s.fel}-${k}`} data-semnal={s.fel}
          className="flex items-start gap-3 rounded-md border bg-card px-3 py-2">
          <Insigna fel={TON_SEVERITATE[s.severitate]}>{s.severitate}</Insigna>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{s.titlu}</div>
            <div className="text-xs leading-snug text-muted-foreground">{s.detaliu}</div>
          </div>
          <ValoareSemnal s={s} />
        </div>
      ))}
    </div>
  );
}

/**
 * Descompunerea ΔFC. Cei doi termeni se adună EXACT la ΔFC — de asta pot sta unul lângă
 * altul fără un „rest" care să înghită diferența.
 */
function Descompunere({ c }: { c: CadentaVariatii }) {
  const d = c.descompunere;
  if (!d) {
    return (
      <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
        Fără perioadă de comparație: {c.comparatie?.motivIndisponibil ?? 'istoricul lipsește.'}
      </div>
    );
  }
  const ton = d.deltaFcPp > 0 ? 'text-red-700' : d.deltaFcPp < 0 ? 'text-emerald-700' : '';
  const parti: { et: string; v: string; nota: string }[] = [
    { et: 'din cost', v: fmtPP(d.efectCostPp), nota: `Δcost ${fmtLei(d.deltaCostRON, 0)} ÷ vânzările perioadei` },
    { et: 'din vânzări', v: fmtPP(d.efectVanzariPp), nota: `Δvânzări ${fmtLei(d.deltaNetRON, 0)} mută numitorul` },
  ];
  return (
    <div className="rounded-md border bg-card p-3" data-zona="descompunere">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Food Cost</span>
        <span className="num text-2xl font-semibold leading-tight">{fmtPct(d.fcCurentPct, 2)}</span>
        <span data-camp="delta-fc" className={cx('num text-sm font-semibold', ton)}>{fmtPP(d.deltaFcPp)}</span>
        <span className="text-xs text-muted-foreground">
          de la {fmtPct(d.fcPrecedentPct, 2)} pe {c.perioadaPrecedenta?.cheie}
        </span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {parti.map(p => (
          <div key={p.et} data-parte={p.et} className="rounded border bg-muted/30 px-2.5 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{p.et}</span>
              <span className="num text-sm font-semibold" data-valoare={p.v}>{p.v}</span>
            </div>
            <div className="text-[11px] leading-snug text-muted-foreground">{p.nota}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Cei doi termeni se adună exact la {fmtPP(d.deltaFcPp)} — nu e o repartiție aleasă, e rescrierea diferenței.
        {' '}Vânzări {fmtLei(d.netCurentRON, 0)} · cost din rețete {fmtLei(d.costCurentRON, 0)}.
      </div>
    </div>
  );
}

function TabelMiscari({ c }: { c: CadentaVariatii }) {
  if (!c.miscari.length) {
    return (
      <div className="rounded-md border border-dashed bg-card px-3 py-4 text-center text-sm text-muted-foreground">
        Fără mișcări pe ingrediente în această cadență.
      </div>
    );
  }
  const cel = (v: number | null, f: (n: number) => string) =>
    (v === null ? <span className="text-muted-foreground">—</span> : f(v));
  const semn = (v: number | null) => cx('num text-right', v !== null && v > 0 && 'text-red-700', v !== null && v < 0 && 'text-emerald-700');
  return (
    <div className="overflow-x-auto rounded-md border bg-card" data-zona="miscari">
      <table className="w-full text-[13px]">
        <thead>
          <tr>
            {['Ingredient', 'Preț', 'Δpreț', 'Consum', 'Δcost', 'din preț', 'din consum', 'încrucișat', 'ΔFC'].map((h, i) => (
              <th key={h} className={cx('whitespace-nowrap border-b bg-muted/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
                i > 0 && 'text-right')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {c.miscari.map((m: MiscarePret) => (
            <tr key={m.ingredient} data-ingredient={m.ingredient}>
              <td className="border-b px-3 py-1.5">
                <span className="font-semibold">{m.denumire}</span>
                {m.pretEstimat && (
                  <span className="ml-1.5 text-[11px] text-orange-700" title="Prețul unei perioade e retro-umplut, nu era cunoscut atunci">estimat</span>
                )}
                <div className="text-[11px] text-muted-foreground">{m.categorie}</div>
              </td>
              <td className="num border-b px-3 py-1.5 text-right" data-camp="pret">{cel(m.pretCurent, v => fmtLei(v, 2))}</td>
              <td className={cx('border-b px-3 py-1.5', semn(m.deltaPretPct))}>
                {cel(m.deltaPretPct, v => `${v > 0 ? '+' : ''}${fmtPct(v, 1)}`)}
              </td>
              <td className={cx('border-b px-3 py-1.5', semn(m.deltaConsumPct))}>
                {cel(m.deltaConsumPct, v => `${v > 0 ? '+' : ''}${fmtPct(v, 1)}`)}
              </td>
              <td data-camp="delta-cost" className={cx('border-b px-3 py-1.5 font-semibold', semn(m.deltaCostRON))}>
                {cel(m.deltaCostRON, v => fmtLei(v, 0))}
              </td>
              <td className={cx('border-b px-3 py-1.5', semn(m.efectPretRON))}>{cel(m.efectPretRON, v => fmtLei(v, 0))}</td>
              <td className={cx('border-b px-3 py-1.5', semn(m.efectConsumRON))}>{cel(m.efectConsumRON, v => fmtLei(v, 0))}</td>
              <td className={cx('border-b px-3 py-1.5', semn(m.efectIncrucisatRON))}>{cel(m.efectIncrucisatRON, v => fmtLei(v, 0))}</td>
              <td className={cx('border-b px-3 py-1.5', semn(m.fcImpactPp))}>{cel(m.fcImpactPp, fmtPP)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.miscariTotale > c.miscari.length && (
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          Se arată {c.miscari.length} din {c.miscariTotale} ingrediente cu mișcare — restul au impact mai mic.
        </div>
      )}
    </div>
  );
}

/** Golul dintre cele două convenții de evaluare, scris ca atare. */
function Reconciliere({ c }: { c: CadentaVariatii }) {
  const r = c.reconciliere;
  if (!r || r.deltaCostReteteRON === null) return null;
  const neglijabil = r.diferentaRON !== null && Math.abs(r.diferentaRON) < 0.5;
  return (
    <details className="rounded-md border bg-card px-3 py-2 text-sm" data-zona="reconciliere">
      <summary className="cursor-pointer select-none text-xs font-semibold text-muted-foreground">
        Suma pe ingrediente {fmtLei(r.sumaIngredienteRON, 0)} vs Δcost din rețete {fmtLei(r.deltaCostReteteRON, 0)}
        {!neglijabil && r.diferentaRON !== null && <> · diferență {fmtLei(r.diferentaRON, 0)}</>}
      </summary>
      <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
        {neglijabil && <p>Cele două vederi coincid pe această perioadă.</p>}
        {r.motive.map(m => <p key={m}>{m}</p>)}
        {r.ingredienteFaraPret.length > 0 && (
          <p>Fără preț: {r.ingredienteFaraPret.slice(0, 12).join(', ')}
            {r.ingredienteFaraPret.length > 12 && ` și încă ${r.ingredienteFaraPret.length - 12}`}.</p>
        )}
      </div>
    </details>
  );
}

function Cadenta({ c }: { c: CadentaVariatii }) {
  if (!c.disponibil) {
    return (
      <Sectiune titlu={c.eticheta} sub={c.perioada.cheie}>
        <Indisponibil titlu="Fără date pe perioada încheiată" motiv={c.motivIndisponibil} />
      </Sectiune>
    );
  }
  return (
    <Sectiune
      titlu={c.eticheta}
      sub={`${c.perioada.cheie} (${c.perioada.de} → ${c.perioada.la})`}
      actiuni={!c.nboDisponibil
        ? <span className="text-[11px] text-muted-foreground" title={c.motivNbo}>FC din rețete · fără 2.9</span>
        : undefined}>
      <div data-cadenta={c.cadenta} className="space-y-3">
        <Descompunere c={c} />
        <TabelMiscari c={c} />
        <Reconciliere c={c} />
        {c.motiveIncomplet.length > 0 && (
          <ul className="space-y-0.5 text-[11px] leading-snug text-muted-foreground" data-zona="motive">
            {c.motiveIncomplet.map(m => <li key={m}>· {m}</li>)}
          </ul>
        )}
      </div>
    </Sectiune>
  );
}

export default function Variatii() {
  const tab = useVariatii();
  return (
    <div className="space-y-6" data-ecran="variatii">
      <Sectiune titlu="Ce s-a mișcat" sub="cele mai importante schimbări din ambele cadențe">
        <Semnale semnale={tab.semnale} />
      </Sectiune>

      {tab.cadente.map(c => <Cadenta key={c.cadenta} c={c} />)}

      <p className="text-[11px] leading-relaxed text-muted-foreground" data-zona="nota">
        Vederea arată întotdeauna <b>ambele cadențe</b> și numai <b>perioade încheiate</b>, comparate
        cu perioada dinaintea lor: din bară ia scopul, restaurantul, canalul și ancora, dar nu
        granularitatea și nu comparația — altfel n-ar putea pune săptămâna și luna una lângă alta.
        {' '}Procentele de FC se compară în puncte procentuale (pp), sumele în lei.
      </p>
    </div>
  );
}
