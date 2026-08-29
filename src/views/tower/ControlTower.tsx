/**
 * FC Control Tower — carcasa: navigarea între cele zece secțiuni, bara de control mereu
 * vizibilă și banda de context (rol, filtrare, origine a datelor).
 *
 * Ecranul nu calculează nimic: compune motoarele deja validate prin `lib/fc-tower`.
 */
import { useMemo, useState } from 'react';
import { configServer, useStore } from '../../lib/store';
import { Insigna, cx } from '../../lib/ui';
import {
  SECTIUNI, accesTower, normalizeazaSelectie, origineDate, selectieImplicita,
  type IdSectiune, type SelectieFC,
} from '../../lib/fc-tower';
import { TowerProvider, useTower } from './context';
import Bara from './Bara';
import Overview from './Overview';
import AnalizaFC from './AnalizaFC';
import Nbo29 from './Nbo29';
import Pmix47 from './Pmix47';
import Reconciliere from './Reconciliere';
import Ingrediente from './Ingrediente';
import Simulari from './Simulari';
import ImportCenter from './ImportCenter';
import AiAdvisor from './AiAdvisor';
import SetariTower from './SetariTower';

const ECRANE: Record<IdSectiune, (p: { onNavigheaza: (s: IdSectiune) => void }) => React.ReactElement> = {
  OVERVIEW: ({ onNavigheaza }) => <Overview onNavigheaza={onNavigheaza} />,
  ANALIZA_FC: () => <AnalizaFC />,
  NBO29: () => <Nbo29 />,
  PMIX47: () => <Pmix47 />,
  RECONCILIERE: () => <Reconciliere />,
  INGREDIENTE: () => <Ingrediente />,
  SIMULARI: () => <Simulari />,
  IMPORTURI: () => <ImportCenter />,
  AI_ADVISOR: () => <AiAdvisor />,
  SETARI: () => <SetariTower />,
};

/** Banda de context: cine ești, dacă datele sunt filtrate și de unde vin. */
export function BandaContext() {
  const { state, acces } = useTower();
  const origine = origineDate(state);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-1.5 text-xs" data-zona="banda">
      <Insigna fel={acces.rol === 'TOP_MANAGEMENT' ? 'ok' : 'info'}>{acces.rol}</Insigna>
      {acces.locatieImpusa && (
        <span className="font-semibold" data-zona="locatie-impusa">restaurant: {acces.locatieImpusa}</span>
      )}
      <Insigna fel={origine.origine === 'IMPORTAT' ? 'ok' : origine.origine === 'GOL' ? 'EXCLUS' : 'warn'}>
        {origine.eticheta}
      </Insigna>
      {acces.enforcatPeServer
        ? <span className="text-muted-foreground">datele vin filtrate de server</span>
        : <span className="text-orange-700" data-zona="fara-enforcement">
          vizibilitatea e doar de interfață — vezi Setări
        </span>}
    </div>
  );
}

export function NavigareTower({ activ, onAlege }: { activ: IdSectiune; onAlege: (s: IdSectiune) => void }) {
  const { acces } = useTower();
  const vizibile = SECTIUNI.filter(s => acces.sectiuni.includes(s.id));
  return (
    <nav className="flex flex-wrap gap-1 border-b bg-card px-3 py-2" data-zona="navigare" aria-label="Secțiuni">
      {vizibile.map(s => (
        <button key={s.id} type="button" data-sectiune={s.id}
          aria-current={s.id === activ ? 'page' : undefined}
          title={s.descriere}
          onClick={() => onAlege(s.id)}
          className={cx('rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
            s.id === activ ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
          {s.nume}
          {s.placeholder && <span className="ml-1 text-[10px] uppercase opacity-70">rezervat</span>}
        </button>
      ))}
    </nav>
  );
}

/** Conținutul turnului, presupunând contextul deja pus — ușor de randat și în teste. */
export function ContinutTower({ initial = 'OVERVIEW' }: { initial?: IdSectiune }) {
  const { acces } = useTower();
  const [sectiune, setSectiune] = useState<IdSectiune>(initial);
  const activ = acces.sectiuni.includes(sectiune) ? sectiune : 'OVERVIEW';
  const Ecran = ECRANE[activ];
  return (
    <div className="min-h-full">
      <NavigareTower activ={activ} onAlege={setSectiune} />
      <Bara />
      <BandaContext />
      <main className="p-4 md:p-6" data-zona="continut" data-sectiune-activa={activ}>
        <Ecran onNavigheaza={setSectiune} />
      </main>
    </div>
  );
}

export default function ControlTower() {
  const { state, ctx, update, serverStare } = useStore();
  const cfg = configServer();
  const acces = useMemo(
    () => accesTower(state, cfg ? cfg.utilizator : null, !!serverStare?.filtrat),
    [state.locatii, cfg?.utilizator.rol, cfg?.utilizator.locatie, serverStare?.filtrat],
  );
  const [sel, setSelBrut] = useState<SelectieFC | null>(null);
  // selecția se re-normalizează la FIECARE randare: dacă rolul sau lista de restaurante
  // se schimbă după ce utilizatorul a ales ceva, alegerea veche nu are voie să supraviețuiască
  const efectiv = useMemo(
    () => normalizeazaSelectie(state, sel ?? selectieImplicita(state, acces), acces),
    [state, acces, sel],
  );
  const setSel = (s: SelectieFC) => setSelBrut(normalizeazaSelectie(state, s, acces));

  return (
    <TowerProvider value={{ state, ctx, sel: efectiv, setSel, acces, update }}>
      <div className="-m-4 md:-m-6">
        <ContinutTower />
      </div>
    </TowerProvider>
  );
}
