import { useMemo } from 'react';
import { useSel, useStore } from '../lib/store';
import { alerte, type Alerta } from '../lib/engine';
import { Gol, Insigna, Titlu, cx } from '../lib/ui';

const NIVEL: Record<Alerta['nivel'], { fel: 'EXCLUS' | 'warn' | 'info'; nume: string; bord: string }> = {
  CRITIC: { fel: 'EXCLUS', nume: 'Critic', bord: 'border-l-danger' },
  ATENTIE: { fel: 'warn', nume: 'Atenție', bord: 'border-l-primary' },
  INFO: { fel: 'info', nume: 'Info', bord: 'border-l-sky-500' },
};

const CATEG: Record<Alerta['categorie'], string> = {
  FC_PESTE_TINTA: 'Food Cost peste target',
  COST_INGREDIENT: 'Cost ingredient',
  MARJA: 'Scădere de marjă',
  MARJA_MICA: 'Marjă foarte mică',
  PROFIT: 'Profit în scădere',
  IMPACT: 'Impact financiar ridicat',
};

export default function Alerte() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const lista = useMemo(() => alerte(state, ctx, sel.luna), [state, ctx, sel.luna]);

  const nr = (n: Alerta['nivel']) => lista.filter(a => a.nivel === n).length;

  return (
    <div>
      <Titlu>Alerts Center — {sel.luna}</Titlu>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-md border bg-card px-3 py-1.5"><b className="num text-danger">{nr('CRITIC')}</b> critice</span>
        <span className="rounded-md border bg-card px-3 py-1.5"><b className="num" style={{ color: '#B97A0A' }}>{nr('ATENTIE')}</b> de atenție</span>
        <span className="rounded-md border bg-card px-3 py-1.5"><b className="num text-sky-700">{nr('INFO')}</b> informative</span>
        <span className="ml-auto self-center text-xs text-muted-foreground">Alertele se generează automat din datele curente: rețete, prețuri, PMIX și ținte.</span>
      </div>

      {lista.length === 0 ? (
        <Gol titlu="Nicio alertă activă" sub="Toate produsele sunt în target, fără scumpiri sau scăderi de marjă semnificative." />
      ) : (
        <div className="space-y-2">
          {lista.map((a, i) => (
            <div key={i} className={cx('rounded-md border border-l-4 bg-card px-4 py-3', NIVEL[a.nivel].bord)}>
              <div className="flex flex-wrap items-center gap-2">
                <Insigna fel={NIVEL[a.nivel].fel}>{NIVEL[a.nivel].nume}</Insigna>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{CATEG[a.categorie]}</span>
                <span className="num ml-auto text-xs text-muted-foreground">{sel.luna}</span>
              </div>
              <div className="mt-1 font-semibold">{a.titlu}</div>
              <div className="text-sm text-muted-foreground">{a.detaliu}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
