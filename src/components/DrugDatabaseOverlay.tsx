import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Pill,
  Sparkles,
  Layers,
  Clock,
  Plus,
  ShieldCheck,
  AlertCircle,
  Check,
  Info,
  CheckCircle2,
  BookmarkPlus,
  Filter
} from 'lucide-react';
import {
  RegisteredMedicine,
  POLISH_MEDICATIONS_REGISTRY,
  searchMedicines,
  normalizePolishText,
  STANDARD_DOSAGE_UNITS,
  STANDARD_FREQUENCIES,
  getDefaultFrequencyForMedicine,
  getDosageUnitLabel
} from '../data/polishMedicationsRegistry';
import { Therapy, Medication, MedicationType, ScheduleType, MEDICATION_TYPE_LABELS } from '../utils/medicationLogic';

interface DrugDatabaseOverlayProps {
  isOpen: boolean;
  therapies: Therapy[];
  onClose: () => void;
  onAddMedicationToTherapy: (medication: Omit<Medication, 'id'>) => void;
  onOpenAddTherapy?: () => void;
}

export const DrugDatabaseOverlay: React.FC<DrugDatabaseOverlayProps> = ({
  isOpen,
  therapies,
  onClose,
  onAddMedicationToTherapy,
  onOpenAddTherapy,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Wszystkie');
  const [selectedMed, setSelectedMed] = useState<RegisteredMedicine | null>(null);

  // Formularz konfiguracji wybranego leku
  const [targetTherapyId, setTargetTherapyId] = useState<string>(therapies[0]?.id || '');
  const [dosageUnit, setDosageUnit] = useState<string>('tabl. powlekana');
  const [doseAmount, setDoseAmount] = useState<string>('1');
  const [selectedFreqId, setSelectedFreqId] = useState<string>('1x_rano');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [instructions, setInstructions] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState<string>('');
  const [packageSize, setPackageSize] = useState<string>('30');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Tryb "Koło ratunkowe" - dodawanie własnego leku
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSubstance, setCustomSubstance] = useState('');
  const [customCategory, setCustomCategory] = useState('Leki Własne');
  const [customUnit, setCustomUnit] = useState('tabl. powlekana');
  const [customDose, setCustomDose] = useState('1');
  const [customInstructions, setCustomInstructions] = useState('');

  // Leki własne z localStorage
  const [customMedicines, setCustomMedicines] = useState<RegisteredMedicine[]>(() => {
    try {
      const saved = localStorage.getItem('medplaner_custom_medicines');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Aktualizuj domyślną terapię
  useEffect(() => {
    if (therapies.length > 0 && !targetTherapyId) {
      setTargetTherapyId(therapies[0].id);
    }
  }, [therapies, targetTherapyId]);

  // Gdy użytkownik kliknie lek z listy
  const handleSelectMed = (med: RegisteredMedicine) => {
    setSelectedMed(med);
    setIsAddingCustom(false);

    // Automatyczne ustawienie jednostki
    setDosageUnit(med.dosageUnit || getDosageUnitLabel(med.defaultType));
    setDoseAmount(med.defaultDose || '1');
    setInstructions(med.instructions || '');

    // Automatyczne dobranie częstotliwości
    const freqInfo = getDefaultFrequencyForMedicine(med);
    const matchingFreq = STANDARD_FREQUENCIES.find((f) => f.label === freqInfo.frequency);
    if (matchingFreq) {
      setSelectedFreqId(matchingFreq.id);
      setTimes(matchingFreq.defaultTimes);
    } else {
      setSelectedFreqId('custom');
      setTimes(freqInfo.times.length > 0 ? freqInfo.times : ['08:00']);
    }
  };

  // Zmiana wybranej częstotliwości
  const handleFreqChange = (freqId: string) => {
    setSelectedFreqId(freqId);
    const found = STANDARD_FREQUENCIES.find((f) => f.id === freqId);
    if (found) {
      setTimes(found.defaultTimes);
    }
  };

  // Wyliczanie listy wyników wyszukiwania i filtrowania
  const filteredMedicines = useMemo(() => {
    let list: RegisteredMedicine[] = [];
    if (searchQuery.trim().length > 0) {
      list = searchMedicines(searchQuery, customMedicines, 60);
    } else {
      // Domyślnie pokaż popularne / rekomendowane leki
      list = [...customMedicines, ...POLISH_MEDICATIONS_REGISTRY.slice(0, 40)];
    }

    if (selectedCategory !== 'Wszystkie') {
      const normCat = normalizePolishText(selectedCategory);
      list = list.filter((m) => normalizePolishText(m.category).includes(normCat));
    }

    return list;
  }, [searchQuery, selectedCategory, customMedicines]);

  // Kategorie do filtrów
  const CATEGORIES = [
    'Wszystkie',
    'Antybiotyki',
    'Przeciwbólowe',
    'Kardiologia',
    'Cukrzyca',
    'Gastrologia',
    'Pulmonologia',
    'Alergia',
    'Neurologia',
    'Tarczyca',
    'Witaminy',
    'Urologia',
    'Leki Własne',
  ];

  // Zapisanie własnego leku (Koło ratunkowe)
  const handleSaveCustomMedicine = () => {
    if (!customName.trim()) return;
    const newCustom: RegisteredMedicine = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      substance: customSubstance.trim() || 'Lek niestandardowy',
      category: customCategory || 'Leki Własne',
      defaultType: 'capsule',
      defaultDose: customDose || '1',
      dosageUnit: customUnit,
      instructions: customInstructions || 'Zgodnie z zaleceniami lekarza',
      isCustom: true,
    };

    const updated = [newCustom, ...customMedicines];
    setCustomMedicines(updated);
    try {
      localStorage.setItem('medplaner_custom_medicines', JSON.stringify(updated));
    } catch (_) {}

    handleSelectMed(newCustom);
    setIsAddingCustom(false);
  };

  // Zatwierdzenie i dodanie leku do wybranej terapii
  const handleConfirmAddToTherapy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    if (!targetTherapyId) {
      alert('Proszę wybrać terapię lub utworzyć nową terapię.');
      return;
    }

    // Wyznacz typ leku dla utils (mapowanie)
    let medType: MedicationType = selectedMed.defaultType || 'capsule';
    if (dosageUnit.includes('kropl')) medType = 'drops';
    else if (dosageUnit.includes('ml') || dosageUnit.includes('syrop')) medType = 'ml';
    else if (dosageUnit.includes('wziew')) medType = 'inhaler';
    else if (dosageUnit.includes('aplik') || dosageUnit.includes('zastrzyk')) medType = 'application';
    else if (dosageUnit.includes('kaps')) medType = 'capsule';

    const parsedPkg = parseFloat(packageSize.replace(',', '.'));
    const validPkg = Number.isFinite(parsedPkg) && parsedPkg > 0 ? parsedPkg : undefined;
    const selectedTherapy = therapies.find((t) => t.id === targetTherapyId);

    const newMedication: Omit<Medication, 'id'> = {
      therapyId: targetTherapyId,
      profileId: selectedTherapy?.profileId || 'self',
      name: selectedMed.name,
      type: medType,
      doseAmount: `${doseAmount} ${dosageUnit}`.trim(),
      instructions: instructions || selectedMed.instructions || '',
      times: times.length > 0 ? times : ['08:00'],
      scheduleType: endDate ? 'date_range' : 'daily',
      selectedDays: [1, 2, 3, 4, 5, 6, 7],
      startDate: startDate || new Date().toISOString().substring(0, 10),
      endDate: endDate || undefined,
      packageSize: validPkg,
      stockQuantity: validPkg,
      lowStockThreshold: validPkg ? Math.max(3, Math.round(validPkg * 0.15)) : 5,
      expiryDate: expiryDate || undefined,
    };

    onAddMedicationToTherapy(newMedication);

    setSuccessNotice(`Dodano "${selectedMed.name}" do Twojego planu leczenia!`);
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Nagłówek nakładki */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-teal-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Baza Leków i Rejestr Medyczny
                </h2>
                <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  URPL / NFZ
                </span>
              </div>
              <p className="text-xs text-teal-200/90 font-medium">
                Przeglądaj ponad 2700 leków w Polsce z dawkami i częstotliwością
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-teal-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Zamknij bazę leków"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Powiadomienie o sukcesie */}
        {successNotice && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 flex items-center gap-2 justify-center animate-in slide-in-from-top">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            {successNotice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Autocomplete Input Szukajki */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Wpisz nazwę handlową (np. Auglavin, Flucofast, Concor, Apap)..."
                autoFocus
                className="w-full pl-11 pr-10 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-2xl border-2 border-slate-200 focus:border-teal-600 focus:outline-hidden text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
                  title="Wyczyść frazę"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-2xs text-slate-500 px-1">
              <span>Wyszukiwanie według nazwy handlowej, substancji czynnej (INN) lub kategorii</span>
              <span className="font-semibold text-teal-700">{filteredMedicines.length} wyników</span>
            </div>
          </div>

          {/* Filtry kategorii leków */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-2xs scrollbar-thin">
            <span className="text-slate-400 flex items-center gap-1 font-bold shrink-0 pr-1">
              <Filter className="w-3 h-3" /> Kategoria:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-teal-700 text-white shadow-xs scale-102'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* KOŁO RATUNKOWE - Gdy użytkownik nie może znaleźć leku lub chce dodać własny */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-snug">
                <span className="font-bold">Nie widzisz swojego leku na liście?</span>
                <span className="text-amber-800 ml-1">
                  Skorzystaj z koła ratunkowego i dodaj go do prywatnej bazy aplikacji.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddingCustom(!isAddingCustom);
                if (!isAddingCustom && searchQuery.trim()) {
                  setCustomName(searchQuery.trim());
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAddingCustom ? 'Zwiń formularz' : 'Dodaj lek własny (Koło ratunkowe)'}
            </button>
          </div>

          {/* Formularz Koła Ratunkowego (Dodanie leku własnego) */}
          {isAddingCustom && (
            <div className="bg-slate-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <BookmarkPlus className="w-4 h-4 text-amber-600" />
                  Formularz leku własnego
                </h4>
                <span className="text-2xs text-slate-500 font-medium">Zostanie zachowany w pamięci offline</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Nazwa handlowa leku *</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="np. Moja Maść, Witaminowy Syrop..."
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:border-teal-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Substancja czynna (opcjonalnie)</label>
                  <input
                    type="text"
                    value={customSubstance}
                    onChange={(e) => setCustomSubstance(e.target.value)}
                    placeholder="np. Składnik aktywny, wyciąg z ziół..."
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-teal-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Jednostka dawkowania</label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-teal-600 focus:outline-hidden"
                  >
                    {STANDARD_DOSAGE_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Standardowa ilość dawki</label>
                  <input
                    type="text"
                    value={customDose}
                    onChange={(e) => setCustomDose(e.target.value)}
                    placeholder="np. 1, 2, 5 ml, 10 kropli"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-teal-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Wskazówki / Zalecenia</label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="np. Popić szklanką wody, przed jedzeniem"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-medium"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  disabled={!customName.trim()}
                  onClick={handleSaveCustomMedicine}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  Zapisz i skonfiguruj dawkowanie
                </button>
              </div>
            </div>
          )}

          {/* Dwie kolumny na dużym ekranie: Lista wyników + Panel konfiguracji wybranego leku */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Lewa kolumna: Lista leków (wyniki wyszukiwania) */}
            <div className="lg:col-span-6 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              <div className="text-2xs font-black uppercase tracking-wider text-slate-500 px-1">
                Wybierz lek, aby dostosować jednostkę i częstotliwość:
              </div>

              {filteredMedicines.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Nie znaleziono leku pasującego do frazy</p>
                  <p className="text-2xs text-slate-500 mt-1">
                    Sprawdź czy nie ma literówki lub użyj przycisku "Dodaj lek własny" powyżej.
                  </p>
                </div>
              ) : (
                filteredMedicines.map((med) => {
                  const isSelected = selectedMed?.id === med.id;
                  return (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => handleSelectMed(med)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/70 shadow-xs ring-2 ring-teal-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 leading-tight">
                            {med.name}
                          </span>
                          {med.isCustom && (
                            <span className="px-1.5 py-0.5 rounded-md text-3xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Własny
                            </span>
                          )}
                        </div>
                        <div className="text-2xs text-slate-500 mt-0.5 font-medium truncate">
                          INN: <span className="text-slate-700 font-semibold">{med.substance}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-3xs">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                            {med.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                            {med.dosageUnit || getDosageUnitLabel(med.defaultType)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white text-transparent'
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Prawa kolumna: Szczegóły leku, Jednostka dawkowania, Częstotliwość i Dodanie do terapii */}
            <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
              {selectedMed ? (
                <form onSubmit={handleConfirmAddToTherapy} className="space-y-3.5">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="text-3xs uppercase tracking-wider font-extrabold text-teal-700">
                      Konfiguracja leku do terapii
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight mt-0.5">
                      {selectedMed.name}
                    </h3>
                    <p className="text-2xs text-slate-600 mt-0.5">
                      Substancja czynna: <span className="font-semibold text-slate-800">{selectedMed.substance}</span>
                    </p>
                  </div>

                  {/* 1. Terapia docelowa */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">
                      Do jakiej terapii przypisać lek? *
                    </label>
                    {therapies.length === 0 ? (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                        Brak aktywnych terapii. Kliknij poniżej, aby najpierw utworzyć terapię.
                        {onOpenAddTherapy && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenAddTherapy();
                            }}
                            className="mt-1.5 block px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-2xs"
                          >
                            + Utwórz terapię
                          </button>
                        )}
                      </div>
                    ) : (
                      <select
                        value={targetTherapyId}
                        onChange={(e) => setTargetTherapyId(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:border-teal-600 focus:outline-hidden"
                      >
                        {therapies.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.isActive ? 'Aktywna' : 'Wstrzymana'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 2. Jednostka dawkowania i ilość */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">
                        Jednostka dawki
                      </label>
                      <select
                        value={dosageUnit}
                        onChange={(e) => setDosageUnit(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 font-medium focus:border-teal-600 focus:outline-hidden"
                      >
                        {STANDARD_DOSAGE_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">
                        Ilość na 1 zażycie
                      </label>
                      <input
                        type="text"
                        value={doseAmount}
                        onChange={(e) => setDoseAmount(e.target.value)}
                        placeholder="np. 1, 2, 500 mg"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 font-bold focus:border-teal-600 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  {/* 3. Częstotliwość zażywania */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">
                      Częstotliwość zażywania leku
                    </label>
                    <select
                      value={selectedFreqId}
                      onChange={(e) => handleFreqChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:border-teal-600 focus:outline-hidden"
                    >
                      {STANDARD_FREQUENCIES.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                      <option value="custom">Niestandardowa / własne godziny</option>
                    </select>
                  </div>

                  {/* Godziny dawek */}
                  <div>
                    <div className="flex items-center justify-between text-2xs font-bold text-slate-700 mb-1">
                      <span>Godziny przypomnień alarmowych:</span>
                      <span className="text-3xs font-medium text-slate-500">
                        {times.join(', ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {times.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-100/80 border border-teal-300 text-teal-900 rounded-lg text-xs font-bold"
                        >
                          <Clock className="w-3 h-3 text-teal-700" />
                          {t}
                          {times.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setTimes(times.filter((_, i) => i !== idx))}
                              className="ml-1 text-teal-700 hover:text-rose-600"
                              title="Usuń godzinę"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newTime = prompt('Wpisz godzinę w formacie GG:MM (np. 14:30):', '14:00');
                          if (newTime && !times.includes(newTime)) {
                            setTimes([...times, newTime].sort());
                          }
                        }}
                        className="px-2 py-1 bg-white border border-slate-300 hover:border-teal-600 text-slate-700 rounded-lg text-2xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Dodaj porę
                      </button>
                    </div>
                  </div>

                  {/* 4. Zalecenia kliniczne / wskazówki */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">
                      Zalecenia przyjmowania
                    </label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="np. W trakcie posiłku, popić szklanką wody"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-teal-600 focus:outline-hidden"
                    />
                  </div>

                  {/* 5. Domowa Apteczka: wielkość opakowania i termin ważności */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">
                        Ilość w opakowaniu
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={packageSize}
                        onChange={(e) => setPackageSize(e.target.value)}
                        placeholder="np. 30"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 font-bold tabular-nums focus:border-teal-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">
                        Termin ważności
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-teal-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Przycisk akcji */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={therapies.length === 0}
                      className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
                    >
                      <Plus className="w-4 h-4" />
                      Dodaj lek do terapii i ustaw alarmy
                    </button>
                  </div>
                </form>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Pill className="w-10 h-10 mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Wybierz lek z listy po lewej</p>
                  <p className="text-2xs text-slate-500 mt-1 max-w-xs">
                    Wybierz lek z bazy URPL/NFZ, aby dostosować jednostkę dawkowania (np. tabl., krople, ml), częstotliwość zażywania i zapisać go do swojej terapii.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Dolna belka informacyjna */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-2xs text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Wszystkie leki i harmonogramy są przechowywane w 100% lokalnie w bazie SQLite urządzenia (offline).</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-bold"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
};
