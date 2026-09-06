/**
 * Bariera de erori — o excepție într-un ecran nu are voie să albească aplicația.
 *
 * De ce contează aici mai mult decât în alte aplicații: starea trăiește în `localStorage`,
 * iar utilizatorul poate avea în ea ore de import și de rețetar. Un ecran alb pare pierdere
 * de date chiar când datele sunt intacte, iar reflexul — reîncarcă, șterge, importă din nou —
 * chiar poate să le piardă. Bariera spune limpede că datele sunt salvate și oferă întoarcerea.
 *
 * Ce NU face: nu înghite eroarea. `componentDidCatch` o lasă în consolă exact cum ar fi
 * ajuns acolo și fără barieră, ca diagnosticarea să nu se înrăutățească. Și nu atinge nicio
 * regulă de business: bariera nu știe nimic despre Food Cost.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Btn } from '../../lib/ui';

interface Props {
  children: ReactNode;
  /** Ce s-a stricat, în cuvintele utilizatorului: „Rețetar", „FC Control Tower". */
  zona?: string;
  /**
   * Cheia de resetare. Când se schimbă, bariera se ridică singură — altfel un ecran căzut
   * ar rămâne căzut și după ce omul navighează în altă parte, deși acolo nu e nimic stricat.
   */
  cheie?: string;
  /** Notificare pentru gazdă (jurnal, telemetrie). Bariera nu decide singură ce se face cu ea. */
  onEroare?: (e: Error, info: ErrorInfo) => void;
}

interface Stare { eroare: Error | null; cheie?: string }

export class Bariera extends Component<Props, Stare> {
  state: Stare = { eroare: null };

  static getDerivedStateFromError(eroare: Error): Partial<Stare> {
    return { eroare };
  }

  /** Ridicarea barierei la schimbarea zonei: React nu resetează singur o stare de eroare. */
  static getDerivedStateFromProps(props: Props, stare: Stare): Partial<Stare> | null {
    if (stare.cheie !== props.cheie) return { cheie: props.cheie, eroare: null };
    return null;
  }

  componentDidCatch(eroare: Error, info: ErrorInfo): void {
    // eroarea rămâne în consolă, întreagă: bariera o afișează, nu o ascunde
    console.error('[FRYDAY] Eroare necaptată' + (this.props.zona ? ` în ${this.props.zona}` : ''), eroare, info.componentStack);
    this.props.onEroare?.(eroare, info);
  }

  private reia = () => this.setState({ eroare: null });

  render(): ReactNode {
    const { eroare } = this.state;
    if (!eroare) return this.props.children;
    return (
      <div className="p-4 md:p-6" data-zona="bariera-eroare" role="alert">
        <div className="mx-auto max-w-2xl rounded-md border-2 border-danger/50 bg-card p-6">
          <div className="font-display text-lg font-extrabold tracking-tight text-danger">
            {this.props.zona ? `Ecranul „${this.props.zona}" s-a oprit` : 'Ecranul s-a oprit'}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <b className="text-foreground">Datele tale sunt salvate.</b> S-a oprit doar afișarea acestui
            ecran, nu aplicația: importurile, rețetele și prețurile rămân exact cum erau. Poți încerca
            din nou sau treci la alt modul din meniu.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn onClick={this.reia} data-actiune="reia">Încearcă din nou</Btn>
            <Btn varianta="linie" onClick={() => window.location.reload()} data-actiune="reincarca">
              Reîncarcă aplicația
            </Btn>
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detaliul tehnic
            </summary>
            <pre className="num mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border bg-muted/40 p-3 text-[11px] leading-relaxed">
              {eroare.name}: {eroare.message}
            </pre>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Aceeași eroare, cu tot traseul ei, e în consola browserului (F12).
            </p>
          </details>
        </div>
      </div>
    );
  }
}

export default Bariera;
