import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  Code2,
  Download,
  ShieldCheck,
  Package,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  Therapy,
  Medication,
  DoseItem,
  DoseStatus,
  FamilyProfile,
  calculateSnoozeTime,
  parseNumericDose,
  evaluateCabinetStatus,
  calculateCompliance,
  formatLocalDate,
  addDaysToDateStr,
  isMedicationActiveOnDate,
  MEDICATION_TYPE_LABELS,
} from './utils/medicationLogic';
import { PhoneSimulator } from './components/PhoneSimulator';
import { ProjectIdxStudio } from './components/ProjectIdxStudio';
import { MedicineCabinetView } from './components/MedicineCabinetView';
import { MedPlanerBackupPayload } from './components/BackupSyncView';
import { downloadFlutterProjectZip } from './utils/zipExport';

const INITIAL_PROFILES: FamilyProfile[] = [
  { id: 'self', name: 'Mój profil', relation: 'Główny', avatarColor: '#0F766E' },
  { id: 'mom', name: 'Mama', relation: 'Rodzina', avatarColor: '#8B5CF6' },
  { id: 'kid', name: 'Zosia', relation: 'Dziecko', avatarColor: '#3B82F6' },
];

const BASE_TODAY = formatLocalDate();

const INITIAL_THERAPIES: Therapy[] = [
  {
    id: 'th-1',
    name: 'Terapia antybiotykowa',
    description: 'Kuracja 7-dniowa. Przyjmować ściśle w równych odstępach.',
    color: '#8b5cf6',
    icon: 'medical_services',
    profileId: 'self',
    startDate: addDaysToDateStr(BASE_TODAY, -2),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'th-2',
    name: 'Krople do oczu',
    description: 'Nawilżanie rogówki 3 razy dziennie.',
    color: '#3b82f6',
    icon: 'droplet',
    profileId: 'mom',
    startDate: addDaysToDateStr(BASE_TODAY, -5),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'th-3',
    name: 'Profilaktyka i odporność',
    description: 'Leki codzienne i wsparcie układu krążenia.',
    color: '#10b981',
    icon: 'heart',
    profileId: 'self',
    startDate: addDaysToDateStr(BASE_TODAY, -30),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const in20Days = addDaysToDateStr(BASE_TODAY, 20);
const in8Months = addDaysToDateStr(BASE_TODAY, 240);

const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    therapyId: 'th-1',
    profileId: 'self',
    name: 'Amotaks 1g (Amoksycylina)',
    type: 'capsule',
    doseAmount: '1',
    instructions: 'Po posiłku, popić pełną szklanką wody',
    times: ['08:00', '20:00'],
    scheduleType: 'daily',
    startDate: addDaysToDateStr(BASE_TODAY, -2),
    packageSize: 16,
    stockQuantity: 4,
    lowStockThreshold: 5,
    expiryDate: in8Months,
  },
  {
    id: 'med-2',
    therapyId: 'th-2',
    profileId: 'mom',
    name: 'Hyabak krople nawilżające',
    type: 'drops',
    doseAmount: '2',
    instructions: 'Po 1 kropli do każdego oka',
    times: ['08:30', '14:00', '21:00'],
    scheduleType: 'daily',
    startDate: addDaysToDateStr(BASE_TODAY, -5),
    packageSize: 100,
    stockQuantity: 62,
    lowStockThreshold: 15,
    expiryDate: in20Days,
  },
  {
    id: 'med-3',
    therapyId: 'th-3',
    profileId: 'self',
    name: 'Acard 75 mg',
    type: 'capsule',
    doseAmount: '1',
    instructions: 'W trakcie obiadu',
    times: ['13:00'],
    scheduleType: 'daily',
    startDate: addDaysToDateStr(BASE_TODAY, -30),
    packageSize: 60,
    stockQuantity: 34,
    lowStockThreshold: 8,
    expiryDate: in8Months,
  },
  {
    id: 'med-4',
    therapyId: 'th-3',
    profileId: 'kid',
    name: 'Syrop prawoślazowy',
    type: 'ml',
    doseAmount: '10',
    instructions: 'Przed snem łagodząco',
    times: ['21:30'],
    scheduleType: 'daily',
    startDate: BASE_TODAY,
    packageSize: 125,
    stockQuantity: 85,
    lowStockThreshold: 20,
    expiryDate: in8Months,
  },
];

function generateSampleDoses(therapies: Therapy[], medications: Medication[]): DoseItem[] {
  const doses: DoseItem[] = [];
  const todayStr = formatLocalDate();
  const yesterdayStr = addDaysToDateStr(todayStr, -1);

  for (const date of [yesterdayStr, todayStr]) {
    const isYesterday = date === yesterdayStr;

    for (const med of medications) {
      const therapy = therapies.find((t) => t.id === med.therapyId) || therapies[0];

      for (const time of med.times) {
        let status: DoseStatus = 'pending';
        let takenAt: string | undefined;
        let snoozedUntil: string | undefined;

        if (isYesterday) {
          status = 'taken';
          takenAt = time;
        } else if (time <= '09:00') {
          status = 'taken';
          takenAt = time;
        } else if (time === '14:00') {
          status = 'snoozed';
          snoozedUntil = '14:15';
        }

        doses.push({
          id: `${med.id}_${date}_${time.replace(':', '')}`,
          medicationId: med.id,
          therapyId: therapy.id,
          profileId: med.profileId || therapy.profileId || 'self',
          medicationName: med.name,
          therapyName: therapy.name,
          therapyColor: therapy.color,
          type: med.type,
          doseAmount: med.doseAmount,
          instructions: med.instructions,
          date,
          time,
          status,
          takenAt,
          snoozedUntil,
        });
      }
    }
  }

  return doses;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'simulator' | 'cabinet' | 'code'>('simulator');
  const [activeProfileId, setActiveProfileId] = useState<string>('all');
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const [profiles, setProfiles] = useState<FamilyProfile[]>(() => {
    try {
      const saved = localStorage.getItem('medplaner_profiles');
      return saved ? JSON.parse(saved) : INITIAL_PROFILES;
    } catch {
      return INITIAL_PROFILES;
    }
  });

  const [therapies, setTherapies] = useState<Therapy[]>(() => {
    try {
      const saved = localStorage.getItem('medplaner_therapies');
      return saved ? JSON.parse(saved) : INITIAL_THERAPIES;
    } catch {
      return INITIAL_THERAPIES;
    }
  });

  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      const saved = localStorage.getItem('medplaner_meds');
      return saved ? JSON.parse(saved) : INITIAL_MEDICATIONS;
    } catch {
      return INITIAL_MEDICATIONS;
    }
  });

  const [doses, setDoses] = useState<DoseItem[]>(() => {
    try {
      const saved = localStorage.getItem('medplaner_doses');
      return saved ? JSON.parse(saved) : generateSampleDoses(INITIAL_THERAPIES, INITIAL_MEDICATIONS);
    } catch {
      return generateSampleDoses(INITIAL_THERAPIES, INITIAL_MEDICATIONS);
    }
  });

  useEffect(() => {
    localStorage.setItem('medplaner_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('medplaner_therapies', JSON.stringify(therapies));
  }, [therapies]);

  useEffect(() => {
    localStorage.setItem('medplaner_meds', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem('medplaner_doses', JSON.stringify(doses));
  }, [doses]);

  const handleTakeDose = (doseId: string, virtualDose?: DoseItem) => {
    const nowTime = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const existing = doses.find((d) => d.id === doseId);
    const targetMedId = existing?.medicationId ?? virtualDose?.medicationId;
    const shouldDecrementStock = existing ? existing.status !== 'taken' : Boolean(virtualDose);

    setDoses((prev) => {
      if (prev.some((d) => d.id === doseId)) {
        return prev.map((d) =>
          d.id === doseId ? { ...d, status: 'taken', takenAt: nowTime, snoozedUntil: undefined } : d
        );
      }
      if (virtualDose) {
        return [...prev, { ...virtualDose, status: 'taken', takenAt: nowTime, snoozedUntil: undefined }];
      }
      return prev;
    });

    if (targetMedId && shouldDecrementStock) {
      setMedications((prev) =>
        prev.map((m) => {
          if (m.id !== targetMedId || typeof m.stockQuantity !== 'number') return m;
          const amount = parseNumericDose(m.doseAmount);
          const next = Math.max(0, Number((m.stockQuantity - amount).toFixed(2)));
          return { ...m, stockQuantity: next };
        })
      );
    }
  };

  const handleSnoozeDose = (doseId: string, minutes: number, virtualDose?: DoseItem) => {
    setDoses((prev) => {
      const exists = prev.some((d) => d.id === doseId);
      if (exists) {
        return prev.map((d) => {
          if (d.id === doseId) {
            const snoozedTime = calculateSnoozeTime(d.time, minutes);
            return {
              ...d,
              status: 'snoozed',
              snoozedUntil: snoozedTime,
              snoozeCount: (d.snoozeCount || 0) + 1,
            };
          }
          return d;
        });
      }
      if (virtualDose) {
        const snoozedTime = calculateSnoozeTime(virtualDose.time, minutes);
        return [
          ...prev,
          { ...virtualDose, status: 'snoozed', snoozedUntil: snoozedTime, snoozeCount: 1 },
        ];
      }
      return prev;
    });
  };

  const handleSkipDose = (doseId: string, virtualDose?: DoseItem) => {
    setDoses((prev) => {
      const exists = prev.some((d) => d.id === doseId);
      if (exists) {
        return prev.map((d) =>
          d.id === doseId ? { ...d, status: 'skipped', snoozedUntil: undefined } : d
        );
      }
      if (virtualDose) {
        return [...prev, { ...virtualDose, status: 'skipped', snoozedUntil: undefined }];
      }
      return prev;
    });
  };

  const handleDeleteMedication = (medicationId: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== medicationId));
    setDoses((prev) => prev.filter((d) => d.medicationId !== medicationId));
  };

  const handleAddTherapy = (newTherapyData: Omit<Therapy, 'id' | 'createdAt'>) => {
    const newTherapy: Therapy = {
      ...newTherapyData,
      id: `th-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTherapies((prev) => [newTherapy, ...prev]);
  };

  const handleAddMedication = (newMedData: Omit<Medication, 'id'>) => {
    const newMed: Medication = {
      ...newMedData,
      id: `med-${Date.now()}`,
    };
    setMedications((prev) => [...prev, newMed]);

    const todayStr = formatLocalDate();
    if (!isMedicationActiveOnDate(newMed, todayStr)) return;

    const therapy = therapies.find((t) => t.id === newMed.therapyId);

    const newDoses: DoseItem[] = newMed.times.map((time) => ({
      id: `${newMed.id}_${todayStr}_${time.replace(':', '')}`,
      medicationId: newMed.id,
      therapyId: newMed.therapyId,
      profileId: newMed.profileId || therapy?.profileId || 'self',
      medicationName: newMed.name,
      therapyName: therapy?.name || 'Terapia',
      therapyColor: therapy?.color || '#10b981',
      type: newMed.type,
      doseAmount: newMed.doseAmount,
      instructions: newMed.instructions,
      date: todayStr,
      time,
      status: 'pending',
    }));

    setDoses((prev) => [...prev, ...newDoses]);
  };

  const handleRefillMedication = (medicationId: string, addAmount?: number) => {
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id !== medicationId) return m;
        const pkg = addAmount ?? m.packageSize ?? 30;
        const nextStock = (m.stockQuantity ?? 0) + pkg;
        return { ...m, stockQuantity: nextStock, packageSize: m.packageSize ?? pkg };
      })
    );
  };

  const handleUpdateStockAndExpiry = (
    medicationId: string,
    stockQuantity: number,
    expiryDate?: string
  ) => {
    setMedications((prev) =>
      prev.map((m) =>
        m.id === medicationId ? { ...m, stockQuantity, expiryDate } : m
      )
    );
  };

  const handleImportBackupData = (payload: MedPlanerBackupPayload) => {
    setProfiles(payload.profiles.length > 0 ? payload.profiles : INITIAL_PROFILES);
    setTherapies(payload.therapies);
    setMedications(payload.medications);
    setDoses(payload.doses);
  };

  const handleResetSampleData = () => {
    setProfiles(INITIAL_PROFILES);
    setTherapies(INITIAL_THERAPIES);
    setMedications(INITIAL_MEDICATIONS);
    setDoses(generateSampleDoses(INITIAL_THERAPIES, INITIAL_MEDICATIONS));
    setActiveProfileId('all');
    localStorage.removeItem('medplaner_profiles');
    localStorage.removeItem('medplaner_therapies');
    localStorage.removeItem('medplaner_meds');
    localStorage.removeItem('medplaner_doses');
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const colors = ['#0F766E', '#6366F1', '#D97706', '#E11D48', '#2563EB'];
    const created: FamilyProfile = {
      id: `prof-${Date.now()}`,
      name: newProfileName.trim(),
      relation: 'Bliski',
      avatarColor: colors[profiles.length % colors.length],
    };
    setProfiles((prev) => [...prev, created]);
    setActiveProfileId(created.id);
    setNewProfileName('');
    setIsAddingProfile(false);
  };

  const todayStr = formatLocalDate();
  const todayCompliance = useMemo(() => {
    const todayDoses = doses.filter((d) => {
      if (d.date !== todayStr) return false;
      if (activeProfileId === 'all') return true;
      const med = medications.find((m) => m.id === d.medicationId);
      const therapy = therapies.find((t) => t.id === d.therapyId);
      const profId = d.profileId || med?.profileId || therapy?.profileId || 'self';
      return profId === activeProfileId;
    });
    return calculateCompliance(todayDoses);
  }, [doses, medications, therapies, todayStr, activeProfileId]);

  const cabinetAlerts = useMemo(
    () =>
      medications
        .map((m) => ({ med: m, eval: evaluateCabinetStatus(m) }))
        .filter((x) => x.eval.status !== 'ok'),
    [medications]
  );

  return (
    <div className="min-h-screen bg-[#F4F7F7] flex flex-col font-sans text-slate-900">
      {/* 3-Zone Application Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left Zone: Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="MedPlaner logo"
              className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200/80 p-0.5 shrink-0"
            />
            <div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight block leading-none">
                MedPlaner
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:block mt-1">
                Terapie · Domowa Apteczka · Offline SQLite
              </span>
            </div>
          </div>

          {/* Center Zone: Segmented Mode Switcher */}
          <div className="p-1 bg-slate-100 rounded-xl border border-slate-200/70 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'simulator'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-700" />
              <span>Symulator</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cabinet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all tabular-nums ${
                viewMode === 'cabinet'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-teal-700" />
              <span>Apteczka</span>
              {cabinetAlerts.length > 0 && (
                <span className="text-[10px] font-black text-amber-700">({cabinetAlerts.length})</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'code'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-teal-700" />
              <span>Kod Flutter</span>
            </button>
          </div>

          {/* Right Zone: Primary Export Action */}
          <button
            type="button"
            onClick={downloadFlutterProjectZip}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shrink-0"
            title="Pobierz kompletny projekt Flutter jako ZIP"
          >
            <Download className="w-4 h-4" />
            <span>Pobierz .ZIP</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {viewMode === 'simulator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Mobile Simulator Column */}
            <div className="lg:col-span-6 flex justify-center">
              <PhoneSimulator
                therapies={therapies}
                medications={medications}
                doses={doses}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onSelectProfile={setActiveProfileId}
                onTakeDose={handleTakeDose}
                onSnoozeDose={handleSnoozeDose}
                onSkipDose={handleSkipDose}
                onAddTherapy={handleAddTherapy}
                onAddMedication={handleAddMedication}
                onDeleteMedication={handleDeleteMedication}
                onRefillMedication={handleRefillMedication}
                onUpdateStockAndExpiry={handleUpdateStockAndExpiry}
                onImportBackupData={handleImportBackupData}
                onResetSampleData={handleResetSampleData}
              />
            </div>

            {/* Companion Desktop Panel: Family Profiles & Dawko Medicine Cabinet Overview */}
            <aside className="lg:col-span-6 space-y-4">
              {/* Quick Clinical Telemetry Summary */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                      Podgląd Terapii i Apteczki
                    </p>
                    <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                      Wspólna apteczka i realizacja dawek
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Każde odhaczenie dawki w symulatorze automatycznie pomniejsza stan opakowania.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 tabular-nums">
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium">Dzisiejsza realizacja</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {todayCompliance.percentage}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium">Leki w apteczce</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{medications.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium">Alerty zapasów</p>
                    <p
                      className={`text-xl font-black mt-0.5 ${
                        cabinetAlerts.length > 0 ? 'text-amber-600' : 'text-emerald-700'
                      }`}
                    >
                      {cabinetAlerts.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Family Profiles Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-700" />
                    <h3 className="text-sm font-extrabold text-slate-900">Profile bliskich</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingProfile(!isAddingProfile)}
                    className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj osobę</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveProfileId('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      activeProfileId === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Wszyscy ({medications.length})
                  </button>
                  {profiles.map((p) => {
                    const count = medications.filter((m) => {
                      const th = therapies.find((t) => t.id === m.therapyId);
                      return (m.profileId || th?.profileId || 'self') === p.id;
                    }).length;
                    const selected = activeProfileId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActiveProfileId(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors tabular-nums ${
                          selected
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: selected ? '#99F6E4' : p.avatarColor }}
                        />
                        <span>{p.name}</span>
                        <span className="opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {isAddingProfile && (
                  <form onSubmit={handleCreateProfile} className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="Imię np. Tata, Babcia..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold"
                    >
                      Zapisz
                    </button>
                  </form>
                )}
              </div>

              {/* Quick Cabinet Alerts Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Kontrola zapasów i ważności
                  </h3>
                  <button
                    type="button"
                    onClick={() => setViewMode('cabinet')}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Otwórz pełną apteczkę &rarr;
                  </button>
                </div>

                {cabinetAlerts.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex items-center gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Wszystkie leki w domowej apteczce mają bezpieczny zapas i ważną datę.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cabinetAlerts.map(({ med, eval: st }) => {
                      const unit = MEDICATION_TYPE_LABELS[med.type]?.unit || 'szt.';
                      return (
                        <div
                          key={med.id}
                          className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{med.name}</p>
                              <p className="text-[11px] text-amber-900 tabular-nums">
                                {st.status === 'expired'
                                  ? `Przeterminowany (${med.expiryDate})`
                                  : st.status === 'expiring_soon'
                                  ? `Termin ważności za ${st.daysUntilExpiry} dni (${med.expiryDate})`
                                  : `Pozostało tylko ${med.stockQuantity} ${unit}`}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRefillMedication(med.id)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 text-[11px] font-bold shrink-0"
                          >
                            + Opakowanie
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : viewMode === 'cabinet' ? (
          <div className="max-w-4xl mx-auto">
            <MedicineCabinetView
              medications={medications}
              therapies={therapies}
              profiles={profiles}
              doses={doses}
              activeProfileId={activeProfileId}
              onRefillMedication={handleRefillMedication}
              onUpdateStockAndExpiry={handleUpdateStockAndExpiry}
            />
          </div>
        ) : (
          <ProjectIdxStudio />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>100% Offline · Lokalna baza SQLite · Kopia do pliku w folderze Pobrane i opcjonalnie Dysk Google</span>
          </div>
          <code className="text-slate-400">flutter build apk --release</code>
        </div>
      </footer>
    </div>
  );
}
