import { useMemo, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import { perProdus, fmtInt, fmtLei, fmtPct, type RandProdus } from '../lib/engine';
import { Gol, Insigna, T, Td, Th, Titlu, cx } from '../lib/ui';
import ProdusDetaliu from './shared/ProdusDetaliu';

type Cheie = keyof Pick<RandProdus, 'buc' | 'net' | 'cost' | 'fc' | 'profit' | 'marja' | 'mix' | 'rang'>;

export default function ProductIntelligence() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [sort, setSort] = useState<Cheie>('net');
  const [desc, setDesc] = useState(true);
  const [selProd, setSelProd] = useState<string | null>(null);

  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;
  const randuri = useMemo(() => {
    const r = perProdus(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere: sel.vedere });
    const v = (x: RandProdus) => (x[sort] ?? -Infinity) as number;
    return [...r].sort((a, b) => (desc ? v(b) - v(a) : v(a) - v(b)));
  }, [state, ctx, sel, loc, sort, desc]);

  const col = (cheie: Cheie, titlu: string) => (
    <Th dr><button className={cx('inline-flex items-center gap-1', sort === cheie && 'text-foreground')}
      onClick={() => { if (sort === cheie) setDesc(!desc); else { setSort(cheie); setDesc(true); } }}>
      {titlu}{sort === cheie ? (desc ? ' ↓' : ' ↑') : ''}
    </button></Th>
  );

  const eticheta = sel.vedere === 'TOTAL' ? 'Total' : sel.vedere === 'INSTORE' ? 'InStore' : 'Delivery';

  return (
    <div>
      <Titlu>Product Analytics — {sel.luna} · {eticheta}{loc ? ` · ${state.locatii.find(l => l.cod === loc)?.nume}` : ' · rețea'}</Titlu>
      {randuri.length === 0 ? <Gol titlu="Nicio vânzare în selecția curentă" /> : (
        <T dens>
          <thead>
            <tr>
              <Th>#</Th><Th>Cod</Th><Th>Produs</Th><Th>Categorie</Th>
              {col('buc', 'Bucăți')}{col('net', 'Vânzări nete')}<Th dr>Preț mediu net</Th>{col('cost', 'Cost')}{col('fc', 'FC %')}{col('profit', 'Profit')}<Th dr>Profit/buc</Th>{col('marja', 'Marjă')}{col('mix', 'Mix %')}
            </tr>
          </thead>
          <tbody>
            {randuri.map(r => (
              <tr key={r.cod} onClick={() => setSelProd(r.cod === selProd ? null : r.cod)}
                className={cx('cursor-pointer hover:bg-muted/50', selProd === r.cod && 'bg-primary/10')}>
                <Td className="num text-muted-foreground">{r.rang}</Td>
                <Td className="num">{r.cod}</Td>
                <Td>{r.denumire}{r.faraReteta && <span className="ml-1.5"><Insigna fel="warn">fără rețetă</Insigna></span>}</Td>
                <Td>{r.categorie}</Td>
                <Td dr>{fmtInt(r.buc)}</Td>
                <Td dr>{fmtInt(r.net)}</Td>
                <Td dr>{r.buc > 0 ? fmtLei(r.net / r.buc) : '—'}</Td>
                <Td dr>{fmtInt(r.cost)}</Td>
                <Td dr className={r.fc != null && r.fc > 30 ? 'text-danger font-semibold' : ''}>{fmtPct(r.fc)}</Td>
                <Td dr>{fmtInt(r.profit)}</Td>
                <Td dr>{r.buc > 0 ? fmtLei(r.profit / r.buc) : '—'}</Td>
                <Td dr>{fmtPct(r.marja)}</Td>
                <Td dr>{fmtPct(r.mix)}</Td>
              </tr>
            ))}
          </tbody>
        </T>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Click pe un produs pentru rețetarul complet, costul ingredientelor și evoluția în timp. Sortare prin click pe antetul coloanei.</p>

      {selProd && <div className="mt-5"><ProdusDetaliu cod={selProd} /></div>}
    </div>
  );
}
