import React, { useState } from 'react';
import { X, Plus, Trash2, Clock, Calendar, Check, AlertCircle } from 'lucide-react';
import { Therapy, Medication, MedicationType, ScheduleType, MEDICATION_TYPE_LABELS } from '../utils/medicationLogic';

interface AddMedicationModalProps {
  isOpen: boolean;
  therapies: Therapy[];
  onClose: () => void;
  onSave: (medication: Omit<Medication, 'id'>) => void;
  onOpenAddTherapy: () => void;
}

const WEEKDAYS = [
  { id: 1, label: 'Pn', fullName: 'Poniedziałek' },
  { id: 2, label: 'Wt', fullName: 'Wtorek' },
  { id: 3, label: 'Śr', fullName: 'Środa' },
  { id: 4, label: 'Cz', fullName: 'Czwartek' },
  { id: 5, label: 'Pt', fullName: 'Piątek' },
  { id: 6, label: 'Sb', fullName: 'Sobota' },
  { id: 7, label: 'Nd', fullName: 'Niedziela' },
];

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({
  isOpen,
  therapies,
  onClose,
  onSave,
  onOpenAddTherapy,
}) => {
  const [therapyId, setTherapyId] = useState<string>(therapies[0]?.id || '');
  const [name, setName] = useState('');
  const [type, setType] = useState<MedicationType>('capsule');
  const [doseAmount, setDoseAmount] = useState('1');
  const [instructions, setInstructions] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00', '20:00']);
  const [newTimeInput, setNewTimeInput] = useState('14:00');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  // Update selected therapy when modal opens
  React.useEffect(() => {
    if (therapies.length > 0 && !therapyId) {
      setTherapyId(therapies[0].id);
    }
  }, [therapies, therapyId]);

  if (!isOpen) return null;

  const handleAddTime = () => {
    if (!newTimeInput) return;
    if (times.includes(newTimeInput)) {
      setError('Ta godzina jest już dodana.');
      return;
    }
    const updated = [...times, newTimeInput].sort();
    setTimes(updated);
    setError('');
  };

  const handleRemoveTime = (timeToRemove: string) => {
    if (times.length <= 1) {
      setError('Wymagana jest co najmniej jedna godzina dawkowania.');
      return;
    }
    setTimes(times.filter((t) => t !== timeToRemove));
  };

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length <= 1) {
        setError('Wybierz przynajmniej jeden dzień tygodnia.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId].sort());
    }
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapyId) {
      setError('Wybierz lub utwórz terapię medyczną.');
      return;
    }
    if (!name.trim()) {
      setError('Podaj nazwę leku.');
      return;
    }
    if (!doseAmount.trim()) {
      setError('Podaj ilość / dawkę.');
      return;
    }
    if (times.length === 0) {
      setError('Dodaj co najmniej jedną godzinę powiadomienia.');
      return;
    }

    onSave({
      therapyId,
      name: name.trim(),
      type,
      doseAmount: doseAmount.trim(),
      instructions: instructions.trim() || undefined,
      times,
      scheduleType,
      selectedDays: scheduleType === 'specific_days' ? selectedDays : undefined,
      startDate,
      endDate: scheduleType === 'date_range' && endDate ? endDate : undefined,
    });

    onClose();
  };

  const currentUnit = MEDICATION_TYPE_LABELS[type]?.unit || 'dawka';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="med-modal-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 id="med-modal-title" className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800">💊</span>
            Dodaj Lek do Terapii
          </h2>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Zamknij formularz leku"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Wybór terapii */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="med-therapy" className="block text-sm font-semibold text-slate-700">
                Przypisz do Terapii *
              </label>
              <button
                type="button"
                onClick={onOpenAddTherapy}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nowa terapia
              </button>
            </div>
            {therapies.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800 flex items-center justify-between">
                <span>Brak aktywnych terapii. Utwórz pierwszą!</span>
                <button
                  type="button"
                  onClick={onOpenAddTherapy}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold"
                >
                  Dodaj
                </button>
              </div>
            ) : (
              <select
                id="med-therapy"
                value={therapyId}
                onChange={(e) => setTherapyId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              >
                {therapies.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Nazwa leku */}
          <div>
            <label htmlFor="med-name" className="block text-sm font-semibold text-slate-700 mb-1">
              Nazwa Leku *
            </label>
            <input
              id="med-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="np. Amotaks 1g, Krople Hyabak, Ventolin, Acard"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>

          {/* Typ leku i dawka */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="med-type" className="block text-sm font-semibold text-slate-700 mb-1">
                Typ leku (postać) *
              </label>
              <select
                id="med-type"
                value={type}
                onChange={(e) => setType(e.target.value as MedicationType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              >
                <option value="capsule">Kapsułka / Tabletka</option>
                <option value="drops">Krople</option>
                <option value="ml">ml (płyn / syrop)</option>
                <option value="inhaler">Wziew</option>
                <option value="application">Aplikacja (maść / aerozol)</option>
                <option value="other">Inne</option>
              </select>
            </div>

            <div>
              <label htmlFor="med-amount" className="block text-sm font-semibold text-slate-700 mb-1">
                Wielkość dawki *
              </label>
              <div className="relative">
                <input
                  id="med-amount"
                  type="text"
                  value={doseAmount}
                  onChange={(e) => setDoseAmount(e.target.value)}
                  placeholder="np. 1, 5, 2.5"
                  className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                  {currentUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Zalecenia */}
          <div>
            <label htmlFor="med-instructions" className="block text-sm font-semibold text-slate-700 mb-1">
              Zalecenia przyjmowania
            </label>
            <input
              id="med-instructions"
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="np. Po posiłku, Popić pełną szklanką wody, Na czczo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>

          {/* Elastyczne pory i godziny dawkowania */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" /> Dokładne godziny alarmów
              </label>
              <span className="text-xs text-slate-500 font-medium">{times.length} dawek na dobę</span>
            </div>

            {/* Lista dodanych godzin */}
            <div className="flex flex-wrap gap-2">
              {times.map((t) => (
                <div
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-teal-200 text-teal-900 text-sm font-bold shadow-2xs"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(t)}
                    aria-label={`Usuń godzinę ${t}`}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Dodawanie nowej godziny */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="time"
                value={newTimeInput}
                onChange={(e) => setNewTimeInput(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={handleAddTime}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Dodaj godzinę
              </button>
            </div>
            <p className="text-2xs text-slate-500">
              Ustal dowolną liczbę alarmów na dobę z dokładnością co do minuty.
            </p>
          </div>

          {/* Harmonogram */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" /> Harmonogram przyjmowania
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'daily', label: 'Codziennie' },
                { id: 'specific_days', label: 'Dni tygodnia' },
                { id: 'date_range', label: 'Przedział dat' },
              ].map((sch) => {
                const isSelected = scheduleType === sch.id;
                return (
                  <button
                    key={sch.id}
                    type="button"
                    onClick={() => setScheduleType(sch.id as ScheduleType)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-teal-50 border-teal-500 text-teal-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {sch.label}
                  </button>
                );
              })}
            </div>

            {/* Opcje wyboru dni tygodnia */}
            {scheduleType === 'specific_days' && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Zaznacz dni tygodnia:
                </span>
                <div className="flex items-center justify-between gap-1">
                  {WEEKDAYS.map((w) => {
                    const isChecked = selectedDays.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleDay(w.id)}
                        aria-label={`Dzień ${w.fullName}`}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                          isChecked
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Opcje zakresu dat */}
            {scheduleType === 'date_range' && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="start-date-input" className="block text-2xs font-semibold text-slate-600 mb-1">Od daty</label>
                  <input
                    id="start-date-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="end-date-input" className="block text-2xs font-semibold text-slate-600 mb-1">Do daty (opcjonalnie)</label>
                  <input
                    id="end-date-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              Zapisz Lek i Zaplanuj Dawki
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
