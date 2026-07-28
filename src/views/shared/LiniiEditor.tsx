import type { LinieReteta, UMCod } from '../../lib/types';
import { Btn, In, Sel } from '../../lib/ui';

export interface OptComponenta { cod: string; nume: string; tip: 'INGREDIENT' | 'SEMIPREPARAT' | 'AMBALAJ'; }

export default function LiniiEditor({ linii, onChange, componente, cuCanal }: {
  linii: LinieReteta[];
  onChange: (l: LinieReteta[]) => void;
  componente: OptComponenta[];
  cuCanal?: boolean;
}) {
  return (
    <div className="space-y-1">
      {linii.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <Sel value={l.comp} className="h-8 flex-1" onChange={e => {
            const c = componente.find(x => x.cod === e.target.value)!;
            onChange(linii.map((x, j) => j === i ? { ...x, comp: c.cod, tipComp: c.tip } : x));
          }}>{componente.map(c => <option key={c.cod} value={c.cod}>{c.nume}</option>)}</Sel>
          <In type="number" step="any" value={l.cant} className="h-8 w-20 text-right"
            onChange={e => onChange(linii.map((x, j) => j === i ? { ...x, cant: Number(e.target.value) } : x))} />
          <Sel value={l.um} className="h-8" onChange={e => onChange(linii.map((x, j) => j === i ? { ...x, um: e.target.value as UMCod } : x))}>
            {(['g', 'kg', 'ml', 'l', 'buc'] as UMCod[]).map(u => <option key={u}>{u}</option>)}
          </Sel>
          {cuCanal && (
            <Sel value={l.canal} className="h-8" onChange={e => onChange(linii.map((x, j) => j === i ? { ...x, canal: e.target.value as LinieReteta['canal'] } : x))}>
              <option value="AMBELE">Ambele</option><option value="INSTORE">InStore</option><option value="DELIVERY">Delivery</option>
            </Sel>
          )}
          <button className="text-danger" title="Șterge" onClick={() => onChange(linii.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <Btn varianta="linie" className="h-8" disabled={!componente.length}
        onClick={() => onChange([...linii, { comp: componente[0].cod, tipComp: componente[0].tip, cant: 0, um: 'g', canal: 'AMBELE' }])}>
        + Componentă rețetă
      </Btn>
    </div>
  );
}
