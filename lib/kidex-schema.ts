import type { AssessmentDomain, AssessmentMode, ScoreItemDefinition } from "@/types/assessment";

export interface ScoreSection {
  key: AssessmentDomain;
  title: string;
  weight: number;
  items: ScoreItemDefinition[];
}

const item = (key: string, title: string, prompt: string, domain: AssessmentDomain): ScoreItemDefinition => ({
  key,
  title,
  prompt,
  domain
});

export const fullSections: ScoreSection[] = [
  {
    key: "movement",
    title: "Mozgasprofil",
    weight: 0.5,
    items: [
      item("futotechnika", "Futotechnika", "Ritmus, karmunka, talajfogas", "movement"),
      item("iranyvaltas", "Iranyvaltas", "Gyors, kontrollalt fordulas", "movement"),
      item("dinamikus_egyensuly", "Dinamikus egyensuly", "Mozgas kozbeni stabilitas", "movement"),
      item("statikus_egyensuly", "Statikus egyensuly", "Egy labon stabil megtartas", "movement"),
      item("ugraskeszseg", "Ugraskeszseg", "Paros/egylabas elrugaszkodas", "movement"),
      item("erkezestechnika", "Erkezestechnika", "Izuletvedelem, tompitas", "movement"),
      item("esesbiztonsag", "Gurulas-esesbiztonsag", "Kontrollalt talajmunka", "movement"),
      item("testsema", "Testsema-tudat", "Testhelyzet felismerese terben", "movement"),
      item("lateralitas", "Lateralitas", "Jobb-bal koordinacio", "movement"),
      item("keresztezo_mozgas", "Keresztezo mozgasok", "Vegtag-integracio", "movement"),
      item("szem_kez", "Szem-kez koordinacio", "Pontos dobas/elkapas", "movement"),
      item("szem_lab", "Szem-lab koordinacio", "Labdakezeles", "movement"),
      item("eroadagolas", "Eroadagolas", "Dobas/pattanas kontroll", "movement"),
      item("reakcioido", "Reakcioido", "Szin-mozgas feladat", "movement"),
      item("ritmuserzek", "Ritmuserzek", "Koordinacios letra", "movement"),
      item("mozgassor", "Mozgassor kivitelezes", "Tobblepcsos feladat", "movement"),
      item("praxis", "Praxis / motoros tervezes", "Uj mozdulat tanulasa", "movement"),
      item("terbeli_tajekozodas", "Terbeli tajekozodas", "Palyan beluli mozgasbiztonsag", "movement"),
      item("utkozeskezeles", "Utkozeskezeles", "Testkontaktus tolerancia", "movement"),
      item("gyorsasag", "Gyorsasag", "Rovid tavu intenzitas", "movement"),
      item("allokepesseg", "Allokepesseg", "Feladat vegigvitele", "movement"),
      item("izomtonus", "Izomtonus", "Stabil torzs", "movement"),
      item("finommotorika", "Finommotorika", "Eszkozkezeles", "movement"),
      item("propriocepcio", "Propriocepcio", "Egyensulypada kontroll", "movement"),
      item("mozgasadaptacio", "Mozgasadaptacio", "Szabalyvaltozasra mozgasmodositas", "movement")
    ]
  },
  {
    key: "social",
    title: "Szocialis-erzelmi profil",
    weight: 0.3,
    items: [
      item("kooperacio", "Kooperacio", "Csapatban aktiv reszvetel", "social"),
      item("szabalykovetes", "Szabalykovetes", "Tudatos betartas", "social"),
      item("varakozasi_tolerancia", "Varakozasi tolerancia", "Sorban allas", "social"),
      item("kudarctures", "Kudarctures", "Hibara adott reakcio", "social"),
      item("gyozelem_kezelese", "Gyozelem kezelese", "Nem dominans viselkedes", "social"),
      item("erzelemszabalyozas", "Erzelemszabalyozas", "Indulatkontroll", "social"),
      item("empatia", "Empatia", "Segitokeszseg", "social"),
      item("kapcsolatkezdemenyezes", "Kapcsolatkezdemenyezes", "Kommunikacio inditasa", "social"),
      item("instrukcio_elfogadas", "Instrukcio elfogadas", "Edzoi iranyitas elfogadasa", "social"),
      item("szerepvallalas", "Dominancia-passzivitas arany", "Szerepvallalas", "social"),
      item("fair_play", "Fair play attitud", "Szabalysertesre reakcio", "social"),
      item("konfliktuskezeles", "Konfliktuskezeles", "Helyzetmegoldas", "social"),
      item("motivacio", "Motivacio tipusa", "Belso vs kulso hajtoero", "social"),
      item("kitartas", "Kitartas", "Nehez feladat befejezese", "social"),
      item("onbizalom", "Onbizalom", "Sajat teljesitmeny megitelese", "social")
    ]
  },
  {
    key: "mental",
    title: "Psziches-mentalis profil",
    weight: 0.2,
    items: [
      item("figyelmi_fokusz", "Figyelmi fokusz", "Feladattartas", "mental"),
      item("megosztott_figyelem", "Megosztott figyelem", "Mozgas + kulso inger", "mental"),
      item("munkamemoria", "Munkamemoria", "Mozgassor megjegyzese", "mental"),
      item("kognitiv_rugalmassag", "Kognitiv rugalmassag", "Szabalyvaltas kezelese", "mental"),
      item("impulzuskontroll", "Impulzuskontroll", "Reakcio kesleltetese", "mental"),
      item("tervezes", "Tervezes", "Elorelato mozgas", "mental"),
      item("onjavitas", "Onjavitas", "Hibabol korrekcio", "mental"),
      item("terhelhetoseg", "Mentalis terhelhetoseg", "Mentalis faradas jelei", "mental"),
      item("teljesitmenyszorongas", "Teljesitmenyszorongas", "Versenyhelyzet reakcio", "mental"),
      item("celorientacio", "Celorientacio", "Sajat cel megfogalmazasa", "mental")
    ]
  }
];

export const rapidSections: ScoreSection[] = [
  {
    key: "movement",
    title: "Rapid bio",
    weight: 1 / 3,
    items: [
      item("labboltozat", "Labboltozat aktivitas", "Sarkon/labujjhegy jaras", "movement"),
      item("egyensuly_rapid", "Egyensuly", "Egy labon allas 10 mp", "movement"),
      item("szokdeles", "Szokdeles szimmetria", "Paros szokdeles vonalon", "movement"),
      item("testtartas", "Testtartas alaphelyzet", "Allas, tengelyek, kompenzacio", "movement")
    ]
  },
  {
    key: "mental",
    title: "Rapid pszicho",
    weight: 1 / 3,
    items: [
      item("figyelem_rapid", "Figyelmi fokusz", "Gyors instrukcio kovetes", "mental"),
      item("feladatmegertes", "Feladatmegertes", "Instrukcio ertese", "mental"),
      item("kitartas_rapid", "Kitartas", "Feladat vegigvitele", "mental"),
      item("frusztracio", "Frusztraciokezeles", "Hibara adott reakcio", "mental")
    ]
  },
  {
    key: "social",
    title: "Rapid szocialis",
    weight: 1 / 3,
    items: [
      item("egyuttmukodes_rapid", "Egyuttmukodes", "Paros/csoportos feladat", "social"),
      item("szabalykovetes_rapid", "Szabalykovetes", "Mini versenyhelyzet", "social"),
      item("kommunikacio_rapid", "Kommunikacio", "Valasz, kezdemenyezes", "social"),
      item("versenyreakcio", "Versenyhelyzet reakcio", "Gyozelem/vereseg kezelese", "social")
    ]
  }
];

export function sectionsForMode(mode: AssessmentMode): ScoreSection[] {
  return mode === "full" ? fullSections : rapidSections;
}
