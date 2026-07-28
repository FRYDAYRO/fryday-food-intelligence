import { useMemo, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import type { RegulaBusiness, TipRegula } from '../lib/types';
import {
  echilibruMeniu, riscIngrediente, scoruriProduse, verificaReguli,
  type ComponentaScor, type Explicatie,
} from '../lib/scoruri';
import { fmtInt, fmtLei, fmtPct, fmtPP } from '../lib/engine';
import { Btn, Gol, In, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';

// ————————————————— explicabilitatea, refolosită de toate secțiunile
function Explicare({ e }: { e: Explicatie }) {
  const fel = e.incredere === 'RIDICATA' ? 'ok' : e.incredere === 'MEDIE' ? 'FOOD' : 'EXCLUS';
  return (
    <div className="mt-2 rounded border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cum s-a calculat</span>
        <Insigna fel={fel}>încredere {e.incredere === 'RIDICATA' ? 'ridicată' : e.incredere === 'MEDIE' ? 'medie' : 'scăzută'}</Insigna>
        <span className="text-xs text-muted-foreground">{e.motivIncredere}</span>
      </div>
      <div className="mt-1.5"><b>Date folosite:</b> <span className="text-muted-foreground">{e.date.join(' · ')}</span></div>
      <div className="mt-1"><b>Logica:</b> <span className="text-muted-foreground">{e.logica}</span></div>
      <div className="mt-1"><b>Calcule:</b></div>
      <ul className="num ml-4 list-disc text-xs text-muted-foreground">{e.calcule.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <div className="mt-1"><b>Impact estimat:</b> {e.impact}</div>
    </div>
  );
}

function Bara({ comp }: { comp: ComponentaScor }) {
  const culoare = comp.scor >= 70 ? '#1E7F4F' : comp.scor >= 45 ? '#B97A0A' : '#C6373C';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-40 shrink-0 truncate">{comp.nume} <span className="text-muted-foreground">({comp.pondere}%)</span></span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
        <div className="h-full" style={{ width: `${comp.scor}%`, background: culoare }} />
      </div>
      <span className="num w-10 shrink-0 text-right font-semibold">{comp.scor.toFixed(0)}</span>
      <span className="hidden flex-1 truncate text-muted-foreground xl:block">{comp.detaliu}</span>
    </div>
  );
}

// ————————————————— 1. Product Health Score
function TabSanatate() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const lista = useMemo(() => scoruriProduse(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const [deschis, setDeschis] = useState<string | null>(null);
  if (!lista.length) return <Gol titlu="Nicio vânzare în luna selectată" />;

  const medie = lista.reduce((s, x) => s + x.scor, 0) / lista.length;

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className="rounded-md border bg-card px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Scor mediu meniu</div>
          <div className="num text-xl font-semibold">{medie.toFixed(0)}/100</div>
        </div>
        {(['EXCELENT', 'BUN', 'ATENTIE', 'CRITIC'] as const).map(v => (
          <div key={v} className="rounded-md border bg-card px-3 py-2 text-center">
            <div className="num text-xl font-semibold">{lista.filter(x => x.verdict === v).length}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {v === 'EXCELENT' ? 'excelente' : v === 'BUN' ? 'bune' : v === 'ATENTIE' ? 'de urmărit' : 'critice'}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {lista.map(h => (
          <div key={h.cod} className={cx('rounded-md border bg-card p-4',
            h.verdict === 'CRITIC' && 'border-l-4 border-l-danger', h.verdict === 'EXCELENT' && 'border-l-4 border-l-ok')}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-2xl font-bold">{h.scor.toFixed(0)}</span>
              <span className="text-sm text-muted-foreground">/100</span>
              <span className="font-display ml-1 text-[15px] font-extrabold">{h.denumire}</span>
              <Insigna fel={h.verdict === 'EXCELENT' ? 'ok' : h.verdict === 'BUN' ? 'info' : h.verdict === 'ATENTIE' ? 'warn' : 'EXCLUS'}>
                {h.verdict === 'EXCELENT' ? 'excelent' : h.verdict === 'BUN' ? 'bun' : h.verdict === 'ATENTIE' ? 'de urmărit' : 'critic'}
              </Insigna>
              <span className="num ml-auto flex flex-wrap gap-3 text-sm">
                <span>FC <b>{fmtPct(h.fc)}</b></span>
                <span>marjă <b>{fmtPct(h.marja)}</b></span>
                <span>profit <b>{fmtInt(h.profit)}</b> lei</span>
                <span>{fmtInt(h.buc)} buc</span>
              </span>
            </div>
            <div className="mt-2 space-y-1">{h.componente.map(c => <Bara key={c.nume} comp={c} />)}</div>
            <div className="mt-1.5 text-sm text-muted-foreground">{h.explicatie.impact}</div>
            <button className="mt-1 text-xs underline" onClick={() => setDeschis(deschis === h.cod ? null : h.cod)}>
              {deschis === h.cod ? 'ascunde explicația' : 'cum s-a calculat scorul?'}
            </button>
            {deschis === h.cod && <Explicare e={h.explicatie} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ————————————————— 2. Ingredient Risk Analyzer
function TabRisc() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const lista = useMemo(() => riscIngrediente(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const [deschis, setDeschis] = useState<string | null>(null);
  if (!lista.length) return <Gol titlu="Niciun ingredient cu consum în luna selectată" />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-sm">
        {(['RIDICAT', 'MEDIU', 'SCAZUT'] as const).map(n => (
          <span key={n} className="rounded-md border bg-card px-3 py-1.5">
            <b className={cx('num', n === 'RIDICAT' ? 'text-danger' : n === 'MEDIU' ? '' : 'text-ok')}>{lista.filter(x => x.nivel === n).length}</b>
            {' '}risc {n === 'RIDICAT' ? 'ridicat' : n === 'MEDIU' ? 'mediu' : 'scăzut'}
          </span>
        ))}
        <span className="ml-auto self-center text-xs text-muted-foreground">
          Expunere totală la o scumpire generalizată de 10%: <b className="num">{fmtInt(lista.reduce((s, x) => s + x.riscLa10Pct, 0))} lei/lună</b>
        </span>
      </div>

      <div className="space-y-2">
        {lista.map(r => (
          <div key={r.cod} className={cx('rounded-md border bg-card p-4', r.nivel === 'RIDICAT' && 'border-l-4 border-l-danger')}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-2xl font-bold">{r.scor.toFixed(0)}</span>
              <span className="text-sm text-muted-foreground">/100</span>
              <span className="font-display ml-1 text-[15px] font-extrabold">{r.nume}</span>
              <Insigna fel={r.nivel === 'RIDICAT' ? 'EXCLUS' : r.nivel === 'MEDIU' ? 'warn' : 'ok'}>
                risc {r.nivel === 'RIDICAT' ? 'ridicat' : r.nivel === 'MEDIU' ? 'mediu' : 'scăzut'}
              </Insigna>
              <span className="num ml-auto flex flex-wrap gap-3 text-sm">
                <span>{r.nrProduse} produse</span>
                <span>{fmtInt(r.cheltuialaAnuala)} lei/an</span>
                <span className="text-danger">+10% = −{fmtInt(r.riscLa10Pct)} lei/lună</span>
              </span>
            </div>
            <div className="mt-2 space-y-1">{r.componente.map(c => <Bara key={c.nume} comp={c} />)}</div>
            <div className="mt-1.5 text-sm text-muted-foreground">
              Prezent în: {r.produse.join(' · ')}. Ultima variație de preț: {r.variatiePct !== 0 ? `${r.variatiePct > 0 ? '+' : ''}${fmtPct(r.variatiePct)}` : 'niciuna'}.
            </div>
            <button className="mt-1 text-xs underline" onClick={() => setDeschis(deschis === r.cod ? null : r.cod)}>
              {deschis === r.cod ? 'ascunde explicația' : 'cum s-a calculat riscul?'}
            </button>
            {deschis === r.cod && <Explicare e={r.explicatie} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ————————————————— 4. Menu Balance Analyzer
function TabEchilibru() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const e = useMemo(() => echilibruMeniu(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const [expl, setExpl] = useState(false);

  return (
    <div>
      <T dens>
        <thead><tr><Th>Categorie</Th><Th dr>SKU</Th><Th dr>% din meniu</Th><Th dr>% din vânzări</Th><Th dr>% din profit</Th><Th dr>FC %</Th><Th dr>Echilibru</Th><Th>Verdict</Th></tr></thead>
        <tbody>
          {e.categorii.map(c => (
            <tr key={c.categorie}>
              <Td className="font-semibold">{c.categorie}</Td>
              <Td dr>{c.nrSKU}</Td>
              <Td dr>{fmtPct(c.shareSKU)}</Td>
              <Td dr>{fmtPct(c.shareVanzari)}</Td>
              <Td dr>{fmtPct(c.shareProfit)}</Td>
              <Td dr>{fmtPct(c.fc)}</Td>
              <Td dr className={cx('font-semibold', c.scorEchilibru <= -8 ? 'text-danger' : c.scorEchilibru >= 8 ? 'text-ok' : '')}>{fmtPP(c.scorEchilibru)}</Td>
              <Td><Insigna fel={c.verdict === 'SUPRADIMENSIONATA' ? 'EXCLUS' : c.verdict === 'SUBREPREZENTATA' ? 'ok' : 'info'}>
                {c.verdict === 'SUPRADIMENSIONATA' ? 'supradimensionată' : c.verdict === 'SUBREPREZENTATA' ? 'subreprezentată' : 'echilibrată'}
              </Insigna></Td>
            </tr>
          ))}
        </tbody>
      </T>

      <Titlu>Recomandări pentru R&D</Titlu>
      <div className="space-y-2">
        {e.categorii.filter(c => c.verdict !== 'ECHILIBRATA').map(c => (
          <div key={c.categorie} className="rounded-md border bg-card p-3 text-sm">
            <b>{c.categorie}</b> — {c.recomandare}
          </div>
        ))}
        {e.recomandariRnD.map((r, i) => (
          <div key={i} className="rounded-md border bg-card p-3 text-sm text-muted-foreground">{r}</div>
        ))}
      </div>

      <button className="mt-3 text-xs underline" onClick={() => setExpl(!expl)}>{expl ? 'ascunde explicația' : 'cum se determină echilibrul?'}</button>
      {expl && <Explicare e={e.explicatie} />}
    </div>
  );
}

// ————————————————— 6. Business Rule Engine
const TIPURI: { v: TipRegula; l: string; um: string }[] = [
  { v: 'FC_MAX_CATEGORIE', l: 'Food Cost maxim pe categorie', um: '%' },
  { v: 'MARJA_MIN', l: 'Marjă minimă pe produs', um: '%' },
  { v: 'PROFIT_MIN_PRODUS', l: 'Profit minim pe produs', um: 'lei/lună' },
  { v: 'VOLUM_MIN', l: 'Volum minim pe produs', um: 'buc/lună' },
  { v: 'COST_MAX_INGREDIENT', l: 'Cost maxim pe ingredient', um: 'lei/UM' },
];

function TabReguli() {
  const { state, ctx, update } = useStore();
  const { sel } = useSel();
  const rez = useMemo(() => verificaReguli(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const [tipNou, setTipNou] = useState<TipRegula>('MARJA_MIN');
  const [valNoua, setValNoua] = useState('70');
  const [scopNou, setScopNou] = useState('');

  const setReg = (id: string, patch: Partial<RegulaBusiness>) =>
    update(s => ({ ...s, reguliBusiness: s.reguliBusiness.map(r => r.id === id ? { ...r, ...patch } : r) }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">Regulile se verifică automat pe datele lunii selectate. Alertele existente rămân neschimbate — acestea sunt regulile tale de business.</p>
        <span className="rounded-md border bg-card px-3 py-1.5 text-sm">
          <b className={cx('num', rez.incalcari.length ? 'text-danger' : 'text-ok')}>{rez.incalcari.length}</b> încălcări din {rez.verificate} verificări
        </span>
      </div>

      <T dens>
        <thead><tr><Th>Activă</Th><Th>Regulă</Th><Th>Se aplică la</Th><Th dr>Valoare</Th><Th dr>Încălcări</Th></tr></thead>
        <tbody>
          {state.reguliBusiness.map(r => {
            const n = rez.incalcari.filter(i => i.regula.id === r.id).length;
            return (
              <tr key={r.id}>
                <Td><input type="checkbox" checked={r.activ} onChange={e => setReg(r.id, { activ: e.target.checked })} /></Td>
                <Td>{r.nume}</Td>
                <Td>{r.scop
                  ? (state.produse.find(p => p.cod === r.scop)?.denumire
                    ?? state.ingrediente.find(i => i.cod === r.scop)?.denumire ?? r.scop)
                  : <span className="text-muted-foreground">tot meniul</span>}</Td>
                <Td dr>
                  <In type="number" className="h-8 w-24 text-right" defaultValue={r.valoare}
                    onBlur={e => { const v = Number(e.target.value); if (Number.isFinite(v)) setReg(r.id, { valoare: v }); }} />
                </Td>
                <Td dr className={n ? 'font-semibold text-danger' : 'text-muted-foreground'}>{r.activ ? n : '—'}</Td>
              </tr>
            );
          })}
        </tbody>
      </T>

      <div className="mt-3 rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Regulă nouă</div>
            <Sel value={tipNou} onChange={e => setTipNou(e.target.value as TipRegula)}>
              {TIPURI.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </Sel>
          </label>
          <label className="text-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valoare ({TIPURI.find(t => t.v === tipNou)?.um})</div>
            <In type="number" className="w-28" value={valNoua} onChange={e => setValNoua(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Se aplică la (opțional)</div>
            <Sel value={scopNou} onChange={e => setScopNou(e.target.value)}>
              <option value="">tot meniul</option>
              {tipNou === 'COST_MAX_INGREDIENT'
                ? state.ingrediente.map(i => <option key={i.cod} value={i.cod}>{i.denumire}</option>)
                : tipNou === 'FC_MAX_CATEGORIE'
                  ? [...new Set(state.produse.map(p => p.categorie))].map(c => <option key={c} value={c}>{c}</option>)
                  : state.produse.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
            </Sel>
          </label>
          <Btn onClick={() => {
            const v = Number(valNoua);
            if (!Number.isFinite(v)) return;
            update(s => ({
              ...s,
              reguliBusiness: [...s.reguliBusiness, {
                id: `R${Date.now().toString(36)}`, tip: tipNou,
                nume: TIPURI.find(t => t.v === tipNou)!.l, scop: scopNou || undefined,
                valoare: v, activ: true,
              }],
            }));
          }}>Adaugă regula</Btn>
        </div>
      </div>

      <Titlu>Încălcări detectate</Titlu>
      {rez.incalcari.length === 0 ? <Gol titlu="Toate regulile sunt respectate" /> : (
        <div className="space-y-2">
          {rez.incalcari.map((i, idx) => (
            <div key={idx} className="rounded-md border border-l-4 border-l-danger bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Insigna fel="EXCLUS">{i.tipSubiect === 'PRODUS' ? 'produs' : i.tipSubiect === 'CATEGORIE' ? 'categorie' : 'ingredient'}</Insigna>
                <span className="font-semibold">{i.subiect}</span>
                <span className="num ml-auto text-sm">{fmtLei(i.valoare)} vs limita {fmtLei(i.limita)}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{i.mesaj}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Regula: {i.regula.nume}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HealthRisk() {
  const [tab, setTab] = useState<'sanatate' | 'risc' | 'echilibru' | 'reguli'>('sanatate');
  return (
    <div>
      <Titlu>Health &amp; Risk</Titlu>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border bg-card p-1">
        {([['sanatate', 'Product Health Score'], ['risc', 'Ingredient Risk'], ['echilibru', 'Menu Balance'], ['reguli', 'Business Rules']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx('rounded px-3 py-1.5 text-sm font-semibold', tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{l}</button>
        ))}
      </div>
      {tab === 'sanatate' && <TabSanatate />}
      {tab === 'risc' && <TabRisc />}
      {tab === 'echilibru' && <TabEchilibru />}
      {tab === 'reguli' && <TabReguli />}
    </div>
  );
}
