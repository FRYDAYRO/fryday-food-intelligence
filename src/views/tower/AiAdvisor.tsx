/**
 * AI Advisor — deocamdată doar destinație de navigare. Motorul de raționament NU e
 * implementat, iar ecranul spune asta explicit: nicio recomandare inventată aici.
 */
import { descrieSelectie } from '../../lib/fc-tower';
import { useTower } from './context';
import { Sectiune } from './parti';

export default function AiAdvisor() {
  const { sel } = useTower();
  return (
    <div className="space-y-6">
      <Sectiune titlu="AI Advisor" sub="rezervat">
        <div className="rounded-md border border-dashed bg-card p-6" data-zona="ai-placeholder">
          <div className="font-semibold">Motorul de raționament nu e încă implementat.</div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Secțiunea există ca destinație de navigare, ca structura aplicației să fie completă.
            Până când motorul e construit și testat, aici nu se afișează nicio recomandare:
            o sugestie fabricată ar fi mai rea decât un ecran gol.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Materia primă e deja produsă de motoarele existente — anomaliile și oportunitățile din
            Ingredient Intelligence, componentele neexplicate din Reconciliere și scenariile din Simulări
            poartă fiecare dovada și încrederea lor. Advisor-ul le va folosi pe acelea, nu va inventa altele.
          </p>
          <div className="mt-3 text-xs text-muted-foreground">Scopul curent: {descrieSelectie(sel)}</div>
        </div>
      </Sectiune>
    </div>
  );
}
