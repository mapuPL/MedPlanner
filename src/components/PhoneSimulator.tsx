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
  RotateCcw,
  Sun,
  SunMedium,
  Moon,
  Search,
  X,
  Cloud,
  Trash2,
  Database,
  Lock,
  Unlock,
  HelpCircle,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { normalizePolishText } from '../data/polishMedicationsRegistry';
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
import { BackupSyncView } from './BackupSyncView';
import { DrugDatabaseOverlay } from './DrugDatabaseOverlay';

interface PhoneSimulatorProps {
  therapies: Therapy[];
  medications: Medication[];
  doses: DoseItem[];
  onTakeDose: (doseId: string) => void;
  onSnoozeDose: (doseId: string, minutes: number) => void;
  onSkipDose: (doseId: string) => void;
  onAddTherapy: (therapy: Omit<Therapy, 'id' | 'createdAt'>) => void;
  onAddMedication: (medication: Omit<Medication, 'id'>) => void;
  onDeleteMedication?: (medicationId: string) => void;
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
  onDeleteMedication,
  onResetSampleData,
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'therapies' | 'sync'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'taken' | 'snoozed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isAddTherapyOpen, setIsAddTherapyOpen] = useState(false);
  const [isDrugDatabaseOpen, setIsDrugDatabaseOpen] = useState(false);
  const [isBgDiagnosisOpen, setIsBgDiagnosisOpen] = useState(false);
  const [snoozeDoseTarget, setSnoozeDoseTarget] = useState<DoseItem | null>(null);

  // Background / Locked Phone Simulation
  const [isPhoneLocked, setIsPhoneLocked] = useState(false);
  const [bgCountdown, setBgCountdown] = useState<number | null>(null);
  const [webNotificationAllowed, setWebNotificationAllowed] = useState(false);

  // Simulated notification banner
  const [incomingNotificationDose, setIncomingNotificationDose] = useState<DoseItem | null>(null);

  // Today's date string
  const todayStr = new Date().toISOString().substring(0, 10);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);

  const todayDoses = doses.filter((d) => d.date === todayStr);
  const sortedTodayDoses = sortDosesChronologically(todayDoses);

  // Filtered doses for Today (wg statusu oraz wpisanej frazy wyszukiwania)
  const displayedDoses = sortedTodayDoses.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = normalizePolishText(searchQuery);
      const normName = normalizePolishText(d.medicationName);
      const normTherapy = normalizePolishText(d.therapyName);
      const normInstructions = d.instructions ? normalizePolishText(d.instructions) : '';
      return normName.includes(q) || normTherapy.includes(q) || normInstructions.includes(q);
    }
    return true;
  });

  const compliance = calculateCompliance(todayDoses);

  // Dźwięk alarmu przy powiadomieniu (Web Audio API)
  const playGentleChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch (_) {}
  };

  // Prawdziwe powiadomienie systemowe przeglądarki (Web Notifications API)
  const triggerNativeDesktopNotification = (dose: DoseItem) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`💊 Czas na lek: ${dose.medicationName}`, {
          body: `Dawka: ${formatDoseDisplay(dose.doseAmount, dose.type)} (${dose.therapyName})`,
          icon: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            setWebNotificationAllowed(true);
            new Notification(`💊 Czas na lek: ${dose.medicationName}`, {
              body: `Dawka: ${formatDoseDisplay(dose.doseAmount, dose.type)} (${dose.therapyName})`,
            });
          }
        });
      }
    }
  };


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
      playGentleChime();
      setIncomingNotificationDose(target);
      triggerNativeDesktopNotification(target);
    }
  };

  // Symulacja działania w tle – zablokowanie telefonu i test po 5 sekundach
  const handleStartBackgroundTest = () => {
    setIsPhoneLocked(true);
    setBgCountdown(5);
    const target = todayDoses.find((d) => d.status === 'pending' || d.status === 'snoozed') || todayDoses[0];

    let remaining = 5;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setBgCountdown(remaining);
      } else {
        clearInterval(interval);
        setBgCountdown(null);
        playGentleChime();
        if (target) {
          setIncomingNotificationDose(target);
          triggerNativeDesktopNotification(target);
        }
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-6 w-full">
      {/* Simulation Controls Bar */}
      <div className="w-full max-w-sm mb-3 flex flex-col gap-2 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Symulator Android (Offline SQLite)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsBgDiagnosisOpen(true)}
              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-2xs font-semibold"
              title="Dlaczego powiadomienia w tle nie działały i jak to naprawiono?"
            >
              <HelpCircle className="w-4 h-4 text-teal-600" />
              <span className="hidden xs:inline">Działanie w tle</span>
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

        {/* Pasek przycisków testowych powiadomień */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handleStartBackgroundTest}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-2xs font-bold transition-all shadow-xs active:scale-95"
            title="Symuluj zamkniętą aplikację – telefon zablokuje się i wyśle alarm za 5s"
          >
            <Lock className="w-3.5 h-3.5" />
            {bgCountdown !== null ? `Budzenie za ${bgCountdown}s...` : 'Test w tle (zamknięta apka)'}
          </button>
          <button
            type="button"
            onClick={handleTriggerSimulatedAlarm}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-2xs font-bold transition-all shadow-xs active:scale-95"
            title="Wyślij testowe powiadomienie alarmowe natychmiast"
          >
            <BellRing className="w-3.5 h-3.5" />
            Alarm teraz
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

          {/* Realistic Android Lock Screen / Simulated Closed App in Background */}
          {isPhoneLocked && (
            <div className="absolute inset-0 z-30 bg-linear-to-b from-slate-950 via-teal-950 to-slate-900 text-white flex flex-col justify-between p-6 animate-in fade-in duration-300">
              {/* Lock screen top icons */}
              <div className="flex items-center justify-between text-xs text-slate-300 pt-3">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-2xs font-semibold">Ekran zablokowany (Aplikacja w tle)</span>
                </div>
                <span className="text-2xs font-bold">100% 🔋</span>
              </div>

              {/* Big Clock & Date */}
              <div className="text-center my-auto space-y-2">
                <div className="text-5xl font-light tracking-tight text-white drop-shadow-md">
                  {new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-teal-200 font-medium capitalize">
                  {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>

                {bgCountdown !== null ? (
                  <div className="mt-6 mx-auto max-w-[250px] p-4 rounded-3xl bg-teal-900/60 border-2 border-teal-400/40 backdrop-blur-md space-y-1.5 shadow-xl animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-300">
                      <Clock className="w-4 h-4 text-teal-400" />
                      Budzenie procesora w tle
                    </div>
                    <div className="text-3xl font-black text-white">
                      {bgCountdown} s
                    </div>
                    <p className="text-3xs text-teal-200/90 leading-tight">
                      Symulacja zamkniętej aplikacji. System Android obudzi się dzięki exactAllowWhileIdle.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-2xl bg-slate-900/70 border border-slate-700/60 text-2xs text-slate-300 max-w-[240px] mx-auto space-y-1">
                    <div className="font-bold text-teal-300 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Gotowy do odbioru alarmu
                    </div>
                    <p className="text-3xs text-slate-400">
                      Powiadomienie z górnego paska pojawi się na tym ekranie w wyznaczonej minucie.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Unlock Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneLocked(false)}
                  className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-98 backdrop-blur-xs"
                >
                  <Unlock className="w-4 h-4 text-teal-300" />
                  Odblokuj / Otwórz MedPlaner
                </button>
              </div>
            </div>
          )}


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
                onClick={() => setIsDrugDatabaseOpen(true)}
                className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                title="Baza leków (ponad 2700 leków z dawkami i częstotliwością)"
              >
                <Database className="w-4 h-4 text-teal-600" />
                <span className="text-2xs font-bold text-teal-800">Baza</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sync')}
                className={`p-1.5 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 ${
                  activeTab === 'sync'
                    ? 'bg-teal-100 text-teal-800 font-bold'
                    : 'text-teal-700 hover:bg-teal-50'
                }`}
                title="Kopia zapasowa w chmurze (Google Drive)"
              >
                <Cloud className="w-4 h-4" />
                <span className="text-2xs hidden xs:inline">Kopia</span>
              </button>
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

                {/* Szybki pasek wyszukiwania leków i terapii */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj leku, dawki lub terapii..."
                    className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-slate-200/90 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-2xs transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                      title="Wyczyść wyszukiwanie"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Szybki link do oficjalnej bazy leków URPL / NFZ */}
                <button
                  type="button"
                  onClick={() => setIsDrugDatabaseOpen(true)}
                  className="w-full p-2.5 rounded-2xl bg-linear-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 hover:border-teal-400 text-teal-900 flex items-center justify-between text-2xs font-bold transition-all shadow-2xs group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-slate-900 font-extrabold flex items-center gap-1.5">
                        <span>Baza Leków URPL / NFZ</span>
                        <span className="text-3xs px-1.5 py-0.2 bg-teal-200/80 text-teal-900 rounded font-bold">2700+ leków</span>
                      </div>
                      <div className="text-3xs text-slate-500 font-medium">
                        Szukaj leku, wybierz jednostkę dawki i dodaj do terapii
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>


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
                    <span className="flex items-center gap-1.5">
                      <span>Leki na dziś</span>
                      {searchQuery && (
                        <span className="text-2xs font-normal text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          filtr: "{searchQuery}"
                        </span>
                      )}
                    </span>
                    <span className="text-2xs font-medium text-slate-500">
                      {displayedDoses.length} {displayedDoses.length === 1 ? 'dawka' : 'dawek'}
                    </span>
                  </div>

                  {displayedDoses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                      <Sparkles className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                      <p className="text-slate-700 font-bold text-sm">
                        {searchQuery
                          ? `Brak dawek pasujących do "${searchQuery}"`
                          : statusFilter === 'all'
                          ? 'Brak zaplanowanych leków na dziś!'
                          : 'Brak leków o wybranym statusie.'}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-teal-600 hover:text-teal-700 font-bold underline"
                          >
                            Wyczyść filtr wyszukiwania
                          </button>
                        ) : (
                          'Dodaj nowy lek do terapii przyciskiem u góry.'
                        )}
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const morning = displayedDoses.filter((d) => (d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.time) < '12:00');
                      const afternoon = displayedDoses.filter((d) => {
                        const t = d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.time;
                        return t >= '12:00' && t < '18:00';
                      });
                      const evening = displayedDoses.filter((d) => (d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.time) >= '18:00');

                      const renderGroup = (
                        title: string,
                        items: typeof displayedDoses,
                        icon: React.ReactNode,
                        badgeClass: string,
                        containerClass: string,
                        titleColor: string
                      ) => {
                        if (items.length === 0) return null;
                        const takenCount = items.filter((d) => d.status === 'taken').length;

                        return (
                          <div className={`rounded-2xl p-3 border space-y-2.5 transition-all ${containerClass}`}>
                            <div className="flex items-center justify-between px-1">
                              <div className={`flex items-center gap-1.5 font-extrabold text-2xs uppercase tracking-wider ${titleColor}`}>
                                {icon}
                                <span>{title}</span>
                              </div>
                              <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                {takenCount}/{items.length} wzięte
                              </span>
                            </div>

                            <div className="space-y-2">
                              {items.map((dose) => {
                                const isTaken = dose.status === 'taken';
                                const isSnoozed = dose.status === 'snoozed';
                                const isSkipped = dose.status === 'skipped';

                                return (
                                  <div
                                    key={dose.id}
                                    className={`bg-white rounded-xl border p-3 transition-all shadow-2xs ${
                                      isTaken
                                        ? 'border-emerald-100 bg-emerald-50/30'
                                        : isSnoozed
                                        ? 'border-amber-200 bg-amber-50/30'
                                        : 'border-slate-200/80 hover:border-teal-200'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div
                                        className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-lg text-center shrink-0 border ${
                                          isTaken
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                            : isSnoozed
                                            ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
                                            : 'bg-slate-50 border-slate-200 text-slate-800'
                                        }`}
                                      >
                                        <Clock className="w-3 h-3 mb-0.5 text-slate-400" />
                                        <span className="font-extrabold text-xs leading-tight">
                                          {isSnoozed && dose.snoozedUntil ? dose.snoozedUntil : dose.time}
                                        </span>
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: dose.therapyColor }}
                                          />
                                          <span className="text-3xs font-semibold text-slate-500 truncate">
                                            {dose.therapyName}
                                          </span>
                                          <span
                                            className={`ml-auto text-3xs font-extrabold px-1.5 py-0.2 rounded-full border ${
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
                                              ? `Odroczone`
                                              : isSkipped
                                              ? 'Pominięte'
                                              : 'Oczekuje'}
                                          </span>
                                        </div>

                                        <h4
                                          className={`font-bold text-xs leading-tight truncate ${
                                            isTaken ? 'line-through text-slate-400' : 'text-slate-900'
                                          }`}
                                        >
                                          {dose.medicationName}
                                        </h4>

                                        <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-slate-600">
                                          <span className="font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded text-3xs">
                                            {formatDoseDisplay(dose.doseAmount, dose.type)}
                                          </span>
                                          {dose.instructions && (
                                            <span className="text-3xs text-slate-500 truncate italic">
                                              • {dose.instructions}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {!isTaken && (
                                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleTakeDoseWithFeedback(dose.id)}
                                          className="flex-1 py-1 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-2xs flex items-center justify-center gap-1 transition-all shadow-xs active:scale-95"
                                        >
                                          <Check className="w-3 h-3" />
                                          Wziąłem
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setSnoozeDoseTarget(dose)}
                                          className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-2xs flex items-center justify-center gap-1 transition-all"
                                        >
                                          <Clock className="w-3 h-3 text-amber-700" />
                                          Odłóż
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onSkipDose(dose.id)}
                                          className="py-1 px-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-3xs font-semibold"
                                          title="Pomiń dawkę"
                                        >
                                          Pomiń
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="space-y-3">
                          {renderGroup(
                            'Rano (do 12:00)',
                            morning,
                            <SunMedium className="w-3.5 h-3.5 text-amber-600" />,
                            'bg-amber-100 text-amber-800',
                            'bg-amber-500/10 border-amber-200/70',
                            'text-amber-800'
                          )}
                          {renderGroup(
                            'Popołudnie (12:00 - 18:00)',
                            afternoon,
                            <Sun className="w-3.5 h-3.5 text-sky-600" />,
                            'bg-sky-100 text-sky-800',
                            'bg-sky-500/10 border-sky-200/70',
                            'text-sky-800'
                          )}
                          {renderGroup(
                            'Wieczór i Noc (od 18:00)',
                            evening,
                            <Moon className="w-3.5 h-3.5 text-indigo-600" />,
                            'bg-indigo-100 text-indigo-800',
                            'bg-indigo-500/10 border-indigo-200/70',
                            'text-indigo-800'
                          )}
                        </div>
                      );
                    })()
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
                              className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="font-bold text-slate-800 truncate">{m.name}</div>
                                <div className="text-2xs text-slate-500 mt-0.5">
                                  Dawka: <span className="font-semibold text-teal-700">{m.doseAmount} ({m.type})</span> • Godziny: {m.times.join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-3xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-md">
                                  {m.scheduleType === 'daily' ? 'Codziennie' : 'Harmonogram'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Czy na pewno chcesz usunąć lek "${m.name}" z terapii "${therapy.name}"? Usunięte zostaną także zaplanowane dla niego dawki.`)) {
                                      if (onDeleteMedication) {
                                        onDeleteMedication(m.id);
                                      }
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Usuń lek z terapii"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 4: KOPIA I DYSK GOOGLE */}
            {activeTab === 'sync' && (
              <BackupSyncView
                therapies={therapies}
                medications={medications}
                onRestoreSampleBackup={onResetSampleData}
              />
            )}

          </div>

          {/* Bottom Navigation Bar */}
          <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around shrink-0 shadow-lg">
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

            <button
              type="button"
              onClick={() => setActiveTab('sync')}
              className={`flex flex-col items-center gap-1 transition-colors ${
                activeTab === 'sync' ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Cloud className="w-5 h-5" />
              <span className="text-2xs">Kopia i Dysk</span>
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

      {/* Drug Database Overlay - Przeszukiwanie bazy ponad 2700 leków w Polsce z dawkami i częstotliwością */}
      <DrugDatabaseOverlay
        isOpen={isDrugDatabaseOpen}
        therapies={therapies}
        onClose={() => setIsDrugDatabaseOpen(false)}
        onAddMedicationToTherapy={onAddMedication}
        onOpenAddTherapy={() => {
          setIsDrugDatabaseOpen(false);
          setIsAddTherapyOpen(true);
        }}
      />

      {/* Background Notification Diagnosis & Settings Modal */}
      {isBgDiagnosisOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    Działanie powiadomień w tle
                  </h3>
                  <p className="text-2xs text-slate-500 font-medium">
                    Dlaczego powiadomienia mogły nie dzwonić przy wyłączonej aplikacji?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBgDiagnosisOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-teal-800">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Naprawa w kodzie Flutter (rescheduleAllUpcomingDoses)
                </div>
                <p className="text-2xs">
                  Wcześniej aplikacja definiowała kanał powiadomień, ale nie wywoływała planowania dokładnych alarmów przy zapisywaniu leków do bazy SQLite. Teraz każda zmiana harmonogramu automatycznie przelicza i rejestruje alarmy w systemie Android.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Kluczowe ustawienia systemu Android (Doze Mode):
                </div>
                <ul className="text-2xs space-y-1.5 pl-2 list-disc list-inside">
                  <li>
                    <span className="font-bold">Dokładne alarmy:</span> W Android 12, 13, 14 i nowszych aplikacja musi mieć przyznane uprawnienie "Alarmy i przypomnienia".
                  </li>
                  <li>
                    <span className="font-bold">Samsung (OneUI):</span> Wejdź w Ustawienia &gt; Aplikacje &gt; MedPlaner &gt; Bateria &gt; Zmień z "Zoptymalizowano" na <strong>"Nieograniczone" (Unrestricted)</strong>.
                  </li>
                  <li>
                    <span className="font-bold">Xiaomi / POCO (MIUI / HyperOS):</span> Włącz <strong>"Autostart"</strong> oraz ustaw Oszczędzanie baterii na <strong>"Bez ograniczeń"</strong>.
                  </li>
                  <li>
                    <span className="font-bold">Huawei (EMUI):</span> Uruchamianie aplikacji &gt; Wyłącz automatyczne, zaznacz <strong>"Działanie w tle"</strong>.
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-slate-100 rounded-2xl space-y-1">
                <div className="font-bold text-slate-800">Test powiadomień w przeglądarce (Web Push):</div>
                <p className="text-2xs text-slate-500">
                  Możesz przetestować natywne powiadomienie z paska systemu klikając przycisk poniżej.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                      Notification.requestPermission().then((res) => {
                        if (res === 'granted') {
                          setWebNotificationAllowed(true);
                          new Notification('🔔 MedPlaner: Powiadomienia włączone', {
                            body: 'Alarmy będą pojawiać się w pasku systemowym urządzenia.',
                          });
                        }
                      });
                    }
                  }}
                  className="mt-2 w-full py-1.5 px-3 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-2xs font-bold text-slate-800 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                  Włącz powiadomienia w przeglądarce
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBgDiagnosisOpen(false)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

