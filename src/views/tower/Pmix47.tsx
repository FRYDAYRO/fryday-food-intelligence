/**
 * PMIX 4.7 — vânzările pe produs care stau sub FC-ul teoretic. Produsele fără rețetă
 * apar explicit: costul lor rămâne necunoscut, nu zero.
 */
import { fmtInt, fmtLei } from '../../lib/engine';
import { Insigna } from '../../lib/ui';
import { useAnaliza } from './date';
import { Indisponibil, Sectiune, Valoare } from './parti';

export default function Pmix47() {
  const analiza = useAnaliza();
  if (!analiza.disponibil) {
    return <Indisponibil titlu="Nu există vânzări pe această selecție" motiv={analiza.motivIndisponibil} />;
  }
  const produse = [...analiza.produse].sort((a, b) => b.net - a.net);
  const faraReteta = produse.filter(p => !p.areReteta);

  return (
    <div className="space-y-6">
      <Sectiune titlu="Mixul pe categorii">
        <div className="overflow-x-auto rounded-md border bg-card" data-zona="categorii">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Categorie</th>
                <th className="px-3 py-2 text-right">Bucăți</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-right">Mix</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Food</th>
                <th className="px-3 py-2 text-right">Paper</th>
                <th className="px-3 py-2 text-right">FC</th>
              </tr>
            </thead>
            <tbody>
              {analiza.categorii.map(c => (
                <tr key={c.categorie} className="border-t">
                  <td className="px-3 py-1.5 font-semibold">{c.categorie}</td>
                  <td className="num px-3 py-1.5 text-right">{fmtInt(c.buc)}</td>
                  <td className="num px-3 py-1.5 text-right">{fmtLei(c.net, 0)}</td>
                  <td className="num px-3 py-1.5 text-right"><Valoare v={c.mixPct} unitate="PCT" /></td>
                  <td className="num px-3 py-1.5 text-right">{fmtLei(c.costRON, 0)}</td>
                  <td className="num px-3 py-1.5 text-right">{fmtLei(c.foodRON, 0)}</td>
                  <td className="num px-3 py-1.5 text-right">{fmtLei(c.paperRON, 0)}</td>
                  <td className="num px-3 py-1.5 text-right"><Valoare v={c.fcPct} unitate="PCT" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sectiune>

      <Sectiune titlu="Produsele vândute" sub={`${produse.length} produse în perioada selectată`}>
        <div className="overflow-x-auto rounded-md border bg-card" data-zona="produse">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Produs</th>
                <th className="px-3 py-2">Categorie</th>
                <th className="px-3 py-2 text-right">Bucăți</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-right">Mix</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">FC</th>
              </tr>
            </thead>
            <tbody>
              {produse.slice(0, 80).map(p => (
                <tr key={p.produs} className="border-t">
                  <td className="px-3 py-1.5">
                    <b>{p.denumire}</b> <span className="text-xs text-muted-foreground">{p.produs}</span>
                    {!p.areReteta && <span className="ml-1"><Insigna fel="warn">fără rețetă</Insigna></span>}
                  </td>
                  <td className="px-3 py-1.5 text-xs">{p.categorie}</td>
                  <td className="num px-3 py-1.5 text-right">{fmtInt(p.buc)}</td>
                  <td className="num px-3 py-1.5 text-right">{fmtLei(p.net, 0)}</td>
                  <td className="num px-3 py-1.5 text-right"><Valoare v={p.mixPct} unitate="PCT" /></td>
                  <td className="num px-3 py-1.5 text-right"><Valoare v={p.costRON} unitate="RON" /></td>
                  <td className="num px-3 py-1.5 text-right"><Valoare v={p.fcPct} unitate="PCT" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {faraReteta.length > 0 && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {faraReteta.length} produse nu au rețetă calculabilă. Costul lor nu intră în FC-ul teoretic
            și nu a fost presupus zero: {faraReteta.slice(0, 10).map(p => p.produs).join(', ')}.
          </p>
        )}
      </Sectiune>
    </div>
  );
}
