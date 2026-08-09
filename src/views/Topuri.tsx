import { useMemo } from 'react';
import { useSel, useStore } from '../lib/store';
import { perProdus, fmtInt, fmtPct, type RandProdus } from '../lib/engine';
import { Gol, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';
import { useState } from 'react';
import type { Vedere } from '../lib/types';

function Top({ titlu, randuri, valoare, format, nota, jos }: {
  titlu: string; randuri: RandProdus[];
  valoare: (r: RandProdus) => number | null;
  format: (n: number) => string; nota?: string;
  jos?: boolean;      // true = cele mai mici valori
}) {
  const date = randuri
    .map(r => ({ r, v: valoare(r) }))
    .filter((x): x is { r: RandProdus; v: number } => x.v != null)
    .sort((a, b) => (jos ? a.v - b.v : b.v - a.v))
    .slice(0, 8);
  const max = Math.max(...date.map(d => Math.abs(d.v)), 1);
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-display text-sm font-extrabold">{titlu}</div>
        {nota && <div className="text-[11px] text-muted-foreground">{nota}</div>}
      </div>
      <div className="space-y-1.5">
        {date.map((d, i) => (
          <div key={d.r.cod} className="relative overflow-hidden rounded">
            <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${(Math.abs(d.v) / max) * 100}%` }} />
            <div className="relative flex items-center justify-between px-2 py-1 text-sm">
              <span className="truncate"><span className="num mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>{d.r.denumire}</span>
              <span className="num ml-2 shrink-0 font-semibold">{format(d.v)}</span>
            </div>
          </div>
        ))}
        {date.length === 0 && <div className="text-sm text-muted-foreground">Fără date.</div>}
      </div>
    </div>
  );
}

export default function Topuri() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;

  const pe = (vedere: Vedere) => perProdus(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere });
  const total = useMemo(() => pe('TOTAL'), [state, ctx, sel.luna, loc]);      // eslint-disable-line react-hooks/exhaustive-deps
  const instore = useMemo(() => pe('INSTORE'), [state, ctx, sel.luna, loc]);  // eslint-disable-line react-hooks/exhaustive-deps
  const delivery = useMemo(() => pe('DELIVERY'), [state, ctx, sel.luna, loc]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!total.length) return <div><Titlu>Topuri produse</Titlu><Gol titlu="Nicio vânzare în perioada selectată" /></div>;

  return (
    <div>
      <Titlu>Topuri produse — {sel.luna}{loc ? ` · ${state.locatii.find(l => l.cod === loc)?.nume}` : ' · rețea'}</Titlu>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Top titlu="Top vânzări" nota="lei net, Total" randuri={total} valoare={r => r.net} format={n => `${fmtInt(n)} lei`} />
        <Top titlu="Top profit" nota="lei, Total" randuri={total} valoare={r => r.profit} format={n => `${fmtInt(n)} lei`} />
        <Top titlu="Top Food Cost %" nota="cele mai scumpe rețete" randuri={total} valoare={r => r.fc} format={n => fmtPct(n)} />
        <Top titlu="Top marjă %" nota="Total" randuri={total} valoare={r => r.marja} format={n => fmtPct(n)} />
        <Top titlu="Cel mai mic Food Cost %" nota="cele mai eficiente rețete" jos randuri={total.filter(r => r.fc != null && r.buc > 0)} valoare={r => r.fc} format={n => fmtPct(n)} />
        <Top titlu="Top bucăți vândute" nota="unități, Total" randuri={total} valoare={r => r.buc} format={n => `${fmtInt(n)} buc`} />
        <Top titlu="Cele mai puțin vândute" nota="unități, Total" jos randuri={total.filter(r => r.buc > 0)} valoare={r => r.buc} format={n => `${fmtInt(n)} buc`} />
        <Top titlu="Top InStore" nota="lei net" randuri={instore} valoare={r => r.net} format={n => `${fmtInt(n)} lei`} />
        <Top titlu="Top Delivery" nota="lei net" randuri={delivery} valoare={r => r.net} format={n => `${fmtInt(n)} lei`} />
      </div>

      <TabelComplet randuri={total} instore={instore} delivery={delivery} />
      <p className="mt-3 text-xs text-muted-foreground">Topurile se recalculează automat din PMIX la fiecare import, pe vederea Total / InStore / Delivery. Bara indică valoarea relativă față de liderul topului.</p>
    </div>
  );
}

type Cheie = 'denumire' | 'buc' | 'net' | 'cost' | 'fc' | 'fcReal' | 'comision' | 'profit' | 'profitReal' | 'marja' | 'mix';

// Tabelul cu TOATE produsele, sortabil — completează topurile, care arată doar primele 8.
function TabelComplet({ randuri, instore, delivery }: { randuri: RandProdus[]; instore: RandProdus[]; delivery: RandProdus[] }) {
  const [cheie, setCheie] = useState<Cheie>('net');
  const [desc, setDesc] = useState(true);
  const [vedere, setVedere] = useState<'TOTAL' | 'INSTORE' | 'DELIVERY'>('TOTAL');
  const [doarFara, setDoarFara] = useState(false);

  const baza = vedere === 'INSTORE' ? instore : vedere === 'DELIVERY' ? delivery : randuri;
  const lista = [...baza].filter(r => !doarFara || r.faraReteta).sort((a, b) => {
    if (cheie === 'denumire') return desc ? b.denumire.localeCompare(a.denumire) : a.denumire.localeCompare(b.denumire);
    const va = (a[cheie] ?? -Infinity) as number, vb = (b[cheie] ?? -Infinity) as number;
    return desc ? vb - va : va - vb;
  });
  const col = (k: Cheie, t: string, dr = true) => (
    <Th dr={dr}><button className={cx('inline-flex items-center gap-1', cheie === k && 'text-foreground')}
      onClick={() => { if (cheie === k) setDesc(!desc); else { setCheie(k); setDesc(true); } }}>
      {t}{cheie === k ? (desc ? ' ↓' : ' ↑') : ''}</button></Th>
  );
  const tot = lista.reduce((a, r) => ({ buc: a.buc + r.buc, net: a.net + r.net, cost: a.cost + r.cost }), { buc: 0, net: 0, cost: 0 });
  const netAcoperit = lista.filter(r => !r.faraReteta).reduce((a, r) => a + r.net, 0);
  const costAcoperit = lista.filter(r => !r.faraReteta).reduce((a, r) => a + r.cost, 0);

  return (
    <div className="mt-5">
      <Titlu actiuni={
        <div className="flex flex-wrap items-center gap-2">
          <Sel className="h-8" value={vedere} onChange={e => setVedere(e.target.value as typeof vedere)}>
            <option value="TOTAL">Total</option><option value="INSTORE">InStore</option><option value="DELIVERY">Delivery</option>
          </Sel>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={doarFara} onChange={e => setDoarFara(e.target.checked)} />
            doar produsele fără rețetă
          </label>
        </div>
      }>Toate produsele — {lista.length} poziții</Titlu>
      <T dens>
        <thead><tr><Th>#</Th>{col('denumire', 'Produs', false)}<Th>Categorie</Th>{col('buc', 'Bucăți')}{col('net', 'Vânzări nete')}{col('cost', 'Cost')}{col('fc', 'Food Cost %')}{col('fcReal', 'FC real')}{col('comision', 'Comision')}{col('profit', 'Profit')}{col('profitReal', 'Profit real')}{col('marja', 'Marjă')}{col('mix', 'Mix %')}</tr></thead>
        <tbody>
          {lista.map((r, i) => (
            <tr key={r.cod} className={r.faraReteta ? 'bg-danger/5' : ''}>
              <Td className="num text-muted-foreground">{i + 1}</Td>
              <Td>{r.denumire}{r.faraReteta && <span className="ml-1.5 text-xs text-danger">fără rețetă</span>}</Td>
              <Td className="text-xs text-muted-foreground">{r.categorie}</Td>
              <Td dr>{fmtInt(r.buc)}</Td>
              <Td dr>{fmtInt(r.net)}</Td>
              <Td dr>{fmtInt(r.cost)}</Td>
              <Td dr className={cx(r.fc != null && r.fc > 45 ? 'text-danger font-semibold' : r.fc != null && r.fc < 30 ? 'text-ok' : '')}>{fmtPct(r.fc)}</Td>
              <Td dr className="text-muted-foreground">{r.comision > 0 ? fmtPct(r.fcReal) : '—'}</Td>
              <Td dr className="text-muted-foreground">{r.comision > 0 ? `−${fmtInt(r.comision)}` : '—'}</Td>
              <Td dr>{fmtInt(r.profit)}</Td>
              <Td dr className="font-semibold">{fmtInt(r.profitReal)}</Td>
              <Td dr>{fmtPct(r.marja)}</Td>
              <Td dr>{fmtPct(r.mix)}</Td>
            </tr>
          ))}
          <tr className="bg-muted/40 font-semibold">
            <Td /><Td>TOTAL</Td><Td />
            <Td dr>{fmtInt(tot.buc)}</Td><Td dr>{fmtInt(tot.net)}</Td><Td dr>{fmtInt(tot.cost)}</Td>
            <Td dr>{fmtPct(netAcoperit > 0 ? (costAcoperit / netAcoperit) * 100 : null)}</Td>
            <Td dr /><Td dr className="text-muted-foreground">−{fmtInt(lista.reduce((a, r) => a + r.comision, 0))}</Td>
            <Td dr>{fmtInt(tot.net - tot.cost)}</Td>
            <Td dr className="font-semibold">{fmtInt(lista.reduce((a, r) => a + r.profitReal, 0))}</Td><Td dr /><Td dr />
          </tr>
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Food Cost-ul de pe rândul TOTAL se calculează pe vânzările produselor care au rețetă ({fmtInt(netAcoperit)} din {fmtInt(tot.net)} lei).
        FC real și Profit real scad comisionul agregatorului din partea Delivery (pe InStore nu se aplică). Rândurile roșii sunt produse vândute fără rețetă — nu au cost și trebuie completate. Click pe antet pentru sortare, în ambele sensuri.
      </p>
    </div>
  );
}
