# Lista de verificare a lansării

Scop: aplicația intră în folosință reală în două trepte — pilot pe un restaurant cu rapoartele lui verificate,
apoi toată rețeaua. Fiecare punct se bifează cu dovadă (raport rulat, test, export), nu din memorie.

## Treapta 1 — pilot (un restaurant)

- [ ] `main` conține lanțul de PR-uri verde (#23 contract waste, #24 gramatica americană + consolidat, #25 audit).
- [ ] Store Master: restaurantul pilot există în `locatii`, cu numele EXACT din antetul rapoartelor NBO
      („FRYDAY CLUJ MEMO", „FRYDAY RM VALCEA DT"). Fără potrivire de nume, importul cade la nivel de companie.
- [ ] Nomenclatorul de ingrediente importat (fișier NOMENCLATOR), cu codurile NBO ca `cod` sau ca alias.
- [ ] Rețetarul importat; produsele vândute în 4.7 au rețetă (Tower › Ingrediente arată acoperirea).
- [ ] Reguli de clasificare pentru TOATE categoriile 2.9 ale restaurantului (Tower › Setări): nimic „presupus Food".
- [ ] Rapoartele lunii pilot importate prin Import Center, în ordinea: 4.7 → 4.1 (dacă e disponibil) → 2.9 → 2.8.
      Fiecare cu versiune activată, fereastra raportului, zero rânduri necitite.
- [ ] Coada de aprobare golită: materialele 2.9 și 2.8 fără ingredient au alias aprobat (inclusiv codurile
      de meniu DESERT* din 2.8), altfel rămân în „Neexplicat" / „fără corespondent".
- [ ] Identitatea 2.9 verificată la import (bilanț de stoc: toate rândurile exact sau în toleranță).
- [ ] Ținta de Food Cost declarată pentru restaurant (Tower › Setări).
- [ ] Un utilizator pe rol: managerul restaurantului vede doar restaurantul lui (Tower › acces).
- [ ] Export JSON al stării din Setări după fiecare import — starea trăiește în browserul unui singur om
      până la portarea pe server.

## Treapta 2 — toată rețeaua

- [ ] Câte un 2.9, 2.8 și 4.7 real pentru fiecare restaurant activ, rulate prin aplicație (nu doar „aproximativ la fel"):
      formatul american (Vâlcea) și cel românesc (Cluj) sunt verificate; un 2.8 în format american încă NU a fost
      văzut pe un raport real.
- [ ] Raportul 4.7 pe mai multe restaurante („Multiple Selection") se închide pe totalul general (verificat pe 30 de magazine).
- [ ] Raportul 2.9 consolidat („Corporate") intră doar la nivel de companie; cifrele pe restaurant vin din rapoartele proprii.
- [ ] Store Master complet: toate restaurantele din lista 4.7 „Groups/Stores" au identificator verificat.
- [ ] Decizie: 4.1 Sales Journal în PDF este un rezumat săptămânal (Net Sales pe Dine In / Take Out / Delivery /
      Drive Thru), nu un jurnal pe zile. Importul lui cere o regulă de canal (Take Out și Drive Thru → InStore?)
      și acceptarea granularității săptămânale ca numitor. Până la decizie, numitorul vine din 4.7.
- [ ] Decizii rămase, în afara PR-urilor curente: transferurile 2.9, convenția pentru Inv Adj negativ, XLSX pentru 2.8.

## Ce NU se face înainte de lansare

- Restilizarea interfeței (mock-ul „Executive Cockpit"): nu schimbă nicio cifră; se face după ce cifrele sunt corecte.
- Portarea pe server: motorul e pur și acoperit de teste; se face după pilot, cu suita ca regresie.

## Dovezi disponibile azi

| Raport | Verificat pe | Rezultat |
|---|---|---|
| 2.9 Cluj, august (RO) | PDF real | 582/582, identitate 570 + 12, 20/20 grupuri |
| 2.9 Vâlcea, săptămâna 17–23.08 (EN) | PDF real | 406/406, identitate 401 + 5, 17/17 grupuri |
| 2.9 consolidat 01–09.08 (EN) | PDF real | 561/561, identitate 532 + 29, 20/20 grupuri, nivel de companie |
| 2.8 Cluj, august (RO) | PDF real | 157/157 evenimente, 4/4 grupuri |
| 4.7 Timișoara, săptămâna 34 | PDF real | 284 linii, total exact |
| 4.7 „Multiple Selection", 30 restaurante | PDF real | 377 linii, total exact după corecția rupturilor |
| 4.1 Sales Journal (All Stores, Timișoara) | PDF real | rezumat săptămânal; fără adaptor (decizie de canal) |
| Fișier Excel de dashboard | XLSX real | nu e sursă de import: foile NOMENCLATOR și RETETAR se importă separat |
