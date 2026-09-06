# Lista de verificare a lansării

Scop: aplicația intră în folosință reală în două trepte — pilot pe un restaurant cu rapoartele lui verificate,
apoi toată rețeaua. Fiecare punct se bifează cu dovadă (raport rulat, test, export), nu din memorie.

## Treapta 1 — pilot (un restaurant)

Decizii (06.09.2026): pilotul e pe FRYDAY CLUJ MEMO, august 2026, cu un singur operator, salvare locală și
backup JSON; numitorul FC vine din 4.7 (adaptorul 4.1 rămâne pentru etapa următoare); NOMENCLATOR și REȚETAR
se importă ca foi separate. Proba de mai jos a fost rulată în aplicația construită, prin browser (Chromium),
pe aplicația goală, cu fișierele reale.

- [x] Versiunea de pilot integrează lanțul de PR-uri verde (#23 contract waste, #24 gramatica americană +
      consolidat, #25 audit, #26 adaptorul 4.1) peste `main`, fără conflicte; `pnpm typecheck`, `pnpm test`
      (4360 teste), `pnpm build` verzi pe versiunea integrată.
- [x] Store Master: restaurantul NU se creează de mână. Primul raport activat (2.9, 2.8 sau 4.7) creează locația
      cu numele EXACT din antet („FRYDAY CLUJ MEMO"); rolul de companie poate activa acest prim raport, iar
      selectorul Tower listează restaurantul o singură dată, cu date. Rapoartele următoare cad pe aceeași locație.
- [x] Nomenclatorul: foaia NOMENCLATOR a dashboardului, prin ecranul Importuri (antetul e găsit pe rândul 3):
      201/201 ingrediente, fiecare cu preț datat („Valabil de la").
- [x] Rețetarul: foaia REȚETAR a dashboardului, prin Importuri: 218 rețete, 746 linii, rândurile „TOTAL REȚETĂ"
      ignorate; produsele lipsă se creează din rețetar (fără preț de vânzare — prețul intră din 4.7). Costul din
      motor = Σ cantitate × preț/UM bază = TOTAL REȚETĂ tipărit, pe 154 de produse (test pe fișierul real).
      La import, „Valabil de la" se pune pe prima zi a lunii pilot (01.08.2026): altfel versiunea de rețetă e
      datată azi și se aplică lunii doar prin regula „prima versiune existentă" (nomenclatorul își poartă data pe rând).
- [ ] Reguli de clasificare pentru TOATE categoriile 2.9 ale restaurantului (Tower › Setări). În 2.9 Cluj august,
      10 categorii n-au regulă și rămân neclasificate (nu se presupun Food): DrinksSugar 21% (17.239 lei usage),
      FRYCafe 21% (3.229), Toys (1.496), Drink 11% (1.492), ACCESORII (751), Diverse 21% (719), Garantie sgr
      pet / aluminiu / sticla (312 / 105 / 36), MERCH RAW (197), Alcool (−4.765, din transferuri).
      Decizie de business: Food / Paper / exclus, pe fiecare.
- [ ] Rapoartele lunii pilot, în ordinea 4.7 → 2.9 → 2.8 (4.1 în etapa următoare):
      - [ ] 4.7 Sales Mix FRYDAY CLUJ MEMO, Period 8 (01.08–31.08.2026): FIȘIER LIPSĂ la data probei. Fără el
            nu există vânzări, deci nici perioadă în Tower, nici numitor, nici cost teoretic: Food Cost-ul și
            reconcilierea nu pot fi validate.
      - [x] 2.9 Cluj MEMO august, prin Import Center (PDF): VALIDAT și activat ca NBO_29#1, 582/582 rânduri,
            bilanț 570 exact + 12 în toleranță, 20/20 grupuri, 311.565 lei consum actual.
      - [x] 2.8 Cluj MEMO august, prin Import Center (PDF): VALIDAT și activat ca NBO_28#1, 157/157 evenimente,
            1.495,85 lei (evaluarea 2.8), 4/4 grupuri.
- [ ] Coada de aprobare golită. După nomenclator + 2.9 rămân 138 de materiale 2.9 fără ingredient (32,3 % din
      usage; cel mai mare: 7000268 BURGER VITA 80G PL, 82.574 lei) și 5 din 2.8 (inclusiv codurile DESERT*).
      Fără alias, materialele rămân „fără corespondent" în puntea pe material. Operatorul alocă aliasurile în
      Importuri › coada de aprobare (sugestiile există pentru o parte; „BURGER VITA 80G PL" n-are sugestie).
- [x] Identitatea 2.9 verificată la import (570 exact + 12 în toleranță din 582).
- [ ] Ținta de Food Cost declarată pentru restaurant (Tower › Setări).
- [x] Persistență: după reîncărcarea paginii starea e identică (versiuni, materiale, evenimente).
- [x] Backup JSON: „Descarcă instantaneul" din Setări, golirea browserului, „Încarcă un instantaneu…" —
      starea restaurată e identică cu cea salvată.
- Un utilizator pe rol: nu se aplică pilotului (un operator, local); serverul comun și accesul managerilor vin
  după pilot.

## Treapta 2 — toată rețeaua

- [ ] Câte un 2.9, 2.8 și 4.7 real pentru fiecare restaurant activ, rulate prin aplicație (nu doar „aproximativ la fel"):
      formatul american (Vâlcea) și cel românesc (Cluj) sunt verificate; un 2.8 în format american încă NU a fost
      văzut pe un raport real.
- [ ] Raportul 4.7 pe mai multe restaurante („Multiple Selection") se închide pe totalul general (verificat pe 30 de magazine).
- [ ] Raportul 2.9 consolidat („Corporate") intră doar la nivel de companie; cifrele pe restaurant vin din rapoartele proprii.
- [ ] Store Master complet: toate restaurantele din lista 4.7 „Groups/Stores" au identificator verificat.
- [x] Decizie luată (06.09.2026): 4.1 Sales Journal în PDF este un rezumat pe fereastră; Take Out și Drive Thru
      intră la InStore, Delivery rămâne Delivery. Rândul se datează pe prima zi a ferestrei, versiunea poartă
      fereastra întreagă (granularitate INTERVAL), raportul „All Stores" intră doar la nivel de companie și,
      când există, e numitorul autoritar al companiei (rândurile pe restaurant nu se adună peste el).
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
| 4.1 Sales Journal (All Stores, Timișoara) | PDF real | rezumat pe fereastră; Σ canale = Net Sales la ban; import prin Import Center |
| Foile NOMENCLATOR și REȚETAR ale dashboardului | XLSX real, separat, prin Importuri | 201 ingrediente; 218 rețete / 746 linii; cost motor = TOTAL REȚETĂ pe 154 produse |
| Fluxul pilotului Cluj în browser | aplicația construită, Chromium | nomenclator → rețetar → 2.9 → 2.8 activate; persistență și backup JSON verificate; 4.7 lipsă |
