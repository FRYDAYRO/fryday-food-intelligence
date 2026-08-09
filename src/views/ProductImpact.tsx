import { useState } from 'react';
import { ImpactRapid, PriceChange, PromoAnalyzer } from './impact/Analizoare';
import DynamicPricing from './impact/DynamicPricing';
import { Titlu, cx } from '../lib/ui';

// Analizoarele rapide, pe un singur produs. Scenariile complexe (mai multe schimbări,
// mix, eliminări, combo-uri noi) se construiesc în modulul Business Simulation.
export default function ProductImpact() {
  const [tab, setTab] = useState<'rapid' | 'dyn' | 'pret' | 'promo'>('rapid');
  return (
    <div>
      <Titlu>Product Impact</Titlu>
      <p className="-mt-2 mb-3 text-sm text-muted-foreground">
        Răspuns instant pentru un singur produs. Pentru scenarii cu mai multe schimbări simultane, ajustări de volum sau produse noi, folosește <b>Business Simulation</b>.
      </p>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border bg-card p-1">
        {([['rapid', 'Impact Dashboard'], ['dyn', 'Dynamic Pricing'], ['pret', 'Price Change Analyzer'], ['promo', 'Promotion Simulator']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx('rounded px-3 py-1.5 text-sm font-semibold', tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{l}</button>
        ))}
      </div>
      {tab === 'rapid' && <ImpactRapid />}
      {tab === 'dyn' && <DynamicPricing />}
      {tab === 'pret' && <PriceChange />}
      {tab === 'promo' && <PromoAnalyzer />}
    </div>
  );
}
