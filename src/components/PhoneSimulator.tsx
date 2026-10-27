import React, { useState } from 'react';
import { 
  Check, 
  Clock, 
  Plus, 
  Calendar, 
  History, 
  Layers, 
  BellRing, 
  Sparkles, 
  Pill, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  Filter,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Therapy, 
  Medication, 
  DoseItem, 
  DoseStatus,
  calculateCompliance,
  sortDosesChronologically,
  formatDoseDisplay
} from '../utils/medicationLogic';
import { CalendarView } from './CalendarView';
import { SnoozeModal } from './SnoozeModal';
import { AddMedicationModal } from './AddMedicationModal';
import { AddTherapyModal } from './AddTherapyModal';
import { NotificationBanner } from './NotificationBanner';

interface PhoneSimulatorProps {
  therapies: Therapy[];
  medications: Medication[];
  doses: DoseItem[];
  onTakeDose: (doseId: string) => void;
  onSnoozeDose: (doseId: string, minutes: number) => void;
  onSkipDose: (doseId: string) => void;
  onAddTherapy: (therapy: Omit<Therapy, 'id' | 'createdAt'>) => void;
  onAddMedication: (medication: Omit<Medication, 'id'>) => void;
  onResetSampleData: () => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  therapies,
  medications,
  doses,
  onTakeDose,
  onSnoozeDose,
  onSkipDose,
  onAddTherapy,
  onAddMedication,
  onResetSampleData,
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'therapies'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'taken' | 'snoozed'>('all');
  
  // Modals state
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isAddTherapyOpen, setIsAddTherapyOpen] = useState(false);
  const [snoozeDoseTarget, setSnoozeDoseTarget] = useState<DoseItem | null>(null);

  // Simulated notification banner
  const [incomingNotificationDose, setIncomingNotificationDose] = useState<DoseItem | null>(null);

  // Today's date string
  const todayStr = new Date().toISOString().substring(0, 10);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);

  const todayDoses = doses.filter((d) => d.date === todayStr);
  const sortedTodayDoses = sortDosesChronologically(todayDoses);

  // Filtered doses for Today
  const displayedDoses = sortedTodayDoses.filter((d) => {
    if (statusFilter === 'all') return true;
    return d.status === statusFilter;
  });

  const compliance = calculateCompliance(todayDoses);

  const handleTakeDoseWithFeedback = (doseId: string) => {
    onTakeDose(doseId);
    
    // Check if that was the last remaining dose
    const remainingPending = todayDoses.filter((d) => d.id !== doseId && d.status !== 'taken').length;
    if (remainingPending === 0) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0f766e', '#14b8a6', '#f59e0b', '#3b82f6'],
      });
    }
  };

  const handleTriggerSimulatedAlarm = () => {
    // Pick the first pending or snoozed dose, or the first dose
    const target = todayDoses.find((d) => d.status === 'pending' || d.status === 'snoozed') || todayDoses[0];
    if (target) {
      setIncomingNotificationDose(target);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-6 w-full">
      {/* Simulation Controls Bar */}
      <div className="w-full max-w-sm mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Symulator Android (Offline SQLite)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTriggerSimulatedAlarm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Wyślij testowe powiadomienie alarmowe"
          >
            <BellRing className="w-3.5 h-3.5" />
            Symuluj Alarm
          </button>
          <button
            type="button"
            onClick={onResetSampleData}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Zresetuj przykładowe dane"
            aria-label="Zresetuj przykładowe dane"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Realistic Mobile Frame */}
      <div className="relative w-full max-w-sm rounded-[42px] bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-800/80 overflow-hidden">
        {/* Notch / Speaker bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-40 flex items-center justify-center">
          <div className="w-10 h-1.5 bg-slate-800 rounded-full" />
        </div>

        {/* Screen Container */}
        <div className="relative w-full bg-slate-50 rounded-[34px] overflow-hidden flex flex-col h-[740px] border border-slate-200">
          
          {/* Status Bar */}
          <div className="pt-2 px-6 pb-1 bg-white flex items-center justify-between text-2xs font-bold text-slate-800 shrink-0 select-none">
            <span>09:41</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="text-3xs">5G</span>
              <ShieldCheck className="w-3 h-3 text-teal-600" />
              <span>100%</span>
            </div>
          </div>

          {/* App Header */}
          <div className="bg-white px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-slate-900 text-base leading-tight">MedPlaner</h1>
                <p className="text-2xs text-slate-500 font-medium">Asystent Terapii i Leków</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsAddTherapyOpen(true)}
                className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                title="Dodaj terapię"
              >
                <Layers className="w-4 h-4" />
                <span className="text-2xs hidden xs:inline">+Terapia</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddMedOpen(true)}
                className="p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-2xs"
                title="Dodaj lek"
              >
                <Plus className="w-4 h-4" />
                <span className="text-2xs">+Lek</span>
              </button>
            </div>
          </div>

          {/* Screen Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* TAB 1: DZIŚ (HOME) */}
            {activeTab === 'today' && (
              <>
                {/* Progress / Compliance Card */}
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-teal-700 via-teal-800 to-emerald-900 p-4 text-white shadow-md">
                  <div className="flex items-center justify-between text-2xs uppercase tracking-wider font-semibold text-teal-200">
                    <span>Harmonogram Dzienny</span>
                    <span>{new Date().toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">
                        {compliance.taken} / {compliance.total}
                      </h2>
                      <p className="text-xs text-teal-100 font-medium">dawek zażytych dzisiaj</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-300">
                        {compliance.percentage}%
                      </span>
                      <p className="text-3xs text-teal-200">realizacja</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 w-full bg-teal-950/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${compliance.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Status Quick Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-2xs">
                  <span className="text-slate-400 flex items-center gap-1 font-semibold pr-1">
                    <Filter className="w-3 h-3" /> Filtr:
                  </span>
                  {[
                    { id: 'all', label: `Wszystkie (${todayDoses.length})` },
                    { id: 'pending', label: `Oczekuje (${todayDoses.filter((d) => d.status === 'pending').length})` },
                    { id: 'taken', label: `Wzięte (${todayDoses.filter((d) => d.status === 'taken').length})` },
                    { id: 'snoozed', label: `Odłożone (${todayDoses.filter((d) => d.status === 'snoozed').length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-full font-semibold whitespace-nowrap transition-all ${
                        statusFilter === f.id
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Doses Chronological List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-0.5">
                    <span>Leki na dziś (chronologicznie)</span>
                    <span className="text-2xs font-medium text-slate-500">
                      {displayedDoses.length} {displayedDoses.length === 1 ? 'dawka' : 'dawek'}
                    </span>
                  </div>

                  {displayedDoses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                      <Sparkles className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                      <p className="text-slate-700 font-bold text-sm">
                        {statusFilter === 'all'
                          ? 'Brak zaplanowanych leków na dziś!'
                          : 'Brak leków o wybranym statusie.'}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        Dodaj nowy lek do terapii przyciskiem u góry.
                      </p>
                    </div>
                  ) : (
                    displayedDoses.map((dose) => {
                      const isTaken = dose.status === 'taken';
                      const isSnoozed = dose.status === 'snoozed';
                      const isSkipped = dose.status === 'skipped';

                      return (
                        <div
                          key={dose.id}
                          className={`bg-white rounded-2xl border p-3.5 transition-all shadow-2xs ${
                            isTaken
                              ? 'border-emerald-100 bg-emerald-50/20'
                              : isSnoozed
                              ? 'border-amber-200 bg-amber-50/20'
                              : 'border-slate-200/80 hover:border-teal-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Time Badge */}
                            <div
                              className={`flex flex-col items-center justify-center w-14 py-2 rounded-xl text-center shrink-0 border ${
                                isTaken
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : isSnoozed
                                  ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5 mb-0.5 text-slate-500" />
                              <span className="font-extrabold text-sm leading-tight">
                                {isSnoozed && dose.snoozedUntil ? dose.snoozedUntil : dose.time}
                              </span>
                              {isSnoozed && (
                                <span className="text-3xs font-bold text-amber-700 mt-0.5">
                                  odroczona
                                </span>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: dose.therapyColor }}
                                />
                                <span className="text-2xs font-semibold text-slate-500 truncate">
                                  {dose.therapyName}
                                </span>

                                {/* Status Tag */}
                                <span
                                  className={`ml-auto text-3xs font-extrabold px-2 py-0.5 rounded-full border ${
                                    isTaken
                                      ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                                      : isSnoozed
                                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                                      : isSkipped
                                      ? 'bg-rose-100 border-rose-200 text-rose-800'
                                      : 'bg-slate-100 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isTaken
                                    ? `Wzięte o ${dose.takenAt || dose.time}`
                                    : isSnoozed
                                    ? `Odroczone do ${dose.snoozedUntil}`
                                    : isSkipped
                                    ? 'Pominięte'
                                    : 'Oczekuje'}
                                </span>
                              </div>

                              <h3
                                className={`font-bold text-sm leading-snug truncate ${
                                  isTaken ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
                                {dose.medicationName}
                              </h3>

                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                                <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded-md text-2xs">
                                  {formatDoseDisplay(dose.doseAmount, dose.type)}
                                </span>
                                {dose.instructions && (
                                  <span className="text-2xs text-slate-500 truncate italic">
                                    • {dose.instructions}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions (Wziąłem / Odłóż / Pomiń) */}
                          {!isTaken && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleTakeDoseWithFeedback(dose.id)}
                                className="flex-1 py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Wziąłem
                              </button>
                              <button
                                type="button"
                                onClick={() => setSnoozeDoseTarget(dose)}
                                className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-700" />
                                Odłóż
                              </button>
                              <button
                                type="button"
                                onClick={() => onSkipDose(dose.id)}
                                className="py-1.5 px-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-2xs font-semibold transition-colors"
                                title="Pomiń dawkę"
                              >
                                Pomiń
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* TAB 2: KALENDARZ */}
            {activeTab === 'calendar' && (
              <CalendarView
                currentDate={todayStr}
                allDoses={doses}
                therapies={therapies}
                onSelectDate={setSelectedCalendarDate}
                onTakeDose={handleTakeDoseWithFeedback}
              />
            )}

            {/* TAB 3: TERAPIE I LEKI */}
            {activeTab === 'therapies' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Aktywne Terapie Medyczne</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddTherapyOpen(true)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nowa terapia
                  </button>
                </div>

                {therapies.map((therapy) => {
                  const therapyMeds = medications.filter((m) => m.therapyId === therapy.id);

                  return (
                    <div
                      key={therapy.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                            style={{ backgroundColor: therapy.color }}
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-tight">
                              {therapy.name}
                            </h4>
                            {therapy.description && (
                              <p className="text-2xs text-slate-500 mt-0.5">{therapy.description}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktywna
                        </span>
                      </div>

                      {/* Lista leków w tej terapii */}
                      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                        <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Leki w terapii ({therapyMeds.length})</span>
                          <button
                            type="button"
                            onClick={() => setIsAddMedOpen(true)}
                            className="text-teal-700 hover:underline font-bold"
                          >
                            + Dodaj lek
                          </button>
                        </div>

                        {therapyMeds.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Brak przypisanych leków.</p>
                        ) : (
                          therapyMeds.map((m) => (
                            <div
                              key={m.id}
                              className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{m.name}</div>
                                <div className="text-2xs text-slate-500">
                                  Dawka: {m.doseAmount} ({m.type}) • Godziny: {m.times.join(', ')}
                                </div>
                              </div>
                              <span className="text-2xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                                {m.scheduleType === 'daily' ? 'Codziennie' : 'Harmonogram'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Bottom Navigation Bar */}
          <div className="bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-around shrink-0 shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex flex-col items-center gap-1 transition-colors ${
                activeTab === 'today' ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Pill className="w-5 h-5" />
              <span className="text-2xs">Dziś</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`flex flex-col items-center gap-1 transition-colors ${
                activeTab === 'calendar' ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-2xs">Kalendarz</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('therapies')}
              className={`flex flex-col items-center gap-1 transition-colors ${
                activeTab === 'therapies' ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span className="text-2xs">Terapie</span>
            </button>
          </div>

        </div>
      </div>

      {/* Interactive Android Notification Banner Simulator */}
      <NotificationBanner
        dose={incomingNotificationDose}
        isVisible={incomingNotificationDose !== null}
        onTake={(doseId) => {
          handleTakeDoseWithFeedback(doseId);
          setIncomingNotificationDose(null);
        }}
        onSnooze={(doseId, minutes) => {
          onSnoozeDose(doseId, minutes);
          setIncomingNotificationDose(null);
        }}
        onDismiss={() => setIncomingNotificationDose(null)}
      />

      {/* Snooze Options Modal */}
      <SnoozeModal
        isOpen={snoozeDoseTarget !== null}
        dose={snoozeDoseTarget}
        onClose={() => setSnoozeDoseTarget(null)}
        onSnooze={onSnoozeDose}
        onTakeNow={handleTakeDoseWithFeedback}
      />

      {/* Add Therapy Modal */}
      <AddTherapyModal
        isOpen={isAddTherapyOpen}
        onClose={() => setIsAddTherapyOpen(false)}
        onSave={onAddTherapy}
      />

      {/* Add Medication Modal */}
      <AddMedicationModal
        isOpen={isAddMedOpen}
        therapies={therapies}
        onClose={() => setIsAddMedOpen(false)}
        onSave={onAddMedication}
        onOpenAddTherapy={() => {
          setIsAddMedOpen(false);
          setIsAddTherapyOpen(true);
        }}
      />
    </div>
  );
};
