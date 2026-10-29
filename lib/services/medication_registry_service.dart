class RegisteredMedicine {
  final String id;
  final String name;
  final String substance;
  final String category;
  final String defaultType; // 'capsule', 'drops', 'ml', 'inhaler', 'application', 'other'
  final String defaultDose;
  final String instructions;
  final bool isCustom;

  const RegisteredMedicine({
    required this.id,
    required this.name,
    required this.substance,
    required this.category,
    required this.defaultType,
    required this.defaultDose,
    required this.instructions,
    this.isCustom = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'substance': substance,
      'category': category,
      'default_type': defaultType,
      'default_dose': defaultDose,
      'instructions': instructions,
      'is_custom': isCustom ? 1 : 0,
    };
  }

  factory RegisteredMedicine.fromMap(Map<String, dynamic> map) {
    return RegisteredMedicine(
      id: map['id'] as String,
      name: map['name'] as String,
      substance: map['substance'] as String,
      category: map['category'] as String,
      defaultType: map['default_type'] as String,
      defaultDose: map['default_dose'] as String,
      instructions: map['instructions'] as String,
      isCustom: (map['is_custom'] as int?) == 1,
    );
  }
}

class MedicationRegistryService {
  static final MedicationRegistryService instance = MedicationRegistryService._internal();
  MedicationRegistryService._internal();

  // Baza leków oparta na oficjalnych rejestrach URPL / NFZ
  static final List<RegisteredMedicine> _registry = _buildInitialRegistry();

  static List<RegisteredMedicine> _buildInitialRegistry() {
    final List<RegisteredMedicine> list = [];
    int id = 1;

    final templates = [
      // Antybiotyki
      {'name': 'Amotaks', 'sub': 'Amoxicillinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['500 mg', '1 g'], 'q': '1', 'inst': 'Po posiłku, popić pełną szklanką wody'},
      {'name': 'Amotaks Dispertab', 'sub': 'Amoxicillinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['500 mg', '750 mg', '1 g'], 'q': '1', 'inst': 'Rozpuścić w niewielkiej ilości wody lub połknąć'},
      {'name': 'Auglavin', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['875 mg + 125 mg', '500 mg + 125 mg'], 'q': '1', 'inst': 'Na początku posiłku w równych odstępach co 12h'},
      {'name': 'Auglavin PPH', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['875 mg + 125 mg', '500 mg + 125 mg'], 'q': '1', 'inst': 'Na początku posiłku, popić wodą'},
      {'name': 'Auglavin Extra', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'ml', 'doses': ['zawiesina 400 mg + 57 mg/5 ml'], 'q': '5', 'inst': 'Wstrząsnąć przed użyciem, na początku posiłku'},
      {'name': 'Augmentin', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['625 mg', '1 g (875 mg + 125 mg)'], 'q': '1', 'inst': 'Na początku posiłku'},
      {'name': 'Taromentin', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['875 mg + 125 mg', '500 mg + 125 mg'], 'q': '1', 'inst': 'Na początku posiłku'},
      {'name': 'Duomox', 'sub': 'Amoxicillinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['500 mg', '750 mg', '1 g'], 'q': '1', 'inst': 'W trakcie lub po posiłku'},
      {'name': 'Zinnat', 'sub': 'Cefuroximum axetil', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['250 mg', '500 mg'], 'q': '1', 'inst': 'Zaraz po posiłku'},
      {'name': 'Klacid', 'sub': 'Clarithromycinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['250 mg', '500 mg', '500 mg Uno'], 'q': '1', 'inst': 'Niezależnie od posiłków, co 12h'},
      {'name': 'Sumamed', 'sub': 'Azithromycinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['250 mg', '500 mg'], 'q': '1', 'inst': '1h przed lub 2h po posiłku'},
      {'name': 'Macromax', 'sub': 'Azithromycinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['500 mg'], 'q': '1', 'inst': 'Raz na dobę o stałej porze'},
      {'name': 'Biseptol', 'sub': 'Sulfamethoxazolum + Trimethoprimum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['480 mg', '960 mg'], 'q': '1', 'inst': 'Po posiłku z dużą ilością płynu'},
      {'name': 'Cipronex', 'sub': 'Ciprofloxacinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['250 mg', '500 mg'], 'q': '1', 'inst': 'Niezależnie od posiłków, nie z nabiałem'},
      {'name': 'Monural', 'sub': 'Fosfomycinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['3 g saszetka'], 'q': '1', 'inst': 'Wieczorem przed snem, po opróżnieniu pęcherza'},
      {'name': 'Xifaxan', 'sub': 'Rifaximinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['200 mg'], 'q': '1', 'inst': 'Doustnie, popić szklanką wody'},

      // Leki przeciwgrzybicze i przeciwwirusowe
      {'name': 'Flucofast', 'sub': 'Fluconazolum', 'cat': 'Przeciwgrzybicze', 'type': 'capsule', 'doses': ['50 mg', '100 mg', '150 mg', '200 mg'], 'q': '1', 'inst': 'Niezależnie od posiłków, popić dużą ilością wody'},
      {'name': 'Diflucan', 'sub': 'Fluconazolum', 'cat': 'Przeciwgrzybicze', 'type': 'capsule', 'doses': ['50 mg', '150 mg'], 'q': '1', 'inst': 'Raz dziennie lub jednorazowo wg zaleceń'},
      {'name': 'Trioxal', 'sub': 'Itraconazolum', 'cat': 'Przeciwgrzybicze', 'type': 'capsule', 'doses': ['100 mg'], 'q': '1', 'inst': 'Bezpośrednio po głównym posiłku'},
      {'name': 'Heviran', 'sub': 'Aciclovirum', 'cat': 'Przeciwwirusowe', 'type': 'capsule', 'doses': ['200 mg', '400 mg', '800 mg'], 'q': '1', 'inst': 'W trakcie posiłku, dbać o nawodnienie'},
      {'name': 'Hascovir', 'sub': 'Aciclovirum', 'cat': 'Przeciwwirusowe', 'type': 'capsule', 'doses': ['200 mg', '400 mg'], 'q': '1', 'inst': 'Co 4 godziny w ciągu dnia'},

      // Glikokortykosteroidy
      {'name': 'Metypred', 'sub': 'Methylprednisolonum', 'cat': 'Kortykosteroidy', 'type': 'capsule', 'doses': ['4 mg', '8 mg', '16 mg'], 'q': '1', 'inst': 'Rano po śniadaniu, z osłoną żołądka'},
      {'name': 'Encorton', 'sub': 'Prednisonum', 'cat': 'Kortykosteroidy', 'type': 'capsule', 'doses': ['1 mg', '5 mg', '10 mg', '20 mg'], 'q': '1', 'inst': 'Rano w trakcie posiłku, nie na czczo'},

      // Przeciwbólowe i NLPZ
      {'name': 'Apap', 'sub': 'Paracetamolum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['500 mg', 'Extra 500 mg + 65 mg'], 'q': '1', 'inst': 'Doraźnie w bólu, co 4-6h'},
      {'name': 'Paracetamol Hasco', 'sub': 'Paracetamolum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['500 mg', '1000 mg'], 'q': '1', 'inst': 'Popić wodą, maks 4 g na dobę'},
      {'name': 'Efferalgan', 'sub': 'Paracetamolum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['500 mg musujące', '1 g musujące'], 'q': '1', 'inst': 'Rozpuścić w szklance wody'},
      {'name': 'Ibuprom', 'sub': 'Ibuprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['200 mg', '400 mg Sprint', '400 mg Max'], 'q': '1', 'inst': 'Po posiłku, popić szklanką wody'},
      {'name': 'Ibum', 'sub': 'Ibuprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['200 mg', '400 mg', '600 mg'], 'q': '1', 'inst': 'Zawsze po posiłku'},
      {'name': 'Ketonal', 'sub': 'Ketoprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['50 mg', '100 mg Forte', '150 mg Duo'], 'q': '1', 'inst': 'Ściśle po jedzeniu z osłoną żołądka'},
      {'name': 'Dexak', 'sub': 'Dexketoprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['25 mg', '25 mg SL saszetki'], 'q': '1', 'inst': '30 min przed posiłkiem'},
      {'name': 'Diclac', 'sub': 'Diclofenacum natricum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['50 mg', '75 mg Duo', '150 mg Duo'], 'q': '1', 'inst': 'W trakcie lub po posiłku, nie dzielić'},
      {'name': 'Voltaren Acti Forte', 'sub': 'Diclofenacum kalicum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['25 mg'], 'q': '1', 'inst': 'Przed posiłkiem z wodą'},
      {'name': 'Nimesil', 'sub': 'Nimesulidum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['100 mg saszetki'], 'q': '1', 'inst': 'Po posiłku, rozpuścić w wodzie'},
      {'name': 'Pyralgina', 'sub': 'Metamizolum natricum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['500 mg'], 'q': '1', 'inst': 'W trakcie lub po posiłku'},
      {'name': 'Doreta', 'sub': 'Tramadoli hydrochloridum + Paracetamolum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['37.5 mg + 325 mg', '75 mg + 650 mg'], 'q': '1', 'inst': 'Ściśle wg wskazań lekarza'},
      {'name': 'Skudexa', 'sub': 'Tramadoli hydrochloridum + Dexketoprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['75 mg + 25 mg'], 'q': '1', 'inst': 'Popić dużą ilością płynu'},

      // Kardiologia i Nadciśnienie
      {'name': 'Prestarium', 'sub': 'Perindoprilum argininum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['2.5 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano na czczo przed śniadaniem'},
      {'name': 'Co-Prestarium', 'sub': 'Perindoprilum + Amlodipinum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5/5 mg', '10/5 mg', '10/10 mg'], 'q': '1', 'inst': 'Rano przed posiłkiem'},
      {'name': 'Concor COR', 'sub': 'Bisoprololi fumaras', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['1.25 mg', '2.5 mg', '3.75 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano podczas śniadania'},
      {'name': 'Bibloc', 'sub': 'Bisoprololi fumaras', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['1.25 mg', '2.5 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano o stałej porze'},
      {'name': 'Nedal', 'sub': 'Nebivololum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5 mg'], 'q': '1', 'inst': 'Rano o stałej porze'},
      {'name': 'Nebilet', 'sub': 'Nebivololum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5 mg'], 'q': '1', 'inst': 'Najlepiej podczas śniadania'},
      {'name': 'Betaloc ZOK', 'sub': 'Metoprololi succinas', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['25 mg', '50 mg', '100 mg'], 'q': '1', 'inst': 'Rano, nie rozgryzać'},
      {'name': 'Vivace', 'sub': 'Ramiprilum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['2.5 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano o stałej porze'},
      {'name': 'Tritace', 'sub': 'Ramiprilum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['2.5 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano, popić wodą'},
      {'name': 'Amlopin', 'sub': 'Amlodipinum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5 mg', '10 mg'], 'q': '1', 'inst': 'Raz na dobę o stałej porze'},
      {'name': 'Tertensif SR', 'sub': 'Indapamidum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['1.5 mg'], 'q': '1', 'inst': 'Rano, w całości'},
      {'name': 'Atoris', 'sub': 'Atorvastatinum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['10 mg', '20 mg', '40 mg', '80 mg'], 'q': '1', 'inst': 'Wieczorem o stałej porze'},
      {'name': 'Roswera', 'sub': 'Rosuvastatinum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5 mg', '10 mg', '20 mg', '40 mg'], 'q': '1', 'inst': 'Raz na dobę o dowolnej porze'},
      {'name': 'Acard', 'sub': 'Acidum acetylsalicylicum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['75 mg', '150 mg'], 'q': '1', 'inst': 'Po obiedzie lub po kolacji'},
      {'name': 'Polocard', 'sub': 'Acidum acetylsalicylicum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['75 mg', '150 mg'], 'q': '1', 'inst': 'Po posiłku w całości'},
      {'name': 'Eliquis', 'sub': 'Apixabanum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['2.5 mg', '5 mg'], 'q': '1', 'inst': 'Rano i wieczorem co 12h'},
      {'name': 'Xarelto', 'sub': 'Rivaroxabanum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['15 mg', '20 mg'], 'q': '1', 'inst': 'W trakcie głównego posiłku'},

      // Cukrzyca i Gastrologia
      {'name': 'Glucophage', 'sub': 'Metformini hydrochloridum', 'cat': 'Cukrzyca', 'type': 'capsule', 'doses': ['500 mg', '850 mg', '1000 mg', 'XR 500 mg', 'XR 750 mg', 'XR 1000 mg'], 'q': '1', 'inst': 'W trakcie lub po posiłku'},
      {'name': 'Metformax', 'sub': 'Metformini hydrochloridum', 'cat': 'Cukrzyca', 'type': 'capsule', 'doses': ['500 mg', '850 mg', '1000 mg', 'SR 500 mg', 'SR 1000 mg'], 'q': '1', 'inst': 'Wieczorem podczas kolacji'},
      {'name': 'Jardiance', 'sub': 'Empagliflozinum', 'cat': 'Cukrzyca', 'type': 'capsule', 'doses': ['10 mg', '25 mg'], 'q': '1', 'inst': 'Rano z posiłkiem lub bez'},
      {'name': 'Forxiga', 'sub': 'Dapagliflozinum', 'cat': 'Cukrzyca', 'type': 'capsule', 'doses': ['5 mg', '10 mg'], 'q': '1', 'inst': 'Raz na dobę o stałej porze'},
      {'name': 'Polprazol', 'sub': 'Omeprazolum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['20 mg', '40 mg'], 'q': '1', 'inst': 'Rano na czczo, 30 min przed śniadaniem'},
      {'name': 'Controloc', 'sub': 'Pantoprazolum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['20 mg', '40 mg'], 'q': '1', 'inst': 'Rano na czczo, nie rozgryzać'},
      {'name': 'Mesopral', 'sub': 'Esomeprazolum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['20 mg', '40 mg'], 'q': '1', 'inst': 'Rano przed śniadaniem'},
      {'name': 'No-Spa', 'sub': 'Drotaverini hydrochloridum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['40 mg', '80 mg Forte', '80 mg Max'], 'q': '1', 'inst': 'Doraźnie w skurczach'},
      {'name': 'Duspatalin Retard', 'sub': 'Mebeverini hydrochloridum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['200 mg'], 'q': '1', 'inst': '20 min przed posiłkiem'},

      // Układ oddechowy i Alergia
      {'name': 'Ventolin', 'sub': 'Salbutamolum', 'cat': 'Pulmonologia', 'type': 'inhaler', 'doses': ['100 µg aerozol'], 'q': '1', 'inst': 'Wziewnie w duszności, wstrząsnąć'},
      {'name': 'Berodual', 'sub': 'Fenoterolum + Ipratropium', 'cat': 'Pulmonologia', 'type': 'drops', 'doses': ['krople do nebulizacji'], 'q': '20', 'inst': 'Do nebulizacji z solą fizjologiczną'},
      {'name': 'Pulmicort', 'sub': 'Budesonidum', 'cat': 'Pulmonologia', 'type': 'ml', 'doses': ['0.25 mg/ml', '0.5 mg/ml'], 'q': '2', 'inst': 'W nebulizacji, wypłukać usta wodą'},
      {'name': 'Foster', 'sub': 'Beclometasoni dipropionas + Formoterolum', 'cat': 'Pulmonologia', 'type': 'inhaler', 'doses': ['100/6 µg', '200/6 µg'], 'q': '1', 'inst': 'Rano i wieczorem, wypłukać usta'},
      {'name': 'Symbicort Turbuhaler', 'sub': 'Budesonidum + Formoterolum', 'cat': 'Pulmonologia', 'type': 'inhaler', 'doses': ['80/4.5 µg', '160/4.5 µg', '320/9 µg'], 'q': '1', 'inst': 'Wziewnie rano i wieczorem'},
      {'name': 'Clatra', 'sub': 'Bilastinum', 'cat': 'Alergia', 'type': 'capsule', 'doses': ['20 mg'], 'q': '1', 'inst': 'Ściśle na czczo: 1h przed lub 2h po jedzeniu'},
      {'name': 'Xyzal', 'sub': 'Levocetirizinum', 'cat': 'Alergia', 'type': 'capsule', 'doses': ['5 mg'], 'q': '1', 'inst': 'Raz na dobę wieczorem'},
      {'name': 'Zyrtec', 'sub': 'Cetirizinum', 'cat': 'Alergia', 'type': 'capsule', 'doses': ['10 mg'], 'q': '1', 'inst': 'Wieczorem, popić wodą'},
      {'name': 'Hitaxa', 'sub': 'Desloratadinum', 'cat': 'Alergia', 'type': 'capsule', 'doses': ['5 mg'], 'q': '1', 'inst': 'Rozpuścić na języku'},

      // Okulistyka, Tarczyca, Neurologia
      {'name': 'Hyabak', 'sub': 'Natrii hyaluronas 0.15%', 'cat': 'Okulistyka', 'type': 'drops', 'doses': ['krople do oczu'], 'q': '1', 'inst': 'Zakroplić do worka spojówkowego'},
      {'name': 'Systane Ultra', 'sub': 'Krople nawilżające', 'cat': 'Okulistyka', 'type': 'drops', 'doses': ['krople do oczu'], 'q': '1', 'inst': '1-2 krople do każdego oka'},
      {'name': 'Thealoz Duo', 'sub': 'Trehalosum + Natrii hyaluronas', 'cat': 'Okulistyka', 'type': 'drops', 'doses': ['krople bez konserwantów'], 'q': '1', 'inst': '1 kropla 4-6 razy dziennie'},
      {'name': 'Tobradex', 'sub': 'Tobramycinum + Dexamethasonum', 'cat': 'Okulistyka', 'type': 'drops', 'doses': ['krople do oczu'], 'q': '1', 'inst': 'Wstrząsnąć, co 4-6h'},
      {'name': 'Euthyrox N', 'sub': 'Levothyroxinum natricum', 'cat': 'Endokrynologia', 'type': 'capsule', 'doses': ['25 µg', '50 µg', '75 µg', '88 µg', '100 µg', '112 µg', '125 µg', '150 µg', '175 µg', '200 µg'], 'q': '1', 'inst': 'Rano na czczo min. 30 min przed śniadaniem, sama woda'},
      {'name': 'Letrox', 'sub': 'Levothyroxinum natricum', 'cat': 'Endokrynologia', 'type': 'capsule', 'doses': ['50 µg', '75 µg', '100 µg', '125 µg', '150 µg'], 'q': '1', 'inst': 'Rano na czczo z małą ilością wody'},
      {'name': 'Pregabalin', 'sub': 'Pregabalinum', 'cat': 'Neurologia', 'type': 'capsule', 'doses': ['75 mg', '150 mg', '300 mg'], 'q': '1', 'inst': 'Rano i wieczorem o stałych porach'},
      {'name': 'Trittico CR', 'sub': 'Trazodoni hydrochloridum', 'cat': 'Psychiatria', 'type': 'capsule', 'doses': ['75 mg', '150 mg'], 'q': '1', 'inst': 'Wieczorem przed snem'},
      {'name': 'Milurit', 'sub': 'Allopurinolum', 'cat': 'Metabolizm', 'type': 'capsule', 'doses': ['100 mg', '200 mg', '300 mg'], 'q': '1', 'inst': 'Po posiłku, pić dużo płynów'},
      {'name': 'Magne B6 Forte', 'sub': 'Magnesium + B6', 'cat': 'Minerały', 'type': 'capsule', 'doses': ['100 mg Mg2+'], 'q': '1', 'inst': 'W trakcie posiłku, popić wodą'},
      {'name': 'Vigantoletten', 'sub': 'Cholecalciferolum (D3)', 'cat': 'Witaminy', 'type': 'capsule', 'doses': ['1000 j.m.', '2000 j.m.'], 'q': '1', 'inst': 'Podczas posiłku z tłuszczami'},
    ];

    for (final t in templates) {
      final doses = t['doses'] as List<String>;
      for (final d in doses) {
        list.add(RegisteredMedicine(
          id: 'med_${id++}',
          name: '${t['name']} $d',
          substance: t['sub'] as String,
          category: t['cat'] as String,
          defaultType: t['type'] as String,
          defaultDose: t['q'] as String,
          instructions: t['inst'] as String,
        ));
      }
    }

    return list;
  }

  static String _normalize(String s) {
    return s.toLowerCase()
        .replaceAll('ą', 'a')
        .replaceAll('ć', 'c')
        .replaceAll('ę', 'e')
        .replaceAll('ł', 'l')
        .replaceAll('ń', 'n')
        .replaceAll('ó', 'o')
        .replaceAll('ś', 's')
        .replaceAll('ź', 'z')
        .replaceAll('ż', 'z')
        .trim();
  }

  List<RegisteredMedicine> search(String query, {List<RegisteredMedicine> customMedicines = const [], int limit = 20}) {
    final q = _normalize(query);
    if (q.isEmpty) return [];

    final List<RegisteredMedicine> results = [];
    final all = [...customMedicines, ..._registry];

    for (final m in all) {
      final nameNorm = _normalize(m.name);
      final subNorm = _normalize(m.substance);
      final catNorm = _normalize(m.category);

      if (nameNorm.contains(q) || subNorm.contains(q) || catNorm.contains(q)) {
        results.add(m);
        if (results.length >= limit) break;
      }
    }

    results.sort((a, b) {
      final aStarts = _normalize(a.name).startsWith(q);
      final bStarts = _normalize(b.name).startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.compareTo(b.name);
    });

    return results;
  }
}
