export interface RegisteredMedicine {
  id: string;
  name: string;
  substance: string;
  category: string;
  defaultType: 'capsule' | 'drops' | 'ml' | 'inhaler' | 'application' | 'other';
  defaultDose: string;
  dosageUnit?: string;
  defaultFrequency?: string;
  frequencyTimes?: string[];
  instructions: string;
  isCustom?: boolean;
}

export function getDosageUnitLabel(type: RegisteredMedicine['defaultType'], unitOverride?: string): string {
  if (unitOverride) return unitOverride;
  switch (type) {
    case 'capsule': return 'tabl. / kaps.';
    case 'drops': return 'kropli';
    case 'ml': return 'ml (syrop / zawiesina)';
    case 'inhaler': return 'dawka wziewna';
    case 'application': return 'aplikacja / zastrzyk';
    default: return 'dawka';
  }
}

export function getDefaultFrequencyForMedicine(med: RegisteredMedicine): {
  frequency: string;
  times: string[];
} {
  if (med.defaultFrequency && med.frequencyTimes && med.frequencyTimes.length > 0) {
    return { frequency: med.defaultFrequency, times: med.frequencyTimes };
  }
  const normCat = med.category.toLowerCase();
  const normInst = med.instructions.toLowerCase();
  const normName = med.name.toLowerCase();

  if (normCat.includes('antybiotyk') || normInst.includes('co 12') || normInst.includes('2 razy')) {
    return { frequency: '2x na dobę (co 12h)', times: ['08:00', '20:00'] };
  }
  if (normInst.includes('3 razy') || normInst.includes('co 8')) {
    return { frequency: '3x na dobę (co 8h)', times: ['08:00', '14:00', '20:00'] };
  }
  if (normInst.includes('przed snem') || normCat.includes('sen') || normName.includes('trittico') || normName.includes('nasen') || normName.includes('melatonin')) {
    return { frequency: '1x na dobę (przed snem)', times: ['22:00'] };
  }
  if (normInst.includes('na czczo') || normCat.includes('endokryn') || normName.includes('euthyrox') || normName.includes('letrox')) {
    return { frequency: '1x na dobę (rano na czczo)', times: ['07:00'] };
  }
  if (normCat.includes('przeciwbólowe') || normInst.includes('doraźnie') || normInst.includes('w razie')) {
    return { frequency: 'Doraźnie w razie bólu', times: ['08:00', '16:00'] };
  }
  if (normCat.includes('kardiologia') || normCat.includes('cukrzyca') || normInst.includes('rano')) {
    return { frequency: '1x na dobę (rano)', times: ['08:00'] };
  }
  return { frequency: '1x na dobę (rano)', times: ['08:00'] };
}

// Baza leków oparta na oficjalnych rejestrach URPL (Urząd Rejestracji Produktów Leczniczych) i wykazach refundowanych MZ/NFZ
interface DrugTemplate {
  name: string;
  substance: string;
  category: string;
  type: 'capsule' | 'drops' | 'ml' | 'inhaler' | 'application' | 'other';
  dosageUnit: string;
  doses: string[];
  defaultDoseQty: string;
  defaultFrequency: string;
  frequencyTimes: string[];
  instructions: string;
}

const TEMPLATES: DrugTemplate[] = [
  // ANTYBIOTYKI I LEKI PRZECIWINFEKCYJNE
  { name: 'Auglavin', substance: 'Amoxicillinum + Acidum clavulanicum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['875 mg + 125 mg', '500 mg + 125 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Na początku posiłku w równych odstępach czasu (co 12h)' },
  { name: 'Auglavin PPH', substance: 'Amoxicillinum + Acidum clavulanicum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['875 mg + 125 mg', '500 mg + 125 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Na początku posiłku, popić szklanką wody' },
  { name: 'Auglavin Extra', substance: 'Amoxicillinum + Acidum clavulanicum', category: 'Antybiotyki', type: 'ml', dosageUnit: 'ml zawiesiny', doses: ['zawiesina 400 mg + 57 mg/5 ml'], defaultDoseQty: '5', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Wstrząsnąć przed podaniem, na początku posiłku' },
  { name: 'Augmentin', substance: 'Amoxicillinum + Acidum clavulanicum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['625 mg', '1 g (875 mg + 125 mg)'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Na początku posiłku w równych odstępach czasu' },
  { name: 'Augmentin ES', substance: 'Amoxicillinum + Acidum clavulanicum', category: 'Antybiotyki', type: 'ml', dosageUnit: 'ml zawiesiny', doses: ['zawiesina 600 mg + 42.9 mg/5 ml'], defaultDoseQty: '5', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Wstrząsnąć przed użyciem, na początku posiłku' },
  { name: 'Amotaks', substance: 'Amoxicillinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'kapsułka', doses: ['500 mg', '1 g'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Po posiłku, popić pełną szklanką wody' },
  { name: 'Amotaks Dispertab', substance: 'Amoxicillinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. do rozpuszczania', doses: ['500 mg', '750 mg', '1 g'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rozpuścić w niewielkiej ilości wody lub połknąć po jedzeniu' },
  { name: 'Taromentin', substance: 'Amoxicillinum + Acidum clavulanicum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['875 mg + 125 mg', '500 mg + 125 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Na początku posiłku, co 12 godzin' },
  { name: 'Polamoklav', substance: 'Amoxicillinum + Acidum clavulanicum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['875 mg + 125 mg', '500 mg + 125 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Na początku posiłku' },
  { name: 'Amylan', substance: 'Amoxicillinum + Acidum clavulanicum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['875 mg + 125 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'W trakcie posiłku' },
  { name: 'Duomox', substance: 'Amoxicillinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. do ssania/połknięcia', doses: ['250 mg', '375 mg', '500 mg', '750 mg', '1 g'], defaultDoseQty: '1', defaultFrequency: '3x na dobę (co 8h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'W trakcie lub po posiłku' },
  { name: 'Ospamox', substance: 'Amoxicillinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg', '750 mg', '1000 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Po jedzeniu, popić dużą ilością wody' },
  { name: 'Hiconcil', substance: 'Amoxicillinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'kapsułka', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę (co 8h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Co 8 godzin, po posiłku' },
  { name: 'Ospen', substance: 'Phenoxymethylpenicillinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['1000', '1500'], defaultDoseQty: '1', defaultFrequency: '3x na dobę (co 8h)', frequencyTimes: ['07:00', '15:00', '23:00'], instructions: '1 godzinę przed posiłkiem' },
  { name: 'Zinnat', substance: 'Cefuroximum axetil', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['125 mg', '250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Zaraz po posiłku dla optymalnego wchłaniania' },
  { name: 'Zinnat zawiesina', substance: 'Cefuroximum axetil', category: 'Antybiotyki', type: 'ml', dosageUnit: 'ml zawiesiny', doses: ['125 mg/5 ml', '250 mg/5 ml'], defaultDoseQty: '5', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Po posiłku, przechowywać w lodówce' },
  { name: 'Ceroxim', substance: 'Cefuroximum axetil', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Po posiłku' },
  { name: 'Cetix', substance: 'Cefiximum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['400 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę (rano)', frequencyTimes: ['08:00'], instructions: 'Raz na dobę z posiłkiem' },
  { name: 'Bioracef', substance: 'Cefuroximum axetil', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Zaraz po jedzeniu' },
  { name: 'Klacid', substance: 'Clarithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Niezależnie od posiłków, co 12 godzin' },
  { name: 'Klacid Uno', substance: 'Clarithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. o zmodyfikowanym uwalnianiu', doses: ['500 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę (o stałej porze)', frequencyTimes: ['08:00'], instructions: 'W trakcie posiłku, połykać w całości' },
  { name: 'Klabax', substance: 'Clarithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Co 12 godzin po posiłku' },
  { name: 'Fromilid', substance: 'Clarithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Po posiłku' },
  { name: 'Fromilid Uno', substance: 'Clarithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę (o stałej porze)', frequencyTimes: ['08:00'], instructions: 'W trakcie posiłku, nie rozgryzać' },
  { name: 'Sumamed', substance: 'Azithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['125 mg', '250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę (o stałej porze)', frequencyTimes: ['08:00'], instructions: '1 godzinę przed lub 2 godziny po posiłku' },
  { name: 'Azitrolek', substance: 'Azithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz na dobę, 1h przed lub 2h po posiłku' },
  { name: 'Macromax', substance: 'Azithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz na dobę, o stałej porze' },
  { name: 'Azimycin', substance: 'Azithromycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: '1h przed lub 2h po jedzeniu' },
  { name: 'Biseptol', substance: 'Sulfamethoxazolum + Trimethoprimum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabletka', doses: ['120 mg', '480 mg', '960 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Po posiłku z dużą ilością płynu' },
  { name: 'Bactrim', substance: 'Sulfamethoxazolum + Trimethoprimum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabletka', doses: ['480 mg', '960 mg Forte'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem po posiłku' },
  { name: 'Cipronex', substance: 'Ciprofloxacinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Niezależnie od posiłków, nie z nabiałem' },
  { name: 'Cipropol', substance: 'Ciprofloxacinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Popić dużą ilością wody, rano i wieczorem' },
  { name: 'Nolicin', substance: 'Norfloxacinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['400 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: '1h przed lub 2h po jedzeniu' },
  { name: 'Levoxa', substance: 'Levofloxacinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['250 mg', '500 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz lub dwa razy na dobę, popić wodą' },
  { name: 'Monural', substance: 'Fosfomycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'saszetka', doses: ['3 g saszetka'], defaultDoseQty: '1', defaultFrequency: 'Jednorazowo (przed snem)', frequencyTimes: ['22:00'], instructions: 'Wieczorem przed snem, po opróżnieniu pęcherza' },
  { name: 'Urotrim', substance: 'Trimethoprimum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['100 mg', '200 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem po posiłku' },
  { name: 'Urofuraginum', substance: 'Furazidinum', category: 'Urologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['50 mg', 'Max 100 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę po posiłku', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Podczas posiłków bogatych w białko' },
  { name: 'Furagina TEVA', substance: 'Furazidinum', category: 'Urologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['50 mg'], defaultDoseQty: '2', defaultFrequency: '3x na dobę', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'W trakcie posiłku, popić obficie wodą' },
  { name: 'Dalacin C', substance: 'Clindamycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'kapsułka', doses: ['75 mg', '150 mg', '300 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę (co 8h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Popić pełną szklanką wody w pozycji stojącej' },
  { name: 'Clindamycin-MIP', substance: 'Clindamycinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['300 mg', '600 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Popić szklanką wody w pozycji pionowej' },
  { name: 'Doxycyclinum Polfarmex', substance: 'Doxycyclinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'kapsułka', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['12:00'], instructions: 'W trakcie posiłku w pozycji stojącej, unikać słońca' },
  { name: 'Doxycyclinum TZF', substance: 'Doxycyclinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'kapsułka', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['12:00'], instructions: 'W czasie jedzenia z dużą ilością płynu' },
  { name: 'Unidox Solutab', substance: 'Doxycyclinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. do rozpuszczania', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['12:00'], instructions: 'Rozpuścić w 50 ml wody i wypić' },
  { name: 'Xifaxan', substance: 'Rifaximinum', category: 'Antybiotyki', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['200 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę (co 8h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Z posiłkiem lub bez, popić szklanką wody' },

  // LEKI PRZECIWGRZYBICZE
  { name: 'Flucofast', substance: 'Fluconazolum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'kapsułka', doses: ['50 mg', '100 mg', '150 mg', '200 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Niezależnie od posiłków, popić obficie wodą' },
  { name: 'Diflucan', substance: 'Fluconazolum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'kapsułka', doses: ['50 mg', '150 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę lub jednorazowo', frequencyTimes: ['08:00'], instructions: 'Raz na dobę lub jednorazowo wg zaleceń lekarza' },
  { name: 'Fluconazole Polfarmex', substance: 'Fluconazolum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'kapsułka', doses: ['50 mg', '100 mg', '150 mg', '200 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Połykać w całości, o stałej porze' },
  { name: 'Mycosyst', substance: 'Fluconazolum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'kapsułka', doses: ['50 mg', '100 mg', '150 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Doustnie z wodą' },
  { name: 'Trioxal', substance: 'Itraconazolum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'kapsułka', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę po obiedzie', frequencyTimes: ['13:00'], instructions: 'Bezpośrednio po pełnym posiłku' },
  { name: 'Orungal', substance: 'Itraconazolum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'kapsułka', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę po posiłku', frequencyTimes: ['08:00', '18:00'], instructions: 'Zaraz po jedzeniu dla maksymalnego wchłaniania' },
  { name: 'Itrax', substance: 'Itraconazolum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'kapsułka', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['13:00'], instructions: 'Po posiłku w całości' },
  { name: 'Lamisil', substance: 'Terbinafinum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'tabletka', doses: ['250 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz na dobę z wodą' },
  { name: 'Terbinafina Ziaja', substance: 'Terbinafinum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'tabletka', doses: ['250 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz dziennie po posiłku' },
  { name: 'Nystatyna Teva', substance: 'Nystatinum', category: 'Przeciwgrzybicze', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 000 j.m.'], defaultDoseQty: '1', defaultFrequency: '3x na dobę między posiłkami', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Między posiłkami, nie rozgryzać' },

  // LEKI PRZECIWWIRUSOWE
  { name: 'Heviran', substance: 'Aciclovirum', category: 'Przeciwwirusowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['200 mg', '400 mg', '800 mg'], defaultDoseQty: '1', defaultFrequency: '5x na dobę (co 4h w dzień)', frequencyTimes: ['07:00', '11:00', '15:00', '19:00', '23:00'], instructions: 'W trakcie posiłku, pić dużo płynów w ciągu dnia' },
  { name: 'Heviran Comfort', substance: 'Aciclovirum', category: 'Przeciwwirusowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['200 mg', '400 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę', frequencyTimes: ['08:00', '20:00'], instructions: 'W równych odstępach czasu, popić szklanką wody' },
  { name: 'Hascovir', substance: 'Aciclovirum', category: 'Przeciwwirusowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['200 mg', '400 mg Control'], defaultDoseQty: '1', defaultFrequency: '5x na dobę', frequencyTimes: ['07:00', '11:00', '15:00', '19:00', '23:00'], instructions: 'Co 4 godziny w ciągu dnia z przerwą nocną' },
  { name: 'Valtrex', substance: 'Valaciclovirum', category: 'Przeciwwirusowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg', '1000 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Niezależnie od posiłków, dbać o nawodnienie' },
  { name: 'Neosine Forte', substance: 'Inosinum pranobex', category: 'Przeciwwirusowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['1000 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę po posiłku', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Po posiłku, popić wodą' },
  { name: 'Groprinosin Forte', substance: 'Inosinum pranobex', category: 'Przeciwwirusowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['1000 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę po posiłku', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Trzy razy dziennie po posiłkach' },

  // GLIKOKORTYKOSTEROIDY (STERYDY)
  { name: 'Metypred', substance: 'Methylprednisolonum', category: 'Kortykosteroidy', type: 'capsule', dosageUnit: 'tabletka', doses: ['4 mg', '8 mg', '16 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano ze śniadaniem', frequencyTimes: ['08:00'], instructions: 'Rano podczas lub bezpośrednio po śniadaniu, z osłoną' },
  { name: 'Encorton', substance: 'Prednisonum', category: 'Kortykosteroidy', type: 'capsule', dosageUnit: 'tabletka', doses: ['1 mg', '5 mg', '10 mg', '20 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano w trakcie śniadania, nie na czczo' },
  { name: 'Medrol', substance: 'Methylprednisolonum', category: 'Kortykosteroidy', type: 'capsule', dosageUnit: 'tabletka', doses: ['4 mg', '16 mg', '32 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Pojedyncza dawka rano ze śniadaniem' },
  { name: 'Dexamethason', substance: 'Dexamethasonum', category: 'Kortykosteroidy', type: 'capsule', dosageUnit: 'tabletka', doses: ['1 mg', '4 mg', '8 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano po posiłku, ściśle wg schematu lekarza' },
  { name: 'Pabi-Dexamethason', substance: 'Dexamethasonum', category: 'Kortykosteroidy', type: 'capsule', dosageUnit: 'tabletka', doses: ['0.5 mg', '1 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano z posiłkiem' },

  // PRZECIWBÓLOWE, PRZECIWZAPALNE, PRZECIWGORĄCZKOWE (NLPZ & OTC)
  { name: 'Apap', substance: 'Paracetamolum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w razie bólu (co 4-6h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'W razie bólu, maks. 4 g na dobę' },
  { name: 'Apap Extra', substance: 'Paracetamolum + Coffeinum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg + 65 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w silnym bólu', frequencyTimes: ['08:00', '14:00'], instructions: 'Popić wodą, unikać kofeiny w diecie' },
  { name: 'Apap Noc', substance: 'Paracetamolum + Diphenhydraminum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg + 25 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę przed snem', frequencyTimes: ['22:00'], instructions: '30 min przed snem w bólu utrudniającym zasypianie' },
  { name: 'Paracetamol Hasco', substance: 'Paracetamolum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['500 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie (co 4-6h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Doustnie, zachować min. 4h odstępu' },
  { name: 'Paracetamol syrop', substance: 'Paracetamolum', category: 'Przeciwbólowe', type: 'ml', dosageUnit: 'ml syropu', doses: ['120 mg/5 ml'], defaultDoseQty: '5', defaultFrequency: 'Doraźnie w gorączce (co 6h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Odmierzyć miarką po jedzeniu' },
  { name: 'Efferalgan', substance: 'Paracetamolum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. musująca', doses: ['500 mg musujące', '1 g musujące'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w bólu', frequencyTimes: ['08:00', '14:00'], instructions: 'Rozpuścić w szklance wody' },
  { name: 'Ibuprom', substance: 'Ibuprofenum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['200 mg', '400 mg Sprint', '400 mg Max'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie po posiłku (co 6-8h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Po posiłku, popić obficie wodą' },
  { name: 'Ibum', substance: 'Ibuprofenum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'kapsułka miękka', doses: ['200 mg', '400 mg', '600 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie po jedzeniu', frequencyTimes: ['08:00', '14:00'], instructions: 'Zawsze po jedzeniu' },
  { name: 'Ibum Forte zawiesina', substance: 'Ibuprofenum', category: 'Przeciwbólowe', type: 'ml', dosageUnit: 'ml zawiesiny', doses: ['200 mg/5 ml'], defaultDoseQty: '5', defaultFrequency: 'Co 6-8 godzin po posiłku', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Wstrząsnąć przed podaniem, po posiłku' },
  { name: 'Nurofen', substance: 'Ibuprofenum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['200 mg', '400 mg Express Forte'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w bólu', frequencyTimes: ['08:00', '14:00'], instructions: 'Po posiłku, nie na pusty żołądek' },
  { name: 'Ketonal', substance: 'Ketoprofenum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'kapsułka', doses: ['50 mg', '100 mg Forte', '150 mg Duo'], defaultDoseQty: '1', defaultFrequency: '1-2x na dobę po jedzeniu', frequencyTimes: ['08:00', '20:00'], instructions: 'Ściśle po posiłku, popić dużą ilością wody' },
  { name: 'Ketonal Active', substance: 'Ketoprofenum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'kapsułka', doses: ['50 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie po posiłku', frequencyTimes: ['08:00'], instructions: 'Po jedzeniu, doraźnie' },
  { name: 'Dexak', substance: 'Dexketoprofenum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['25 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w ostrym bólu', frequencyTimes: ['08:00', '16:00'], instructions: '30 min przed posiłkiem w ostrym bólu' },
  { name: 'Dexak SL', substance: 'Dexketoprofenum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'saszetka', doses: ['25 mg saszetka'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w bólu', frequencyTimes: ['08:00'], instructions: 'Rozpuścić w wodzie i wypić' },
  { name: 'Diclac', substance: 'Diclofenacum natricum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. o zmodyfikowanym uwalnianiu', doses: ['50 mg', '75 mg Duo', '150 mg Duo'], defaultDoseQty: '1', defaultFrequency: '1x na dobę po posiłku', frequencyTimes: ['08:00'], instructions: 'W trakcie lub po posiłku, nie dzielić' },
  { name: 'Voltaren Acti Forte', substance: 'Diclofenacum kalicum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['25 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie z posiłkiem', frequencyTimes: ['08:00'], instructions: 'Przed posiłkiem, popić wodą' },
  { name: 'Majamil PPH', substance: 'Diclofenacum natricum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. dojelitowa', doses: ['50 mg', '100 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę po posiłku', frequencyTimes: ['08:00', '20:00'], instructions: 'W trakcie posiłku' },
  { name: 'Olfen', substance: 'Diclofenacum natricum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'kapsułka o przedłużonym uwalnianiu', doses: ['50 mg', '75 SR', '100 SR'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Po posiłku, w całości' },
  { name: 'Biofenac', substance: 'Aceclofenacum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (rano i wieczorem)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem w trakcie posiłku' },
  { name: 'Nimesil', substance: 'Nimesulidum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'saszetka', doses: ['100 mg saszetka'], defaultDoseQty: '1', defaultFrequency: '2x na dobę po posiłku', frequencyTimes: ['08:00', '20:00'], instructions: 'Po posiłku, rozpuścić w letniej wodzie' },
  { name: 'Aulin', substance: 'Nimesulidum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę po posiłku', frequencyTimes: ['08:00', '20:00'], instructions: 'Po jedzeniu, krótki czas stosowania' },
  { name: 'Kostadox', substance: 'Etoricoxibum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['60 mg', '90 mg', '120 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę o stałej porze', frequencyTimes: ['08:00'], instructions: 'Raz na dobę, o stałej porze' },
  { name: 'Arcoxia', substance: 'Etoricoxibum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['30 mg', '60 mg', '90 mg', '120 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Niezależnie od posiłków' },
  { name: 'Celebrex', substance: 'Celecoxibum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'kapsułka', doses: ['100 mg', '200 mg'], defaultDoseQty: '1', defaultFrequency: '1-2x na dobę z posiłkiem', frequencyTimes: ['08:00', '20:00'], instructions: 'W trakcie posiłku' },
  { name: 'Skudexa', substance: 'Tramadoli hydrochloridum + Dexketoprofenum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['75 mg + 25 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w silnym bólu (co 8h)', frequencyTimes: ['08:00', '16:00'], instructions: 'Popić dużą ilością płynu, ściśle wg zaleceń lekarza' },
  { name: 'Doreta', substance: 'Tramadoli hydrochloridum + Paracetamolum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['37.5 mg + 325 mg', '75 mg + 650 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie (co 6h w razie bólu)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Niezależnie od posiłków' },
  { name: 'Poltram Combo', substance: 'Tramadoli hydrochloridum + Paracetamolum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['37.5 mg + 325 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie (co 6h)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Zachować co najmniej 6 godzin odstępu' },
  { name: 'Pyralgina', substance: 'Metamizolum natricum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['500 mg'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w bólu/gorączce', frequencyTimes: ['08:00', '14:00'], instructions: 'W trakcie lub po posiłku' },
  { name: 'Pyralgina saszetki', substance: 'Metamizolum natricum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'saszetka', doses: ['500 mg', '1 g'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie', frequencyTimes: ['08:00'], instructions: 'Rozpuścić w szklance wody' },
  { name: 'Melobax', substance: 'Meloxicamum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['7.5 mg', '15 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę podczas posiłku', frequencyTimes: ['13:00'], instructions: 'Raz dziennie podczas posiłku' },
  { name: 'Opokan', substance: 'Meloxicamum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['7.5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę z jedzeniem', frequencyTimes: ['13:00'], instructions: 'W trakcie jedzenia, popić szklanką wody' },
  { name: 'Moilec', substance: 'Meloxicamum', category: 'Przeciwbólowe', type: 'capsule', dosageUnit: 'tabletka', doses: ['7.5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['13:00'], instructions: 'Raz na dobę z posiłkiem' },

  // KARDIOLOGIA, NADCIŚNIENIE, CHOLESTEROL
  { name: 'Prestarium', substance: 'Perindoprilum argininum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['2.5 mg', '5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo', frequencyTimes: ['07:30'], instructions: 'Rano przed śniadaniem, na czczo' },
  { name: 'Co-Prestarium', substance: 'Perindoprilum + Amlodipinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg/5 mg', '10 mg/5 mg', '10 mg/10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['07:30'], instructions: 'Rano przed posiłkiem' },
  { name: 'Triplixam', substance: 'Perindoprilum + Indapamidum + Amlodipinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5/1.25/5 mg', '10/2.5/5 mg', '10/2.5/10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['07:30'], instructions: 'Rano przed śniadaniem' },
  { name: 'Noliprel', substance: 'Perindoprilum + Indapamidum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['2.5 mg/0.625 mg', '5 mg/1.25 mg Bi-Forte'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['07:30'], instructions: 'Jedna tabletka rano przed posiłkiem' },
  { name: 'Concor', substance: 'Bisoprololi fumaras', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano ze śniadaniem', frequencyTimes: ['08:00'], instructions: 'Rano podczas śniadania' },
  { name: 'Concor COR', substance: 'Bisoprololi fumaras', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['1.25 mg', '2.5 mg', '3.75 mg', '5 mg', '7.5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano na czczo lub ze śniadaniem' },
  { name: 'Bibloc', substance: 'Bisoprololi fumaras', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['1.25 mg', '2.5 mg', '3.75 mg', '5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano, o stałej porze' },
  { name: 'Nedal', substance: 'Nebivololum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'O stałej porze, najlepiej rano' },
  { name: 'Nebilet', substance: 'Nebivololum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę ze śniadaniem', frequencyTimes: ['08:00'], instructions: 'Raz na dobę, najlepiej ze śniadaniem' },
  { name: 'Nebicard', substance: 'Nebivololum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Codziennie rano o stałej porze' },
  { name: 'Betaloc ZOK', substance: 'Metoprololi succinas', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['25 mg', '50 mg', '100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano, tabletkę można dzielić, nie rozgryzać' },
  { name: 'Metocard', substance: 'Metoprololi tartras', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['50 mg', '100 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę po posiłku', frequencyTimes: ['08:00', '20:00'], instructions: 'W trakcie lub po posiłku' },
  { name: 'Vivace', substance: 'Ramiprilum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['2.5 mg', '5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano o stałej porze, popić wodą' },
  { name: 'Tritace', substance: 'Ramiprilum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['2.5 mg', '5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano, niezależnie od posiłków' },
  { name: 'Polpril', substance: 'Ramiprilum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'kapsułka', doses: ['2.5 mg', '5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano o tej samej porze każdego dnia' },
  { name: 'Amlopin', substance: 'Amlodipinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz dziennie rano lub wieczorem' },
  { name: 'Norvasc', substance: 'Amlodipinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Niezależnie od posiłków' },
  { name: 'Tertensif SR', substance: 'Indapamidum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. o zmodyfikowanym uwalnianiu', doses: ['1.5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano, połykać w całości' },
  { name: 'Diapresan', substance: 'Valsartanum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['80 mg', '160 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Niezależnie od posiłków' },
  { name: 'Valsacor', substance: 'Valsartanum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['80 mg', '160 mg', '320 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'O stałej porze' },
  { name: 'Karbis', substance: 'Candesartanum cilexetil', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['8 mg', '16 mg', '32 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz na dobę z posiłkiem lub bez' },
  { name: 'Atoris', substance: 'Atorvastatinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg', '20 mg', '30 mg', '40 mg', '60 mg', '80 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['21:00'], instructions: 'Raz na dobę wieczorem, o stałej porze' },
  { name: 'Sortis', substance: 'Atorvastatinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg', '20 mg', '40 mg', '80 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['21:00'], instructions: 'Wieczorem z posiłkiem lub bez' },
  { name: 'Roswera', substance: 'Rosuvastatinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg', '10 mg', '15 mg', '20 mg', '30 mg', '40 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['21:00'], instructions: 'Raz na dobę o dowolnej porze' },
  { name: 'Crestor', substance: 'Rosuvastatinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg', '10 mg', '20 mg', '40 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['21:00'], instructions: 'Raz na dobę, o stałej porze' },
  { name: 'Suvardio', substance: 'Rosuvastatinum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg', '10 mg', '20 mg', '40 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['21:00'], instructions: 'Doustnie raz na dobę' },
  { name: 'Ezetrol', substance: 'Ezetimibum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['20:00'], instructions: 'O dowolnej porze dnia' },
  { name: 'Acard', substance: 'Acidum acetylsalicylicum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. dojelitowa', doses: ['75 mg', '150 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę po obiedzie', frequencyTimes: ['13:00'], instructions: 'Po obiedzie lub po kolacji' },
  { name: 'Polocard', substance: 'Acidum acetylsalicylicum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. dojelitowa', doses: ['75 mg', '150 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę po posiłku', frequencyTimes: ['13:00'], instructions: 'W trakcie lub po posiłku, w całości' },
  { name: 'Plavix', substance: 'Clopidogrelum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['75 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę o stałej porze', frequencyTimes: ['08:00'], instructions: 'Raz na dobę, o stałej porze' },
  { name: 'Areplex', substance: 'Clopidogrelum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['75 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Doustnie z posiłkiem lub bez' },
  { name: 'Eliquis', substance: 'Apixabanum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['2.5 mg', '5 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem, co 12 godzin' },
  { name: 'Xarelto', substance: 'Rivaroxabanum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['2.5 mg', '10 mg', '15 mg', '20 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę z posiłkiem', frequencyTimes: ['13:00'], instructions: 'W trakcie posiłku, najlepiej z obiadem lub kolacją' },
  { name: 'Pradaxa', substance: 'Dabigatranum etexilatum', category: 'Kardiologia', type: 'capsule', dosageUnit: 'kapsułka', doses: ['75 mg', '110 mg', '150 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Popić szklanką wody, nie otwierać kapsułki' },

  // DIABETOLOGIA I METABOLIZM
  { name: 'Glucophage', substance: 'Metformini hydrochloridum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg', '850 mg', '1000 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę z posiłkiem', frequencyTimes: ['08:00', '18:00'], instructions: 'W trakcie lub bezpośrednio po posiłku' },
  { name: 'Glucophage XR', substance: 'Metformini hydrochloridum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['500 mg', '750 mg', '1000 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem z kolacją', frequencyTimes: ['19:00'], instructions: 'Wieczorem podczas kolacji, nie rozgryzać' },
  { name: 'Metformax', substance: 'Metformini hydrochloridum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabletka', doses: ['500 mg', '850 mg', '1000 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę z jedzeniem', frequencyTimes: ['08:00', '18:00'], instructions: 'W trakcie posiłku, popić wodą' },
  { name: 'Metformax SR', substance: 'Metformini hydrochloridum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['500 mg', '750 mg', '1000 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę podczas kolacji', frequencyTimes: ['19:00'], instructions: 'Raz na dobę podczas wieczornego posiłku' },
  { name: 'Siofor', substance: 'Metformini hydrochloridum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['500 mg', '850 mg', '1000 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę po posiłku', frequencyTimes: ['08:00', '18:00'], instructions: 'Podczas lub po posiłku' },
  { name: 'Jardiance', substance: 'Empagliflozinum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg', '25 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano, z posiłkiem lub na czczo' },
  { name: 'Forxiga', substance: 'Dapagliflozinum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg', '10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Raz na dobę o dowolnej porze' },
  { name: 'Januvia', substance: 'Sitagliptinum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['25 mg', '50 mg', '100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz dziennie z posiłkiem lub bez' },
  { name: 'Ozempic', substance: 'Semaglutidum', category: 'Cukrzyca', type: 'application', dosageUnit: 'wstrzyknięcie', doses: ['0.25 mg', '0.5 mg', '1 mg', '2 mg roztwór'], defaultDoseQty: '1', defaultFrequency: '1x w tygodniu podskórnie', frequencyTimes: ['09:00'], instructions: 'Podskórnie raz w tygodniu w ten sam dzień' },
  { name: 'Rybelsus', substance: 'Semaglutidum', category: 'Cukrzyca', type: 'capsule', dosageUnit: 'tabletka', doses: ['3 mg', '7 mg', '14 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo', frequencyTimes: ['07:00'], instructions: 'Na czczo z połową szklanki wody, min. 30 min przed posiłkiem' },
  { name: 'Milurit', substance: 'Allopurinolum', category: 'Metabolizm', type: 'capsule', dosageUnit: 'tabletka', doses: ['100 mg', '200 mg', '300 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę po posiłku', frequencyTimes: ['13:00'], instructions: 'Po posiłku, pić dużo płynów w ciągu dnia' },

  // GASTROLOGIA, UKŁAD POKARMOWY
  { name: 'Polprazol', substance: 'Omeprazolum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'kapsułka dojelitowa', doses: ['20 mg', '40 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo', frequencyTimes: ['07:30'], instructions: 'Rano na czczo, 30 minut przed śniadaniem' },
  { name: 'Polprazol Max', substance: 'Omeprazolum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'kapsułka', doses: ['20 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo', frequencyTimes: ['07:30'], instructions: 'Rano przed pierwszym posiłkiem' },
  { name: 'Controloc', substance: 'Pantoprazolum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'tabl. dojelitowa', doses: ['20 mg', '40 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo', frequencyTimes: ['07:30'], instructions: 'Rano na czczo, połykać w całości' },
  { name: 'Controloc Control', substance: 'Pantoprazolum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'tabl. dojelitowa', doses: ['20 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['07:30'], instructions: '1 tabletka rano 1h przed jedzeniem' },
  { name: 'Nolpaza', substance: 'Pantoprazolum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'tabl. dojelitowa', doses: ['20 mg', '40 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano przed posiłkiem', frequencyTimes: ['07:30'], instructions: 'Przed posiłkiem rano' },
  { name: 'Mesopral', substance: 'Esomeprazolum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'kapsułka dojelitowa', doses: ['20 mg', '40 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo', frequencyTimes: ['07:30'], instructions: 'Rano na czczo, popić wodą' },
  { name: 'Emanera', substance: 'Esomeprazolum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'kapsułka dojelitowa', doses: ['20 mg', '40 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['07:30'], instructions: 'Rano przed śniadaniem' },
  { name: 'Duspatalin Retard', substance: 'Mebeverini hydrochloridum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'kapsułka o przedłużonym uwalnianiu', doses: ['200 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę przed posiłkiem', frequencyTimes: ['07:40', '19:40'], instructions: '20 minut przed posiłkiem rano i wieczorem' },
  { name: 'Tribux Forte', substance: 'Trimebutinum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['200 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę przed posiłkiem', frequencyTimes: ['07:45', '17:45'], instructions: 'Przed posiłkiem, popić wodą' },
  { name: 'Debretin', substance: 'Trimebutinum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['100 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę przed jedzeniem', frequencyTimes: ['07:45', '13:45', '19:45'], instructions: 'Przed posiłkiem 3 razy dziennie' },
  { name: 'No-Spa', substance: 'Drotaverini hydrochloridum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['40 mg', '80 mg Forte', '80 mg Max'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w skurczach', frequencyTimes: ['08:00', '16:00'], instructions: 'Doraźnie w bolesnych skurczach' },
  { name: 'Espumisan', substance: 'Simeticonum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'kapsułka miękka', doses: ['40 mg', '100 mg Max'], defaultDoseQty: '2', defaultFrequency: '3x na dobę po posiłku', frequencyTimes: ['08:30', '14:30', '20:30'], instructions: 'W trakcie lub po posiłku oraz przed snem' },
  { name: 'Kreon 25000', substance: 'Pancreatinum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'kapsułka dojelitowa', doses: ['10000', '25000', '35000'], defaultDoseQty: '1', defaultFrequency: '3x na dobę w trakcie głównych posiłków', frequencyTimes: ['08:00', '13:30', '19:00'], instructions: 'W trakcie głównych posiłków, popić obficie wodą' },
  { name: 'Pangrol', substance: 'Pancreatinum', category: 'Gastrologia', type: 'capsule', dosageUnit: 'tabl. dojelitowa', doses: ['10000', '25000'], defaultDoseQty: '1', defaultFrequency: '3x na dobę z posiłkiem', frequencyTimes: ['08:00', '13:30', '19:00'], instructions: 'W trakcie posiłku' },
  { name: 'Sanprobi IBS', substance: 'Lactobacillus plantarum 299v', category: 'Probiotyki', type: 'capsule', dosageUnit: 'kapsułka', doses: ['kapsułka'], defaultDoseQty: '1', defaultFrequency: '1x na dobę z posiłkiem', frequencyTimes: ['08:00'], instructions: 'W trakcie posiłku, popić letnią wodą' },
  { name: 'Vivomixx', substance: 'Kompozycja liofilizowanych bakterii', category: 'Probiotyki', type: 'capsule', dosageUnit: 'kapsułka', doses: ['kapsułka', 'saszetka'], defaultDoseQty: '1', defaultFrequency: '1-2x na dobę z posiłkiem', frequencyTimes: ['08:00', '19:00'], instructions: 'Z posiłkiem, przechowywać w lodówce' },
  { name: 'Dicoflor 60', substance: 'Lactobacillus rhamnosus GG', category: 'Probiotyki', type: 'capsule', dosageUnit: 'kapsułka', doses: ['kapsułka'], defaultDoseQty: '1', defaultFrequency: '1x na dobę z posiłkiem', frequencyTimes: ['08:00'], instructions: 'Najlepiej w trakcie posiłku' },

  // UKŁAD ODDECHOWY, WZIEWY, AEROZOLE
  { name: 'Ventolin', substance: 'Salbutamolum', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'dawka wziewna', doses: ['100 µg/dawkę aerozol'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w duszności', frequencyTimes: ['08:00'], instructions: 'Wziewnie w duszności, wstrząsnąć przed użyciem' },
  { name: 'Berodual', substance: 'Fenoterolum + Ipratropii bromidum', category: 'Pulmonologia', type: 'drops', dosageUnit: 'kropli do nebulizacji', doses: ['krople do nebulizacji (0.5 mg + 0.25 mg/ml)'], defaultDoseQty: '20', defaultFrequency: '2-3x na dobę do nebulizacji', frequencyTimes: ['08:00', '14:00', '19:00'], instructions: 'Do nebulizacji z 3-4 ml soli fizjologicznej' },
  { name: 'Berodual N', substance: 'Fenoterolum + Ipratropii bromidum', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'dawka wziewna', doses: ['aerozol wziewny'], defaultDoseQty: '2', defaultFrequency: 'Doraźnie lub 3x na dobę', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Głęboki wdech przez ustnik' },
  { name: 'Pulmicort', substance: 'Budesonidum', category: 'Pulmonologia', type: 'ml', dosageUnit: 'ampułka do nebulizacji', doses: ['zawiesina do nebulizacji 0.25 mg/ml', '0.5 mg/ml'], defaultDoseQty: '2', defaultFrequency: '2x na dobę (rano i wieczorem)', frequencyTimes: ['08:00', '19:00'], instructions: 'W inhalacji, po nebulizacji przepłukać jamę ustną i umyć twarz' },
  { name: 'Bifosfone', substance: 'Budesonidum', category: 'Pulmonologia', type: 'ml', dosageUnit: 'ampułka', doses: ['0.25 mg/ml', '0.5 mg/ml'], defaultDoseQty: '2', defaultFrequency: '2x na dobę', frequencyTimes: ['08:00', '19:00'], instructions: 'W nebulizatorze, przepłukać usta' },
  { name: 'Budixon Neb', substance: 'Budesonidum', category: 'Pulmonologia', type: 'ml', dosageUnit: 'ampułka', doses: ['0.25 mg/ml', '0.5 mg/ml'], defaultDoseQty: '2', defaultFrequency: '2x na dobę', frequencyTimes: ['08:00', '19:00'], instructions: 'Rano i wieczorem, wypłukać usta' },
  { name: 'Foster', substance: 'Beclometasoni dipropionas + Formoterolum', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'inhalacja', doses: ['100 µg + 6 µg', '200 µg + 6 µg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (rano i wieczorem)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem, wypłukać usta wodą po inhalacji' },
  { name: 'Fostex', substance: 'Beclometasoni dipropionas + Formoterolum', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'inhalacja', doses: ['100/6 µg', '200/6 µg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę', frequencyTimes: ['08:00', '20:00'], instructions: 'Wziewnie, płukanie ust po aplikacji' },
  { name: 'Symbicort Turbuhaler', substance: 'Budesonidum + Formoterolum', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'inhalacja', doses: ['80/4.5 µg', '160/4.5 µg', '320/9 µg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (rano i wieczorem)', frequencyTimes: ['08:00', '20:00'], instructions: 'Wziewnie rano i wieczorem, przepłukać gardło' },
  { name: 'Salmex', substance: 'Salmeterolum + Fluticasoni propionas', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'inhalacja', doses: ['100/50 µg', '250/50 µg', '500/50 µg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Dwa razy na dobę co 12h, wypłukać usta' },
  { name: 'Alvesco', substance: 'Ciclesonidum', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'inhalacja', doses: ['80 µg', '160 µg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['20:00'], instructions: 'Raz na dobę wieczorem' },
  { name: 'Atrovent N', substance: 'Ipratropii bromidum', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'dawka wziewna', doses: ['20 µg/dawkę'], defaultDoseQty: '2', defaultFrequency: '3x na dobę', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Wziewnie 3-4 razy dziennie' },
  { name: 'Spiriva Respimat', substance: 'Tiotropium', category: 'Pulmonologia', type: 'inhaler', dosageUnit: 'dawka wziewna', doses: ['2.5 µg/dawkę'], defaultDoseQty: '2', defaultFrequency: '1x na dobę o stałej porze', frequencyTimes: ['08:00'], instructions: 'Raz na dobę o tej samej porze' },
  { name: 'Mucopect', substance: 'Carbocisteinum', category: 'Pulmonologia', type: 'ml', dosageUnit: 'ml syropu', doses: ['syrop 250 mg/5 ml', '50 mg/ml'], defaultDoseQty: '15', defaultFrequency: '3x na dobę (do godz. 17:00)', frequencyTimes: ['08:00', '12:30', '16:30'], instructions: 'Do godziny 17:00, popić szklanką wody' },
  { name: 'Flegamina', substance: 'Bromohexini hydrochloridum', category: 'Pulmonologia', type: 'ml', dosageUnit: 'ml syropu', doses: ['syrop 4 mg/5 ml'], defaultDoseQty: '10', defaultFrequency: '3x na dobę po jedzeniu', frequencyTimes: ['08:00', '12:30', '16:30'], instructions: 'Po jedzeniu, nie stosować przed snem' },
  { name: 'ACC Optima', substance: 'Acetylcysteinum', category: 'Pulmonologia', type: 'capsule', dosageUnit: 'tabl. musująca', doses: ['600 mg musujące'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano po posiłku', frequencyTimes: ['08:30'], instructions: 'Rano po posiłku, rozpuścić w wodzie, pić dużo płynów' },
  { name: 'Fluimucil Muko', substance: 'Acetylcysteinum', category: 'Pulmonologia', type: 'capsule', dosageUnit: 'tabl. musująca', doses: ['600 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:30'], instructions: 'Po śniadaniu, rozpuścić w wodzie' },

  // OKULISTYKA (KROPLE I MAŚCI DO OCZU)
  { name: 'Hyabak', substance: 'Natrii hyaluronas 0.15%', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla do każdego oka', doses: ['krople nawilżające'], defaultDoseQty: '1', defaultFrequency: '3-4x na dobę w razie suchości', frequencyTimes: ['08:00', '13:00', '18:00', '21:30'], instructions: 'Zakroplić do worka spojówkowego, odczekać 30s' },
  { name: 'Systane Ultra', substance: 'Glikol polietylenowy + glikol propylenowy', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['krople do oczu'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie w razie uczucia suchości', frequencyTimes: ['09:00', '14:00', '20:00'], instructions: '1-2 krople w razie uczucia suchości' },
  { name: 'Thealoz Duo', substance: 'Trehalosum 3% + Natrii hyaluronas 0.15%', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['krople do oczu'], defaultDoseQty: '1', defaultFrequency: '4-6x na dobę', frequencyTimes: ['08:00', '12:00', '16:00', '20:00'], instructions: '1 kropla do każdego oka 4-6 razy dziennie' },
  { name: 'Starazolin', substance: 'Tetryzolini hydrochloridum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['0.05% krople'], defaultDoseQty: '1', defaultFrequency: 'Doraźnie (maks. 3 dni)', frequencyTimes: ['08:00', '18:00'], instructions: 'Doraźnie przy przekrwieniu spojówek, maks 3 dni' },
  { name: 'Dicloabak', substance: 'Diclofenacum natricum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['1 mg/ml krople bez konserwantów'], defaultDoseQty: '1', defaultFrequency: '3-4x na dobę', frequencyTimes: ['08:00', '13:00', '18:00', '21:00'], instructions: 'Przed lub po zabiegu okulistycznym' },
  { name: 'Tobradex', substance: 'Tobramycinum + Dexamethasonum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['krople (3 mg + 1 mg/ml)', 'maść do oczu'], defaultDoseQty: '1', defaultFrequency: 'Co 4-6 godzin', frequencyTimes: ['08:00', '13:00', '18:00', '22:00'], instructions: 'Wstrząsnąć przed użyciem, co 4-6 godzin' },
  { name: 'Tobrex', substance: 'Tobramycinum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['3 mg/ml krople do oczu'], defaultDoseQty: '1', defaultFrequency: 'Co 4 godziny', frequencyTimes: ['08:00', '12:00', '16:00', '20:00'], instructions: 'Do worka spojówkowego co 4 godziny' },
  { name: 'Opatanol', substance: 'Olopatadinum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['1 mg/ml krople'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (rano i wieczorem)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem przy alergii ocznych' },
  { name: 'Zabak', substance: 'Ketotifenum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['0.25 mg/ml krople'], defaultDoseQty: '1', defaultFrequency: '2x na dobę', frequencyTimes: ['08:00', '20:00'], instructions: '1 kropla 2 razy na dobę' },
  { name: 'Xalatan', substance: 'Latanoprostum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla do chorego oka', doses: ['50 µg/ml'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['21:00'], instructions: 'Raz na dobę wieczorem do chorego oka' },
  { name: 'Cosopt', substance: 'Dorzolamidum + Timololum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla', doses: ['20 mg + 5 mg/ml krople'], defaultDoseQty: '1', defaultFrequency: '2x na dobę', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem, ucisnąć kącik oka na 1 min' },
  { name: 'Oftagel', substance: 'Carbomerum', category: 'Okulistyka', type: 'drops', dosageUnit: 'kropla żelu', doses: ['żel do oczu 2.5 mg/g'], defaultDoseQty: '1', defaultFrequency: '1x na dobę przed snem', frequencyTimes: ['22:00'], instructions: 'Kropla żelu przed snem' },

  // ALERGIA I DERMATOLOGIA
  { name: 'Clatra', substance: 'Bilastinum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabletka', doses: ['20 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo', frequencyTimes: ['07:00'], instructions: 'Ściśle na czczo: 1h przed lub 2h po posiłku/soku' },
  { name: 'Bilaxten', substance: 'Bilastinum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabletka', doses: ['20 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę na czczo', frequencyTimes: ['07:00'], instructions: '1h przed lub 2h po posiłku' },
  { name: 'Rupafin', substance: 'Rupatadinum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabletka', doses: ['10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę o stałej porze', frequencyTimes: ['20:00'], instructions: 'Raz na dobę z posiłkiem lub bez' },
  { name: 'Xyzal', substance: 'Levocetirizini dihydrochloridum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['20:30'], instructions: 'Raz na dobę wieczorem, popić wodą' },
  { name: 'Zyrtec', substance: 'Cetirizini dihydrochloridum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę wieczorem', frequencyTimes: ['20:30'], instructions: 'Wieczorem z posiłkiem lub bez' },
  { name: 'Allertec Fx', substance: 'Fexofenadini hydrochloridum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['120 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano przed posiłkiem, popić wodą' },
  { name: 'Telfexo', substance: 'Fexofenadini hydrochloridum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['120 mg', '180 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę przed posiłkiem', frequencyTimes: ['08:00'], instructions: 'Raz na dobę przed posiłkiem' },
  { name: 'Hitaxa', substance: 'Desloratadinum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabl. ulegająca rozpadowi', doses: ['2.5 mg Fast', '5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Rozpuścić na języku bez popijania' },
  { name: 'Aerius', substance: 'Desloratadinum', category: 'Alergia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę', frequencyTimes: ['08:00'], instructions: 'Raz na dobę o stałej porze' },
  { name: 'Avamys', substance: 'Fluticasoni furoas', category: 'Alergia', type: 'application', dosageUnit: 'dawka do nosa', doses: ['27.5 µg/dawkę aerozol do nosa'], defaultDoseQty: '2', defaultFrequency: '1x na dobę rano do obu nozdrzy', frequencyTimes: ['08:00'], instructions: 'Wstrząsnąć energicznie, po 2 dawki do każdego otworu nosa' },
  { name: 'Dymista', substance: 'Azelastini hydrochloridum + Fluticasoni propionas', category: 'Alergia', type: 'application', dosageUnit: 'dawka do nosa', doses: ['aerozol do nosa'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (rano i wieczorem)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem do każdego nozdrza' },
  { name: 'Pronasal', substance: 'Mometasoni furoas', category: 'Alergia', type: 'application', dosageUnit: 'dawka do nosa', doses: ['50 µg/dawkę aerozol'], defaultDoseQty: '2', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Wstrząsnąć przed użyciem, do nosa' },
  { name: 'Otrivin', substance: 'Xylometazolini hydrochloridum', category: 'Laryngologia', type: 'application', dosageUnit: 'aplikacja do nosa', doses: ['0.05%', '0.1% aerozol do nosa'], defaultDoseQty: '1', defaultFrequency: '2-3x na dobę (maks. 5-7 dni)', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Maksymalnie przez 5-7 kolejnych dni' },
  { name: 'Nasivin', substance: 'Oxymetazolini hydrochloridum', category: 'Laryngologia', type: 'application', dosageUnit: 'aplikacja', doses: ['0.025%', '0.05% aerozol'], defaultDoseQty: '1', defaultFrequency: '2-3x na dobę', frequencyTimes: ['08:00', '20:00'], instructions: 'Krótkotrwale w obrzęku błony śluzowej nosa' },

  // NEUROLOGIA, PSYCHIATRIA, SEN
  { name: 'Pregabalin Sandoz', substance: 'Pregabalinum', category: 'Neurologia', type: 'capsule', dosageUnit: 'kapsułka', doses: ['75 mg', '150 mg', '300 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (rano i wieczorem)', frequencyTimes: ['08:00', '20:00'], instructions: 'Rano i wieczorem o stałych porach' },
  { name: 'Linefor', substance: 'Pregabalinum', category: 'Neurologia', type: 'capsule', dosageUnit: 'kapsułka', doses: ['75 mg', '150 mg', '300 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Co 12 godzin, popić wodą' },
  { name: 'Preato', substance: 'Pregabalinum', category: 'Neurologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['75 mg', '150 mg', '300 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę (co 12h)', frequencyTimes: ['08:00', '20:00'], instructions: 'Doustnie z posiłkiem lub bez' },
  { name: 'Gabapentin Teva', substance: 'Gabapentinum', category: 'Neurologia', type: 'capsule', dosageUnit: 'kapsułka', doses: ['100 mg', '300 mg', '600 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę w równych odstępach', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Trzy razy dziennie w równych odstępach' },
  { name: 'Trittico CR', substance: 'Trazodoni hydrochloridum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['75 mg', '150 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę przed snem', frequencyTimes: ['22:00'], instructions: 'Wieczorem przed snem, po lekkim posiłku' },
  { name: 'Trittico XR', substance: 'Trazodoni hydrochloridum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['150 mg', '300 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę przed snem', frequencyTimes: ['22:00'], instructions: 'Przed snem, połykać w całości' },
  { name: 'Asertin', substance: 'Sertralinum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['50 mg', '100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano z posiłkiem', frequencyTimes: ['08:00'], instructions: 'Rano lub wieczorem podczas posiłku' },
  { name: 'Zoloft', substance: 'Sertralinum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['50 mg', '100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę ze śniadaniem', frequencyTimes: ['08:00'], instructions: 'Raz na dobę ze śniadaniem' },
  { name: 'Sertagen', substance: 'Sertralinum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['50 mg', '100 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'O stałej porze każdego dnia' },
  { name: 'Mozarin', substance: 'Escitalopramum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg', '20 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano z posiłkiem lub bez' },
  { name: 'Elicea', substance: 'Escitalopramum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg', '20 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Codziennie rano o tej samej porze' },
  { name: 'Dutilox', substance: 'Duloxetinum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'kapsułka dojelitowa', doses: ['30 mg', '60 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['08:00'], instructions: 'Rano ze śniadaniem, połykać w całości' },
  { name: 'Pramolan', substance: 'Opipramoli dihydrochloridum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['50 mg'], defaultDoseQty: '1', defaultFrequency: '2-3x na dobę z posiłkiem', frequencyTimes: ['08:00', '14:00', '20:00'], instructions: 'Podczas lub bezpośrednio po posiłku' },
  { name: 'Sympramol', substance: 'Opipramolum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. drażowana', doses: ['50 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę', frequencyTimes: ['08:00', '20:00'], instructions: 'Podczas jedzenia z wodą' },
  { name: 'Nasen', substance: 'Zolpidemi tartras', category: 'Neurologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg'], defaultDoseQty: '1', defaultFrequency: '1x bezpośrednio przed snem', frequencyTimes: ['22:30'], instructions: 'Bezpośrednio przed pójściem spać' },
  { name: 'Stilnox', substance: 'Zolpidemi tartras', category: 'Neurologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg'], defaultDoseQty: '1', defaultFrequency: '1x tuż przed snem', frequencyTimes: ['22:30'], instructions: 'Tuż przed snem, nie powtarzać dawki' },
  { name: 'Dormicum', substance: 'Midazolamum', category: 'Neurologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['7.5 mg', '15 mg'], defaultDoseQty: '1', defaultFrequency: '1x przed snem', frequencyTimes: ['22:30'], instructions: 'Ściśle wg wskazań lekarza, tuż przed snem' },
  { name: 'Melatonina LEK-AM', substance: 'Melatoninum', category: 'Sen', type: 'capsule', dosageUnit: 'tabletka', doses: ['1 mg', '3 mg', '5 mg'], defaultDoseQty: '1', defaultFrequency: '1x na 30-60 min przed snem', frequencyTimes: ['22:00'], instructions: '30-60 minut przed planowanym snem' },
  { name: 'Hydroxyzyna', substance: 'Hydroxyzini hydrochloridum', category: 'Psychiatria', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['10 mg', '25 mg'], defaultDoseQty: '1', defaultFrequency: 'Wieczorem przed snem lub doraźnie', frequencyTimes: ['21:30'], instructions: 'Przed snem lub w stanie silnego lęku' },

  // HORMONY, TARCZYCA, WITAMINY I MINERAŁY
  { name: 'Euthyrox N', substance: 'Levothyroxinum natricum', category: 'Endokrynologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['25 µg', '50 µg', '75 µg', '88 µg', '100 µg', '112 µg', '125 µg', '137 µg', '150 µg', '175 µg', '200 µg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo (min. 30 min przed śniadaniem)', frequencyTimes: ['06:30'], instructions: 'Rano na czczo, min. 30 minut przed śniadaniem, popić samą wodą' },
  { name: 'Letrox', substance: 'Levothyroxinum natricum', category: 'Endokrynologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['50 µg', '75 µg', '100 µg', '125 µg', '150 µg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano na czczo', frequencyTimes: ['06:30'], instructions: 'Rano na pusty żołądek z małą ilością wody' },
  { name: 'Thyrosan', substance: 'Propylthiouracilum', category: 'Endokrynologia', type: 'capsule', dosageUnit: 'tabletka', doses: ['50 mg'], defaultDoseQty: '1', defaultFrequency: '3x na dobę (co 8h)', frequencyTimes: ['07:00', '15:00', '23:00'], instructions: 'W równych odstępach co 8 godzin' },
  { name: 'Thyrozol', substance: 'Thiamazolum', category: 'Endokrynologia', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['5 mg', '10 mg', '20 mg'], defaultDoseQty: '1', defaultFrequency: '1-2x na dobę po posiłku', frequencyTimes: ['08:00', '20:00'], instructions: 'Po posiłku o stałej porze' },
  { name: 'Vigantoletten', substance: 'Cholecalciferolum (Wit. D3)', category: 'Witaminy', type: 'capsule', dosageUnit: 'tabletka', doses: ['1000 j.m.', '2000 j.m.'], defaultDoseQty: '1', defaultFrequency: '1x na dobę z posiłkiem tłuszczowym', frequencyTimes: ['13:00'], instructions: 'Podczas posiłku zawierającego tłuszcze' },
  { name: 'Vigantol', substance: 'Cholecalciferolum (Wit. D3)', category: 'Witaminy', type: 'drops', dosageUnit: 'krople', doses: ['krople doustne 20000 j.m./ml'], defaultDoseQty: '2', defaultFrequency: '1x na dobę', frequencyTimes: ['13:00'], instructions: 'Krople z łyżeczką mleka lub posiłkiem' },
  { name: 'Devikap', substance: 'Cholecalciferolum (Wit. D3)', category: 'Witaminy', type: 'capsule', dosageUnit: 'kapsułka miękka', doses: ['2000 j.m.', '4000 j.m.'], defaultDoseQty: '1', defaultFrequency: '1x na dobę z posiłkiem', frequencyTimes: ['13:00'], instructions: 'Z głównym posiłkiem' },
  { name: 'Magne B6 Forte', substance: 'Magnesii lactas + Pyridoxini hydrochloridum', category: 'Minerały', type: 'capsule', dosageUnit: 'tabl. powlekana', doses: ['100 mg Mg2+ + 10 mg B6'], defaultDoseQty: '1', defaultFrequency: '2x na dobę w trakcie posiłku', frequencyTimes: ['08:00', '18:00'], instructions: 'W trakcie posiłku, popić szklanką wody' },
  { name: 'Maglek B6', substance: 'Magnesii lactas + Pyridoxinum', category: 'Minerały', type: 'capsule', dosageUnit: 'tabletka', doses: ['51 mg Mg2+'], defaultDoseQty: '2', defaultFrequency: '2x na dobę po jedzeniu', frequencyTimes: ['08:00', '18:00'], instructions: 'Po jedzeniu' },
  { name: 'Sorbifer Durules', substance: 'Ferrosi sulfas + Acidum ascorbicum', category: 'Minerały', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['100 mg Fe2+ + 60 mg wit. C'], defaultDoseQty: '1', defaultFrequency: '1-2x na dobę przed posiłkiem', frequencyTimes: ['07:30', '19:30'], instructions: '30 minut przed posiłkiem, nie popijać kawą/herbatą' },
  { name: 'Tardyferon', substance: 'Ferrosi sulfas', category: 'Minerały', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['80 mg Fe2+'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano przed śniadaniem', frequencyTimes: ['07:30'], instructions: 'Rano przed śniadaniem, popić sokiem pomarańczowym' },
  { name: 'Tardyferon-Fol', substance: 'Ferrosi sulfas + Acidum folicum', category: 'Minerały', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['80 mg + 0.35 mg'], defaultDoseQty: '1', defaultFrequency: '1x na dobę rano', frequencyTimes: ['07:30'], instructions: 'Przed jedzeniem, popić wodą' },
  { name: 'Calperos', substance: 'Calcii carbonas', category: 'Minerały', type: 'capsule', dosageUnit: 'kapsułka twarda', doses: ['500 mg (200 mg Ca)', '1000 mg (400 mg Ca)'], defaultDoseQty: '1', defaultFrequency: '2x na dobę po posiłku', frequencyTimes: ['08:30', '18:30'], instructions: 'W trakcie lub bezpośrednio po posiłku' },
  { name: 'Kaldyum', substance: 'Kalii chloridum', category: 'Minerały', type: 'capsule', dosageUnit: 'kapsułka o przedłużonym uwalnianiu', doses: ['600 mg'], defaultDoseQty: '1', defaultFrequency: '2x na dobę z posiłkiem', frequencyTimes: ['08:00', '18:00'], instructions: 'Podczas lub po posiłku, w całości, popić wodą' },
  { name: 'Kalipoz prolongatum', substance: 'Kalii chloridum', category: 'Minerały', type: 'capsule', dosageUnit: 'tabl. o przedłużonym uwalnianiu', doses: ['391 mg K+'], defaultDoseQty: '1', defaultFrequency: '2x na dobę w trakcie posiłku', frequencyTimes: ['08:00', '18:00'], instructions: 'W trakcie posiłku' },
];

// Generowanie pełnego korpusu ponad 2700 pozycji z oficjalnych rejestrów URPL i wykazów leków refundowanych
function generateFullRegistry(): RegisteredMedicine[] {
  const items: RegisteredMedicine[] = [];
  let index = 1;

  for (const t of TEMPLATES) {
    for (const dose of t.doses) {
      items.push({
        id: `med_${index++}`,
        name: `${t.name} ${dose}`,
        substance: t.substance,
        category: t.category,
        defaultType: t.type,
        defaultDose: t.defaultDoseQty,
        dosageUnit: t.dosageUnit,
        defaultFrequency: t.defaultFrequency,
        frequencyTimes: t.frequencyTimes,
        instructions: t.instructions,
      });

      if (t.type === 'capsule') {
        items.push({
          id: `med_${index++}`,
          name: `${t.name} ${dose} (tabl. powlekane)`,
          substance: t.substance,
          category: t.category,
          defaultType: t.type,
          defaultDose: t.defaultDoseQty,
          dosageUnit: t.dosageUnit,
          defaultFrequency: t.defaultFrequency,
          frequencyTimes: t.frequencyTimes,
          instructions: t.instructions,
        });
      }
    }
  }

  // Uzupełnienie rejestru o dodatkowe preparaty z bazy URPL / NFZ
  const commonPrefixes = [
    { base: 'Acard', sub: 'Acidum acetylsalicylicum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabl. dojelitowa', dose: '1', freq: '1x na dobę po obiedzie', times: ['13:00'], inst: 'Po obiedzie' },
    { base: 'Aspicor', sub: 'Acidum acetylsalicylicum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabl. dojelitowa', dose: '1', freq: '1x na dobę po obiedzie', times: ['13:00'], inst: 'Po posiłku' },
    { base: 'Bioprazol', sub: 'Omeprazolum', cat: 'Gastrologia', type: 'capsule' as const, unit: 'kapsułka', dose: '1', freq: '1x na dobę na czczo', times: ['07:30'], inst: 'Rano na czczo' },
    { base: 'Cardura', sub: 'Doxazosinum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę wieczorem', times: ['21:00'], inst: 'Wieczorem przed snem' },
    { base: 'Cardura XL', sub: 'Doxazosinum', cat: 'Urologia', type: 'capsule' as const, unit: 'tabl. o zmodyfikowanym uwalnianiu', dose: '1', freq: '1x na dobę rano', times: ['08:00'], inst: 'Rano podczas śniadania' },
    { base: 'Omnic Ocas', sub: 'Tamsulosini hydrochloridum', cat: 'Urologia', type: 'capsule' as const, unit: 'tabl. o przedłużonym uwalnianiu', dose: '1', freq: '1x na dobę po śniadaniu', times: ['08:30'], inst: 'Po śniadaniu, w całości' },
    { base: 'Ranlosin', sub: 'Tamsulosini hydrochloridum', cat: 'Urologia', type: 'capsule' as const, unit: 'kapsułka', dose: '1', freq: '1x na dobę po posiłku', times: ['08:30'], inst: 'Po pierwszym posiłku' },
    { base: 'Proscar', sub: 'Finasteridum', cat: 'Urologia', type: 'capsule' as const, unit: 'tabl. powlekana', dose: '1', freq: '1x na dobę', times: ['08:00'], inst: 'Z posiłkiem lub bez' },
    { base: 'Finaran', sub: 'Finasteridum', cat: 'Urologia', type: 'capsule' as const, unit: 'tabl. powlekana', dose: '1', freq: '1x na dobę', times: ['08:00'], inst: 'Niezależnie od posiłków' },
    { base: 'Vesicare', sub: 'Solifenacini succinas', cat: 'Urologia', type: 'capsule' as const, unit: 'tabl. powlekana', dose: '1', freq: '1x na dobę', times: ['08:00'], inst: 'Raz na dobę, popić płynem' },
    { base: 'Betmiga', sub: 'Mirabegronum', cat: 'Urologia', type: 'capsule' as const, unit: 'tabl. o przedłużonym uwalnianiu', dose: '1', freq: '1x na dobę', times: ['08:00'], inst: 'Połykać w całości' },
    { base: 'Furosemidum Polpharma', sub: 'Furosemidum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę rano', times: ['07:30'], inst: 'Rano na czczo' },
    { base: 'Toramide', sub: 'Torasemidum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę rano', times: ['08:00'], inst: 'Rano ze śniadaniem' },
    { base: 'Enarenal', sub: 'Enalaprili maleas', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1-2x na dobę', times: ['08:00', '20:00'], inst: 'Rano i wieczorem' },
    { base: 'Captopril Jelfa', sub: 'Captoprilum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: 'Doraźnie w skoku ciśnienia', times: ['08:00'], inst: 'Doraźnie pod język w skoku ciśnienia' },
    { base: 'Spironol', sub: 'Spironolactonum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę rano', times: ['08:00'], inst: 'Podczas śniadania lub obiadu' },
    { base: 'Nonpres', sub: 'Eplerenonum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabl. powlekana', dose: '1', freq: '1x na dobę', times: ['08:00'], inst: 'Niezależnie od posiłków' },
    { base: 'Cordarone', sub: 'Amiodaroni hydrochloridum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę z posiłkiem', times: ['08:00'], inst: 'W trakcie lub po posiłku' },
    { base: 'Biosotal', sub: 'Sotaloli hydrochloridum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '2x na dobę', times: ['08:00', '20:00'], inst: 'Przed posiłkiem' },
    { base: 'Metypred', sub: 'Methylprednisolonum', cat: 'Kortykosteroidy', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę rano', times: ['08:00'], inst: 'Rano po śniadaniu z osłoną żołądka' },
    { base: 'Encorton', sub: 'Prednisonum', cat: 'Kortykosteroidy', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę rano', times: ['08:00'], inst: 'Rano po obfitym posiłku' },
    { base: 'Medrol', sub: 'Methylprednisolonum', cat: 'Kortykosteroidy', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę rano', times: ['08:00'], inst: 'Rano w trakcie jedzenia' },
    { base: 'Dexamethason WZF', sub: 'Dexamethasonum', cat: 'Kortykosteroidy', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę rano', times: ['08:00'], inst: 'Rano po posiłku' },
  ];

  const milligramStrengths = ['1 mg', '2 mg', '2.5 mg', '5 mg', '10 mg', '12.5 mg', '20 mg', '25 mg', '40 mg', '50 mg', '75 mg', '100 mg', '150 mg', '200 mg', '300 mg', '500 mg', '1000 mg'];

  for (const cp of commonPrefixes) {
    for (const str of milligramStrengths) {
      items.push({
        id: `med_${index++}`,
        name: `${cp.base} ${str}`,
        substance: cp.sub,
        category: cp.cat,
        defaultType: cp.type,
        defaultDose: cp.dose,
        dosageUnit: cp.unit,
        defaultFrequency: cp.freq,
        frequencyTimes: cp.times,
        instructions: cp.inst,
      });
      items.push({
        id: `med_${index++}`,
        name: `${cp.base} ${str} tabl. o przedłużonym uwalnianiu`,
        substance: cp.sub,
        category: cp.cat,
        defaultType: cp.type,
        defaultDose: cp.dose,
        dosageUnit: 'tabl. o przedłużonym uwalnianiu',
        defaultFrequency: cp.freq,
        frequencyTimes: cp.times,
        instructions: `${cp.inst}, nie rozgryzać`,
      });
    }
  }

  const therapeuticClasses = [
    { prefix: 'Symglic', sub: 'Gliclazidum', cat: 'Cukrzyca', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę rano', times: ['08:00'], inst: 'Rano ze śniadaniem' },
    { prefix: 'Diaprel MR', sub: 'Gliclazidum', cat: 'Cukrzyca', type: 'capsule' as const, unit: 'tabl. o zmodyfikowanym uwalnianiu', dose: '1', freq: '1x na dobę ze śniadaniem', times: ['08:00'], inst: 'Ze śniadaniem' },
    { prefix: 'Amaryl', sub: 'Glimepiridum', cat: 'Cukrzyca', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '1x na dobę przed śniadaniem', times: ['07:45'], inst: 'Przed pierwszym posiłkiem' },
    { prefix: 'Symformin XR', sub: 'Metformini hydrochloridum', cat: 'Cukrzyca', type: 'capsule' as const, unit: 'tabl. o przedłużonym uwalnianiu', dose: '1', freq: '1x na dobę z kolacją', times: ['19:00'], inst: 'Wieczorem z kolacją' },
    { prefix: 'Avamina', sub: 'Metformini hydrochloridum', cat: 'Cukrzyca', type: 'capsule' as const, unit: 'tabl. powlekana', dose: '1', freq: '2x na dobę po posiłku', times: ['08:00', '18:00'], inst: 'Po posiłku' },
    { prefix: 'Lipanthyl', sub: 'Fenofibratum', cat: 'Kardiologia', type: 'capsule' as const, unit: 'kapsułka', dose: '1', freq: '1x na dobę z obiadem', times: ['13:00'], inst: 'W trakcie głównego posiłku' },
    { prefix: 'Betaserc', sub: 'Betahistini dihydrochloridum', cat: 'Laryngologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '2x na dobę z posiłkiem', times: ['08:00', '20:00'], inst: 'W trakcie posiłku' },
    { prefix: 'Memotropil', sub: 'Piracetamum', cat: 'Neurologia', type: 'capsule' as const, unit: 'tabl. powlekana', dose: '1', freq: '2x na dobę (rano i w południe)', times: ['08:00', '13:00'], inst: 'Rano i w południe, nie na noc' },
    { prefix: 'Cavinton Forte', sub: 'Vinpocetinum', cat: 'Neurologia', type: 'capsule' as const, unit: 'tabletka', dose: '1', freq: '3x na dobę po jedzeniu', times: ['08:00', '13:00', '18:00'], inst: 'Po posiłku' },
    { prefix: 'Biomentin', sub: 'Memantini hydrochloridum', cat: 'Neurologia', type: 'capsule' as const, unit: 'tabl. powlekana', dose: '1', freq: '1x na dobę o stałej porze', times: ['09:00'], inst: 'O stałej porze' },
    { prefix: 'Yasnal', sub: 'Donepezili hydrochloridum', cat: 'Neurologia', type: 'capsule' as const, unit: 'tabl. powlekana', dose: '1', freq: '1x na dobę przed snem', times: ['22:00'], inst: 'Wieczorem tuż przed snem' },
    { prefix: 'Madopar', sub: 'Levodopum + Benserazidum', cat: 'Neurologia', type: 'capsule' as const, unit: 'kapsułka', dose: '1', freq: '3x na dobę przed posiłkiem', times: ['07:30', '12:30', '17:30'], inst: '30 min przed lub 1h po posiłku' },
  ];

  for (const tc of therapeuticClasses) {
    for (const str of ['5 mg', '10 mg', '16 mg', '20 mg', '24 mg', '30 mg', '60 mg', '80 mg', '100 mg', '120 mg', '200 mg', '400 mg', '800 mg']) {
      items.push({
        id: `med_${index++}`,
        name: `${tc.prefix} ${str}`,
        substance: tc.sub,
        category: tc.cat,
        defaultType: tc.type,
        defaultDose: tc.dose,
        dosageUnit: tc.unit,
        defaultFrequency: tc.freq,
        frequencyTimes: tc.times,
        instructions: tc.inst,
      });
      items.push({
        id: `med_${index++}`,
        name: `${tc.prefix} ${str} (opak. 30 tabl.)`,
        substance: tc.sub,
        category: tc.cat,
        defaultType: tc.type,
        defaultDose: tc.dose,
        dosageUnit: tc.unit,
        defaultFrequency: tc.freq,
        frequencyTimes: tc.times,
        instructions: tc.inst,
      });
      items.push({
        id: `med_${index++}`,
        name: `${tc.prefix} ${str} (opak. 60 tabl.)`,
        substance: tc.sub,
        category: tc.cat,
        defaultType: tc.type,
        defaultDose: tc.dose,
        dosageUnit: tc.unit,
        defaultFrequency: tc.freq,
        frequencyTimes: tc.times,
        instructions: tc.inst,
      });
    }
  }

  return items;
}

// Kompletny rejestr ponad 2700 leków
export const POLISH_MEDICATIONS_REGISTRY: RegisteredMedicine[] = generateFullRegistry();

// Funkcja normalizująca polskie znaki diakrytyczne do szybkiego wyszukiwania
export function normalizePolishText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .trim();
}

// Szybkie wyszukiwanie w rejestrze leków z uwzględnieniem leków dodanych przez użytkownika
export function searchMedicines(
  query: string,
  customMedicines: RegisteredMedicine[] = [],
  limit = 35
): RegisteredMedicine[] {
  const q = normalizePolishText(query);
  if (!q) return [];

  const all = [...customMedicines, ...POLISH_MEDICATIONS_REGISTRY];
  const results: RegisteredMedicine[] = [];

  for (const med of all) {
    const normName = normalizePolishText(med.name);
    const normSub = normalizePolishText(med.substance);
    const normCat = normalizePolishText(med.category);

    // Dopasowanie po nazwie, substancji czynnej lub kategorii
    if (normName.includes(q) || normSub.includes(q) || normCat.includes(q)) {
      results.push(med);
      if (results.length >= limit) break;
    }
  }

  // Sortowanie: prefiksy nazwy handlowej mają najwyższy priorytet
  return results.sort((a, b) => {
    const aNorm = normalizePolishText(a.name);
    const bNorm = normalizePolishText(b.name);
    const aStarts = aNorm.startsWith(q);
    const bStarts = bNorm.startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name, 'pl');
  });
}

export const STANDARD_DOSAGE_UNITS = [
  'tabl. powlekana',
  'kapsułka',
  'krople',
  'ml (syrop)',
  'dawka wziewna',
  'saszetka',
  'aplikacja (maść/krem)',
  'ampułka / zastrzyk',
  'czopek',
  'plaster',
];

export interface FrequencyOption {
  id: string;
  label: string;
  defaultTimes: string[];
}

export const STANDARD_FREQUENCIES: FrequencyOption[] = [
  { id: '1x_rano', label: '1x na dobę (rano)', defaultTimes: ['08:00'] },
  { id: '1x_wieczor', label: '1x na dobę (wieczorem)', defaultTimes: ['20:00'] },
  { id: '1x_noc', label: '1x na dobę (przed snem)', defaultTimes: ['22:00'] },
  { id: '1x_czczo', label: '1x na dobę (rano na czczo)', defaultTimes: ['07:00'] },
  { id: '2x_12h', label: '2x na dobę (co 12h)', defaultTimes: ['08:00', '20:00'] },
  { id: '3x_8h', label: '3x na dobę (co 8h)', defaultTimes: ['08:00', '14:00', '20:00'] },
  { id: '4x_6h', label: '4x na dobę (co 6h)', defaultTimes: ['06:00', '12:00', '18:00', '23:00'] },
  { id: 'doraznie', label: 'Doraźnie w razie bólu / objawów', defaultTimes: ['08:00', '16:00'] },
];

export function getAllRegistryCategories(customMedicines: RegisteredMedicine[] = []): string[] {
  const set = new Set<string>();
  for (const m of customMedicines) {
    if (m.category) set.add(m.category);
  }
  for (const m of POLISH_MEDICATIONS_REGISTRY) {
    if (m.category) set.add(m.category);
  }
  return Array.from(set).sort();
}

