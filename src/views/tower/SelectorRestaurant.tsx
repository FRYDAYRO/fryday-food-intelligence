/**
 * Selectorul de restaurante: „Toate restaurantele" + locațiile cu date + master-ul real
 * FRYDAY (30 de nume din raportul 4.7). Căutare, derulare, selecție vizibilă.
 *
 * Nu conține nicio regulă de business: ce se poate alege vine din `optiuniRestaurant`,
 * ce se întâmplă la alegere vine din `alegeRestaurant` — ambele pure, în `fc-tower`.
 */
import { useMemo, useState } from 'react';
import { In, Insigna, cx } from '../../lib/ui';
import { optiuniRestaurant, type OptiuneRestaurant } from '../../lib/fc-tower';
import { useTower } from './context';

function Rand({ o, activ, onAlege }: { o: OptiuneRestaurant; activ: boolean; onAlege: (v: string) => void }) {
  return (
    <button type="button" role="option" aria-selected={activ}
      data-optiune={o.valoare} data-are-date={o.areDate ? '1' : '0'}
      title={o.motiv}
      onClick={() => onAlege(o.valoare)}
      className={cx('flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
        activ ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted')}>
      <span className="min-w-0 flex-1 truncate">{o.eticheta}</span>
      {!o.areDate && <Insigna fel="warn">fără date</Insigna>}
    </button>
  );
}

function Grup({ titlu, optiuni, activ, onAlege }: {
  titlu: string; optiuni: OptiuneRestaurant[]; activ: string; onAlege: (v: string) => void;
}) {
  if (!optiuni.length) return null;
  return (
    <div data-grup={titlu}>
      <div className="sticky top-0 bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {titlu}
      </div>
      {optiuni.map(o => <Rand key={o.valoare} o={o} activ={o.valoare === activ} onAlege={onAlege} />)}
    </div>
  );
}

export default function SelectorRestaurant({ valoare, eticheta, onAlege, deschisInitial = false }: {
  valoare: string; eticheta: string; onAlege: (v: string) => void; deschisInitial?: boolean;
}) {
  const { state, acces } = useTower();
  const [deschis, setDeschis] = useState(deschisInitial);
  const [q, setQ] = useState('');
  const opt = useMemo(() => optiuniRestaurant(state, acces, q), [state, acces, q]);
  const blocat = opt.blocatLa !== null;
  const nimic = !opt.toate && !opt.dinDate.length && !opt.reale.length;

  const alege = (v: string) => { onAlege(v); setDeschis(false); setQ(''); };

  return (
    <div className="relative" data-zona="selector-restaurant">
      <button type="button" data-camp="locatie"
        aria-haspopup="listbox" aria-expanded={deschis} disabled={blocat}
        title={blocat ? 'Rolul tău vede doar restaurantul propriu' : 'Alege restaurantul'}
        onClick={() => setDeschis(d => !d)}
        className="flex h-9 w-full min-w-[13rem] items-center gap-2 rounded-md border bg-card px-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
        <span className="min-w-0 flex-1 truncate text-left" data-zona="selectat">{eticheta}</span>
        <span aria-hidden className="text-muted-foreground">▾</span>
      </button>

      {deschis && !blocat && (
        <div role="listbox" aria-label="Restaurantele FRYDAY" data-zona="lista-restaurante"
          className="absolute left-0 z-20 mt-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md border bg-card shadow-lg">
          <div className="border-b p-2">
            <In autoFocus value={q} onChange={e => setQ(e.target.value)}
              aria-label="Caută restaurantul" data-camp="cauta-restaurant"
              placeholder="Caută după oraș sau mall…" />
          </div>
          {/* derularea: lista are 30+ intrări, deci panoul are înălțime fixă și scroll propriu */}
          <div className="max-h-72 overflow-y-auto overscroll-contain" data-zona="derulare">
            <Grup titlu="Companie" optiuni={opt.toate ? [opt.toate] : []} activ={valoare} onAlege={alege} />
            <Grup titlu="Locații cu date" optiuni={opt.dinDate} activ={valoare} onAlege={alege} />
            <Grup titlu="Restaurante FRYDAY" optiuni={opt.reale} activ={valoare} onAlege={alege} />
            {nimic && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground" data-zona="fara-rezultate">
                Niciun restaurant nu se potrivește cu „{q}".
              </div>
            )}
          </div>
          <div className="border-t px-3 py-1.5 text-[11px] leading-snug text-muted-foreground">
            Restaurantele marcate „fără date" vin din raportul 4.7, care nu conține
            identificatorul de magazin. Până la un export cu acest identificator, ele nu se
            leagă de nicio cifră — nu se afișează datele altui restaurant în locul lor.
          </div>
        </div>
      )}
    </div>
  );
}
