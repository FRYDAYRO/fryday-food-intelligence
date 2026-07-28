import { useMemo, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import {
  CATEG_MENU_LABEL, ETAPA_LABEL, cicluViata, driveriProfit, optimizariMeniu, optimizariReteta, oportunitati,
  type CategOportunitate, type Etapa, type RolDriver,
} from '../lib/decizii';
import { fmtInt, fmtLei, fmtPct, fmtPP } from '../lib/engine';
import { Gol, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';
import Portofoliu from './impact/Portofoliu';

const ROL: Record<RolDriver, { l: string; fel: 'ok' | 'FOOD' | 'info' | 'EXCLUS' }> = {
  MOTOR_PROFIT: { l: 'Motor de profit', fel: 'ok' },
  MOTOR_MARJA: { l: 'Marjă mare', fel: 'info' },
  CONSUMATOR_FC: { l: 'Consumator de Food Cost', fel: 'FOOD' },
  FRANA: { l: 'Trage profitabilitatea în jos', fel: 'EXCLUS' },
};

// ————————————————————————————— 1. Profit Drivers
function TabDriveri() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const dr = useMemo(() => driveriProfit(state, ctx, sel.luna), [state, ctx, sel.luna]);
  if (!dr.randuri.length) return <Gol titlu="Nicio vânzare în luna selectată" />;

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Media rețelei: marjă {fmtPct(dr.marjaMedie)} · Food Cost {fmtPct(dr.fcRetea)}{dr.tinta != null ? ` (țintă ${fmtPct(dr.tinta)})` : ''}.
        Fiecare produs primește rolul său și <b>cauza</b> — nu doar poziția în clasament.
      </p>
      <div className="space-y-2">
        {dr.randuri.map(r => (
          <div key={r.cod} className={cx('rounded-md border bg-card p-4', r.roluri.includes('FRANA') && 'border-l-4 border-l-danger', r.roluri.includes('MOTOR_PROFIT') && !r.roluri.includes('FRANA') && 'border-l-4 border-l-ok')}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[15px] font-extrabold">{r.denumire}</span>
              {r.roluri.map(x => <Insigna key={x} fel={ROL[x].fel}>{ROL[x].l}</Insigna>)}
              <span className="num ml-auto flex flex-wrap gap-3 text-sm">
                <span>profit <b>{fmtInt(r.profit)}</b> lei</span>
                <span>marjă <b>{fmtPct(r.marja)}</b></span>
                <span>FC <b>{fmtPct(r.fc)}</b></span>
                <span>ROI <b>{fmtPct(r.roi, 0)}</b></span>
              </span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{r.cauza}</div>
            <div className="num mt-1.5 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>{fmtPct(r.mix)} din vânzări</span>
              <span>{fmtPct(r.contributie)} din profit</span>
              <span>{fmtPct(r.mixCost)} din Food Cost</span>
              <span className={cx(r.decalaj >= 3 && 'font-semibold text-danger')}>decalaj {fmtPP(r.decalaj)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ————————————————————————————— 2. Menu Optimization
function TabMeniu() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const lista = useMemo(() => optimizariMeniu(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const total = lista.reduce((s, o) => s + Math.max(0, o.impactLunar ?? 0), 0);
  if (!lista.length) return <Gol titlu="Meniul este optimizat" sub="Niciun produs nu întrunește criteriile de intervenție." />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">Scanarea întregului meniu; fiecare produs primește categoriile în care se încadrează, acțiunea recomandată și impactul estimat.</p>
        <span className="rounded-md border bg-card px-3 py-1.5 text-sm">Potențial total: <b className="num text-ok">+{fmtInt(total)} lei/lună</b></span>
      </div>
      <div className="space-y-2">
        {lista.map(o => (
          <div key={o.cod} className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[15px] font-extrabold">{o.denumire}</span>
              {o.categorii.map(c => <Insigna key={c} fel={c === 'ELIMINARE' ? 'EXCLUS' : c === 'PROFITABIL_NEPROMOVAT' ? 'ok' : c === 'FC_MARE' || c === 'REFORMULARE' ? 'FOOD' : 'warn'}>{CATEG_MENU_LABEL[c]}</Insigna>)}
              {o.impactLunar != null && (
                <span className={cx('num ml-auto text-sm font-semibold', o.impactLunar >= 0 ? 'text-ok' : 'text-danger')}>
                  {o.impactLunar >= 0 ? '+' : ''}{fmtInt(o.impactLunar)} lei/lună · {fmtInt(o.impactAnual)} lei/an
                </span>
              )}
            </div>
            <div className="mt-1 text-sm"><b>Diagnostic:</b> <span className="text-muted-foreground">{o.diagnostic}</span></div>
            <div className="mt-0.5 text-sm"><b>Acțiune:</b> {o.actiune}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ————————————————————————————— 3. Recipe Optimization
function TabReteta() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const cuReteta = state.produse.filter(p => state.retete.some(r => r.cod === p.cod));
  const [cod, setCod] = useState(cuReteta[0]?.cod ?? '');
  const rez = useMemo(() => (cod ? optimizariReteta(state, ctx, cod, sel.luna) : null), [cod, state, ctx, sel.luna]);

  if (!rez) return <Gol titlu="Niciun produs cu rețetă" />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produs analizat</div>
          <Sel value={cod} onChange={e => setCod(e.target.value)}>
            {cuReteta.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
          </Sel>
        </label>
        <p className="pb-1.5 text-xs text-muted-foreground">Motorul propune scenarii și le evaluează financiar. <b>Rețeta nu se modifică</b> — aplicarea se face conștient din Product Impact sau R&D Lab.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div>
          <div className="mb-2 text-sm font-bold">Structura costului (porție InStore)</div>
          <T dens>
            <thead><tr><Th>Componentă</Th><Th dr>Cant.</Th><Th dr>Cost</Th><Th dr>% din cost</Th></tr></thead>
            <tbody>
              {rez.componente.map((c, i) => (
                <tr key={i} className={c.share >= 35 ? 'bg-primary/5 font-semibold' : ''}>
                  <Td>{c.nume}{!c.esential && <span className="ml-1.5"><Insigna fel="info">neesențial</Insigna></span>}</Td>
                  <Td dr>{c.cant} {c.um}</Td>
                  <Td dr>{fmtLei(c.cost)}</Td>
                  <Td dr>{fmtPct(c.share)}</Td>
                </tr>
              ))}
            </tbody>
          </T>
        </div>

        <div>
          <div className="mb-2 text-sm font-bold">Scenarii de optimizare propuse ({rez.scenarii.length})</div>
          {rez.scenarii.length === 0 ? <Gol titlu="Nicio pârghie de optimizare identificată" /> : (
            <div className="space-y-2">
              {rez.scenarii.map(s => (
                <div key={s.id} className="rounded-md border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Insigna fel={s.tip === 'GRAMAJ' ? 'warn' : s.tip === 'SURSA' ? 'info' : 'EXCLUS'}>
                      {s.tip === 'GRAMAJ' ? 'Reducere gramaj' : s.tip === 'SURSA' ? 'Înlocuire sursă' : 'Eliminare ingredient'}
                    </Insigna>
                    <span className="font-semibold">{s.titlu}</span>
                    <span className="num ml-auto flex gap-3 text-sm">
                      <span>cost {fmtLei(s.costNou)} <span className="text-muted-foreground">({s.dCostPortie >= 0 ? '+' : ''}{fmtLei(s.dCostPortie)})</span></span>
                      <span>FC <b>{fmtPct(s.fcNou)}</b></span>
                      <span className={cx('font-semibold', s.dProfitLunar >= 0 ? 'text-ok' : 'text-danger')}>
                        {s.dProfitLunar >= 0 ? '+' : ''}{fmtInt(s.dProfitLunar)} lei/lună
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.motiv} Impact anual estimat: {s.dProfitAnual >= 0 ? '+' : ''}{fmtInt(s.dProfitAnual)} lei.</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ————————————————————————————— 4. Product Lifecycle
const ETAPA_FEL: Record<Etapa, 'info' | 'ok' | 'FOOD' | 'EXCLUS'> = {
  LANSARE: 'info', CRESTERE: 'ok', MATURITATE: 'FOOD', DECLIN: 'EXCLUS',
};

function TabCiclu() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const lista = useMemo(() => cicluViata(state, ctx, sel.luna), [state, ctx, sel.luna]);
  if (!lista.length) return <Gol titlu="Fără istoric de vânzări" />;

  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {(['LANSARE', 'CRESTERE', 'MATURITATE', 'DECLIN'] as Etapa[]).map(e => (
          <div key={e} className="rounded-md border bg-card px-3 py-2 text-center">
            <div className="num text-xl font-semibold">{lista.filter(x => x.etapa === e).length}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{ETAPA_LABEL[e]}</div>
          </div>
        ))}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Etapa se determină din istoricul PMIX: vechimea produsului, trendul ultimelor 14 zile față de cele 14 anterioare și poziția față de vârful istoric.
      </p>
      <div className="space-y-2">
        {lista.map(c => (
          <div key={c.cod} className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[15px] font-extrabold">{c.denumire}</span>
              <Insigna fel={ETAPA_FEL[c.etapa]}>{ETAPA_LABEL[c.etapa]}</Insigna>
              <span className="num ml-auto flex gap-3 text-sm">
                <span className={cx('font-semibold', (c.trendPct ?? 0) >= 0 ? 'text-ok' : 'text-danger')}>
                  {(c.trendPct ?? 0) >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(c.trendPct ?? 0))}
                </span>
                <span>marjă {fmtPct(c.marja)}</span>
                <span>{fmtPct(c.contributie)} din profit</span>
              </span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{c.dovada}</div>
            <div className="mt-0.5 text-sm">{c.recomandare}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ————————————————————————————— 5. Opportunity Finder
const CAT_OPP: Record<CategOportunitate, { l: string; fel: 'FOOD' | 'ok' | 'info' | 'warn' | 'PAPER' | 'EXCLUS' }> = {
  FOOD_COST: { l: 'Reducere Food Cost', fel: 'FOOD' },
  PROFIT: { l: 'Creștere de profit', fel: 'ok' },
  MENIU: { l: 'Optimizare de meniu', fel: 'warn' },
  INGREDIENT: { l: 'Optimizare ingrediente', fel: 'info' },
  PROMOVARE: { l: 'De promovat', fel: 'PAPER' },
  ANALIZA: { l: 'Analiză urgentă', fel: 'EXCLUS' },
};

function TabOportunitati() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const lista = useMemo(() => oportunitati(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const total = lista.reduce((s, o) => s + Math.max(0, o.impactLunar ?? 0), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">Scanare automată a întregii baze de date: rețetar, prețuri, oferte de furnizori, PMIX și istoricul vânzărilor.</p>
        <span className="rounded-md border bg-card px-3 py-1.5 text-sm">
          Impact cumulat: <b className="num text-ok">+{fmtInt(total)} lei/lună</b> · <span className="num">{fmtInt(total * 12)} lei/an</span>
        </span>
      </div>
      {lista.length === 0 ? <Gol titlu="Nicio oportunitate deschisă" /> : (
        <T dens>
          <thead><tr><Th>#</Th><Th>Oportunitate</Th><Th>Categorie</Th><Th dr>Impact lunar</Th><Th dr>Impact anual</Th><Th>Se execută în</Th></tr></thead>
          <tbody>
            {lista.map((o, i) => (
              <tr key={o.id}>
                <Td className="num text-muted-foreground">{i + 1}</Td>
                <Td>
                  <div className="font-semibold">{o.titlu}</div>
                  <div className="text-xs text-muted-foreground">{o.detaliu}</div>
                </Td>
                <Td><Insigna fel={CAT_OPP[o.categorie].fel}>{CAT_OPP[o.categorie].l}</Insigna></Td>
                <Td dr className={cx('font-semibold', (o.impactLunar ?? 0) > 0 ? 'text-ok' : '')}>{o.impactLunar != null ? `${o.impactLunar >= 0 ? '+' : ''}${fmtInt(o.impactLunar)} lei` : '—'}</Td>
                <Td dr>{o.impactAnual != null ? `${o.impactAnual >= 0 ? '+' : ''}${fmtInt(o.impactAnual)} lei` : '—'}</Td>
                <Td className="text-xs text-muted-foreground">{o.unde}</Td>
              </tr>
            ))}
          </tbody>
        </T>
      )}
    </div>
  );
}

export default function DecisionIntelligence() {
  const [tab, setTab] = useState<'driveri' | 'meniu' | 'portof' | 'reteta' | 'ciclu' | 'oport'>('driveri');
  return (
    <div>
      <Titlu>Decision Intelligence</Titlu>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border bg-card p-1">
        {([['driveri', 'Profit Drivers'], ['meniu', 'Menu Optimization'], ['portof', 'Portfolio Optimization'], ['reteta', 'Recipe Optimization'], ['ciclu', 'Product Lifecycle'], ['oport', 'Opportunity Finder']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx('rounded px-3 py-1.5 text-sm font-semibold', tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{l}</button>
        ))}
      </div>
      {tab === 'driveri' && <TabDriveri />}
      {tab === 'meniu' && <TabMeniu />}
      {tab === 'portof' && <Portofoliu />}
      {tab === 'reteta' && <TabReteta />}
      {tab === 'ciclu' && <TabCiclu />}
      {tab === 'oport' && <TabOportunitati />}
    </div>
  );
}
