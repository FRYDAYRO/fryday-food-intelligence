/**
 * Overview — cifrele de titlu ale perioadei, puntea FC și performanța restaurantelor.
 * Fiecare cifră vine dintr-un motor validat; ecranul doar alege ce arată și în ce ordine.
 */
import { useState } from 'react';
import { Sel } from '../../lib/ui';
import {
  kpiuri, punteTower, semnaleCalitate, sorteazaMagazine, tabelMagazine,
  type GrupBridge, type IdSectiune,
} from '../../lib/fc-tower';
import type { CriteriuClasament } from '../../lib/fc-timeline';
import { useTower } from './context';
import { useAnaliza, useIngrediente, usePunte } from './date';
import { Indisponibil, MaterialeGrup, Punte, RandKpiuri, Sectiune, Semnale, TabelMagazine } from './parti';

const SORTARI: { v: CriteriuClasament; l: string }[] = [
  { v: 'FC_MARE', l: 'FC-ul cel mai mare' },
  { v: 'CRESTERE_FC', l: 'Cea mai mare creștere' },
  { v: 'SCADERE_FC', l: 'Cea mai mare scădere' },
  { v: 'NEEXPLICAT', l: 'Cel mai mare neexplicat' },
  { v: 'IMPACT_COST', l: 'Cel mai mare impact de cost' },
];

export default function Overview({ onNavigheaza }: { onNavigheaza: (s: IdSectiune) => void }) {
  const { state, sel, setSel } = useTower();
  const analiza = useAnaliza();
  const bridge = usePunte();
  const ingrediente = useIngrediente();
  const [grup, setGrup] = useState<GrupBridge | null>(null);
  const [criteriu, setCriteriu] = useState<CriteriuClasament>('FC_MARE');

  if (!analiza.disponibil) {
    return <Indisponibil titlu="Nu există date pe această selecție" motiv={analiza.motivIndisponibil} />;
  }

  const punte = punteTower(bridge);
  const grupActiv = punte.grupuri.find(g => g.grup === grup) ?? null;
  const magazine = tabelMagazine(state, analiza);
  const sortare = sorteazaMagazine(magazine, analiza, criteriu);
  const semnale = semnaleCalitate(state, analiza, ingrediente.disponibil ? ingrediente : null);

  return (
    <div className="space-y-6">
      <Sectiune titlu="Cifrele perioadei" sub={analiza.cerere.perioada.cheie}>
        <RandKpiuri kpiuri={kpiuri(analiza)} />
      </Sectiune>

      <Sectiune titlu="Puntea Food Cost" sub="apasă un grup ca să vezi materialele din spatele lui">
        <Punte p={punte} activ={grup} onAlege={g => setGrup(g === grup ? null : g as GrupBridge)} />
        {grupActiv && <MaterialeGrup g={grupActiv} />}
      </Sectiune>

      {analiza.magazine
        ? (
          <Sectiune titlu="Performanța restaurantelor"
            actiuni={
              <Sel aria-label="Ordonare" data-camp="sortare" value={criteriu}
                onChange={e => setCriteriu(e.target.value as CriteriuClasament)}>
                {SORTARI.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </Sel>
            }>
            <TabelMagazine randuri={sortare.randuri} excluse={sortare.excluse} baza={sortare.baza}
              onAlege={loc => setSel({ ...sel, scop: 'RESTAURANT', locatie: loc })} />
          </Sectiune>
        )
        : (
          <Sectiune titlu="Performanța restaurantelor">
            <Indisponibil titlu={`Vedere pe ${sel.locatie ?? 'restaurant'}`}
              motiv={'Defalcarea pe restaurante există la nivel de companie. Treci pe „Companie" ca să compari restaurantele.'} />
          </Sectiune>
        )}

      <Sectiune titlu="Calitatea datelor">
        <Semnale semnale={semnale} onSectiune={s => onNavigheaza(s.sectiune)} />
      </Sectiune>
    </div>
  );
}
