import React, { useState, useMemo } from 'react';
import {
  Check,
  Clock,
  Plus,
  Calendar,
  Layers,
  BellRing,
  Sparkles,
  Pill,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
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
  Volume2,
  Package,
  AlertTriangle,
  Users,
  Pencil,
  PauseCircle,
  PlayCircle,
  Archive,
  StickyNote,
  Undo2,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { normalizePolishText } from '../data/polishMedicationsRegistry';
import {
  Therapy,
  Medication,
  DoseItem,
  FamilyProfile,
  MedicationChangeRecord,
  calculateCompliance,
  buildDosesForDate,
  formatDoseDisplay,
  formatLocalDate,
  addDaysToDateStr,
  isDoseVisibleForTherapy,
  evaluateCabinetStatus,
  MEDICATION_TYPE_LABELS,
} from '../utils/medicationLogic';
import { CalendarView } from './CalendarView';
import { SnoozeModal } from './SnoozeModal';
import { AddMedicationModal } from './AddMedicationModal';
import { AddTherapyModal } from './AddTherapyModal';
import { NotificationBanner } from './NotificationBanner';
import { BackupSyncView, MedPlanerBackupPayload } from './BackupSyncView';
import { DrugDatabaseOverlay } from './DrugDatabaseOverlay';
import { MedicineCabinetView } from './MedicineCabinetView';
import { ProfileManagerModal, ConfirmDialogModal } from './ProfileManagerModal';
import { TherapyPdfReportModal } from './TherapyPdfReportModal';

export type SimulatorTab = 'today' | 'calendar' | 'cabinet' | 'therapies' | 'sync';

interface PhoneSimulatorProps {
  therapies: Therapy[];
  medications: Medication[];
  doses: DoseItem[];
  profiles: FamilyProfile[];
  medicationChanges: MedicationChangeRecord[];
  activeProfileId: string;
  activeTab?: SimulatorTab;
  onTabChange?: (tab: SimulatorTab) => void;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (data: Omit<FamilyProfile, 'id'>) => FamilyProfile;
  onUpdateProfile: (profile: FamilyProfile) => void;
  onDeleteProfile: (
    profileId: string,
    options: { mode: 'transfer' | 'cascade'; targetProfileId?: string }
  ) => void;
  onTakeDose: (doseId: string, virtualDose?: DoseItem) => void;
  onSnoozeDose: (doseId: string, minutes: number, virtualDose?: DoseItem) => void;
  onSkipDose: (doseId: string, virtualDose?: DoseItem) => void;
  onUndoDose: (doseId: string) => void;
  onUpdateDoseNote?: (doseId: string, note: string | undefined, virtualDose?: DoseItem) => void;
  onAddTherapy: (therapy: Omit<Therapy, 'id' | 'createdAt'>) => void;
  onUpdateTherapy: (therapy: Therapy) => void;
  onToggleTherapyActive: (therapyId: string) => void;
  onDeleteTherapy: (therapyId: string) => void;
  onAddMedication: (medication: Omit<Medication, 'id'>) => void;
  onUpdateMedication?: (medication: Medication, changeReason?: string) => void;
  onDeleteMedication?: (medicationId: string) => void;
  onRefillMedication: (medicationId: string) => void;
  onUpdateStockAndExpiry: (medicationId: string, stockQuantity: number, expiryDate?: string) => void;
  onImportBackupData: (payload: MedPlanerBackupPayload, mode: 'replace' | 'merge') => void;
  onResetSampleData: () => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  therapies,
  medications,
  doses,
  profiles,
  medicationChanges,
  activeProfileId,
  activeTab: controlledTab,
  onTabChange,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onTakeDose,
  onSnoozeDose,
  onSkipDose,
  onUndoDose,
  onUpdateDoseNote,
  onAddTherapy,
  onUpdateTherapy,
  onToggleTherapyActive,
  onDeleteTherapy,
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  onRefillMedication,
  onUpdateStockAndExpiry,
  onImportBackupData,
  onResetSampleData,
}) => {
  const [internalTab, setInternalTab] = useState<SimulatorTab>('today');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: SimulatorTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'taken' | 'snoozed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [preselectedTherapyIdForMed, setPreselectedTherapyIdForMed] = useState<string | null>(null);
  const [editingMedicationTarget, setEditingMedicationTarget] = useState<Medication | null>(null);
  const [isAddTherapyOpen, setIsAddTherapyOpen] = useState(false);
  const [editingTherapyTarget, setEditingTherapyTarget] = useState<Therapy | null>(null);
  const [isDrugDatabaseOpen, setIsDrugDatabaseOpen] = useState(false);
  const [isBgDiagnosisOpen, setIsBgDiagnosisOpen] = useState(false);
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);
  const [snoozeDoseTarget, setSnoozeDoseTarget] = useState<DoseItem | null>(null);
  const [noteDoseTarget, setNoteDoseTarget] = useState<DoseItem | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirmDeleteMedTarget, setConfirmDeleteMedTarget] = useState<{
    med: Medication;
    therapyName: string;
  } | null>(null);
  const [confirmDeleteTherapyTarget, setConfirmDeleteTherapyTarget] = useState<Therapy | null>(null);

  // Background / Locked Phone Simulation
  const [isPhoneLocked, setIsPhoneLocked] = useState(false);
  const [bgCountdown, setBgCountdown] = useState<number | null>(null);
  const [incomingNotificationDose, setIncomingNotificationDose] = useState<DoseItem | null>(null);

  // Selected date in Today strip (default today)
  const todayStr = formatLocalDate();
  const [selectedDayStr, setSelectedDayStr] = useState<string>(todayStr);

  // Build 7-day strip centered around today (-2 to +4 days)
  const weekStrip = useMemo(() => {
    const days = [];
    for (let i = -2; i <= 4; i++) {
      const iso = addDaysToDateStr(todayStr, i);
      const d = new Date(`${iso}T12:00:00Z`);
      const dayShort = d.toLocaleDateString('pl-PL', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
      days.push({
        iso,
        dayShort,
        dayNum: d.getUTCDate(),
        isToday: iso === todayStr,
      });
    }
    return days;
  }, [todayStr]);

  // Stored doses visible according to therapy active status
  const visibleStoredDoses = useMemo(() => {
    return doses.filter((d) => {
      const therapy = therapies.find((t) => t.id === d.therapyId);
      return isDoseVisibleForTherapy(d, therapy);
    });
  }, [doses, therapies]);

  // Build doses for selectedDayStr using shared schedule engine
  const dosesForSelectedDay = useMemo(
    () =>
      buildDosesForDate(
        selectedDayStr,
        therapies,
        medications,
        visibleStoredDoses,
        activeProfileId
      ),
    [visibleStoredDoses, medications, therapies, selectedDayStr, activeProfileId]
  );

  const displayedDoses = dosesForSelectedDay.filter((d) => {
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

  const compliance = calculateCompliance(dosesForSelectedDay);

  // Cabinet low-stock / expiry alerts count
  const cabinetAlertsCount = useMemo(() => {
    return medications.filter((med) => {
      if (activeProfileId !== 'all') {
        const therapy = therapies.find((t) => t.id === med.therapyId);
        const profId = med.profileId || therapy?.profileId || 'self';
        if (profId !== activeProfileId) return false;
      }
      return evaluateCabinetStatus(med).status !== 'ok';
    }).length;
  }, [medications, therapies, activeProfileId]);

  const filteredTherapies = useMemo(() => {
    return therapies.filter(
      (t) => activeProfileId === 'all' || (t.profileId || 'self') === activeProfileId
    );
  }, [therapies, activeProfileId]);

  const activeTherapies = useMemo(
    () => filteredTherapies.filter((t) => t.isActive),
    [filteredTherapies]
  );

  const pausedTherapies = useMemo(
    () => filteredTherapies.filter((t) => !t.isActive),
    [filteredTherapies]
  );

  const playGentleChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch {
      // Audio playback blocked by browser autoplay policy
    }
  };

  const triggerNativeDesktopNotification = (dose: DoseItem) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Czas na lek: ${dose.medicationName}`, {
          body: `Dawka: ${formatDoseDisplay(dose.doseAmount, dose.type)} · ${dose.therapyName}`,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(`Czas na lek: ${dose.medicationName}`, {
              body: `Dawka: ${formatDoseDisplay(dose.doseAmount, dose.type)} · ${dose.therapyName}`,
            });
          }
        });
      }
    }
  };

  const handleTakeDoseWithFeedback = (dose: DoseItem) => {
    onTakeDose(dose.id, dose);

    const remainingPending = dosesForSelectedDay.filter(
      (d) => d.id !== dose.id && d.status !== 'taken'
    ).length;
    if (remainingPending === 0 && dosesForSelectedDay.length > 0) {
      confetti({
        particleCount: 65,
        spread: 58,
        origin: { y: 0.6 },
        colors: ['#0f766e', '#14b8a6', '#f59e0b', '#3b82f6'],
      });
    }
  };

  const handleTriggerSimulatedAlarm = () => {
    const target =
      dosesForSelectedDay.find((d) => d.status === 'pending' || d.status === 'snoozed') ||
      dosesForSelectedDay[0];
    if (target) {
      playGentleChime();
      setIncomingNotificationDose(target);
      triggerNativeDesktopNotification(target);
    }
  };

  const handleStartBackgroundTest = () => {
    setIsPhoneLocked(true);
    setBgCountdown(5);
    const target =
      dosesForSelectedDay.find((d) => d.status === 'pending' || d.status === 'snoozed') ||
      dosesForSelectedDay[0];

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

  // Ring geometry for SVG Adherence Ring
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - compliance.percentage / 100);

  const renderTherapyCard = (therapy: Therapy) => {
    const therapyMeds = medications.filter((m) => m.therapyId === therapy.id);
    const profile = profiles.find((p) => p.id === (therapy.profileId || 'self'));
    const isPaused = !therapy.isActive;
    const dateRangeLabel =
      therapy.startDate && therapy.endDate
        ? `${therapy.startDate} – ${therapy.endDate}`
        : therapy.startDate
        ? `Od ${therapy.startDate}`
        : therapy.endDate
        ? `Do ${therapy.endDate}`
        : null;

    return (
      <div
        key={therapy.id}
        className={`rounded-2xl border p-4 shadow-2xs space-y-3 transition-colors ${
          isPaused
            ? 'bg-slate-50/90 border-slate-200/80 opacity-90'
            : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              className={`w-3.5 h-3.5 rounded-full shrink-0 mt-1 ${isPaused ? 'opacity-50' : ''}`}
              style={{ backgroundColor: therapy.color }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4
                  className={`font-bold text-sm leading-tight truncate ${
                    isPaused ? 'text-slate-600' : 'text-slate-900'
                  }`}
                >
                  {therapy.name}
                </h4>
                {isPaused && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Wstrzymana
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {profile?.name || 'Mój profil'}
                {dateRangeLabel ? ` · ${dateRangeLabel}` : ''}
                {therapy.description ? ` · ${therapy.description}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleTherapyActive(therapy.id)}
              title={isPaused ? 'Wznów terapię' : 'Wstrzymaj terapię'}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                isPaused
                  ? 'bg-teal-700 hover:bg-teal-800 text-white'
                  : 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800'
              }`}
            >
              {isPaused ? (
                <>
                  <PlayCircle className="w-3 h-3" />
                  <span>Wznów</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3 h-3" />
                  <span>Wstrzymaj</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingTherapyTarget(therapy);
                setIsAddTherapyOpen(true);
              }}
              title="Edytuj terapię"
              aria-label={`Edytuj terapię ${therapy.name}`}
              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setConfirmDeleteTherapyTarget(therapy)}
              title="Usuń terapię"
              aria-label={`Usuń terapię ${therapy.name}`}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-2.5 space-y-2 border border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between px-1">
            <span>Leki w terapii ({therapyMeds.length})</span>
            <button
              type="button"
              onClick={() => {
                setEditingMedicationTarget(null);
                setPreselectedTherapyIdForMed(therapy.id);
                setIsAddMedOpen(true);
              }}
              className="text-teal-700 hover:underline font-bold"
            >
              + Dodaj lek
            </button>
          </div>

          {therapyMeds.length === 0 ? (
            <p className="text-xs text-slate-400 italic px-1">Brak przypisanych leków.</p>
          ) : (
            therapyMeds.map((m) => (
              <div
                key={m.id}
                className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-bold text-slate-900 truncate">{m.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    {formatDoseDisplay(m.doseAmount, m.type)} · {m.times.join(', ')}
                    {typeof m.stockQuantity === 'number' && ` · Zapas: ${m.stockQuantity}`}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMedicationTarget(m);
                      setPreselectedTherapyIdForMed(therapy.id);
                      setIsAddMedOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Edytuj lek"
                    aria-label={`Edytuj lek ${m.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDeleteMedTarget({ med: m, therapyName: therapy.name })
                    }
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Compact Simulator Utility Strip */}
      <div className="w-full max-w-[400px] mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartBackgroundTest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
            title="Zablokuj ekran i przetestuj powiadomienie za 5s"
          >
            <Lock className="w-3.5 h-3.5 text-teal-300" />
            <span>{bgCountdown !== null ? `Alarm za ${bgCountdown}s` : 'Test w tle (5s)'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerSimulatedAlarm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors"
            title="Wyślij testowe powiadomienie teraz"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Alarm</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsBgDiagnosisOpen(true)}
            className="p-2 text-slate-500 hover:text-teal-700 hover:bg-white rounded-xl transition-colors"
            title="Diagnostyka powiadomień w tle"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onResetSampleData}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl transition-colors"
            title="Przywróć dane demonstracyjne"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dawko-inspired Refined Mobile Device Frame */}
      <div className="relative w-full max-w-[400px] rounded-[46px] bg-[#161B22] p-3 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.28)] ring-1 ring-slate-800/80">
        {/* Dynamic Island Speaker Pill */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-40 flex items-center justify-end pr-2">
          <div className="w-2 h-2 rounded-full bg-slate-800 ring-1 ring-slate-700" />
        </div>

        {/* Screen Container */}
        <div className="relative w-full bg-[#F5F7F8] rounded-[36px] overflow-hidden flex flex-col h-[752px] border border-slate-200/80">
          {/* Device Status Bar */}
          <div className="pt-3 px-7 pb-1.5 bg-white flex items-center justify-between text-[11px] font-bold text-slate-800 shrink-0 select-none tabular-nums">
            <span>09:41</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <span>5G</span>
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>100%</span>
            </div>
          </div>

          {/* Realistic Lock Screen Overlay (Background Test Mode) */}
          {isPhoneLocked && (
            <div className="absolute inset-0 z-30 bg-slate-950 text-white flex flex-col justify-between p-6">
              <div className="flex items-center justify-between text-xs text-slate-400 pt-5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-teal-400" /> Ekran zablokowany
                </span>
                <span className="tabular-nums">100%</span>
              </div>

              <div className="text-center my-auto space-y-2">
                <div className="text-5xl font-light tracking-tight text-white tabular-nums">
                  {new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-teal-200/90 font-medium capitalize">
                  {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>

                {bgCountdown !== null ? (
                  <div className="mt-6 mx-auto max-w-[240px] p-4 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-md space-y-1">
                    <div className="text-xs font-semibold text-teal-300">Budzenie alarmu w tle</div>
                    <div className="text-3xl font-black text-white tabular-nums">{bgCountdown} s</div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      System Android wybudzi powiadomienie przez exactAllowWhileIdle.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 p-3.5 rounded-2xl bg-white/10 border border-white/15 text-xs text-slate-200 max-w-[240px] mx-auto">
                    Powiadomienie zostało wyzwolone w pasku systemowym.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsPhoneLocked(false)}
                className="w-full py-3 px-4 bg-white/15 hover:bg-white/25 border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              >
                <Unlock className="w-4 h-4 text-teal-300" />
                Odblokuj telefon
              </button>
            </div>
          )}

          {/* Clean iOS-inspired App Header */}
          <div className="bg-white px-5 pt-2 pb-3 border-b border-slate-200/70 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-icon.png"
                  alt="MedPlaner logo"
                  className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200/80 p-0.5 shrink-0"
                />
                <div>
                  <h1 className="font-extrabold text-slate-900 text-base leading-tight tracking-tight">
                    MedPlaner
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeProfileId === 'all'
                      ? 'Wszyscy domownicy'
                      : `Profil: ${profiles.find((p) => p.id === activeProfileId)?.name || 'Mój profil'}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDrugDatabaseOpen(true)}
                  className="px-2.5 py-1.5 text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                  title="Otwórz bazę ponad 2700 leków"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Baza</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMedicationTarget(null);
                    setPreselectedTherapyIdForMed(null);
                    setIsAddMedOpen(true);
                  }}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                  title="Dodaj nowy lek"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lek</span>
                </button>
              </div>
            </div>

            {/* Profile Switcher Strip + Manage Profiles Button */}
            {activeTab !== 'sync' && (
              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => onSelectProfile('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                    activeProfileId === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Wszyscy
                </button>
                {profiles.map((prof) => {
                  const selected = activeProfileId === prof.id;
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => onSelectProfile(prof.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                        selected
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: selected ? '#99F6E4' : prof.avatarColor }}
                      />
                      <span>{prof.name}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsProfileManagerOpen(true)}
                  title="Zarządzaj profilami domowników"
                  aria-label="Zarządzaj profilami"
                  className="ml-auto px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/70 flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Users className="w-3 h-3" />
                  <span>Osoby</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Scrollable Screen Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
            {/* TAB 1: DZIŚ (DAWKO-INSPIRED TODAY VIEW) */}
            {activeTab === 'today' && (
              <>
                {/* 7-Day Horizontal Strip right inside Today */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-2 grid grid-cols-7 gap-1">
                  {weekStrip.map((day) => {
                    const isSelected = day.iso === selectedDayStr;
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => setSelectedDayStr(day.iso)}
                        className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all tabular-nums ${
                          isSelected
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`text-[10px] uppercase font-bold ${
                            isSelected ? 'text-teal-200' : 'text-slate-400'
                          }`}
                        >
                          {day.dayShort}
                        </span>
                        <span className="text-sm font-extrabold mt-0.5">{day.dayNum}</span>
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            day.isToday
                              ? isSelected
                                ? 'bg-emerald-300'
                                : 'bg-teal-600'
                              : 'bg-transparent'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Hero Summary Card with SVG Circular Adherence Ring */}
                <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                      {selectedDayStr === todayStr
                        ? 'Dzisiejsze dawkowanie'
                        : new Date(`${selectedDayStr}T12:00:00Z`).toLocaleDateString('pl-PL', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                          })}
                    </p>
                    <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                      {compliance.taken} z {compliance.total}{' '}
                      <span className="text-sm font-semibold text-slate-500">dawek</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {compliance.total === 0
                        ? 'Brak zaplanowanych leków'
                        : compliance.taken === compliance.total
                        ? 'Wszystkie dawki na ten dzień przyjęte'
                        : `Pozostało ${compliance.total - compliance.taken} do przyjęcia`}
                    </p>
                  </div>

                  {/* SVG Adherence Ring */}
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r={ringRadius}
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="6"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={ringRadius}
                        fill="none"
                        stroke="#0F766E"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    <span className="absolute text-xs font-extrabold text-slate-900 tabular-nums">
                      {compliance.percentage}%
                    </span>
                  </div>
                </div>

                {/* Cabinet Alert Shortcut */}
                {cabinetAlertsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('cabinet')}
                    className="w-full p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between text-left hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-950">
                          Apteczka: {cabinetAlertsCount}{' '}
                          {cabinetAlertsCount === 1 ? 'lek wymaga uwagi' : 'leki wymagają uwagi'}
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Sprawdź kończące się opakowania i daty ważności
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />
                  </button>
                )}

                {/* Search + Segmented Status Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj leku, dawki lub terapii..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Clean segmented filter tabs */}
                  <div className="grid grid-cols-4 bg-slate-200/70 p-0.5 rounded-xl text-[11px] font-bold tabular-nums">
                    {[
                      { id: 'all', label: `Wszystkie (${dosesForSelectedDay.length})` },
                      {
                        id: 'pending',
                        label: `Czeka (${dosesForSelectedDay.filter((d) => d.status === 'pending').length})`,
                      },
                      {
                        id: 'taken',
                        label: `Wzięte (${dosesForSelectedDay.filter((d) => d.status === 'taken').length})`,
                      },
                      {
                        id: 'snoozed',
                        label: `Odłożone (${dosesForSelectedDay.filter((d) => d.status === 'snoozed').length})`,
                      },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id as 'all' | 'pending' | 'taken' | 'snoozed')}
                        className={`py-1.5 px-1 rounded-lg transition-all truncate ${
                          statusFilter === f.id
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Drug Registry Link */}
                <button
                  type="button"
                  onClick={() => setIsDrugDatabaseOpen(true)}
                  className="w-full p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-400 flex items-center justify-between text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        Baza Leków URPL / NFZ · 2700+ pozycji
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Wyszukaj lek po nazwie lub substancji czynnej
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition-colors shrink-0" />
                </button>

                {/* Chronological Time-of-Day Timeline */}
                {displayedDoses.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                    <Sparkles className="w-7 h-7 text-teal-400 mx-auto mb-2" />
                    <p className="text-slate-800 font-bold text-sm">
                      {searchQuery
                        ? `Brak dawek dla "${searchQuery}"`
                        : 'Brak dawek do wyświetlenia'}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Dodaj lek z bazy lub zmień wybrany filtr.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const morning = displayedDoses.filter(
                      (d) => (d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.time) < '12:00'
                    );
                    const afternoon = displayedDoses.filter((d) => {
                      const t = d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.time;
                      return t >= '12:00' && t < '18:00';
                    });
                    const evening = displayedDoses.filter(
                      (d) => (d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.time) >= '18:00'
                    );

                    const renderSection = (
                      title: string,
                      items: DoseItem[],
                      icon: React.ReactNode
                    ) => {
                      if (items.length === 0) return null;
                      const takenCount = items.filter((d) => d.status === 'taken').length;

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                              {icon}
                              <span>{title}</span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                              {takenCount}/{items.length}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {items.map((dose) => {
                              const isTaken = dose.status === 'taken';
                              const isSnoozed = dose.status === 'snoozed';
                              const isSkipped = dose.status === 'skipped';
                              const linkedMed = medications.find((m) => m.id === dose.medicationId);
                              const stockEval = linkedMed ? evaluateCabinetStatus(linkedMed) : null;

                              return (
                                <div
                                  key={dose.id}
                                  className={`bg-white rounded-2xl border p-3.5 transition-all ${
                                    isTaken
                                      ? 'border-emerald-200/70 bg-emerald-50/20'
                                      : isSnoozed
                                      ? 'border-amber-300/80'
                                      : 'border-slate-200/80'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Time Block */}
                                    <div
                                      className={`w-13 py-2 rounded-xl text-center shrink-0 tabular-nums ${
                                        isTaken
                                          ? 'bg-emerald-50 text-emerald-800'
                                          : isSnoozed
                                          ? 'bg-amber-100 text-amber-900'
                                          : 'bg-slate-100 text-slate-900'
                                      }`}
                                    >
                                      <div className="text-xs font-black leading-none">
                                        {isSnoozed && dose.snoozedUntil ? dose.snoozedUntil : dose.time}
                                      </div>
                                      <div className="text-[9px] font-semibold uppercase tracking-wide mt-1 opacity-75">
                                        {isTaken
                                          ? 'Wzięte'
                                          : isSnoozed
                                          ? 'Odłoż.'
                                          : isSkipped
                                          ? 'Pomin.'
                                          : 'Plan'}
                                      </div>
                                    </div>

                                      {/* Unboxed Metadata + Drug Name */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: dose.therapyColor }}
                                          />
                                          <span className="truncate">{dose.therapyName}</span>
                                          {isTaken && dose.takenAt && (
                                            <span className="ml-auto text-emerald-700 font-bold tabular-nums shrink-0">
                                              o {dose.takenAt}
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setNoteDoseTarget(dose);
                                              setNoteDraft(dose.note || '');
                                            }}
                                            title={dose.note ? 'Edytuj notatkę do dawki' : 'Dodaj notatkę do dawki'}
                                            aria-label="Notatka do dawki"
                                            className={`${
                                              isTaken && dose.takenAt ? 'ml-1' : 'ml-auto'
                                            } p-1 rounded-md transition-colors shrink-0 ${
                                              dose.note
                                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                                : 'text-slate-400 hover:text-teal-700 hover:bg-slate-100'
                                            }`}
                                          >
                                            <StickyNote className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        <h4
                                          className={`font-bold text-sm leading-snug mt-0.5 truncate ${
                                            isTaken || isSkipped ? 'line-through text-slate-400' : 'text-slate-900'
                                          }`}
                                        >
                                          {dose.medicationName}
                                        </h4>

                                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                                          <strong className="text-teal-800">
                                            {formatDoseDisplay(dose.doseAmount, dose.type)}
                                          </strong>
                                          {dose.instructions && (
                                            <span className="text-slate-500"> · {dose.instructions}</span>
                                          )}
                                        </p>

                                        {dose.note && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setNoteDoseTarget(dose);
                                              setNoteDraft(dose.note || '');
                                            }}
                                            className="mt-1.5 w-full text-left px-2.5 py-1.5 rounded-lg bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-900 flex items-center justify-between gap-2 hover:bg-amber-100/70 transition-colors"
                                          >
                                            <span className="truncate">{dose.note}</span>
                                            <Pencil className="w-3 h-3 text-amber-700 shrink-0" />
                                          </button>
                                        )}

                                        {linkedMed &&
                                          stockEval?.isLowStock &&
                                          typeof linkedMed.stockQuantity === 'number' && (
                                            <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1 tabular-nums">
                                              <AlertTriangle className="w-3 h-3 shrink-0" />
                                              <span>
                                                Zapas: {linkedMed.stockQuantity}{' '}
                                                {MEDICATION_TYPE_LABELS[linkedMed.type]?.unit || 'szt.'}
                                              </span>
                                            </p>
                                          )}
                                      </div>
                                    </div>

                                  {!isTaken && !isSkipped ? (
                                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleTakeDoseWithFeedback(dose)}
                                        className="flex-1 min-h-[38px] py-1.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Wziąłem</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSnoozeDoseTarget(dose)}
                                        className="min-h-[38px] py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                                      >
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Odłóż</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onSkipDose(dose.id, dose)}
                                        className="min-h-[38px] px-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-[11px] font-semibold"
                                      >
                                        Pomiń
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                      {isTaken ? (
                                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 tabular-nums">
                                          <Check className="w-3.5 h-3.5" />
                                          Wzięte {dose.takenAt ? `o ${dose.takenAt}` : ''}
                                        </span>
                                      ) : (
                                        <span className="text-xs font-semibold text-slate-500">
                                          Pominięte
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onUndoDose(dose.id)}
                                        className="min-h-[32px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-teal-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                      >
                                        <Undo2 className="w-3.5 h-3.5" />
                                        <span>Cofnij</span>
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
                      <div className="space-y-4">
                        {renderSection(
                          'Rano · do 12:00',
                          morning,
                          <SunMedium className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        {renderSection(
                          'Popołudnie · 12:00–18:00',
                          afternoon,
                          <Sun className="w-3.5 h-3.5 text-sky-600" />
                        )}
                        {renderSection(
                          'Wieczór · od 18:00',
                          evening,
                          <Moon className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                      </div>
                    );
                  })()
                )}
              </>
            )}

            {/* TAB 2: KALENDARZ */}
            {activeTab === 'calendar' && (
              <CalendarView
                currentDate={todayStr}
                selectedDate={selectedDayStr}
                therapies={therapies}
                medications={medications}
                storedDoses={visibleStoredDoses}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onSelectDate={(d) => setSelectedDayStr(d)}
                onTakeDose={(dose) => handleTakeDoseWithFeedback(dose)}
                onSkipDose={(dose) => onSkipDose(dose.id, dose)}
                onUndoDose={onUndoDose}
                onEditDoseNote={(dose) => {
                  setNoteDoseTarget(dose);
                  setNoteDraft(dose.note || '');
                }}
              />
            )}

            {/* TAB 3: DOMOWA APTECZKA (DAWKO FEATURE) */}
            {activeTab === 'cabinet' && (
              <MedicineCabinetView
                medications={medications}
                therapies={therapies}
                profiles={profiles}
                doses={doses}
                activeProfileId={activeProfileId}
                onRefillMedication={onRefillMedication}
                onUpdateStockAndExpiry={onUpdateStockAndExpiry}
                onOpenPdfReport={() => setIsPdfReportOpen(true)}
                compact
              />
            )}

            {/* TAB 4: TERAPIE I LEKI */}
            {activeTab === 'therapies' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">Aktywne terapie</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsPdfReportOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
                      title="Generuj kartę przebiegu terapii PDF dla lekarza"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Raport PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTherapyTarget(null);
                        setIsAddTherapyOpen(true);
                      }}
                      className="text-xs text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nowa terapia
                    </button>
                  </div>
                </div>

                {activeTherapies.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700">Brak aktywnych terapii</p>
                    <p className="text-[11px] text-slate-400">
                      Utwórz nową terapię lub wznów wstrzymaną poniżej.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">{activeTherapies.map(renderTherapyCard)}</div>
                )}

                {pausedTherapies.length > 0 && (
                  <div className="pt-2 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 px-1">
                      <Archive className="w-3.5 h-3.5 text-slate-400" />
                      <span>Zarchiwizowane / Wstrzymane ({pausedTherapies.length})</span>
                    </div>
                    <div className="space-y-3">{pausedTherapies.map(renderTherapyCard)}</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: KOPIA I DYSK */}
            {activeTab === 'sync' && (
              <BackupSyncView
                therapies={therapies}
                medications={medications}
                doses={doses}
                profiles={profiles}
                medicationChanges={medicationChanges}
                onImportBackupData={onImportBackupData}
                onRestoreSampleBackup={onResetSampleData}
              />
            )}
          </div>

          {/* 5-Tab Bottom Navigation Bar (44px+ targets) */}
          <nav className="bg-white border-t border-slate-200/80 px-2 py-1.5 grid grid-cols-5 shrink-0">
            {[
              { id: 'today', label: 'Dziś', icon: Pill },
              { id: 'calendar', label: 'Kalendarz', icon: Calendar },
              { id: 'cabinet', label: 'Apteczka', icon: Package, badge: cabinetAlertsCount },
              { id: 'therapies', label: 'Terapie', icon: Layers },
              { id: 'sync', label: 'Kopia', icon: Cloud },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as 'today' | 'calendar' | 'cabinet' | 'therapies' | 'sync')}
                  className={`relative min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
                    isActive ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-[18px] h-[18px]" />
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center tabular-nums">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Interactive Android Notification Banner Simulator */}
      <NotificationBanner
        dose={incomingNotificationDose}
        isVisible={incomingNotificationDose !== null}
        onTake={(doseId) => {
          if (incomingNotificationDose) {
            handleTakeDoseWithFeedback(incomingNotificationDose);
          } else {
            onTakeDose(doseId);
          }
          setIncomingNotificationDose(null);
        }}
        onSnooze={(doseId, minutes) => {
          onSnoozeDose(doseId, minutes, incomingNotificationDose || undefined);
          setIncomingNotificationDose(null);
        }}
        onDismiss={() => setIncomingNotificationDose(null)}
      />

      {/* Snooze Options Modal */}
      <SnoozeModal
        isOpen={snoozeDoseTarget !== null}
        dose={snoozeDoseTarget}
        onClose={() => setSnoozeDoseTarget(null)}
        onSnooze={(id, mins) => onSnoozeDose(id, mins, snoozeDoseTarget || undefined)}
        onTakeNow={(id) => {
          if (snoozeDoseTarget && snoozeDoseTarget.id === id) {
            handleTakeDoseWithFeedback(snoozeDoseTarget);
          } else {
            onTakeDose(id);
          }
        }}
      />

      {/* Add / Edit Therapy Modal */}
      <AddTherapyModal
        isOpen={isAddTherapyOpen}
        profiles={profiles}
        defaultProfileId={activeProfileId}
        therapyToEdit={editingTherapyTarget}
        onClose={() => {
          setIsAddTherapyOpen(false);
          setEditingTherapyTarget(null);
        }}
        onSave={onAddTherapy}
        onUpdate={onUpdateTherapy}
        onCreateProfile={onCreateProfile}
      />

      {/* Add / Edit Medication Modal */}
      <AddMedicationModal
        isOpen={isAddMedOpen}
        therapies={therapies}
        profiles={profiles}
        initialTherapyId={preselectedTherapyIdForMed}
        medicationToEdit={editingMedicationTarget}
        onClose={() => {
          setIsAddMedOpen(false);
          setPreselectedTherapyIdForMed(null);
          setEditingMedicationTarget(null);
        }}
        onSave={onAddMedication}
        onUpdate={onUpdateMedication}
        onOpenAddTherapy={() => {
          setIsAddMedOpen(false);
          setPreselectedTherapyIdForMed(null);
          setEditingMedicationTarget(null);
          setEditingTherapyTarget(null);
          setIsAddTherapyOpen(true);
        }}
      />

      {/* Drug Database Overlay */}
      <DrugDatabaseOverlay
        isOpen={isDrugDatabaseOpen}
        therapies={therapies}
        profiles={profiles}
        initialTherapyId={preselectedTherapyIdForMed}
        onClose={() => setIsDrugDatabaseOpen(false)}
        onAddMedicationToTherapy={onAddMedication}
        onOpenAddTherapy={() => {
          setIsDrugDatabaseOpen(false);
          setEditingTherapyTarget(null);
          setIsAddTherapyOpen(true);
        }}
      />

      {/* Dose Note Quick-Edit Modal */}
      {noteDoseTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-3"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dose-note-title"
          >
            <div className="flex items-center justify-between">
              <h3 id="dose-note-title" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-600" />
                <span>Notatka: {noteDoseTarget.medicationName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setNoteDoseTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                aria-label="Zamknij okno notatki"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="np. Ciśnienie 125/80, po śniadaniu, bez dolegliwości..."
              autoFocus
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              {noteDoseTarget.note ? (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateDoseNote?.(noteDoseTarget.id, undefined, noteDoseTarget);
                    setNoteDoseTarget(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Usuń notatkę
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNoteDoseTarget(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleaned = noteDraft.trim() || undefined;
                    onUpdateDoseNote?.(noteDoseTarget.id, cleaned, noteDoseTarget);
                    setNoteDoseTarget(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
                >
                  Zapisz notatkę
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Manager Modal (from simulator strip) */}
      <ProfileManagerModal
        isOpen={isProfileManagerOpen}
        profiles={profiles}
        therapies={therapies}
        medications={medications}
        onClose={() => setIsProfileManagerOpen(false)}
        onCreateProfile={onCreateProfile}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
      />

      {/* Confirm Delete Medication Modal */}
      <ConfirmDialogModal
        isOpen={confirmDeleteMedTarget !== null}
        title="Usunąć lek z terapii?"
        message={
          confirmDeleteMedTarget
            ? `Czy na pewno chcesz usunąć lek "${confirmDeleteMedTarget.med.name}" z terapii "${confirmDeleteMedTarget.therapyName}"?`
            : ''
        }
        confirmLabel="Usuń lek"
        onCancel={() => setConfirmDeleteMedTarget(null)}
        onConfirm={() => {
          if (confirmDeleteMedTarget) {
            onDeleteMedication?.(confirmDeleteMedTarget.med.id);
          }
          setConfirmDeleteMedTarget(null);
        }}
      />

      {/* Confirm Delete Therapy Modal */}
      <ConfirmDialogModal
        isOpen={confirmDeleteTherapyTarget !== null}
        title="Usunąć terapię?"
        message={
          confirmDeleteTherapyTarget
            ? `Czy na pewno chcesz usunąć terapię "${confirmDeleteTherapyTarget.name}" wraz z przypisanymi lekami i historią dawek?`
            : ''
        }
        confirmLabel="Usuń terapię"
        onCancel={() => setConfirmDeleteTherapyTarget(null)}
        onConfirm={() => {
          if (confirmDeleteTherapyTarget) {
            onDeleteTherapy(confirmDeleteTherapyTarget.id);
          }
          setConfirmDeleteTherapyTarget(null);
        }}
      />

      {/* PDF Therapy Report Configurator & Preview Modal */}
      <TherapyPdfReportModal
        isOpen={isPdfReportOpen}
        onClose={() => setIsPdfReportOpen(false)}
        profiles={profiles}
        therapies={therapies}
        medications={medications}
        doses={doses}
        medicationChanges={medicationChanges}
        activeProfileId={activeProfileId}
      />

      {/* Background Notification Diagnosis & Settings Modal */}
      {isBgDiagnosisOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    Działanie powiadomień w tle
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dlaczego alarmy dzwonią nawet przy zamkniętej aplikacji
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBgDiagnosisOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-teal-800">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Automatyczne planowanie dokładnych alarmów
                </div>
                <p className="text-xs">
                  Każde dodanie leku lub przywrócenie kopii zapasowej wywołuje{' '}
                  <code className="font-mono bg-white/80 px-1 rounded">rescheduleAllUpcomingDoses()</code>,
                  rejestrując dokładne wybudzenia na kolejne 7 dni.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Ustawienia systemu Android (Doze Mode):
                </div>
                <ul className="text-xs space-y-1 pl-2 list-disc list-inside">
                  <li>
                    <strong>Alarmy i przypomnienia:</strong> włączone dla MedPlaner w Android 12–15.
                  </li>
                  <li>
                    <strong>Samsung:</strong> Bateria &rarr; „Nieograniczone” (Unrestricted).
                  </li>
                  <li>
                    <strong>Xiaomi / POCO:</strong> włącz „Autostart” i brak oszczędzania baterii.
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    Notification.requestPermission().then((res) => {
                      if (res === 'granted') {
                        new Notification('MedPlaner: Powiadomienia włączone', {
                          body: 'Alarmy będą pojawiać się w pasku systemowym urządzenia.',
                        });
                      }
                    });
                  }
                }}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-4 h-4 text-teal-700" />
                Przetestuj powiadomienie systemowe w przeglądarce
              </button>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBgDiagnosisOpen(false)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs"
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
