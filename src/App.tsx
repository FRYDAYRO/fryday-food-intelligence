import { useEffect, useMemo, useState } from 'react';
import { SelCtx, StoreProvider, configServer, useSel, useStore, type Selectie } from './lib/store';
import { Sel, cx } from './lib/ui';
import Dashboard from './views/Dashboard';
import ExecutiveCockpit from './views/ExecutiveCockpit';
import DecisionIntelligence from './views/DecisionIntelligence';
import OpportunityBoard from './views/OpportunityBoard';
import HealthRisk from './views/HealthRisk';
import ProductTimeline from './views/ProductTimeline';
import SupplierIntelligence from './views/SupplierIntelligence';
import BusinessSimulation from './views/BusinessSimulation';
import BusinessStrategy from './views/BusinessStrategy';
import MasterData from './views/MasterData';
import Retetar from './views/Retetar';
import Importuri from './views/Importuri';
import FoodCost from './views/FoodCost';
import ProductIntelligence from './views/ProductIntelligence';
import IngredientIntelligence from './views/IngredientIntelligence';
import ProfitIntelligence from './views/ProfitIntelligence';
import Recomandari from './views/Recomandari';
import MenuEngineering from './views/MenuEngineering';
import Alerte from './views/Alerte';
import RnDLab from './views/RnDLab';
import Topuri from './views/Topuri';
import ProductImpact from './views/ProductImpact';
import Setari from './views/Setari';
import ControlTower from './views/tower/ControlTower';
import Bariera from './views/shared/Bariera';

const MODULE = [
  { id: 'tower', nume: 'FC Control Tower', C: ControlTower },
  { id: 'cockpit', nume: 'Executive Cockpit', C: ExecutiveCockpit },
  { id: 'board', nume: 'Opportunity Board', C: OpportunityBoard },
  { id: 'dashboard', nume: 'Dashboard', C: Dashboard },
  { id: 'master', nume: 'Master Data', C: MasterData },
  { id: 'retetar', nume: 'Rețetar', C: Retetar },
  { id: 'importuri', nume: 'Importuri', C: Importuri },
  { id: 'foodcost', nume: 'Food Cost', C: FoodCost },
  { id: 'pi', nume: 'Product Analytics', C: ProductIntelligence },
  { id: 'ii', nume: 'Ingredient Intelligence', C: IngredientIntelligence },
  { id: 'profit', nume: 'Profit Intelligence', C: ProfitIntelligence },
  { id: 'decizii', nume: 'Decision Intelligence', C: DecisionIntelligence },
  { id: 'health', nume: 'Health & Risk', C: HealthRisk },
  { id: 'timeline', nume: 'Product Timeline', C: ProductTimeline },
  { id: 'furnizori', nume: 'Supplier Intelligence', C: SupplierIntelligence },
  { id: 'menu', nume: 'Menu Engineering', C: MenuEngineering },
  { id: 'rnd', nume: 'R&D Lab', C: RnDLab },
  { id: 'reco', nume: 'Recomandări', C: Recomandari },
  { id: 'topuri', nume: 'Topuri', C: Topuri },
  { id: 'bse', nume: 'Business Simulation', C: BusinessSimulation },
  { id: 'strategie', nume: 'Business Strategy', C: BusinessStrategy },
  { id: 'impact', nume: 'Product Impact', C: ProductImpact },
  { id: 'alerte', nume: 'Alerte', C: Alerte },
  { id: 'setari', nume: 'Setări', C: Setari },
] as const;

/**
 * Cine ești și ce vezi. Când datele vin filtrate de server, utilizatorul trebuie să știe
 * permanent — altfel un manager care vede cifre mai mici crede că rețeaua a scăzut.
 */
function IndicatorServer() {
  const { serverStare } = useStore();
  const cfg = configServer();
  if (!cfg) return null;
  const u = cfg.utilizator;
  const eroare = serverStare?.eroare;
  return (
    <div className="flex items-center gap-1.5">
      <span className={cx('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold',
        eroare ? 'border-danger/60 bg-danger/10 text-danger' : 'border-ok/50 bg-ok/10 text-ok')}
        title={eroare ?? `Conectat la ${cfg.url} · revizia ${serverStare?.revizie ?? '—'}`}>
        <span className={cx('h-1.5 w-1.5 rounded-full', eroare ? 'bg-danger' : 'bg-ok')} />
        {u.rol}{u.nume ? ` · ${u.nume}` : ''}
      </span>
      {serverStare?.filtrat && u.locatie && (
        <span className="inline-flex items-center rounded-md border border-primary/50 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
          title="Serverul îți trimite doar datele restaurantului tău">
          date filtrate: {u.locatie}
        </span>
      )}
      {eroare && <span className="hidden max-w-xs truncate text-xs text-danger md:inline">{eroare}</span>}
    </div>
  );
}

/**
 * Un manager al cărui restaurant nu are date ar vedea o aplicație goală, fără explicație.
 * Diferența dintre „nu s-a importat nimic" și „nu există date pentru tine" trebuie spusă.
 */
function AvertismentFiltrat() {
  const { state, serverStare } = useStore();
  const cfg = configServer();
  if (!serverStare?.filtrat || !cfg?.utilizator.locatie) return null;
  if (state.vanzari.length > 0) return null;
  return (
    <div className="border-b border-primary/40 bg-primary/5 px-4 py-2.5 text-sm">
      <b>Nu există vânzări pentru {cfg.utilizator.locatie} în datele încărcate pe server.</b>{' '}
      Rețetele și prețurile sunt vizibile, dar analizele au nevoie de vânzări. Cauza obișnuită: raportul
      4.7 a fost importat agregat pe toată rețeaua, nu câte un fișier per restaurant — cere analiștilor
      importul pe restaurante.
    </div>
  );
}

/**
 * Module care își aduc propria bară de scop. Pentru ele selecția globală nu se aplică:
 * afișarea ei ar pune două rânduri de filtre cu aceeași denumire pe același ecran, iar
 * cel de sus n-ar face nimic — utilizatorul schimbă perioada și nu se mișcă nicio cifră.
 */
const SCOP_PROPRIU = new Set<string>(['tower']);

function Antet({ scopPropriu = false }: { scopPropriu?: boolean }) {
  const { state } = useStore();
  const { sel, setSel } = useSel();
  const luni = useMemo(() => [...new Set(state.vanzari.map(v => v.data.slice(0, 7)))].sort().reverse(), [state.vanzari]);

  // modulul își pune singur perioada, restaurantul și canalul — aici rămâne doar identitatea
  if (scopPropriu) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b bg-card/70 px-4 py-2 backdrop-blur"
        data-zona="antet-scop-propriu">
        <span className="mr-1 hidden text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
          Cine ești
        </span>
        <IndicatorServer />
        <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">
          Perioada, restaurantul și canalul se aleg din bara „Scop" a modulului, mai jos.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card/70 px-4 py-2 backdrop-blur">
      <span className="mr-1 hidden text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">Context global</span>
      <Sel aria-label="Perioada" value={sel.luna} onChange={e => setSel({ ...sel, luna: e.target.value })}>
        {luni.map(l => <option key={l} value={l}>{l}</option>)}
        {luni.length === 0 && <option value={sel.luna}>{sel.luna}</option>}
      </Sel>
      <Sel aria-label="Locația" value={sel.locatie} onChange={e => setSel({ ...sel, locatie: e.target.value })}>
        <option value="RETEA">Toată rețeaua</option>
        {state.locatii.map(l => <option key={l.cod} value={l.cod}>{l.nume}</option>)}
      </Sel>
      <Sel aria-label="Canal" value={sel.vedere} onChange={e => setSel({ ...sel, vedere: e.target.value as Selectie['vedere'] })}>
        <option value="TOTAL">Total (ambele canale)</option>
        <option value="INSTORE">InStore</option>
        <option value="DELIVERY">Delivery</option>
      </Sel>
      <IndicatorServer />
      <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">Vederea de canal se aplică analizelor pe produs; FC Curat/operațional sunt pe Total (limitare 2.9).</span>
    </div>
  );
}

/**
 * Ține selecția globală ancorată în date. Fără asta, după un import pe o lună nouă
 * toate modulele rămân pe luna veche și par „neactualizate".
 */
function AliniazaSelectia() {
  const { state } = useStore();
  const { sel, setSel } = useSel();
  const luni = useMemo(() => [...new Set(state.vanzari.map(v => v.data.slice(0, 7)))].sort().reverse(), [state.vanzari]);
  const locuri = useMemo(() => new Set(state.locatii.map(l => l.cod)), [state.locatii]);

  useEffect(() => {
    const patch: Partial<typeof sel> = {};
    if (luni.length && !luni.includes(sel.luna)) patch.luna = luni[0];
    if (sel.locatie !== 'RETEA' && !locuri.has(sel.locatie)) patch.locatie = 'RETEA';
    if (Object.keys(patch).length) setSel({ ...sel, ...patch });
  }, [luni, locuri, sel, setSel]);

  return null;
}

function Continut() {
  const [modul, setModul] = useState<(typeof MODULE)[number]['id']>('tower');
  const Activ = MODULE.find(m => m.id === modul)!.C;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar text-stone-200 lg:flex">
        <div className="px-4 pb-4 pt-5">
          <div className="font-display text-xl font-black leading-none tracking-tight text-white">FRYDAY</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Food Intelligence</div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {MODULE.map(m => (
            <button key={m.id} onClick={() => setModul(m.id)}
              className={`block w-full rounded px-3 py-2 text-left text-sm font-semibold transition-colors ${modul === m.id ? 'bg-primary text-primary-foreground' : 'text-stone-300 hover:bg-white/10 hover:text-white'}`}>
              {m.nume}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 text-[11px] leading-relaxed text-stone-400">
          <b>{VERSIUNE}</b> · construit {DATA_BUILD}<br />2 canale: InStore &amp; Delivery
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b bg-sidebar px-3 py-2 lg:hidden">
          <span className="font-display text-base font-black text-white">FRYDAY <span className="text-primary">FI</span></span>
          <select value={modul} onChange={e => setModul(e.target.value as typeof modul)}
            className="ml-auto h-9 rounded-md border-0 bg-white/10 px-2 text-sm font-semibold text-white">
            {MODULE.map(m => <option key={m.id} value={m.id} className="text-black">{m.nume}</option>)}
          </select>
        </div>
        <AliniazaSelectia />
        <Antet scopPropriu={SCOP_PROPRIU.has(modul)} />
        <AvertismentFiltrat />
        <Bariera zona={MODULE.find(m => m.id === modul)!.nume} cheie={modul}>
          <main className="p-4 md:p-6">
            <Activ />
          </main>
        </Bariera>
      </div>
    </div>
  );
}

// Marcaj de versiune, ca să se poată verifica dintr-o privire că rulează fișierul cel mai nou.
export const VERSIUNE = 'RC 12.3';
export const DATA_BUILD = '08.08.2026';

export default function App() {
  const [sel, setSel] = useState<Selectie>({ luna: '2026-07', locatie: 'RETEA', vedere: 'TOTAL' });
  return (
    <Bariera>
      <StoreProvider>
        <SelCtx.Provider value={{ sel, setSel }}>
          <Continut />
        </SelCtx.Provider>
      </StoreProvider>
    </Bariera>
  );
}
