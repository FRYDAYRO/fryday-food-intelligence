// GENERAT AUTOMAT de scripts/converteste-date-reale.mjs — nu edita manual.
// Surse: date-sursa/FRYDAY_FC_Initial_Corectat.xlsx, 4.7_Sales_Mix.pdf, 2.9_Cluj_Memo.pdf
//
// ATENȚIE — cele două rapoarte NU au același domeniu, de aceea stau pe locații separate:
//   NET  = 30 de restaurante, 27–31 iulie 2026 (4.7 Sales Mix)
//   CLUJ = doar FRYDAY CLUJ MEMO, 1–31 iulie 2026 (2.9)
// Nu compara direct FC-ul dintre ele și nu citi „Toată rețeaua" ca pe un FC real:
// ar împărți consumul lunar al unei locații la vânzările pe 5 zile ale rețelei.
import type { AppState } from './types';

export function genereazaDateReale(): AppState {
  return {
    "locatii": [
      {
        "cod": "NET",
        "nume": "Rețea FRYDAY — 30 restaurante (4.7, 27–31 iul)"
      },
      {
        "cod": "CLUJ",
        "nume": "FRYDAY CLUJ MEMO (2.9, iulie)"
      }
    ],
    "furnizori": [],
    "ingrediente": [
      {
        "cod": "700977",
        "denumire": "Aqua Carpatica Plata (raw)",
        "categorie": "Drink 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.75
          }
        ],
        "activ": true
      },
      {
        "cod": "702586",
        "denumire": "Aripioare de pui picante",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.50443
          }
        ],
        "activ": true
      },
      {
        "cod": "702230",
        "denumire": "Barbecue Sauce 100 x 25g",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.082
          }
        ],
        "activ": true
      },
      {
        "cod": "700158",
        "denumire": "BASE - Milkshake 2021",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 5.151
          }
        ],
        "activ": true
      },
      {
        "cod": "7000230",
        "denumire": "BASE - Milkshake 2026",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 3.115
          }
        ],
        "activ": true
      },
      {
        "cod": "7000235",
        "denumire": "BASE - Milkshake CAN",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 5.216
          }
        ],
        "activ": true
      },
      {
        "cod": "702176",
        "denumire": "CARROT CAKE",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 8.008
          }
        ],
        "activ": true
      },
      {
        "cod": "702479",
        "denumire": "MARITOZZO 90 g x 12",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 9.621
          }
        ],
        "activ": true
      },
      {
        "cod": "7000014",
        "denumire": "MILLEFOGLIE RAW",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 8.228
          }
        ],
        "activ": true
      },
      {
        "cod": "4083",
        "denumire": "Nuggets cornflakes (raw)",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.67483
          }
        ],
        "activ": true
      },
      {
        "cod": "702044",
        "denumire": "Pepsi Max 0.33L PROMO FREE",
        "categorie": "DrinksSugar 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.643
          }
        ],
        "activ": true
      },
      {
        "cod": "702548",
        "denumire": "Prep Limonada",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 34.98
          }
        ],
        "activ": true
      },
      {
        "cod": "4073",
        "denumire": "Topping KitKat Crunch (raw)",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 68.6
          }
        ],
        "activ": true
      },
      {
        "cod": "702171",
        "denumire": "Tort de ciocolata cu zmeura",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 8.513
          }
        ],
        "activ": true
      },
      {
        "cod": "702624",
        "denumire": "2025 - PATRATA FRY IMPERFECT",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.693
          }
        ],
        "activ": true
      },
      {
        "cod": "702315",
        "denumire": "7UP ZERO BIB",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 44.94
          }
        ],
        "activ": true
      },
      {
        "cod": "702631",
        "denumire": "Almette cu rosii si busuioc 150 gr",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 41.14
          }
        ],
        "activ": true
      },
      {
        "cod": "7000015",
        "denumire": "Ambalaj Crispy FRY 300x148x70 (T+M+S)",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.06
          }
        ],
        "activ": true
      },
      {
        "cod": "3002",
        "denumire": "Apa Evian (raw)",
        "categorie": "Drink 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 6.57
          }
        ],
        "activ": true
      },
      {
        "cod": "7000011",
        "denumire": "APPLE CINNAMON TOPPING WITH DICES",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 18.83
          }
        ],
        "activ": true
      },
      {
        "cod": "701010",
        "denumire": "Aqua Carpatica Minerala (raw)",
        "categorie": "Drink 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.75
          }
        ],
        "activ": true
      },
      {
        "cod": "60602",
        "denumire": "Ardei Rosii Capia 2.5kg",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 20.1
          }
        ],
        "activ": true
      },
      {
        "cod": "702587",
        "denumire": "Aripioare de pui nepicante",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.39123
          }
        ],
        "activ": true
      },
      {
        "cod": "4003",
        "denumire": "Bacon (raw)",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 48.96
          }
        ],
        "activ": true
      },
      {
        "cod": "702342",
        "denumire": "BASE - Pepsi Soft Drinks 500 ml",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.805
          }
        ],
        "activ": true
      },
      {
        "cod": "697008",
        "denumire": "BASE - Soft Drinks 250ml",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.649
          }
        ],
        "activ": true
      },
      {
        "cod": "701054",
        "denumire": "Bere Budweiser 0.33",
        "categorie": "Alcool",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 6.23
          }
        ],
        "activ": true
      },
      {
        "cod": "697054",
        "denumire": "Biogon C E290 10kg",
        "categorie": "Diverse 21%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 25.4
          }
        ],
        "activ": true
      },
      {
        "cod": "7000016",
        "denumire": "BOL SALATA COLESLAW CIRIY226AE1311 Y226 FRYDAY",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.438
          }
        ],
        "activ": true
      },
      {
        "cod": "7000123",
        "denumire": "Branza cheddar felii 2026",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.61567
          }
        ],
        "activ": true
      },
      {
        "cod": "702263",
        "denumire": "Breaded Shrimp Patty 100g",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 5.238
          }
        ],
        "activ": true
      },
      {
        "cod": "700682",
        "denumire": "BULINA BANANE 2025",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.045
          }
        ],
        "activ": true
      },
      {
        "cod": "700681",
        "denumire": "BULINA CAPSUNI 2025",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.045
          }
        ],
        "activ": true
      },
      {
        "cod": "700968",
        "denumire": "Bulina porc",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.086
          }
        ],
        "activ": true
      },
      {
        "cod": "7000017",
        "denumire": "CAPAC BOL SALATA COLESLAW LIRISL95S LID Y226 FRYDAY",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.427
          }
        ],
        "activ": true
      },
      {
        "cod": "702116",
        "denumire": "Capac din plastic negru 4oz",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.119
          }
        ],
        "activ": true
      },
      {
        "cod": "702114",
        "denumire": "Capac din plastic SR 80 (8OZ)",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.16
          }
        ],
        "activ": true
      },
      {
        "cod": "702115",
        "denumire": "Capac dn plastic SR 90 (12OZ)",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.209
          }
        ],
        "activ": true
      },
      {
        "cod": "7000006",
        "denumire": "CAPAC PENTRU PAHAR CARTON CL90 - 0.35-0.4-0.5 ML",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.116
          }
        ],
        "activ": true
      },
      {
        "cod": "7000013",
        "denumire": "CAPAC PLAT CU ORIFICIU FRYZZZ",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.106
          }
        ],
        "activ": true
      },
      {
        "cod": "701043",
        "denumire": "Capac sosiera 50ml",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.045
          }
        ],
        "activ": true
      },
      {
        "cod": "702037",
        "denumire": "Cartofi congelati",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 12.44
          }
        ],
        "activ": true
      },
      {
        "cod": "701035",
        "denumire": "Ceapa prajita",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 26.6
          }
        ],
        "activ": true
      },
      {
        "cod": "7000130",
        "denumire": "CHEESECAKE NY 2.130 KG",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 9.292
          }
        ],
        "activ": true
      },
      {
        "cod": "7000133",
        "denumire": "CHIFLA CARTOF 3.5inch 53G x 72",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.4
          }
        ],
        "activ": true
      },
      {
        "cod": "1003",
        "denumire": "Corona (raw)",
        "categorie": "Alcool",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 6.97
          }
        ],
        "activ": true
      },
      {
        "cod": "702633",
        "denumire": "Creme castraveti 200 gr",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 36
          }
        ],
        "activ": true
      },
      {
        "cod": "702316",
        "denumire": "CUTIE CARTOFI FRYDAY 112G 2024",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.182
          }
        ],
        "activ": true
      },
      {
        "cod": "702317",
        "denumire": "CUTIE CARTOFI FRYDAY 150G 2024",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.24
          }
        ],
        "activ": true
      },
      {
        "cod": "702318",
        "denumire": "CUTIE CARTOFI FRYDAY 250G 2024",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.35
          }
        ],
        "activ": true
      },
      {
        "cod": "7000182",
        "denumire": "CUTIE CARTON FRYPIE APPLE TOFFEFE FRYDAY",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.28
          }
        ],
        "activ": true
      },
      {
        "cod": "8001",
        "denumire": "Cutie Jucarie",
        "categorie": "Toys",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 12.368
          }
        ],
        "activ": true
      },
      {
        "cod": "702607",
        "denumire": "CUTIE MICA BLACK TRUFFLE BRG 2025 - PATRATA FRY",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.693
          }
        ],
        "activ": true
      },
      {
        "cod": "702367",
        "denumire": "CUTIE MICA HOMESTYLE BRG.2024",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.693
          }
        ],
        "activ": true
      },
      {
        "cod": "702556",
        "denumire": "CUTIE MICA RED PEPPER SMASHED BURGER Fry",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.693
          }
        ],
        "activ": true
      },
      {
        "cod": "702471",
        "denumire": "CUTIE MICA Shrimp Burger 2024- PATRAT",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.691
          }
        ],
        "activ": true
      },
      {
        "cod": "702261",
        "denumire": "DR PEPPER DOZA 0.33L",
        "categorie": "DrinksSugar 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 3.64
          }
        ],
        "activ": true
      },
      {
        "cod": "7000018",
        "denumire": "Frydays Homestyle Chick'n Tender 65g",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.76925
          }
        ],
        "activ": true
      },
      {
        "cod": "702092",
        "denumire": "Furculita Rosie",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.27
          }
        ],
        "activ": true
      },
      {
        "cod": "700963",
        "denumire": "Green Pesto Mayo",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 47
          }
        ],
        "activ": true
      },
      {
        "cod": "7000141",
        "denumire": "HARTIE AMERICAN CHEESBURGER 12X12 AA14",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.111
          }
        ],
        "activ": true
      },
      {
        "cod": "7000140",
        "denumire": "HARTIE BURGER Doubles 12x12 AA13",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.111
          }
        ],
        "activ": true
      },
      {
        "cod": "5028",
        "denumire": "Hartie Burger Fryday",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.115
          }
        ],
        "activ": true
      },
      {
        "cod": "700653",
        "denumire": "Hartie Kraft Pui",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.103
          }
        ],
        "activ": true
      },
      {
        "cod": "700655",
        "denumire": "Hartie Little Hamburgers",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.111
          }
        ],
        "activ": true
      },
      {
        "cod": "7000125",
        "denumire": "HEINZ HONEY MUSTARD DIPPOT 100X25G",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.43
          }
        ],
        "activ": true
      },
      {
        "cod": "7000126",
        "denumire": "HEINZ KETCHUP SASCHET 200X10ML",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.452
          }
        ],
        "activ": true
      },
      {
        "cod": "7000128",
        "denumire": "HEINZ MAYONNAISE SASCHET 200X100ML",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.45
          }
        ],
        "activ": true
      },
      {
        "cod": "7000124",
        "denumire": "HEINZ SWEET CHILLY DIPPOT 100X25G",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.43
          }
        ],
        "activ": true
      },
      {
        "cod": "7000103",
        "denumire": "Homestyle CKN Patty",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 4.756
          }
        ],
        "activ": true
      },
      {
        "cod": "7000144",
        "denumire": "Iceberg Cal.1  400/500gr",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 7.5
          }
        ],
        "activ": true
      },
      {
        "cod": "702140",
        "denumire": "Illy Expresso Clasico 1.5 kg",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 238.33
          }
        ],
        "activ": true
      },
      {
        "cod": "4028",
        "denumire": "Jalapenos (raw)",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 41.17
          }
        ],
        "activ": true
      },
      {
        "cod": "702052",
        "denumire": "Ketchup Jerrycan Heinz 10.2L",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 22.1
          }
        ],
        "activ": true
      },
      {
        "cod": "4032",
        "denumire": "Lapte cafea",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 9.8
          }
        ],
        "activ": true
      },
      {
        "cod": "4033",
        "denumire": "Lapte UHT 7.5%",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 18.16
          }
        ],
        "activ": true
      },
      {
        "cod": "702122",
        "denumire": "Lemon Pepper  Mayo",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 40.63
          }
        ],
        "activ": true
      },
      {
        "cod": "702512",
        "denumire": "LOTUS-BISCOFF CREMA TARTINABILA 3KG",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 50.3
          }
        ],
        "activ": true
      },
      {
        "cod": "7000163",
        "denumire": "LW CRISSCUTS SKIN-ON",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 14.18
          }
        ],
        "activ": true
      },
      {
        "cod": "702088-MAC",
        "denumire": "Mac&Cheese Bites RAW",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.76286
          }
        ],
        "activ": true
      },
      {
        "cod": "7000132",
        "denumire": "Mandarina cu sorbet, 12 buc",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 11.653
          }
        ],
        "activ": true
      },
      {
        "cod": "702193",
        "denumire": "Monin Syrup caramel 70 cl",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 65.2
          }
        ],
        "activ": true
      },
      {
        "cod": "702048",
        "denumire": "Mustar Heinz 875ml",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 33
          }
        ],
        "activ": true
      },
      {
        "cod": "702314",
        "denumire": "N Sos Cocktail",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 32.15
          }
        ],
        "activ": true
      },
      {
        "cod": "4041",
        "denumire": "Nutella (raw)",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 36.66
          }
        ],
        "activ": true
      },
      {
        "cod": "702035",
        "denumire": "Pahar cafea 4OZ",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.303
          }
        ],
        "activ": true
      },
      {
        "cod": "7000151",
        "denumire": "PAHAR CARTOFI FRY 12OZ - 85MM 2026",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.453
          }
        ],
        "activ": true
      },
      {
        "cod": "5032",
        "denumire": "Pahar Carton Chedar Dip 130ml",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.335
          }
        ],
        "activ": true
      },
      {
        "cod": "7000003",
        "denumire": "Pahar Carton Dip'n FRY RANCH 130ml",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.335
          }
        ],
        "activ": true
      },
      {
        "cod": "7000002",
        "denumire": "Pahar Carton Dip'n Truffle 130ml",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.335
          }
        ],
        "activ": true
      },
      {
        "cod": "5033",
        "denumire": "Pahar Carton DW Fryday 250ml",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.734
          }
        ],
        "activ": true
      },
      {
        "cod": "5034",
        "denumire": "Pahar Carton DW Fryday 350ml",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.487
          }
        ],
        "activ": true
      },
      {
        "cod": "7000004",
        "denumire": "PAHAR DIN CARTON [300ML/12OZ] FRY RANCH CGRBA7991 DP12N",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.277
          }
        ],
        "activ": true
      },
      {
        "cod": "7000005",
        "denumire": "PAHAR DIN CARTON [400ML/16OZ] FRY RANCH CGRBA7992 DP16T",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.328
          }
        ],
        "activ": true
      },
      {
        "cod": "7000012",
        "denumire": "PAHAR PET FRYZZZ 300-400ML",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.424
          }
        ],
        "activ": true
      },
      {
        "cod": "7000181",
        "denumire": "Pahar Storm",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.782
          }
        ],
        "activ": true
      },
      {
        "cod": "5042",
        "denumire": "Pai 12 mm",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.296
          }
        ],
        "activ": true
      },
      {
        "cod": "702138",
        "denumire": "Pai hartie 8mm",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.176
          }
        ],
        "activ": true
      },
      {
        "cod": "5044",
        "denumire": "Paletine Lemn 14 cm",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.013
          }
        ],
        "activ": true
      },
      {
        "cod": "702045",
        "denumire": "Patties pui 50gr Transavia",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.171
          }
        ],
        "activ": true
      },
      {
        "cod": "7000121",
        "denumire": "PEPSI ZERO CREAM SODA 330ML",
        "categorie": "DrinksSugar 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 3.71
          }
        ],
        "activ": true
      },
      {
        "cod": "7000122",
        "denumire": "PEPSI ZERO STRAWBERRY CREAM 330ML",
        "categorie": "DrinksSugar 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 3.71
          }
        ],
        "activ": true
      },
      {
        "cod": "700657",
        "denumire": "Pepsi-Cola 0.33L",
        "categorie": "DrinksSugar 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.935
          }
        ],
        "activ": true
      },
      {
        "cod": "702015",
        "denumire": "Piure Banane Monin",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 87.47
          }
        ],
        "activ": true
      },
      {
        "cod": "702016",
        "denumire": "Piure Capsuni Monin",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 87.47
          }
        ],
        "activ": true
      },
      {
        "cod": "NOU-PIU-GRAP",
        "denumire": "Piure Grapefruit Monin",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 87.47
          }
        ],
        "activ": true
      },
      {
        "cod": "NOU-PIU-PEPE",
        "denumire": "Piure Pepene Rosu Monin",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 87.47
          }
        ],
        "activ": true
      },
      {
        "cod": "NOU-PIU-PINA",
        "denumire": "Piure Pina Colada Monin",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 87.47
          }
        ],
        "activ": true
      },
      {
        "cod": "7000166",
        "denumire": "PLACINTA MAR CARAMEL. 70G",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.543
          }
        ],
        "activ": true
      },
      {
        "cod": "7000169",
        "denumire": "PLIC CONDIMENTE CAJUN [3G] FRY",
        "categorie": "Condimente",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.172
          }
        ],
        "activ": true
      },
      {
        "cod": "7000168",
        "denumire": "PLIC CONDIMENTE PARMESAN [3G] FRY",
        "categorie": "Condimente",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.446
          }
        ],
        "activ": true
      },
      {
        "cod": "702181",
        "denumire": "Prajitura cu mascarpone si capasuni in pahar sticla",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 9.25
          }
        ],
        "activ": true
      },
      {
        "cod": "702179",
        "denumire": "Prajitura de vanilie cu bezea crocanta",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 5.056
          }
        ],
        "activ": true
      },
      {
        "cod": "7000210",
        "denumire": "PREP - smashed koliber 60G",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.93233
          }
        ],
        "activ": true
      },
      {
        "cod": "7000024",
        "denumire": "Prep Salata Coleslaw",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 18.94
          }
        ],
        "activ": true
      },
      {
        "cod": "3016",
        "denumire": "Prigat Portocale (raw)",
        "categorie": "DrinksSugar 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 4.17
          }
        ],
        "activ": true
      },
      {
        "cod": "702175",
        "denumire": "Profiterol cu ciocolata",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 4.92
          }
        ],
        "activ": true
      },
      {
        "cod": "702507",
        "denumire": "PUNGA 11x5x12.5 BURGER MIC",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.105
          }
        ],
        "activ": true
      },
      {
        "cod": "5046",
        "denumire": "Punga Alba Pui 15x15",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.127
          }
        ],
        "activ": true
      },
      {
        "cod": "7000167",
        "denumire": "Punga Fry Shaker",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.319
          }
        ],
        "activ": true
      },
      {
        "cod": "702146",
        "denumire": "PUNGA FRYDAY PEPSI 23X10X30",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.529
          }
        ],
        "activ": true
      },
      {
        "cod": "700970",
        "denumire": "Punga Pui Nepicant",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.294
          }
        ],
        "activ": true
      },
      {
        "cod": "700971",
        "denumire": "Punga Pui Picant",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.34
          }
        ],
        "activ": true
      },
      {
        "cod": "702147",
        "denumire": "PUNGA TO GO FRD+PEPSI 26X17X33",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.939
          }
        ],
        "activ": true
      },
      {
        "cod": "3017",
        "denumire": "Redbull (raw)",
        "categorie": "DrinksSugar 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 6.08
          }
        ],
        "activ": true
      },
      {
        "cod": "702514",
        "denumire": "Redpeppajam Sauce",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 39.53
          }
        ],
        "activ": true
      },
      {
        "cod": "702414",
        "denumire": "Rosti Rounds",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.353
          }
        ],
        "activ": true
      },
      {
        "cod": "702102",
        "denumire": "RTS - Sos Samurai 25ml",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.112
          }
        ],
        "activ": true
      },
      {
        "cod": "702103",
        "denumire": "RTS - Sos Truffle Mayo 25ml",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.272
          }
        ],
        "activ": true
      },
      {
        "cod": "702104",
        "denumire": "RTS - Sos Usturoi 25ml",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 1.984
          }
        ],
        "activ": true
      },
      {
        "cod": "702237",
        "denumire": "Sacosa mare to go FRD 32X16.5X34",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.765
          }
        ],
        "activ": true
      },
      {
        "cod": "4056",
        "denumire": "Salata Eisberg",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 20
          }
        ],
        "activ": true
      },
      {
        "cod": "7000143",
        "denumire": "SALATA LOLLO BIONDA S 500g",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 36
          }
        ],
        "activ": true
      },
      {
        "cod": "702458",
        "denumire": "Sausage Patty",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 2.471
          }
        ],
        "activ": true
      },
      {
        "cod": "5054",
        "denumire": "Servetele umede",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.198
          }
        ],
        "activ": true
      },
      {
        "cod": "4063",
        "denumire": "Sos Brender Mayo BIB",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 23
          }
        ],
        "activ": true
      },
      {
        "cod": "4064",
        "denumire": "Sos Cheddar BIB",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 45.07
          }
        ],
        "activ": true
      },
      {
        "cod": "7000001",
        "denumire": "Sos FryRanch",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 26.13
          }
        ],
        "activ": true
      },
      {
        "cod": "NOU-SOSREAL",
        "denumire": "Sos Real Burger",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 27.03
          }
        ],
        "activ": true
      },
      {
        "cod": "701042",
        "denumire": "Sosiera neagra 50ml",
        "categorie": "Paper",
        "tip": "PACKAGING",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 0.176
          }
        ],
        "activ": true
      },
      {
        "cod": "7000131",
        "denumire": "TIRAMISU FISTIC 1.2 KG",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 9.025
          }
        ],
        "activ": true
      },
      {
        "cod": "702180",
        "denumire": "TIRAMISÙ pufos in pahar sticla",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 7.485
          }
        ],
        "activ": true
      },
      {
        "cod": "4077",
        "denumire": "Topping Oreo Crunch (raw)",
        "categorie": "Food 21%",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 94.75
          }
        ],
        "activ": true
      },
      {
        "cod": "702178",
        "denumire": "Tort pufos cu capsuni",
        "categorie": "FRYCafe 21%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 7.385
          }
        ],
        "activ": true
      },
      {
        "cod": "702511",
        "denumire": "Truffle Mayonaise 10L",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 35.06
          }
        ],
        "activ": true
      },
      {
        "cod": "4078",
        "denumire": "Ulei de alune",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "l",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 16.9
          }
        ],
        "activ": true
      },
      {
        "cod": "4080",
        "denumire": "Veggie Plant Based 95g",
        "categorie": "Food 11%",
        "tip": "FOOD",
        "um": "buc",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 3.457
          }
        ],
        "activ": true
      },
      {
        "cod": "7000142",
        "denumire": "Y - Ceapa Cuburi",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 7
          }
        ],
        "activ": true
      },
      {
        "cod": "697191",
        "denumire": "Y-Banane Feliate",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 14
          }
        ],
        "activ": true
      },
      {
        "cod": "697190",
        "denumire": "Y-Capsuni Feliate",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 34
          }
        ],
        "activ": true
      },
      {
        "cod": "702399",
        "denumire": "Y-Castraveti felii in saramura",
        "categorie": "Neclasificat",
        "tip": "FOOD",
        "um": "kg",
        "preturi": [
          {
            "validDeLa": "2026-07-01",
            "pret": 15.54
          }
        ],
        "activ": true
      }
    ],
    "produse": [
      {
        "cod": "HAMBURGER",
        "denumire": "HAMBURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 8,
        "pretDelivery": 10,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 8,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 10,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DUBLU_HAMBURGER",
        "denumire": "DUBLU HAMBURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14.99,
        "pretDelivery": 16.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 16.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CHEESEBURGER",
        "denumire": "CHEESEBURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 11.49,
        "pretDelivery": 13.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 11,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 11.49,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 13,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 13.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DUBLU_CHEESEBURGER",
        "denumire": "DUBLU CHEESEBURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17.99,
        "pretDelivery": 19.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 17.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 19,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 19.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "AMERICAN_CHEESEBURGER",
        "denumire": "AMERICAN CHEESEBURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 10,
        "pretDelivery": 13,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 13,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "AMERICAN_DUBLU_CHEESEBURGER",
        "denumire": "AMERICAN DUBLU CHEESEBURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 16,
        "pretDelivery": 19,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 16,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 19,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "AMERICAN_TRIPLU_CHEESEBURGER",
        "denumire": "AMERICAN TRIPLU CHEESEBURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 22,
        "pretDelivery": 25,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 22,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 25,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SMASHED_BURGER",
        "denumire": "SMASHED BURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 21.99,
        "pretDelivery": 25.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 20.99,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 21.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 24.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 25.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DUBLU_SMASHED_BURGER",
        "denumire": "DUBLU SMASHED BURGER",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 28.99,
        "pretDelivery": 32.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 26.99,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 28.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 30.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 32.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "BLACK_TRUFFLE_SMASHED",
        "denumire": "BLACK TRUFFLE SMASHED",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 22.99,
        "pretDelivery": 25.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 22,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 22.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 25,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 25.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DUBLU_BLACK_TRUFFLE_SMASHED",
        "denumire": "DUBLU BLACK TRUFFLE SMASHED",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 29.99,
        "pretDelivery": 32.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 28,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 29.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 31,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 32.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "RED_PEPPER_SMASHED",
        "denumire": "RED PEPPER SMASHED",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 26.99,
        "pretDelivery": 29.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 26,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 26.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 29,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 29.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DUBLU_RED_PEPPER_SMASHED",
        "denumire": "DUBLU RED PEPPER SMASHED",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 33.99,
        "pretDelivery": 36.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 32,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 33.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 35,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 36.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "AMERICAN_TRIPLU_CHEESEBURGER_LETTUCE_WRAP",
        "denumire": "AMERICAN TRIPLU CHEESEBURGER LETTUCE WRAP",
        "categorie": "BURGER VITA",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 22.99,
        "pretDelivery": 27.990000000000002,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 22,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 22.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 25,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 27.990000000000002,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PUI_BURGER",
        "denumire": "PUI BURGER",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 7,
        "pretDelivery": 10,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 7,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 10,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DUBLU_PUI_BURGER",
        "denumire": "DUBLU PUI BURGER",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 15.49,
        "pretDelivery": 18.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15.49,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 18.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_PESTO",
        "denumire": "HOMESTYLE CHICKEN PESTO",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 26.99,
        "pretDelivery": 29.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 26,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 26.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 28,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 29.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_LEMON",
        "denumire": "HOMESTYLE CHICKEN LEMON",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 26.99,
        "pretDelivery": 28.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 26,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 26.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 28,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 28.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_RANCH",
        "denumire": "HOMESTYLE CHICKEN RANCH",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 26,
        "pretDelivery": 28
      },
      {
        "cod": "CHICKEN_TRUFFLE",
        "denumire": "CHICKEN TRUFFLE",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14.49,
        "pretDelivery": 16.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 14.49,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 16.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DUBLU_CHICKEN_TRUFFLE",
        "denumire": "DUBLU CHICKEN TRUFFLE",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 19.99,
        "pretDelivery": 21.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 19,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 19.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 21,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 21.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CHICKEN_FRYRANCH_XREMUS",
        "denumire": "Chicken FryRanch XRemus",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 18,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 18,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_FRYRANCH_LETTUCE_WRAP",
        "denumire": "HOMESTYLE CHICKEN FRYRANCH LETTUCE WRAP",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 26.99,
        "pretDelivery": 28.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 26,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 26.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 28,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 28.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_LEMON_LETTUCE_WRAP",
        "denumire": "HOMESTYLE CHICKEN LEMON LETTUCE WRAP",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 26.99,
        "pretDelivery": 28.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 26,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 26.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 28,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 28.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "TRIPLU_PUI_BURGER",
        "denumire": "TRIPLU PUI BURGER",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 20.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 20,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 20.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "TRIPLU_CHICKEN_TRUFFLE",
        "denumire": "TRIPLU CHICKEN TRUFFLE",
        "categorie": "BURGER PUI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 24.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 24,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 24.49,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "ALMETTE_FRESH_PUI",
        "denumire": "ALMETTE FRESH PUI",
        "categorie": "BREAKFAST",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 20,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 20,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ALMETTE_BASIL_PUI",
        "denumire": "ALMETTE BASIL PUI",
        "categorie": "BREAKFAST",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 20,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 20,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ALMETTE_FRESH_PORC",
        "denumire": "ALMETTE FRESH PORC",
        "categorie": "BREAKFAST",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 20,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 20,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ALMETTE_BASIL_PORC",
        "denumire": "ALMETTE BASIL PORC",
        "categorie": "BREAKFAST",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 20,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 20,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ROSTI_SAUSAGE_BURGER",
        "denumire": "ROSTI SAUSAGE BURGER",
        "categorie": "BREAKFAST",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 20,
        "pretDelivery": 23,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 20,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 23,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SHRIMP_BURGER",
        "denumire": "SHRIMP BURGER",
        "categorie": "CREVETI",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 25.99,
        "pretDelivery": 28.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 25,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 25.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 28,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 28.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "BURGER_VEGETARIAN",
        "denumire": "BURGER VEGETARIAN",
        "categorie": "BURGER VEGETARIAN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 20.99,
        "pretDelivery": 23.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 20,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 20.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 23,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 23.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "4_NUGGETS",
        "denumire": "4 NUGGETS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 9.5,
        "pretDelivery": 12.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 9,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 9.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 12,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 12.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "6_NUGGETS",
        "denumire": "6 NUGGETS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 16.5,
        "pretDelivery": 19.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 16,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 16.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 19,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 19.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "9_NUGGETS",
        "denumire": "9 NUGGETS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 22.5,
        "pretDelivery": 26.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 22,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 22.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 26,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 26.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "3_COUNTRY_WINGS",
        "denumire": "3 COUNTRY WINGS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 15,
        "pretDelivery": 17.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 17,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 17.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "5_COUNTRY_WINGS",
        "denumire": "5 COUNTRY WINGS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 21.5,
        "pretDelivery": 28,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 21,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 21.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 27.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 28,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "7_COUNTRY_WINGS",
        "denumire": "7 COUNTRY WINGS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 27,
        "pretDelivery": 31,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 26.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 27,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 30.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 31,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "9_COUNTRY_WINGS",
        "denumire": "9 COUNTRY WINGS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 32,
        "pretDelivery": 36.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 31.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 32,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 36,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 36.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "3_HOT_COUNTRY_WINGS",
        "denumire": "3 HOT COUNTRY WINGS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 15,
        "pretDelivery": 17.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 17,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 17.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "5_HOT_COUNTRY_WINGS",
        "denumire": "5 HOT COUNTRY WINGS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 21.5,
        "pretDelivery": 28,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 21,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 21.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 27.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 28,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "7_HOT_COUNTRY_WINGS",
        "denumire": "7 HOT COUNTRY WINGS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 27,
        "pretDelivery": 31,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 26.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 27,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 30.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 31,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "9_HOT_COUNTRY_WINGS",
        "denumire": "9 HOT COUNTRY WINGS",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 32,
        "pretDelivery": 36.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 31.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 32,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 36,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 36.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CRISPY_3_180_G",
        "denumire": "HOMESTYLE CRISPY 3 (180G)",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 18.5,
        "pretDelivery": 21,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 18,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 18.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 20.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 21,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CRISPY_4_240_G",
        "denumire": "HOMESTYLE CRISPY 4 (240G)",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 24.5,
        "pretDelivery": 28.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 24,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 24.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 28,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 28.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CRISPY_5_300_G",
        "denumire": "HOMESTYLE CRISPY 5 (300G)",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 30.5,
        "pretDelivery": 34.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 30,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 30.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 34,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 34.5,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PACK_HOMESTYLE_CRISPY_20_1200_G",
        "denumire": "PACK HOMESTYLE CRISPY 20 (1200G)",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 101.24,
        "pretDelivery": 121.24,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 100,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 101.24,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 120,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 121.24,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PACK_COUNTRY_WINGS_30_1050_G",
        "denumire": "PACK COUNTRY WINGS 30 (1050G)",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 101.24,
        "pretDelivery": 121.24,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 100,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 101.24,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 120,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 121.24,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PACK_COUNTRY_HOT_WINGS_30_1050_G",
        "denumire": "PACK COUNTRY HOT WINGS 30 (1050G)",
        "categorie": "FRIED CHICKEN",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 101.24,
        "pretDelivery": 121.24,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 100,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 101.24,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 120,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 121.24,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "REALLY_CRUNCHY_FRIES_170_G",
        "denumire": "REALLY CRUNCHY FRIES 170G",
        "categorie": "FRIES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 12.4,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 11.9,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 12.4,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "CARTOFI_CRISS_CUT_140_G",
        "denumire": "CARTOFI CRISS CUT 140G",
        "categorie": "FRIES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 15.5,
        "pretDelivery": 14.15,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 13.65,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.15,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_112_G",
        "denumire": "Cartofi prajiti in ulei de alune 112g",
        "categorie": "FRIES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretDelivery": 14.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14.49,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_150_G",
        "denumire": "Cartofi prajiti in ulei de alune 150g",
        "categorie": "FRIES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretDelivery": 16.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16.49,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 16.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_SUPERSIZE_250_G",
        "denumire": "Cartofi prajiti in ulei de alune SuperSize 250g",
        "categorie": "FRIES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretDelivery": 23.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 23.49,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 23.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MAC_CHEESY_BITES",
        "denumire": "MAC & CHEESY BITES",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 16.5,
        "pretDelivery": 16.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 16.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16.5,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SALATA_COLESLAW",
        "denumire": "SALATA COLESLAW",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 10.25,
        "pretDelivery": 10.25,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.25,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 10,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 10.25,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ADD_BACON",
        "denumire": "ADD Bacon",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 5,
        "pretDelivery": 2,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 2,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ADD_FELIE_CHEDDAR",
        "denumire": "ADD Felie Cheddar",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 3,
        "pretDelivery": 3,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 3,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PUNGA",
        "denumire": "Punga",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 1.5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 1,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 1.5,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "PUNGA_MICA",
        "denumire": "Punga Mica",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 0.75,
        "pretDelivery": 0.75,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 0.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 0.75,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 0.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 0.75,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SACOSA",
        "denumire": "Sacosa",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 2,
        "pretDelivery": 2,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 1.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 2,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 1.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 2,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ADD_JALAPENO",
        "denumire": "ADD Jalapeno",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 2,
        "pretDelivery": 2,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 2,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "EXTRA_HOMESTYLE_CRISPY",
        "denumire": "Extra Homestyle Crispy",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 7,
        "pretDelivery": 7,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 7,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 7,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "FRY_SHAKER_PARMEZAN_USTUROI",
        "denumire": "Fry Shaker Parmezan & Usturoi",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 5,
        "pretDelivery": 5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 5,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "FRY_SHAKER_CAJUN",
        "denumire": "Fry Shaker Cajun",
        "categorie": "SNACK",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 5,
        "pretDelivery": 5,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 5,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SOS_TRUFFLE_MAYO",
        "denumire": "Sos Truffle Mayo",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 6.1,
        "pretDelivery": 6.1,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 6,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 6.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 6,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 6.1,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SOS_SAMURAI",
        "denumire": "Sos Samurai",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 6.1,
        "pretDelivery": 6.1,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 6,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 6.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 6,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 6.1,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SOS_USTUROI",
        "denumire": "Sos Usturoi",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 6.1,
        "pretDelivery": 6.1,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 6,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 6.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 6,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 6.1,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SIDE_CHEDDAR_40_ML",
        "denumire": "Side Cheddar 40 ml",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 6.1,
        "pretDelivery": 6.6,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 6,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 6.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 6.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 6.6,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SIDE_FRYRANCH_40_G",
        "denumire": "SIDE FRYRANCH 40G",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 6,
        "pretDelivery": 6.1,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 6,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 6.1,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SOS_KETCHUP_10_ML",
        "denumire": "Sos Ketchup 10ml",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 3.1,
        "pretDelivery": 3.6,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 3,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 3.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 3.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 3.6,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SOS_MAYONEZA_10_ML",
        "denumire": "Sos Mayoneza 10ml",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 3.1,
        "pretDelivery": 3.6,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 3,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 3.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 3.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 3.6,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SOS_BARBEQUE_25_G",
        "denumire": "Sos Barbeque 25G",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 5.1,
        "pretDelivery": 5.3,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 5.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 5.2,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 5.3,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SOS_HONEY_MUSTARD_25_G",
        "denumire": "Sos HONEY MUSTARD 25G",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 5.1,
        "pretDelivery": 5.3,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 5.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 5.2,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 5.3,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "SOS_SWEET_CHILLI_25_G",
        "denumire": "Sos SWEET CHILLI 25G",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 5.1,
        "pretDelivery": 5.3,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 5.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 5.2,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 5.3,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "2_X_SOS_KETCHUP_10_ML_MAYONEZA_10_ML",
        "denumire": "2X Sos Ketchup 10ml/Mayoneza 10ml",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 5.1,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 5.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "DIP_N_CHEDDAR_100_ML",
        "denumire": "DIP N Cheddar 100 ML",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14.08,
        "pretDelivery": 14.08,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13.98,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 14.08,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 13.98,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.08,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DIP_N_FRYRANCH_100_G",
        "denumire": "DIP N FRYRANCH 100G",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14.08,
        "pretDelivery": 14.08,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13.98,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 14.08,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 13.98,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.08,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DIP_N_FRYRANCH_250_G",
        "denumire": "DIP N FRYRANCH 250G",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 25.1,
        "pretDelivery": 25.1,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 25,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 25.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 25,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 25.1,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DIP_N_FRYRANCH_400_G",
        "denumire": "DIP N FRYRANCH 400G",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 35.1,
        "pretDelivery": 35.1,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 35,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 35.1,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 35,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 35.1,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DIP_N_TRUFFLE_100_G",
        "denumire": "DIP N TRUFFLE 100G",
        "categorie": "SAUCES",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14.08,
        "pretDelivery": 14.08,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13.98,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 14.08,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 13.98,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.08,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "APPLE_PIE_TOFFIE",
        "denumire": "APPLE PIE TOFFIE",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 10,
        "pretDelivery": 10.9
      },
      {
        "cod": "NUTELLA_BURGER",
        "denumire": "Nutella Burger",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 10,
        "pretDelivery": 12,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 12,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "NUTELLA_BURGER_CAPSUNI",
        "denumire": "Nutella Burger Capsuni",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 12,
        "pretDelivery": 14,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 12,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "NUTELLA_BURGER_BANANE",
        "denumire": "Nutella Burger Banane",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 12,
        "pretDelivery": 14,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 12,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MILKSHAKE_BISCOFF_300_G",
        "denumire": "Milkshake Biscoff 300G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 18
      },
      {
        "cod": "MILKSHAKE_APPLE_CINNAMON_300_G",
        "denumire": "Milkshake Apple Cinnamon 300G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 18
      },
      {
        "cod": "MILKSHAKE_VANILIE_300_G",
        "denumire": "Milkshake Vanilie 300G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 18
      },
      {
        "cod": "MILKSHAKE_BANANE_300_G",
        "denumire": "Milkshake Banane 300G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 18
      },
      {
        "cod": "MILKSHAKE_CAPSUNI_300_G",
        "denumire": "Milkshake Capsuni 300G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 18
      },
      {
        "cod": "MILKSHAKE_CIOCOLATA_300_G",
        "denumire": "Milkshake Ciocolata 300G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 18
      },
      {
        "cod": "APPLE_PIE_TOFFIE_2_X",
        "denumire": "APPLE PIE TOFFIE 2X",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 15,
        "pretDelivery": 15
      },
      {
        "cod": "ADD_ON_NUTELLA",
        "denumire": "ADD-ON Nutella",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 3,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 3,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "ADD_ON_BANANE",
        "denumire": "ADD-ON Banane",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 3,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 3,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "TOPPING_BISCOFF",
        "denumire": "Topping Biscoff",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 4,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 4,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "TOPPING_OREO",
        "denumire": "Topping Oreo",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 4,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 4,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "TOPPING_KITKAT",
        "denumire": "Topping KitKat",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 4,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 4,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "TOPPING_APPLE_CINNAMON",
        "denumire": "Topping Apple Cinnamon",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 3,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 3,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "ADD_NUTELLA_MILKSHAKE",
        "denumire": "Add Nutella Milkshake",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 3
      },
      {
        "cod": "ADD_ON_CAPSUNI",
        "denumire": "ADD-ON Capsuni",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 3,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 3,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "MILKSHAKE_VANILIE_200_G",
        "denumire": "Milkshake Vanilie 200G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 12,
        "pretDelivery": 14,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 12,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MILKSHAKE_CIOCOLATA_200_G",
        "denumire": "Milkshake Ciocolata 200G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14,
        "pretDelivery": 16,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MILKSHAKE_CAPSUNI_200_G",
        "denumire": "Milkshake Capsuni 200G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14,
        "pretDelivery": 16,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MILKSHAKE_BANANE_200_G",
        "denumire": "Milkshake Banane 200G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14,
        "pretDelivery": 16,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MILKSHAKE_BISCOFF_210_G",
        "denumire": "Milkshake Biscoff 210G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14,
        "pretDelivery": 16,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MILKSHAKE_APPLE_CINNAMON_220_G",
        "denumire": "Milkshake Apple Cinnamon 220G",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 14,
        "pretDelivery": 16,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MILKSHAKE_CIRESE_CAN",
        "denumire": "Milkshake Cirese CAN",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretDelivery": 16
      },
      {
        "cod": "MILKSHAKE_FRUCTUL_PASIUNII_CAN",
        "denumire": "Milkshake Fructul Pasiunii CAN",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretDelivery": 16
      },
      {
        "cod": "APFELSTORM_X_TOFFEE",
        "denumire": "ApfelStorm X Toffee",
        "categorie": "MILKSHAKE & DESSERT",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 19.9,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 19.9,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_2",
        "denumire": "Pepsi /PEPSI ZERO/7UP ZERO/MIRINDA ZERO/LIPTON 250ML",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 7
      },
      {
        "cod": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_5",
        "denumire": "Pepsi /PEPSI ZERO/7UP ZERO/MIRINDA ZERO/LIPTON 500ML",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10
      },
      {
        "cod": "APA_PLATA_AQUA_CARPATICA",
        "denumire": "Apa Plata AQUA CARPATICA",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10.99,
        "pretDelivery": 11.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 11,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 11.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "APA_MINERALA_AQUA_CARPATICA",
        "denumire": "Apa Minerala AQUA CARPATICA",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10.99,
        "pretDelivery": 11.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 11,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 11.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PRIGAT_PORTOCALE_CAPSUNI_BANANE",
        "denumire": "Prigat Portocale/Capsuni &Banane",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10.99,
        "pretDelivery": 12.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 12,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 12.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DR_PEPPER",
        "denumire": "Dr Pepper",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 11.99,
        "pretDelivery": 12.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 11,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 11.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 12,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 12.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "RED_BULL",
        "denumire": "Red Bull",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 15.99,
        "pretDelivery": 17.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 17,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 17.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CORONA",
        "denumire": "Corona",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 15,
        "pretDelivery": 19.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 19,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 19.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "BUDWEISER",
        "denumire": "Budweiser",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 15,
        "pretDelivery": 18.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 18.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "APA_EVIAN",
        "denumire": "Apa Evian",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 15.99,
        "pretDelivery": 17.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 17,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 17.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "FRYZZZ_CAPSUNI",
        "denumire": "FRYZZZ CAPSUNI",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 13.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "FRYZZZ_GRAPEFRUIT",
        "denumire": "FRYZZZ GRAPEFRUIT",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 13.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "FRYZZZ_PINACOLADA",
        "denumire": "FRYZZZ PINACOLADA",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 13.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "FRYZZZ_PEPENE_ROSU",
        "denumire": "FRYZZZ PEPENE ROSU",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 13.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "PEPSI_CU_GUST_DE_C_P_UNI_I_FRI_C",
        "denumire": "Pepsi cu gust de Căpșuni și Frișcă",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10.49,
        "pretDelivery": 10.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 9.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.49,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 9.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 10.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PEPSI_CU_GUST_DE_NGHE_AT_DE_VANILIE",
        "denumire": "Pepsi cu gust de Înghețată de Vanilie",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10.49,
        "pretDelivery": 10.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 9.5,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.49,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 9.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 10.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DOZA_PEPSI_ZERO",
        "denumire": "DOZA PEPSI ZERO",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretDelivery": 5.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 5.49,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "DOZE_PEPSI_330_ML_TWIST_ZERO_330_ML_7_UP_330_ML_",
        "denumire": "DOZE PEPSI 330 ML/TWIST ZERO 330 ML/7UP 330 ML/MIRINDA PORTOCALE 330 ML",
        "categorie": "DRINKS",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretDelivery": 10.49,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 9.5,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 10.49,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "TORT_CIOCOLATA_ZMEURA",
        "denumire": "Tort ciocolata zmeura",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 18,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PROFITEROL_CIOCOLATA",
        "denumire": "Profiterol ciocolata",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 15,
        "pretDelivery": 16,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CARROT_CAKE",
        "denumire": "CARROT CAKE",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 18,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "TORT_PUFOS_CAPSUNI",
        "denumire": "Tort pufos capsuni",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 18,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PRAJITURA_VANILIE_BEZEA",
        "denumire": "Prajitura vanilie bezea",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 15,
        "pretDelivery": 16,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "TIRAMISU",
        "denumire": "TIRAMISU",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 18,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PRAJITURA_MASCARPONE_CAPSUNI",
        "denumire": "Prajitura mascarpone capsuni",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 18,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "PRAJITURA_MARITOZZO",
        "denumire": "Prajitura Maritozzo",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 18,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MILLEFOGLIE",
        "denumire": "Millefoglie",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 17,
        "pretDelivery": 18,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 17,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 18,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ESPRESSO",
        "denumire": "Espresso",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 8.99,
        "pretDelivery": 9.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 8,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 8.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 9,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 9.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ESPRESSO_GRANDE",
        "denumire": "Espresso Grande",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10.99,
        "pretDelivery": 11.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 11,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 11.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "LATTE_MACHIATO",
        "denumire": "Latte Machiato",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 13.99,
        "pretDelivery": 14.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "AMERICANO",
        "denumire": "Americano",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10.99,
        "pretDelivery": 11.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 11,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 11.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "AMERICANO_GRANDE",
        "denumire": "Americano Grande",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 12.99,
        "pretDelivery": 14.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 12,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 12.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CAPPUCINO",
        "denumire": "Cappucino",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 12.99,
        "pretDelivery": 13.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 12,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 12.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 13,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CAPPUCINO_GRANDE",
        "denumire": "Cappucino Grande",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 14.99,
        "pretDelivery": 15.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 15,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 15.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CAFFE_LATTE",
        "denumire": "Caffe Latte",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 12.99,
        "pretDelivery": 14.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 12,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 12.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CAFFE_LATTE_GRANDE",
        "denumire": "Caffe Latte Grande",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 14.99,
        "pretDelivery": 15.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 14,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 15,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 15.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CIOCO_CAPPUCINO",
        "denumire": "Cioco Cappucino",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 13.99,
        "pretDelivery": 14.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CIOCO_CAPPUCINO_GRANDE",
        "denumire": "Cioco Cappucino Grande",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 15.99,
        "pretDelivery": 16.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 16.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "VANILLA_LATTE",
        "denumire": "Vanilla Latte",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 13.99,
        "pretDelivery": 14.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 14,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 14.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "VANILLA_LATTE_GRANDE",
        "denumire": "Vanilla Latte Grande",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 15.99,
        "pretDelivery": 16.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 16.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "CARAMEL_MACHIATO",
        "denumire": "Caramel Machiato",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 15.99,
        "pretDelivery": 16.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 15,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 15.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 16,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-08-03",
            "canal": "DELIVERY",
            "pret": 16.99,
            "nota": "etapa 03.08.2026 (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "ICED_COFFEE_LATTE",
        "denumire": "ICED COFFEE LATTE",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 13.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 13,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 13.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "LIMONADA_350_ML",
        "denumire": "LIMONADA 350ML",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretInstore": 10.99,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 10,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-08-03",
            "canal": "INSTORE",
            "pret": 10.99,
            "nota": "etapa 03.08.2026 (CR–IT)"
          }
        ]
      },
      {
        "cod": "LIMONADA_400_ML",
        "denumire": "LIMONADA 400ML",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 21,
        "activ": true,
        "pretDelivery": 12.99
      },
      {
        "cod": "CHEESECAKE_NEWYORK",
        "denumire": "CHEESECAKE NEWYORK",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 20,
        "pretDelivery": 21,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 20,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 21,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "TIRAMISU_CU_FISTIC",
        "denumire": "TIRAMISU CU FISTIC",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 20,
        "pretDelivery": 21,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 20,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 21,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "MANDARINA_CU_SORBET",
        "denumire": "MANDARINA CU SORBET",
        "categorie": "FRYCAFE",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 21,
        "pretDelivery": 21,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 21,
            "nota": "preț anterior (CR–IT)"
          }
        ]
      },
      {
        "cod": "JUNIOR_MEAL_HAMBURGER",
        "denumire": "Junior Meal Hamburger",
        "categorie": "JUNIOR",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 39,
        "pretDelivery": 39,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 39,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 39,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 39,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "JUNIOR_MEAL_PUI_BURGER",
        "denumire": "Junior Meal Pui Burger",
        "categorie": "JUNIOR",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 39,
        "pretDelivery": 39,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 39,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 39,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 39,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      },
      {
        "cod": "JUNIOR_MEAL_4_NUGGETS",
        "denumire": "Junior Meal 4 Nuggets",
        "categorie": "JUNIOR",
        "tip": "SIMPLU",
        "tva": 11,
        "activ": true,
        "pretInstore": 39,
        "pretDelivery": 39,
        "istoricPret": [
          {
            "data": "2026-07-01",
            "canal": "INSTORE",
            "pret": 39,
            "nota": "preț anterior (CR–IT)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 39,
            "nota": "preț anterior (UPDATE delivery)"
          },
          {
            "data": "2026-07-01",
            "canal": "DELIVERY",
            "pret": 39,
            "nota": "preț anterior (UPDATE delivery)"
          }
        ]
      }
    ],
    "retete": [
      {
        "cod": "HAMBURGER",
        "tip": "PRODUS",
        "denumire": "HAMBURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700655",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702052",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702048",
                "tipComp": "INGREDIENT",
                "cant": 0.7,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 2.8,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000142",
                "tipComp": "INGREDIENT",
                "cant": 5,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DUBLU_HAMBURGER",
        "tip": "PRODUS",
        "denumire": "DUBLU HAMBURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000140",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702052",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702048",
                "tipComp": "INGREDIENT",
                "cant": 1.4,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000142",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CHEESEBURGER",
        "tip": "PRODUS",
        "denumire": "CHEESEBURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700655",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702052",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702048",
                "tipComp": "INGREDIENT",
                "cant": 0.7,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000142",
                "tipComp": "INGREDIENT",
                "cant": 5,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 2.8,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DUBLU_CHEESEBURGER",
        "tip": "PRODUS",
        "denumire": "DUBLU CHEESEBURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000140",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702052",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702048",
                "tipComp": "INGREDIENT",
                "cant": 1.4,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000142",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "AMERICAN_CHEESEBURGER",
        "tip": "PRODUS",
        "denumire": "AMERICAN CHEESEBURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000141",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "AMERICAN_DUBLU_CHEESEBURGER",
        "tip": "PRODUS",
        "denumire": "AMERICAN DUBLU CHEESEBURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000140",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "AMERICAN_TRIPLU_CHEESEBURGER",
        "tip": "PRODUS",
        "denumire": "AMERICAN TRIPLU CHEESEBURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000140",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SMASHED_BURGER",
        "tip": "PRODUS",
        "denumire": "SMASHED BURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000142",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702624",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "NOU-SOSREAL",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DUBLU_SMASHED_BURGER",
        "tip": "PRODUS",
        "denumire": "DUBLU SMASHED BURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000142",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702624",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "NOU-SOSREAL",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "BLACK_TRUFFLE_SMASHED",
        "tip": "PRODUS",
        "denumire": "BLACK TRUFFLE SMASHED",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702607",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702511",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "701035",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DUBLU_BLACK_TRUFFLE_SMASHED",
        "tip": "PRODUS",
        "denumire": "DUBLU BLACK TRUFFLE SMASHED",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702607",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702511",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "701035",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "RED_PEPPER_SMASHED",
        "tip": "PRODUS",
        "denumire": "RED PEPPER SMASHED",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702514",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "701035",
                "tipComp": "INGREDIENT",
                "cant": 7.5,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "60602",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4003",
                "tipComp": "INGREDIENT",
                "cant": 28,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702556",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DUBLU_RED_PEPPER_SMASHED",
        "tip": "PRODUS",
        "denumire": "DUBLU RED PEPPER SMASHED",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702514",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "701035",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "60602",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4003",
                "tipComp": "INGREDIENT",
                "cant": 28,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702556",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "AMERICAN_TRIPLU_CHEESEBURGER_LETTUCE_WRAP",
        "tip": "PRODUS",
        "denumire": "AMERICAN TRIPLU CHEESEBURGER LETTUCE WRAP",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000144",
                "tipComp": "INGREDIENT",
                "cant": 0.33,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000141",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PUI_BURGER",
        "tip": "PRODUS",
        "denumire": "PUI BURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700655",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "4063",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DUBLU_PUI_BURGER",
        "tip": "PRODUS",
        "denumire": "DUBLU PUI BURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700653",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "4063",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "4056",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_PESTO",
        "tip": "PRODUS",
        "denumire": "HOMESTYLE CHICKEN PESTO",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000103",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700963",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000143",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702367",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_LEMON",
        "tip": "PRODUS",
        "denumire": "HOMESTYLE CHICKEN LEMON",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000103",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702122",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000143",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702367",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_RANCH",
        "tip": "PRODUS",
        "denumire": "HOMESTYLE CHICKEN RANCH",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000103",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000024",
                "tipComp": "INGREDIENT",
                "cant": 50,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000001",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702367",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CHICKEN_TRUFFLE",
        "tip": "PRODUS",
        "denumire": "CHICKEN TRUFFLE",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702511",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "701035",
                "tipComp": "INGREDIENT",
                "cant": 7.5,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "700653",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DUBLU_CHICKEN_TRUFFLE",
        "tip": "PRODUS",
        "denumire": "DUBLU CHICKEN TRUFFLE",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702511",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "701035",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "700653",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CHICKEN_FRYRANCH_XREMUS",
        "tip": "PRODUS",
        "denumire": "Chicken FryRanch XRemus",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000024",
                "tipComp": "INGREDIENT",
                "cant": 50,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000001",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_FRYRANCH_LETTUCE_WRAP",
        "tip": "PRODUS",
        "denumire": "HOMESTYLE CHICKEN FRYRANCH LETTUCE WRAP",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000144",
                "tipComp": "INGREDIENT",
                "cant": 0.33,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000103",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000024",
                "tipComp": "INGREDIENT",
                "cant": 50,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000001",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702367",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CHICKEN_LEMON_LETTUCE_WRAP",
        "tip": "PRODUS",
        "denumire": "HOMESTYLE CHICKEN LEMON LETTUCE WRAP",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000144",
                "tipComp": "INGREDIENT",
                "cant": 0.33,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000103",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702122",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000143",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702367",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702507",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TRIPLU_PUI_BURGER",
        "tip": "PRODUS",
        "denumire": "TRIPLU PUI BURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700653",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 60,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "4063",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "4056",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TRIPLU_CHICKEN_TRUFFLE",
        "tip": "PRODUS",
        "denumire": "TRIPLU CHICKEN TRUFFLE",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 60,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702511",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "701035",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "700653",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ALMETTE_FRESH_PUI",
        "tip": "PRODUS",
        "denumire": "ALMETTE FRESH PUI",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702633",
                "tipComp": "INGREDIENT",
                "cant": 50,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "60602",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000143",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ALMETTE_BASIL_PUI",
        "tip": "PRODUS",
        "denumire": "ALMETTE BASIL PUI",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702631",
                "tipComp": "INGREDIENT",
                "cant": 50,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 29,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "60602",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000143",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ALMETTE_FRESH_PORC",
        "tip": "PRODUS",
        "denumire": "ALMETTE FRESH PORC",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702633",
                "tipComp": "INGREDIENT",
                "cant": 50,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702458",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "60602",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000143",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ALMETTE_BASIL_PORC",
        "tip": "PRODUS",
        "denumire": "ALMETTE BASIL PORC",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702631",
                "tipComp": "INGREDIENT",
                "cant": 50,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702458",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "60602",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000143",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ROSTI_SAUSAGE_BURGER",
        "tip": "PRODUS",
        "denumire": "ROSTI SAUSAGE BURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702414",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702458",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700968",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 11.2,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SHRIMP_BURGER",
        "tip": "PRODUS",
        "denumire": "SHRIMP BURGER",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702263",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702314",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000143",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702471",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "BURGER_VEGETARIAN",
        "tip": "PRODUS",
        "denumire": "BURGER VEGETARIAN",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4080",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702052",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "4063",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "4056",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "4_NUGGETS",
        "tip": "PRODUS",
        "denumire": "4 NUGGETS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4083",
                "tipComp": "INGREDIENT",
                "cant": 4,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 16,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "5046",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "6_NUGGETS",
        "tip": "PRODUS",
        "denumire": "6 NUGGETS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4083",
                "tipComp": "INGREDIENT",
                "cant": 6,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 24,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "5046",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702052",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "9_NUGGETS",
        "tip": "PRODUS",
        "denumire": "9 NUGGETS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4083",
                "tipComp": "INGREDIENT",
                "cant": 9,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 36,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "5046",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702052",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "DELIVERY"
              },
              {
                "comp": "4063",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "3_COUNTRY_WINGS",
        "tip": "PRODUS",
        "denumire": "3 COUNTRY WINGS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702587",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700970",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "5_COUNTRY_WINGS",
        "tip": "PRODUS",
        "denumire": "5 COUNTRY WINGS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702587",
                "tipComp": "INGREDIENT",
                "cant": 5,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700970",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "7_COUNTRY_WINGS",
        "tip": "PRODUS",
        "denumire": "7 COUNTRY WINGS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702587",
                "tipComp": "INGREDIENT",
                "cant": 7,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 28,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700970",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "9_COUNTRY_WINGS",
        "tip": "PRODUS",
        "denumire": "9 COUNTRY WINGS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702587",
                "tipComp": "INGREDIENT",
                "cant": 9,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 36,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700970",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "3_HOT_COUNTRY_WINGS",
        "tip": "PRODUS",
        "denumire": "3 HOT COUNTRY WINGS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702586",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700971",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "5_HOT_COUNTRY_WINGS",
        "tip": "PRODUS",
        "denumire": "5 HOT COUNTRY WINGS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702586",
                "tipComp": "INGREDIENT",
                "cant": 5,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700971",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "7_HOT_COUNTRY_WINGS",
        "tip": "PRODUS",
        "denumire": "7 HOT COUNTRY WINGS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702586",
                "tipComp": "INGREDIENT",
                "cant": 7,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 28,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700971",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "9_HOT_COUNTRY_WINGS",
        "tip": "PRODUS",
        "denumire": "9 HOT COUNTRY WINGS",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702586",
                "tipComp": "INGREDIENT",
                "cant": 9,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 36,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "700971",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CRISPY_3_180_G",
        "tip": "PRODUS",
        "denumire": "HOMESTYLE CRISPY 3 (180G)",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000018",
                "tipComp": "INGREDIENT",
                "cant": 3,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 18,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "5046",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CRISPY_4_240_G",
        "tip": "PRODUS",
        "denumire": "HOMESTYLE CRISPY 4 (240G)",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000018",
                "tipComp": "INGREDIENT",
                "cant": 4,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 24,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "5046",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "HOMESTYLE_CRISPY_5_300_G",
        "tip": "PRODUS",
        "denumire": "HOMESTYLE CRISPY 5 (300G)",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000018",
                "tipComp": "INGREDIENT",
                "cant": 5,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "5046",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PACK_HOMESTYLE_CRISPY_20_1200_G",
        "tip": "PRODUS",
        "denumire": "PACK HOMESTYLE CRISPY 20 (1200G)",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000018",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 120,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000015",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PACK_COUNTRY_WINGS_30_1050_G",
        "tip": "PRODUS",
        "denumire": "PACK COUNTRY WINGS 30 (1050G)",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702587",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 120,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000015",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PACK_COUNTRY_HOT_WINGS_30_1050_G",
        "tip": "PRODUS",
        "denumire": "PACK COUNTRY HOT WINGS 30 (1050G)",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702586",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 120,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000015",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5054",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "REALLY_CRUNCHY_FRIES_170_G",
        "tip": "PRODUS",
        "denumire": "REALLY CRUNCHY FRIES 170G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702037",
                "tipComp": "INGREDIENT",
                "cant": 243,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 18.28,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000151",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CARTOFI_CRISS_CUT_140_G",
        "tip": "PRODUS",
        "denumire": "CARTOFI CRISS CUT 140G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000163",
                "tipComp": "INGREDIENT",
                "cant": 243,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000151",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 18.28,
                "um": "ml",
                "canal": "INSTORE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 18.281,
                "um": "ml",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_112_G",
        "tip": "PRODUS",
        "denumire": "Cartofi prajiti in ulei de alune 112g",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702037",
                "tipComp": "INGREDIENT",
                "cant": 160,
                "um": "g",
                "canal": "DELIVERY"
              },
              {
                "comp": "702316",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "ml",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_150_G",
        "tip": "PRODUS",
        "denumire": "Cartofi prajiti in ulei de alune 150g",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702317",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 40.2,
                "um": "ml",
                "canal": "DELIVERY"
              },
              {
                "comp": "702037",
                "tipComp": "INGREDIENT",
                "cant": 300,
                "um": "g",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_SUPERSIZE_250_G",
        "tip": "PRODUS",
        "denumire": "Cartofi prajiti in ulei de alune SuperSize 250g",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702037",
                "tipComp": "INGREDIENT",
                "cant": 358,
                "um": "g",
                "canal": "DELIVERY"
              },
              {
                "comp": "702318",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 27,
                "um": "ml",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "MAC_CHEESY_BITES",
        "tip": "PRODUS",
        "denumire": "MAC & CHEESY BITES",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702088-MAC",
                "tipComp": "INGREDIENT",
                "cant": 7,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 21,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "5046",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SALATA_COLESLAW",
        "tip": "PRODUS",
        "denumire": "SALATA COLESLAW",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000024",
                "tipComp": "INGREDIENT",
                "cant": 125,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000016",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000017",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ADD_BACON",
        "tip": "PRODUS",
        "denumire": "ADD Bacon",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4003",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ADD_FELIE_CHEDDAR",
        "tip": "PRODUS",
        "denumire": "ADD Felie Cheddar",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000123",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PUNGA",
        "tip": "PRODUS",
        "denumire": "Punga",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702147",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PUNGA_MICA",
        "tip": "PRODUS",
        "denumire": "Punga Mica",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702146",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SACOSA",
        "tip": "PRODUS",
        "denumire": "Sacosa",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702237",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ADD_JALAPENO",
        "tip": "PRODUS",
        "denumire": "ADD Jalapeno",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4028",
                "tipComp": "INGREDIENT",
                "cant": 6,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "EXTRA_HOMESTYLE_CRISPY",
        "tip": "PRODUS",
        "denumire": "Extra Homestyle Crispy",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000018",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 6,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "FRY_SHAKER_PARMEZAN_USTUROI",
        "tip": "PRODUS",
        "denumire": "Fry Shaker Parmezan & Usturoi",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000167",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000168",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "FRY_SHAKER_CAJUN",
        "tip": "PRODUS",
        "denumire": "Fry Shaker Cajun",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000167",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000169",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SOS_TRUFFLE_MAYO",
        "tip": "PRODUS",
        "denumire": "Sos Truffle Mayo",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702103",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SOS_SAMURAI",
        "tip": "PRODUS",
        "denumire": "Sos Samurai",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702102",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SOS_USTUROI",
        "tip": "PRODUS",
        "denumire": "Sos Usturoi",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702104",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SIDE_CHEDDAR_40_ML",
        "tip": "PRODUS",
        "denumire": "Side Cheddar 40 ml",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4064",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "701042",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "701043",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SIDE_FRYRANCH_40_G",
        "tip": "PRODUS",
        "denumire": "SIDE FRYRANCH 40G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000001",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "701042",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "701043",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SOS_KETCHUP_10_ML",
        "tip": "PRODUS",
        "denumire": "Sos Ketchup 10ml",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000126",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SOS_MAYONEZA_10_ML",
        "tip": "PRODUS",
        "denumire": "Sos Mayoneza 10ml",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000128",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SOS_BARBEQUE_25_G",
        "tip": "PRODUS",
        "denumire": "Sos Barbeque 25G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702230",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SOS_HONEY_MUSTARD_25_G",
        "tip": "PRODUS",
        "denumire": "Sos HONEY MUSTARD 25G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000125",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "SOS_SWEET_CHILLI_25_G",
        "tip": "PRODUS",
        "denumire": "Sos SWEET CHILLI 25G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000124",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "2_X_SOS_KETCHUP_10_ML_MAYONEZA_10_ML",
        "tip": "PRODUS",
        "denumire": "2X Sos Ketchup 10ml/Mayoneza 10ml",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000126",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DIP_N_CHEDDAR_100_ML",
        "tip": "PRODUS",
        "denumire": "DIP N Cheddar 100 ML",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "5032",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "701043",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4064",
                "tipComp": "INGREDIENT",
                "cant": 100,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DIP_N_FRYRANCH_100_G",
        "tip": "PRODUS",
        "denumire": "DIP N FRYRANCH 100G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000001",
                "tipComp": "INGREDIENT",
                "cant": 100,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000003",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "701043",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DIP_N_FRYRANCH_250_G",
        "tip": "PRODUS",
        "denumire": "DIP N FRYRANCH 250G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000001",
                "tipComp": "INGREDIENT",
                "cant": 250,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000004",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000006",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DIP_N_FRYRANCH_400_G",
        "tip": "PRODUS",
        "denumire": "DIP N FRYRANCH 400G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000001",
                "tipComp": "INGREDIENT",
                "cant": 400,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000005",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000006",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DIP_N_TRUFFLE_100_G",
        "tip": "PRODUS",
        "denumire": "DIP N TRUFFLE 100G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702511",
                "tipComp": "INGREDIENT",
                "cant": 100,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000002",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "701043",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "APPLE_PIE_TOFFIE",
        "tip": "PRODUS",
        "denumire": "APPLE PIE TOFFIE",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000166",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 50,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000182",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "NUTELLA_BURGER",
        "tip": "PRODUS",
        "denumire": "Nutella Burger",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4041",
                "tipComp": "INGREDIENT",
                "cant": 35,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "NUTELLA_BURGER_CAPSUNI",
        "tip": "PRODUS",
        "denumire": "Nutella Burger Capsuni",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4041",
                "tipComp": "INGREDIENT",
                "cant": 35,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700681",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "697190",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "NUTELLA_BURGER_BANANE",
        "tip": "PRODUS",
        "denumire": "Nutella Burger Banane",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4041",
                "tipComp": "INGREDIENT",
                "cant": 35,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5028",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "697191",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "700682",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_BISCOFF_300_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Biscoff 300G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "700158",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702512",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_APPLE_CINNAMON_300_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Apple Cinnamon 300G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "700158",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000011",
                "tipComp": "INGREDIENT",
                "cant": 80,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_VANILIE_300_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Vanilie 300G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "700158",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_BANANE_300_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Banane 300G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "700158",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702015",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_CAPSUNI_300_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Capsuni 300G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "700158",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702016",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_CIOCOLATA_300_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Ciocolata 300G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "700158",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4041",
                "tipComp": "INGREDIENT",
                "cant": 25,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "APPLE_PIE_TOFFIE_2_X",
        "tip": "PRODUS",
        "denumire": "APPLE PIE TOFFIE 2X",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000166",
                "tipComp": "INGREDIENT",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 100,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000182",
                "tipComp": "AMBALAJ",
                "cant": 2,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ADD_ON_NUTELLA",
        "tip": "PRODUS",
        "denumire": "ADD-ON Nutella",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4041",
                "tipComp": "INGREDIENT",
                "cant": 22.5,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ADD_ON_BANANE",
        "tip": "PRODUS",
        "denumire": "ADD-ON Banane",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "697191",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TOPPING_BISCOFF",
        "tip": "PRODUS",
        "denumire": "Topping Biscoff",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702512",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TOPPING_OREO",
        "tip": "PRODUS",
        "denumire": "Topping Oreo",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4077",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TOPPING_KITKAT",
        "tip": "PRODUS",
        "denumire": "Topping KitKat",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4073",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TOPPING_APPLE_CINNAMON",
        "tip": "PRODUS",
        "denumire": "Topping Apple Cinnamon",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000011",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ADD_NUTELLA_MILKSHAKE",
        "tip": "PRODUS",
        "denumire": "Add Nutella Milkshake",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4041",
                "tipComp": "INGREDIENT",
                "cant": 25,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ADD_ON_CAPSUNI",
        "tip": "PRODUS",
        "denumire": "ADD-ON Capsuni",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "697190",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_VANILIE_200_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Vanilie 200G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000230",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "INSTORE"
              },
              {
                "comp": "7000235",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_CIOCOLATA_200_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Ciocolata 200G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000230",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "INSTORE"
              },
              {
                "comp": "4041",
                "tipComp": "INGREDIENT",
                "cant": 25,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000235",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_CAPSUNI_200_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Capsuni 200G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000230",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "INSTORE"
              },
              {
                "comp": "702016",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000235",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_BANANE_200_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Banane 200G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000230",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702015",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_BISCOFF_210_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Biscoff 210G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000235",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702512",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "g",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_APPLE_CINNAMON_220_G",
        "tip": "PRODUS",
        "denumire": "Milkshake Apple Cinnamon 220G",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000230",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "INSTORE"
              },
              {
                "comp": "7000011",
                "tipComp": "INGREDIENT",
                "cant": 40,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000235",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_CIRESE_CAN",
        "tip": "PRODUS",
        "denumire": "Milkshake Cirese CAN",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000235",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILKSHAKE_FRUCTUL_PASIUNII_CAN",
        "tip": "PRODUS",
        "denumire": "Milkshake Fructul Pasiunii CAN",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000235",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "APFELSTORM_X_TOFFEE",
        "tip": "PRODUS",
        "denumire": "ApfelStorm X Toffee",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000181",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4033",
                "tipComp": "INGREDIENT",
                "cant": 140,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000166",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5042",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_2",
        "tip": "PRODUS",
        "denumire": "Pepsi /PEPSI ZERO/7UP ZERO/MIRINDA ZERO/LIPTON 250ML",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "697008",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702315",
                "tipComp": "INGREDIENT",
                "cant": 41.66,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_5",
        "tip": "PRODUS",
        "denumire": "Pepsi /PEPSI ZERO/7UP ZERO/MIRINDA ZERO/LIPTON 500ML",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702342",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702315",
                "tipComp": "INGREDIENT",
                "cant": 83.32,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "APA_PLATA_AQUA_CARPATICA",
        "tip": "PRODUS",
        "denumire": "Apa Plata AQUA CARPATICA",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "700977",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "APA_MINERALA_AQUA_CARPATICA",
        "tip": "PRODUS",
        "denumire": "Apa Minerala AQUA CARPATICA",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "701010",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PRIGAT_PORTOCALE_CAPSUNI_BANANE",
        "tip": "PRODUS",
        "denumire": "Prigat Portocale/Capsuni &Banane",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "3016",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DR_PEPPER",
        "tip": "PRODUS",
        "denumire": "Dr Pepper",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702261",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "RED_BULL",
        "tip": "PRODUS",
        "denumire": "Red Bull",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "3017",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CORONA",
        "tip": "PRODUS",
        "denumire": "Corona",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "1003",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "BUDWEISER",
        "tip": "PRODUS",
        "denumire": "Budweiser",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "701054",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "APA_EVIAN",
        "tip": "PRODUS",
        "denumire": "Apa Evian",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "3002",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "FRYZZZ_CAPSUNI",
        "tip": "PRODUS",
        "denumire": "FRYZZZ CAPSUNI",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "697054",
                "tipComp": "INGREDIENT",
                "cant": 2.48,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000012",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000013",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702138",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702016",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "FRYZZZ_GRAPEFRUIT",
        "tip": "PRODUS",
        "denumire": "FRYZZZ GRAPEFRUIT",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "697054",
                "tipComp": "INGREDIENT",
                "cant": 2.48,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000012",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000013",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702138",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "NOU-PIU-GRAP",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "FRYZZZ_PINACOLADA",
        "tip": "PRODUS",
        "denumire": "FRYZZZ PINACOLADA",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "697054",
                "tipComp": "INGREDIENT",
                "cant": 2.48,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000012",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000013",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702138",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "NOU-PIU-PINA",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "FRYZZZ_PEPENE_ROSU",
        "tip": "PRODUS",
        "denumire": "FRYZZZ PEPENE ROSU",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "697054",
                "tipComp": "INGREDIENT",
                "cant": 2.48,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000012",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000013",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702138",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "NOU-PIU-PEPE",
                "tipComp": "INGREDIENT",
                "cant": 30,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PEPSI_CU_GUST_DE_C_P_UNI_I_FRI_C",
        "tip": "PRODUS",
        "denumire": "Pepsi cu gust de Căpșuni și Frișcă",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000122",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PEPSI_CU_GUST_DE_NGHE_AT_DE_VANILIE",
        "tip": "PRODUS",
        "denumire": "Pepsi cu gust de Înghețată de Vanilie",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000121",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "DOZA_PEPSI_ZERO",
        "tip": "PRODUS",
        "denumire": "DOZA PEPSI ZERO",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702044",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "DOZE_PEPSI_330_ML_TWIST_ZERO_330_ML_7_UP_330_ML_",
        "tip": "PRODUS",
        "denumire": "DOZE PEPSI 330 ML/TWIST ZERO 330 ML/7UP 330 ML/MIRINDA PORTOCALE 330 ML",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "700657",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "TORT_CIOCOLATA_ZMEURA",
        "tip": "PRODUS",
        "denumire": "Tort ciocolata zmeura",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702171",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PROFITEROL_CIOCOLATA",
        "tip": "PRODUS",
        "denumire": "Profiterol ciocolata",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702175",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CARROT_CAKE",
        "tip": "PRODUS",
        "denumire": "CARROT CAKE",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702176",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TORT_PUFOS_CAPSUNI",
        "tip": "PRODUS",
        "denumire": "Tort pufos capsuni",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702178",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PRAJITURA_VANILIE_BEZEA",
        "tip": "PRODUS",
        "denumire": "Prajitura vanilie bezea",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702179",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TIRAMISU",
        "tip": "PRODUS",
        "denumire": "TIRAMISU",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702180",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PRAJITURA_MASCARPONE_CAPSUNI",
        "tip": "PRODUS",
        "denumire": "Prajitura mascarpone capsuni",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702181",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "PRAJITURA_MARITOZZO",
        "tip": "PRODUS",
        "denumire": "Prajitura Maritozzo",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702479",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MILLEFOGLIE",
        "tip": "PRODUS",
        "denumire": "Millefoglie",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000014",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ESPRESSO",
        "tip": "PRODUS",
        "denumire": "Espresso",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702035",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702116",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ESPRESSO_GRANDE",
        "tip": "PRODUS",
        "denumire": "Espresso Grande",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 14,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702035",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702116",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "LATTE_MACHIATO",
        "tip": "PRODUS",
        "denumire": "Latte Machiato",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 185,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5034",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702115",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "AMERICANO",
        "tip": "PRODUS",
        "denumire": "Americano",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5033",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702114",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "AMERICANO_GRANDE",
        "tip": "PRODUS",
        "denumire": "Americano Grande",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 16,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5034",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702115",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CAPPUCINO",
        "tip": "PRODUS",
        "denumire": "Cappucino",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5033",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702114",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 150,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CAPPUCINO_GRANDE",
        "tip": "PRODUS",
        "denumire": "Cappucino Grande",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 165,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 14,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5034",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702115",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CAFFE_LATTE",
        "tip": "PRODUS",
        "denumire": "Caffe Latte",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 15,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5033",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702114",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 200,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CAFFE_LATTE_GRANDE",
        "tip": "PRODUS",
        "denumire": "Caffe Latte Grande",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 165,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 14,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5034",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702115",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CIOCO_CAPPUCINO",
        "tip": "PRODUS",
        "denumire": "Cioco Cappucino",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 130,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5033",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702114",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CIOCO_CAPPUCINO_GRANDE",
        "tip": "PRODUS",
        "denumire": "Cioco Cappucino Grande",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 165,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 14,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5034",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702115",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "VANILLA_LATTE",
        "tip": "PRODUS",
        "denumire": "Vanilla Latte",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 130,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5033",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702114",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "VANILLA_LATTE_GRANDE",
        "tip": "PRODUS",
        "denumire": "Vanilla Latte Grande",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 165,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 14,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5034",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702115",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "CARAMEL_MACHIATO",
        "tip": "PRODUS",
        "denumire": "Caramel Machiato",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 185,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "5034",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "5044",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702115",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702193",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "ICED_COFFEE_LATTE",
        "tip": "PRODUS",
        "denumire": "ICED COFFEE LATTE",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702140",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "4032",
                "tipComp": "INGREDIENT",
                "cant": 150,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000012",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000013",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702138",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "LIMONADA_350_ML",
        "tip": "PRODUS",
        "denumire": "LIMONADA 350ML",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702548",
                "tipComp": "INGREDIENT",
                "cant": 60.01,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "7000012",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000013",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702138",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "LIMONADA_400_ML",
        "tip": "PRODUS",
        "denumire": "LIMONADA 400ML",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "702548",
                "tipComp": "INGREDIENT",
                "cant": 60.01,
                "um": "ml",
                "canal": "DELIVERY"
              },
              {
                "comp": "7000012",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              },
              {
                "comp": "7000013",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              },
              {
                "comp": "702138",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "DELIVERY"
              }
            ]
          }
        ]
      },
      {
        "cod": "CHEESECAKE_NEWYORK",
        "tip": "PRODUS",
        "denumire": "CHEESECAKE NEWYORK",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000130",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "TIRAMISU_CU_FISTIC",
        "tip": "PRODUS",
        "denumire": "TIRAMISU CU FISTIC",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000131",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "MANDARINA_CU_SORBET",
        "tip": "PRODUS",
        "denumire": "MANDARINA CU SORBET",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000132",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702092",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "JUNIOR_MEAL_HAMBURGER",
        "tip": "PRODUS",
        "denumire": "Junior Meal Hamburger",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "7000210",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700655",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702052",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702048",
                "tipComp": "INGREDIENT",
                "cant": 0.7,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 2.8,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "7000142",
                "tipComp": "INGREDIENT",
                "cant": 5,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702037",
                "tipComp": "INGREDIENT",
                "cant": 160,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702316",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "697008",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702315",
                "tipComp": "INGREDIENT",
                "cant": 41.66,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "8001",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "JUNIOR_MEAL_PUI_BURGER",
        "tip": "PRODUS",
        "denumire": "Junior Meal Pui Burger",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "7000133",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702045",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "700655",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 20,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702399",
                "tipComp": "INGREDIENT",
                "cant": 5.6,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "4063",
                "tipComp": "INGREDIENT",
                "cant": 10,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "702037",
                "tipComp": "INGREDIENT",
                "cant": 160,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702316",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "697008",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702315",
                "tipComp": "INGREDIENT",
                "cant": 41.66,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "8001",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      },
      {
        "cod": "JUNIOR_MEAL_4_NUGGETS",
        "tip": "PRODUS",
        "denumire": "Junior Meal 4 Nuggets",
        "activa": 1,
        "versiuni": [
          {
            "nr": 1,
            "data": "2026-07-01",
            "nota": "Import xlsx FC inițial",
            "linii": [
              {
                "comp": "4083",
                "tipComp": "INGREDIENT",
                "cant": 4,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 16,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "5046",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702037",
                "tipComp": "INGREDIENT",
                "cant": 160,
                "um": "g",
                "canal": "AMBELE"
              },
              {
                "comp": "702316",
                "tipComp": "AMBALAJ",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "4078",
                "tipComp": "INGREDIENT",
                "cant": 12,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "697008",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              },
              {
                "comp": "702315",
                "tipComp": "INGREDIENT",
                "cant": 41.66,
                "um": "ml",
                "canal": "AMBELE"
              },
              {
                "comp": "8001",
                "tipComp": "INGREDIENT",
                "cant": 1,
                "um": "buc",
                "canal": "AMBELE"
              }
            ]
          }
        ]
      }
    ],
    "vanzari": [
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "APA_EVIAN",
        "cant": 5,
        "brut": 85,
        "net": 70.25
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "BUDWEISER",
        "cant": 66,
        "brut": 990,
        "net": 818.18
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "BUDWEISER",
        "cant": 33,
        "brut": 594,
        "net": 490.91
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ALMETTE_BASIL_PORC",
        "cant": 23,
        "brut": 391,
        "net": 352.25
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ALMETTE_BASIL_PORC",
        "cant": 52,
        "brut": 1040,
        "net": 936.94
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ALMETTE_BASIL_PUI",
        "cant": 54,
        "brut": 918,
        "net": 827.03
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ALMETTE_BASIL_PUI",
        "cant": 29,
        "brut": 580,
        "net": 522.52
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ALMETTE_FRESH_PORC",
        "cant": 21,
        "brut": 357,
        "net": 321.62
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ALMETTE_FRESH_PORC",
        "cant": 77,
        "brut": 1540,
        "net": 1387.39
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ALMETTE_FRESH_PUI",
        "cant": 111,
        "brut": 1887,
        "net": 1700
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ALMETTE_FRESH_PUI",
        "cant": 45,
        "brut": 900,
        "net": 810.81
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ALMETTE_FRESH_PUI",
        "cant": 3,
        "brut": 85.71,
        "net": 77.22
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "AMERICAN_CHEESEBURGER",
        "cant": 5328,
        "brut": 53280,
        "net": 48000
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "AMERICAN_CHEESEBURGER",
        "cant": 881,
        "brut": 11453,
        "net": 10318.02
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "AMERICAN_DUBLU_CHEESEBURGER",
        "cant": 3438,
        "brut": 55008,
        "net": 49556.76
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "AMERICAN_DUBLU_CHEESEBURGER",
        "cant": 937,
        "brut": 17803,
        "net": 16038.74
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "AMERICAN_TRIPLU_CHEESEBURGER_LETTUCE_WRAP",
        "cant": 1731,
        "brut": 38082,
        "net": 34308.11
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "AMERICAN_TRIPLU_CHEESEBURGER_LETTUCE_WRAP",
        "cant": 1058,
        "brut": 26450,
        "net": 23828.83
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "AMERICAN_TRIPLU_CHEESEBURGER_LETTUCE_WRAP",
        "cant": 32,
        "brut": 895.68,
        "net": 806.92
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "AMERICAN_TRIPLU_CHEESEBURGER",
        "cant": 1751,
        "brut": 38522,
        "net": 34704.5
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "AMERICAN_TRIPLU_CHEESEBURGER",
        "cant": 1198,
        "brut": 29950,
        "net": 26981.98
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "BLACK_TRUFFLE_SMASHED",
        "cant": 2437,
        "brut": 53614,
        "net": 48300.9
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "BLACK_TRUFFLE_SMASHED",
        "cant": 3,
        "brut": 75,
        "net": 67.57
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "BLACK_TRUFFLE_SMASHED",
        "cant": 1302,
        "brut": 46494.42,
        "net": 41886.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "BLACK_TRUFFLE_SMASHED",
        "cant": 1,
        "brut": 37.13,
        "net": 33.45
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "BLACK_TRUFFLE_SMASHED",
        "cant": 23,
        "brut": 996.36,
        "net": 897.62
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "BURGER_VEGETARIAN",
        "cant": 286,
        "brut": 5720,
        "net": 5153.15
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "BURGER_VEGETARIAN",
        "cant": 101,
        "brut": 3318.86,
        "net": 2989.96
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CHEESEBURGER",
        "cant": 4125,
        "brut": 45375,
        "net": 40878.38
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CHEESEBURGER",
        "cant": 982,
        "brut": 18235.74,
        "net": 16428.59
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CHICKEN_FRYRANCH_XREMUS",
        "cant": 150,
        "brut": 2700,
        "net": 2432.43
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CHICKEN_TRUFFLE",
        "cant": 1497,
        "brut": 20958,
        "net": 18881.08
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CHICKEN_TRUFFLE",
        "cant": 2,
        "brut": 32,
        "net": 28.83
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CHICKEN_TRUFFLE",
        "cant": 470,
        "brut": 10744.2,
        "net": 9679.46
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DUBLU_BLACK_TRUFFLE_SMASHED",
        "cant": 3397,
        "brut": 95116,
        "net": 85690.09
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_BLACK_TRUFFLE_SMASHED",
        "cant": 1995,
        "brut": 88358.55,
        "net": 79602.3
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DUBLU_CHEESEBURGER",
        "cant": 2680,
        "brut": 45560,
        "net": 41045.05
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_CHEESEBURGER",
        "cant": 12,
        "brut": 228,
        "net": 205.41
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_CHEESEBURGER",
        "cant": 2706,
        "brut": 73440.84,
        "net": 66162.92
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DUBLU_CHICKEN_TRUFFLE",
        "cant": 529,
        "brut": 10051,
        "net": 9054.95
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_CHICKEN_TRUFFLE",
        "cant": 3,
        "brut": 63,
        "net": 56.76
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_CHICKEN_TRUFFLE",
        "cant": 648,
        "brut": 19440,
        "net": 17513.51
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DUBLU_HAMBURGER",
        "cant": 367,
        "brut": 5138,
        "net": 4628.83
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_HAMBURGER",
        "cant": 206,
        "brut": 4709.16,
        "net": 4242.49
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DUBLU_PUI_BURGER",
        "cant": 653,
        "brut": 9795,
        "net": 8824.32
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_PUI_BURGER",
        "cant": 4,
        "brut": 72,
        "net": 64.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_PUI_BURGER",
        "cant": 574,
        "brut": 14757.54,
        "net": 13295.08
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DUBLU_RED_PEPPER_SMASHED",
        "cant": 536,
        "brut": 17152,
        "net": 15452.25
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_RED_PEPPER_SMASHED",
        "cant": 238,
        "brut": 11900,
        "net": 10720.72
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DUBLU_SMASHED_BURGER",
        "cant": 3486,
        "brut": 94087.14,
        "net": 84763.19
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_SMASHED_BURGER",
        "cant": 7,
        "brut": 213.5,
        "net": 192.34
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DUBLU_SMASHED_BURGER",
        "cant": 2552,
        "brut": 111190,
        "net": 100171.17
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HAMBURGER",
        "cant": 136,
        "brut": 0,
        "net": 0
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HAMBURGER",
        "cant": 2839,
        "brut": 22712,
        "net": 20461.26
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HAMBURGER",
        "cant": 4,
        "brut": 40,
        "net": 36.04
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HAMBURGER",
        "cant": 587,
        "brut": 8388.23,
        "net": 7556.96
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HOMESTYLE_CHICKEN_FRYRANCH_LETTUCE_WRAP",
        "cant": 322,
        "brut": 8372,
        "net": 7542.34
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_FRYRANCH_LETTUCE_WRAP",
        "cant": 351,
        "brut": 9828,
        "net": 8854.05
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_FRYRANCH_LETTUCE_WRAP",
        "cant": 14,
        "brut": 405.86,
        "net": 365.64
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HOMESTYLE_CHICKEN_LEMON_LETTUCE_WRAP",
        "cant": 238,
        "brut": 6188,
        "net": 5574.77
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_LEMON_LETTUCE_WRAP",
        "cant": 183,
        "brut": 5124,
        "net": 4616.22
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_LEMON_LETTUCE_WRAP",
        "cant": 9,
        "brut": 260.91,
        "net": 235.05
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HOMESTYLE_CHICKEN_LEMON",
        "cant": 575,
        "brut": 14950,
        "net": 13468.47
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_LEMON",
        "cant": 4,
        "brut": 112,
        "net": 100.9
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_LEMON",
        "cant": 173,
        "brut": 6920,
        "net": 6234.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_PESTO",
        "cant": 1,
        "brut": 28,
        "net": 25.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_PESTO",
        "cant": 200,
        "brut": 8000,
        "net": 7207.21
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HOMESTYLE_CHICKEN_PESTO",
        "cant": 504,
        "brut": 13104,
        "net": 11805.41
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HOMESTYLE_CHICKEN_RANCH",
        "cant": 1567,
        "brut": 40742,
        "net": 36704.5
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_RANCH",
        "cant": 1,
        "brut": 28,
        "net": 25.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CHICKEN_RANCH",
        "cant": 617,
        "brut": 24680,
        "net": 22234.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "MAC_CHEESY_BITES",
        "cant": 486,
        "brut": 8019,
        "net": 7224.32
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MAC_CHEESY_BITES",
        "cant": 623,
        "brut": 10279.5,
        "net": 9260.81
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PUI_BURGER",
        "cant": 210,
        "brut": 0,
        "net": 0
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PUI_BURGER",
        "cant": 5896,
        "brut": 41272,
        "net": 37181.98
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PUI_BURGER",
        "cant": 3,
        "brut": 30,
        "net": 27.03
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PUI_BURGER",
        "cant": 1360,
        "brut": 19434.4,
        "net": 17508.47
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "RED_PEPPER_SMASHED",
        "cant": 477,
        "brut": 12402,
        "net": 11172.97
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "RED_PEPPER_SMASHED",
        "cant": 155,
        "brut": 6421.65,
        "net": 5785.27
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ROSTI_SAUSAGE_BURGER",
        "cant": 33,
        "brut": 660,
        "net": 594.59
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ROSTI_SAUSAGE_BURGER",
        "cant": 93,
        "brut": 2139,
        "net": 1927.03
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ROSTI_SAUSAGE_BURGER",
        "cant": 3,
        "brut": 98.58,
        "net": 88.81
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SHRIMP_BURGER",
        "cant": 284,
        "brut": 7100,
        "net": 6396.4
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SHRIMP_BURGER",
        "cant": 1,
        "brut": 28,
        "net": 25.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SHRIMP_BURGER",
        "cant": 178,
        "brut": 7120,
        "net": 6414.41
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SMASHED_BURGER",
        "cant": 2448,
        "brut": 51383.52,
        "net": 46291.46
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SMASHED_BURGER",
        "cant": 812,
        "brut": 28420,
        "net": 25603.6
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "TRIPLU_CHICKEN_TRUFFLE",
        "cant": 79,
        "brut": 1896,
        "net": 1708.11
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "TRIPLU_PUI_BURGER",
        "cant": 46,
        "brut": 920,
        "net": 828.83
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CARTOFI_CRISS_CUT_140_G",
        "cant": 5711,
        "brut": 85665,
        "net": 77175.68
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_CRISS_CUT_140_G",
        "cant": 11,
        "brut": 165,
        "net": 148.65
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_CRISS_CUT_140_G",
        "cant": 3550,
        "brut": 69225,
        "net": 62364.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_112_G",
        "cant": 11,
        "brut": 153.89,
        "net": 138.64
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_112_G",
        "cant": 3085,
        "brut": 44701.65,
        "net": 40271.76
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_112_G",
        "cant": 1,
        "brut": 13.99,
        "net": 12.6
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_112_G",
        "cant": 919,
        "brut": 13316.31,
        "net": 11996.68
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_150_G",
        "cant": 1,
        "brut": 15.99,
        "net": 14.41
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_150_G",
        "cant": 443,
        "brut": 7305.07,
        "net": 6581.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_150_G",
        "cant": 183,
        "brut": 2926.17,
        "net": 2636.19
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_SUPERSIZE_250_G",
        "cant": 3,
        "brut": 68.97,
        "net": 62.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_SUPERSIZE_250_G",
        "cant": 2508,
        "brut": 58912.92,
        "net": 53074.7
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARTOFI_PRAJITI_IN_ULEI_DE_ALUNE_SUPERSIZE_250_G",
        "cant": 457,
        "brut": 10506.43,
        "net": 9465.25
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "FRY_SHAKER_CAJUN",
        "cant": 193,
        "brut": 965,
        "net": 869.37
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "FRY_SHAKER_CAJUN",
        "cant": 22,
        "brut": 110,
        "net": 99.1
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "FRY_SHAKER_CAJUN",
        "cant": 174,
        "brut": 870,
        "net": 783.78
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "FRY_SHAKER_PARMEZAN_USTUROI",
        "cant": 518,
        "brut": 2590,
        "net": 2333.33
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "FRY_SHAKER_PARMEZAN_USTUROI",
        "cant": 220,
        "brut": 1100,
        "net": 990.99
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "REALLY_CRUNCHY_FRIES_170_G",
        "cant": 23820,
        "brut": 283458,
        "net": 255367.57
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "APA_EVIAN",
        "cant": 18,
        "brut": 270,
        "net": 223.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "APA_MINERALA_AQUA_CARPATICA",
        "cant": 18,
        "brut": 36,
        "net": 29.75
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "APA_MINERALA_AQUA_CARPATICA",
        "cant": 389,
        "brut": 3890,
        "net": 3214.88
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "APA_MINERALA_AQUA_CARPATICA",
        "cant": 22,
        "brut": 242,
        "net": 200
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "APA_PLATA_AQUA_CARPATICA",
        "cant": 105,
        "brut": 210,
        "net": 173.55
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "APA_PLATA_AQUA_CARPATICA",
        "cant": 1644,
        "brut": 16440,
        "net": 13586.78
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "APA_PLATA_AQUA_CARPATICA",
        "cant": 87,
        "brut": 957,
        "net": 790.91
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DOZA_PEPSI_ZERO",
        "cant": 374,
        "brut": 1866.26,
        "net": 1542.36
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DR_PEPPER",
        "cant": 50,
        "brut": 550,
        "net": 454.55
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DR_PEPPER",
        "cant": 116,
        "brut": 1392,
        "net": 1150.41
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "FRYZZZ_CAPSUNI",
        "cant": 230,
        "brut": 2990,
        "net": 2471.07
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "FRYZZZ_GRAPEFRUIT",
        "cant": 132,
        "brut": 1716,
        "net": 1418.18
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "FRYZZZ_PEPENE_ROSU",
        "cant": 318,
        "brut": 4134,
        "net": 3416.53
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "FRYZZZ_PINACOLADA",
        "cant": 234,
        "brut": 3042,
        "net": 2514.05
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "LIMONADA_350_ML",
        "cant": 71,
        "brut": 923,
        "net": 762.81
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_2",
        "cant": 884,
        "brut": 6188,
        "net": 5114.05
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_5",
        "cant": 713,
        "brut": 7130,
        "net": 5892.56
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DOZE_PEPSI_330_ML_TWIST_ZERO_330_ML_7_UP_330_ML_",
        "cant": 70,
        "brut": 665,
        "net": 549.59
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PEPSI_CU_GUST_DE_C_P_UNI_I_FRI_C",
        "cant": 21,
        "brut": 199.5,
        "net": 164.88
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PEPSI_CU_GUST_DE_C_P_UNI_I_FRI_C",
        "cant": 44,
        "brut": 418,
        "net": 345.45
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PEPSI_CU_GUST_DE_NGHE_AT_DE_VANILIE",
        "cant": 17,
        "brut": 161.5,
        "net": 133.47
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PEPSI_CU_GUST_DE_NGHE_AT_DE_VANILIE",
        "cant": 50,
        "brut": 475,
        "net": 392.56
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_2",
        "cant": 32,
        "brut": 64,
        "net": 52.89
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_2",
        "cant": 1925,
        "brut": 13475,
        "net": 11136.36
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PEPSI_PEPSI_ZERO_7_UP_ZERO_MIRINDA_ZERO_LIPTON_5",
        "cant": 2677,
        "brut": 26770,
        "net": 22123.97
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PRIGAT_PORTOCALE_CAPSUNI_BANANE",
        "cant": 58,
        "brut": 116,
        "net": 95.87
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PRIGAT_PORTOCALE_CAPSUNI_BANANE",
        "cant": 99,
        "brut": 990,
        "net": 818.18
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PRIGAT_PORTOCALE_CAPSUNI_BANANE",
        "cant": 20,
        "brut": 240,
        "net": 198.35
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "RED_BULL",
        "cant": 19,
        "brut": 285,
        "net": 235.54
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "RED_BULL",
        "cant": 17,
        "brut": 289,
        "net": 238.84
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ADD_FELIE_CHEDDAR",
        "cant": 332,
        "brut": 996,
        "net": 897.3
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ADD_BACON",
        "cant": 385,
        "brut": 1925,
        "net": 1734.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ADD_BACON",
        "cant": 257,
        "brut": 514,
        "net": 463.06
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ADD_FELIE_CHEDDAR",
        "cant": 305,
        "brut": 915,
        "net": 824.32
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ADD_JALAPENO",
        "cant": 176,
        "brut": 352,
        "net": 317.12
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ADD_JALAPENO",
        "cant": 430,
        "brut": 2150,
        "net": 1936.94
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ADD_ON_BANANE",
        "cant": 9,
        "brut": 27,
        "net": 24.32
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ADD_ON_CAPSUNI",
        "cant": 7,
        "brut": 21,
        "net": 18.92
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ADD_ON_NUTELLA",
        "cant": 6,
        "brut": 18,
        "net": 16.22
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "APFELSTORM_X_TOFFEE",
        "cant": 83,
        "brut": 1651.7,
        "net": 1488.02
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CARROT_CAKE",
        "cant": 19,
        "brut": 323,
        "net": 290.99
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARROT_CAKE",
        "cant": 22,
        "brut": 396,
        "net": 356.76
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CHEESECAKE_NEWYORK",
        "cant": 39,
        "brut": 780,
        "net": 702.7
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CHEESECAKE_NEWYORK",
        "cant": 37,
        "brut": 777,
        "net": 700
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MANDARINA_CU_SORBET",
        "cant": 32,
        "brut": 704,
        "net": 634.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MILKSHAKE_APPLE_CINNAMON_220_G",
        "cant": 38,
        "brut": 532,
        "net": 479.28
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "MILKSHAKE_APPLE_CINNAMON_220_G",
        "cant": 46,
        "brut": 736,
        "net": 663.06
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MILKSHAKE_BANANE_200_G",
        "cant": 81,
        "brut": 1134,
        "net": 1021.62
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "MILKSHAKE_BANANE_200_G",
        "cant": 116,
        "brut": 1856,
        "net": 1672.07
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MILKSHAKE_BISCOFF_210_G",
        "cant": 2,
        "brut": 28,
        "net": 25.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MILKSHAKE_CAPSUNI_200_G",
        "cant": 112,
        "brut": 1568,
        "net": 1412.61
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "MILKSHAKE_CAPSUNI_200_G",
        "cant": 113,
        "brut": 1808,
        "net": 1628.83
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MILKSHAKE_CIOCOLATA_200_G",
        "cant": 161,
        "brut": 2254,
        "net": 2030.63
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "MILKSHAKE_CIOCOLATA_200_G",
        "cant": 161,
        "brut": 2576,
        "net": 2320.72
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MILKSHAKE_VANILIE_200_G",
        "cant": 132,
        "brut": 1584,
        "net": 1427.03
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "MILKSHAKE_VANILIE_200_G",
        "cant": 116,
        "brut": 1624,
        "net": 1463.06
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "MILLEFOGLIE",
        "cant": 16,
        "brut": 288,
        "net": 259.46
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "MILLEFOGLIE",
        "cant": 22,
        "brut": 374,
        "net": 336.94
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "NUTELLA_BURGER_BANANE",
        "cant": 200,
        "brut": 2800,
        "net": 2522.52
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "NUTELLA_BURGER_BANANE",
        "cant": 508,
        "brut": 6096,
        "net": 5491.89
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "NUTELLA_BURGER_CAPSUNI",
        "cant": 272,
        "brut": 3808,
        "net": 3430.63
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "NUTELLA_BURGER_CAPSUNI",
        "cant": 794,
        "brut": 9528,
        "net": 8583.78
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "NUTELLA_BURGER",
        "cant": 176,
        "brut": 2112,
        "net": 1902.7
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "NUTELLA_BURGER",
        "cant": 398,
        "brut": 3980,
        "net": 3585.59
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PRAJITURA_MARITOZZO",
        "cant": 15,
        "brut": 255,
        "net": 229.73
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PRAJITURA_MARITOZZO",
        "cant": 6,
        "brut": 108,
        "net": 97.3
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PRAJITURA_MASCARPONE_CAPSUNI",
        "cant": 34,
        "brut": 578,
        "net": 520.72
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PRAJITURA_MASCARPONE_CAPSUNI",
        "cant": 9,
        "brut": 162,
        "net": 145.95
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PRAJITURA_VANILIE_BEZEA",
        "cant": 32,
        "brut": 480,
        "net": 432.43
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PRAJITURA_VANILIE_BEZEA",
        "cant": 20,
        "brut": 320,
        "net": 288.29
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PROFITEROL_CIOCOLATA",
        "cant": 61,
        "brut": 915,
        "net": 824.32
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PROFITEROL_CIOCOLATA",
        "cant": 23,
        "brut": 368,
        "net": 331.53
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "TIRAMISU_CU_FISTIC",
        "cant": 35,
        "brut": 700,
        "net": 630.63
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "TIRAMISU_CU_FISTIC",
        "cant": 23,
        "brut": 483,
        "net": 435.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "TIRAMISU",
        "cant": 20,
        "brut": 360,
        "net": 324.32
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "TIRAMISU",
        "cant": 63,
        "brut": 1071,
        "net": 964.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "TORT_CIOCOLATA_ZMEURA",
        "cant": 48,
        "brut": 816,
        "net": 735.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "TORT_CIOCOLATA_ZMEURA",
        "cant": 28,
        "brut": 504,
        "net": 454.05
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "TORT_PUFOS_CAPSUNI",
        "cant": 12,
        "brut": 204,
        "net": 183.78
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "TORT_PUFOS_CAPSUNI",
        "cant": 19,
        "brut": 342,
        "net": 308.11
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "AMERICANO",
        "cant": 2,
        "brut": 22,
        "net": 18.18
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "AMERICANO_GRANDE",
        "cant": 33,
        "brut": 396,
        "net": 327.27
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "AMERICANO_GRANDE",
        "cant": 14,
        "brut": 182,
        "net": 150.41
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "AMERICANO",
        "cant": 59,
        "brut": 590,
        "net": 487.6
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CAFFE_LATTE",
        "cant": 3,
        "brut": 39,
        "net": 32.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CAFFE_LATTE_GRANDE",
        "cant": 7,
        "brut": 105,
        "net": 86.78
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CAFFE_LATTE_GRANDE",
        "cant": 38,
        "brut": 532,
        "net": 439.67
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CAFFE_LATTE",
        "cant": 80,
        "brut": 960,
        "net": 793.39
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CAPPUCINO",
        "cant": 12,
        "brut": 156,
        "net": 128.93
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CAPPUCINO_GRANDE",
        "cant": 9,
        "brut": 135,
        "net": 111.57
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CAPPUCINO_GRANDE",
        "cant": 33,
        "brut": 462,
        "net": 381.82
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CAPPUCINO",
        "cant": 90,
        "brut": 1080,
        "net": 892.56
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CARAMEL_MACHIATO",
        "cant": 22,
        "brut": 330,
        "net": 272.73
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CARAMEL_MACHIATO",
        "cant": 19,
        "brut": 304,
        "net": 251.24
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CIOCO_CAPPUCINO",
        "cant": 2,
        "brut": 28,
        "net": 23.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CIOCO_CAPPUCINO_GRANDE",
        "cant": 5,
        "brut": 75,
        "net": 61.98
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "CIOCO_CAPPUCINO_GRANDE",
        "cant": 5,
        "brut": 80,
        "net": 66.12
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "CIOCO_CAPPUCINO",
        "cant": 8,
        "brut": 104,
        "net": 85.95
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ESPRESSO",
        "cant": 2,
        "brut": 18,
        "net": 14.88
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "ESPRESSO_GRANDE",
        "cant": 3,
        "brut": 33,
        "net": 27.27
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ESPRESSO_GRANDE",
        "cant": 89,
        "brut": 890,
        "net": 735.54
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ESPRESSO",
        "cant": 164,
        "brut": 1312,
        "net": 1084.3
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ICED_COFFEE_LATTE",
        "cant": 286,
        "brut": 3718,
        "net": 3072.73
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "LATTE_MACHIATO",
        "cant": 1,
        "brut": 14,
        "net": 11.57
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "LATTE_MACHIATO",
        "cant": 46,
        "brut": 598,
        "net": 494.21
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "VANILLA_LATTE_GRANDE",
        "cant": 15,
        "brut": 240,
        "net": 198.35
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "VANILLA_LATTE_GRANDE",
        "cant": 11,
        "brut": 165,
        "net": 136.36
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "VANILLA_LATTE",
        "cant": 16,
        "brut": 208,
        "net": 171.9
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "VANILLA_LATTE",
        "cant": 5,
        "brut": 70,
        "net": 57.85
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PUNGA",
        "cant": 7113,
        "brut": 7113,
        "net": 6408.11
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PUNGA_MICA",
        "cant": 970,
        "brut": 485,
        "net": 436.94
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PUNGA_MICA",
        "cant": 36207,
        "brut": 18103.5,
        "net": 16309.46
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PUNGA_MICA",
        "cant": 5,
        "brut": 3.75,
        "net": 3.38
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SACOSA",
        "cant": 224,
        "brut": 336,
        "net": 302.7
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SACOSA",
        "cant": 52,
        "brut": 78,
        "net": 70.27
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SACOSA",
        "cant": 130,
        "brut": 260,
        "net": 234.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "3_COUNTRY_WINGS",
        "cant": 180,
        "brut": 2610,
        "net": 2351.35
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "3_COUNTRY_WINGS",
        "cant": 112,
        "brut": 2720.48,
        "net": 2450.88
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "3_HOT_COUNTRY_WINGS",
        "cant": 221,
        "brut": 3204.5,
        "net": 2886.94
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "3_HOT_COUNTRY_WINGS",
        "cant": 102,
        "brut": 2477.58,
        "net": 2232.05
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "4_NUGGETS",
        "cant": 233,
        "brut": 0,
        "net": 0
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "4_NUGGETS",
        "cant": 625,
        "brut": 5625,
        "net": 5067.57
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "4_NUGGETS",
        "cant": 3,
        "brut": 36,
        "net": 32.43
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "4_NUGGETS",
        "cant": 352,
        "brut": 6033.28,
        "net": 5435.39
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "5_COUNTRY_WINGS",
        "cant": 324,
        "brut": 6804,
        "net": 6129.73
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "5_COUNTRY_WINGS",
        "cant": 74,
        "brut": 2907.46,
        "net": 2619.33
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "5_HOT_COUNTRY_WINGS",
        "cant": 418,
        "brut": 8778,
        "net": 7908.11
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "6_NUGGETS",
        "cant": 497,
        "brut": 7952,
        "net": 7163.96
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "6_NUGGETS",
        "cant": 348,
        "brut": 9444.72,
        "net": 8508.76
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "7_COUNTRY_WINGS",
        "cant": 206,
        "brut": 5459,
        "net": 4918.02
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "7_COUNTRY_WINGS",
        "cant": 151,
        "brut": 6579.07,
        "net": 5927.09
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "7_HOT_COUNTRY_WINGS",
        "cant": 212,
        "brut": 5618,
        "net": 5061.26
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "9_COUNTRY_WINGS",
        "cant": 187,
        "brut": 5890.5,
        "net": 5306.76
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "9_COUNTRY_WINGS",
        "cant": 191,
        "brut": 9823.13,
        "net": 8849.67
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "9_HOT_COUNTRY_WINGS",
        "cant": 205,
        "brut": 6457.5,
        "net": 5817.57
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "9_NUGGETS",
        "cant": 356,
        "brut": 7832,
        "net": 7055.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "9_NUGGETS",
        "cant": 408,
        "brut": 15153.12,
        "net": 13651.46
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "EXTRA_HOMESTYLE_CRISPY",
        "cant": 20,
        "brut": 140,
        "net": 126.13
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "EXTRA_HOMESTYLE_CRISPY",
        "cant": 25,
        "brut": 175,
        "net": 157.66
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HOMESTYLE_CRISPY_3_180_G",
        "cant": 1328,
        "brut": 23904,
        "net": 21535.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CRISPY_3_180_G",
        "cant": 1,
        "brut": 20.5,
        "net": 18.47
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CRISPY_3_180_G",
        "cant": 392,
        "brut": 11481.68,
        "net": 10343.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HOMESTYLE_CRISPY_4_240_G",
        "cant": 1011,
        "brut": 24264,
        "net": 21859.46
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CRISPY_4_240_G",
        "cant": 1,
        "brut": 28,
        "net": 25.23
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CRISPY_4_240_G",
        "cant": 302,
        "brut": 12080,
        "net": 10882.88
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "HOMESTYLE_CRISPY_5_300_G",
        "cant": 1476,
        "brut": 44280,
        "net": 39891.89
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CRISPY_5_300_G",
        "cant": 3,
        "brut": 102,
        "net": 91.89
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "HOMESTYLE_CRISPY_5_300_G",
        "cant": 689,
        "brut": 33464.73,
        "net": 30148.41
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PACK_COUNTRY_WINGS_30_1050_G",
        "cant": 14,
        "brut": 1680,
        "net": 1513.51
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "PACK_HOMESTYLE_CRISPY_20_1200_G",
        "cant": 76,
        "brut": 9120,
        "net": 8216.22
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "PACK_HOMESTYLE_CRISPY_20_1200_G",
        "cant": 168,
        "brut": 16800,
        "net": 15135.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SALATA_COLESLAW",
        "cant": 210,
        "brut": 2100,
        "net": 1891.89
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SALATA_COLESLAW",
        "cant": 287,
        "brut": 2870,
        "net": 2585.59
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SALATA_COLESLAW",
        "cant": 8,
        "brut": 82,
        "net": 73.87
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "2_X_SOS_KETCHUP_10_ML_MAYONEZA_10_ML",
        "cant": 394,
        "brut": 1970,
        "net": 1774.77
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DIP_N_CHEDDAR_100_ML",
        "cant": 1473,
        "brut": 20592.54,
        "net": 18551.84
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DIP_N_CHEDDAR_100_ML",
        "cant": 1,
        "brut": 14.08,
        "net": 12.68
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DIP_N_CHEDDAR_100_ML",
        "cant": 140,
        "brut": 1957.2,
        "net": 1763.24
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DIP_N_CHEDDAR_100_ML",
        "cant": 3877,
        "brut": 54200.46,
        "net": 48829.24
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DIP_N_FRYRANCH_100_G",
        "cant": 1389,
        "brut": 19418.22,
        "net": 17493.89
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DIP_N_FRYRANCH_100_G",
        "cant": 3546,
        "brut": 49573.08,
        "net": 44660.43
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DIP_N_FRYRANCH_250_G",
        "cant": 373,
        "brut": 9325,
        "net": 8400.9
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DIP_N_FRYRANCH_250_G",
        "cant": 345,
        "brut": 8625,
        "net": 7770.27
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DIP_N_FRYRANCH_400_G",
        "cant": 57,
        "brut": 1995,
        "net": 1797.3
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DIP_N_FRYRANCH_400_G",
        "cant": 43,
        "brut": 1505,
        "net": 1355.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "DIP_N_TRUFFLE_100_G",
        "cant": 567,
        "brut": 7926.66,
        "net": 7141.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "DIP_N_TRUFFLE_100_G",
        "cant": 483,
        "brut": 6752.34,
        "net": 6083.19
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SIDE_CHEDDAR_40_ML",
        "cant": 1269,
        "brut": 8248.5,
        "net": 7431.08
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SIDE_CHEDDAR_40_ML",
        "cant": 174,
        "brut": 1131,
        "net": 1018.92
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SIDE_CHEDDAR_40_ML",
        "cant": 2614,
        "brut": 15684,
        "net": 14129.73
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SIDE_FRYRANCH_40_G",
        "cant": 1347,
        "brut": 8082,
        "net": 7281.08
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SIDE_FRYRANCH_40_G",
        "cant": 2253,
        "brut": 13518,
        "net": 12178.38
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_BARBEQUE_25_G",
        "cant": 48,
        "brut": 249.6,
        "net": 224.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_BARBEQUE_25_G",
        "cant": 33,
        "brut": 171.6,
        "net": 154.59
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_BARBEQUE_25_G",
        "cant": 268,
        "brut": 1340,
        "net": 1207.21
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_HONEY_MUSTARD_25_G",
        "cant": 56,
        "brut": 291.2,
        "net": 262.34
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_HONEY_MUSTARD_25_G",
        "cant": 38,
        "brut": 197.6,
        "net": 178.02
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_HONEY_MUSTARD_25_G",
        "cant": 78,
        "brut": 390,
        "net": 351.35
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_KETCHUP_10_ML",
        "cant": 165,
        "brut": 577.5,
        "net": 520.27
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_KETCHUP_10_ML",
        "cant": 78,
        "brut": 273,
        "net": 245.95
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_KETCHUP_10_ML",
        "cant": 373,
        "brut": 0,
        "net": 0
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_KETCHUP_10_ML",
        "cant": 1393,
        "brut": 4179,
        "net": 3764.86
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_MAYONEZA_10_ML",
        "cant": 252,
        "brut": 882,
        "net": 794.59
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_MAYONEZA_10_ML",
        "cant": 415,
        "brut": 0,
        "net": 0
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_MAYONEZA_10_ML",
        "cant": 1503,
        "brut": 4509,
        "net": 4062.16
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_MAYONEZA_10_ML",
        "cant": 99,
        "brut": 346.5,
        "net": 312.16
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_SAMURAI",
        "cant": 229,
        "brut": 1374,
        "net": 1237.84
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_SAMURAI",
        "cant": 91,
        "brut": 546,
        "net": 491.89
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_SAMURAI",
        "cant": 776,
        "brut": 4656,
        "net": 4194.59
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_SWEET_CHILLI_25_G",
        "cant": 87,
        "brut": 452.4,
        "net": 407.57
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_SWEET_CHILLI_25_G",
        "cant": 61,
        "brut": 317.2,
        "net": 285.77
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_SWEET_CHILLI_25_G",
        "cant": 254,
        "brut": 1270,
        "net": 1144.14
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_TRUFFLE_MAYO",
        "cant": 416,
        "brut": 2496,
        "net": 2248.65
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_TRUFFLE_MAYO",
        "cant": 203,
        "brut": 1218,
        "net": 1097.3
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_TRUFFLE_MAYO",
        "cant": 1383,
        "brut": 8298,
        "net": 7475.68
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_USTUROI",
        "cant": 833,
        "brut": 4998,
        "net": 4502.7
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "produs": "SOS_USTUROI",
        "cant": 185,
        "brut": 1202.5,
        "net": 1083.33
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "SOS_USTUROI",
        "cant": 3166,
        "brut": 18996,
        "net": 17113.51
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "ADD_NUTELLA_MILKSHAKE",
        "cant": 9,
        "brut": 27,
        "net": 24.32
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "TOPPING_KITKAT",
        "cant": 14,
        "brut": 56,
        "net": 50.45
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "produs": "TOPPING_OREO",
        "cant": 19,
        "brut": 76,
        "net": 68.47
      }
    ],
    "salesReport": [
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "INSTORE",
        "net": 1542730.53,
        "brut": 1720783.56
      },
      {
        "data": "2026-07-31",
        "locatie": "NET",
        "canal": "DELIVERY",
        "net": 1001389.04,
        "brut": 1112332.95
      },
      {
        "data": "2026-07-31",
        "locatie": "CLUJ",
        "canal": "INSTORE",
        "net": 554381.59
      }
    ],
    "linii29": [
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Alcool",
        "valoare": 1120
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Condimente",
        "valoare": 294
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Diverse 21%",
        "valoare": 480
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Drink 11%",
        "valoare": 1268
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "DrinksSugar 21%",
        "valoare": 11095
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Food 11%",
        "valoare": 197102
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Food 21%",
        "valoare": 9031
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "FRYCafe 21%",
        "valoare": 2899
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Garantie sgr aluminiu (Raw)",
        "valoare": 126
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Garantie sgr pet (Raw)",
        "valoare": 288
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Garantie sgr sticla (Raw)",
        "valoare": 37
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "MERCH RAW",
        "valoare": 0
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Birotica",
        "valoare": 0
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Operationale",
        "valoare": 102
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "ACCESORII",
        "valoare": 622
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Paper",
        "valoare": 21271
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Produse curatenie",
        "valoare": 2005
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "Toys",
        "valoare": 915
      },
      {
        "perioada": "2026-07",
        "locatie": "CLUJ",
        "categorie": "UNIFORMA CREW & MANAGERI",
        "valoare": 0
      }
    ],
    "reguli": [
      {
        "pattern": "Alcool",
        "clasa": "FOOD"
      },
      {
        "pattern": "Condimente",
        "clasa": "FOOD"
      },
      {
        "pattern": "Diverse 21%",
        "clasa": "FOOD"
      },
      {
        "pattern": "Drink 11%",
        "clasa": "FOOD"
      },
      {
        "pattern": "DrinksSugar 21%",
        "clasa": "FOOD"
      },
      {
        "pattern": "Food 11%",
        "clasa": "FOOD"
      },
      {
        "pattern": "Food 21%",
        "clasa": "FOOD"
      },
      {
        "pattern": "FRYCafe 21%",
        "clasa": "FOOD"
      },
      {
        "pattern": "Garantie sgr aluminiu (Raw)",
        "clasa": "EXCLUS"
      },
      {
        "pattern": "Garantie sgr pet (Raw)",
        "clasa": "EXCLUS"
      },
      {
        "pattern": "Garantie sgr sticla (Raw)",
        "clasa": "EXCLUS"
      },
      {
        "pattern": "MERCH RAW",
        "clasa": "EXCLUS"
      },
      {
        "pattern": "Birotica",
        "clasa": "EXCLUS"
      },
      {
        "pattern": "Operationale",
        "clasa": "EXCLUS"
      },
      {
        "pattern": "ACCESORII",
        "clasa": "PAPER"
      },
      {
        "pattern": "Paper",
        "clasa": "PAPER"
      },
      {
        "pattern": "Produse curatenie",
        "clasa": "EXCLUS"
      },
      {
        "pattern": "Toys",
        "clasa": "EXCLUS"
      },
      {
        "pattern": "UNIFORMA CREW & MANAGERI",
        "clasa": "EXCLUS"
      }
    ],
    "tinte": [
      {
        "locatie": "RETEA",
        "fcCurat": 21
      }
    ],
    "importuri": [
      {
        "id": "IMP-XLSX",
        "tip": "RETETAR",
        "fisier": "FRYDAY_FC_Initial_Corectat.xlsx",
        "data": "2026-07-01",
        "randuri": 434,
        "importate": 471,
        "avertismente": [
          "Delivery — 6 produse diferă între UPDATE și CR–IT „9. Preturi DELIVERY RO\"; s-a folosit UPDATE: CARTOFI CRISS CUT 140G: UPDATE 14.15 vs CR–IT 13.9 · Cartofi prajiti in ulei de alune 112g: UPDATE 14.99 vs CR–IT 14.24 · Cartofi prajiti in ulei de alune 150g: UPDATE 16.99 vs CR–IT 16.24 · Cartofi prajiti in ulei de alune SuperSize 250g: UPDATE 23.99 vs CR–IT 23.24 · Punga Mica: UPDATE 0.75 vs CR–IT 0.5 · Sacosa: UPDATE 2 vs CR–IT 1.5"
        ],
        "erori": [],
        "status": "IMPORTAT"
      },
      {
        "id": "IMP-47",
        "tip": "PMIX",
        "fisier": "4.7_Sales_Mix.pdf (27–31 iul, 30 restaurante)",
        "data": "2026-07-31",
        "randuri": 402,
        "importate": 309,
        "avertismente": [
          "93 articole din 4.7 nu au corespondent în nomenclatorul xlsx (247914 lei, 8.0% din brut). Vânzările rețelei sunt subevaluate cu această sumă, deci FC% pe locația NET e supraevaluat.",
          "nepotrivit: Pepsi-Cola 500ml new — 50000.00 lei",
          "nepotrivit: Pepsi-Cola 250ml new — 36253.00 lei",
          "nepotrivit: 9 COUNTRY HOT WINGS new D — 13371.80 lei",
          "nepotrivit: APPLE TOFFEE FRYPIE 2X — 10965.00 lei",
          "nepotrivit: Bautura 7 UP zero 500 ml new — 7930.00 lei",
          "nepotrivit: APPLE TOFFEE FRYPIE 2X D — 7020.00 lei",
          "nepotrivit: M JuniorNuggetts4* — 6524.00 lei",
          "nepotrivit: Butura 7UP Zero new — 6188.00 lei",
          "nepotrivit: Meniu Junior Chicken Burger* — 5880.00 lei",
          "nepotrivit: 7 COUNTRY HOT WINGS new D — 5315.54 lei",
          "nepotrivit: Jucarie — 5211.00 lei",
          "nepotrivit: Mirinda Zero Zahar 500ml new — 5060.00 lei",
          "nepotrivit: Mirinda Zero new — 4942.00 lei",
          "nepotrivit: Iced Latte Tiramisu — 4845.00 lei",
          "nepotrivit: LIMONADA new — 4810.00 lei",
          "nepotrivit: APPLE TOFFEE FRYPIE — 4760.00 lei",
          "nepotrivit: Milkshake Ciocolata       NEW — 4662.00 lei",
          "nepotrivit: 5 COUNTRY HOT WINGS new D — 4636.22 lei",
          "nepotrivit: FRYZZZ ORANGE SPRITZ — 4425.00 lei",
          "nepotrivit: Milkshake Vanilie NEW — 4302.00 lei",
          "nepotrivit: Meniu Junior Little Hamburger* — 3808.00 lei",
          "nepotrivit: PACK COUNTRY WINGS 30 (900G) new — 3800.00 lei",
          "nepotrivit: Doza Pepsi 330ml new D — 3087.50 lei",
          "nepotrivit: Milkshake Capsuni NEW — 3006.00 lei",
          "nepotrivit: Milkshake Banane NEW — 2556.00 lei"
        ],
        "erori": [],
        "status": "IMPORTAT"
      },
      {
        "id": "IMP-29",
        "tip": "FC29",
        "fisier": "2.9_Cluj_Memo.pdf (1–31 iul, FRYDAY CLUJ MEMO)",
        "data": "2026-07-31",
        "randuri": 19,
        "importate": 19,
        "avertismente": [
          "Domeniu diferit de 4.7: o singură locație, lună întreagă. Nu compara direct cu locația NET."
        ],
        "erori": [],
        "status": "IMPORTAT"
      }
    ],
    "scenarii": [],
    "pretFurnizori": [],
    "labor": [],
    "costuriOperare": [],
    "reguliBusiness": [],
    "rnd": [],
    "setari": {
      "tvaImplicit": 11,
      "tolerantaReconciliere": 2,
      "pragAlertaPret": 10
    }
  } as AppState;
}
