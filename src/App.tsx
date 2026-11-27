import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  Code2,
  Download,
  ShieldCheck,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import {
  Therapy,
  Medication,
  DoseItem,
  DoseStatus,
  FamilyProfile,
  MedicationChangeRecord,
  calculateSnoozeTime,
  parseNumericDose,
  evaluateCabinetStatus,
  calculateCompliance,
  formatLocalDate,
  addDaysToDateStr,
  isMedicationActiveOnDate,
  isDuplicateProfileName,
  refreshDosesAfterMedicationUpdate,
  buildDosesForDate,
  undoDoseStatusResult,
  resolveProfileId,
  applyBackupImport,
  buildMedicationChangeRecord,
  buildTherapyStatusChangeRecords,
  MEDICATION_TYPE_LABELS,
} from './utils/medicationLogic';
import { PhoneSimulator, SimulatorTab } from './components/PhoneSimulator';
import { ProjectIdxStudio } from './components/ProjectIdxStudio';
import { MedPlanerBackupPayload } from './components/BackupSyncView';
import { TherapyPdfReportModal } from './components/TherapyPdfReportModal';
import {
  ProfileManagerModal,
  PROFILE_COLOR_PALETTE,
  PROFILE_RELATION_OPTIONS,
} from './components/ProfileManagerModal';
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

const INITIAL_MED_CHANGES: MedicationChangeRecord[] = [
  {
    id: 'chg-init-1',
    medicationId: 'med-3',
    therapyId: 'th-3',
    profileId: 'self',
    medicationName: 'Acard 75 mg',
    changedAt: `${addDaysToDateStr(BASE_TODAY, -6)}T09:30:00.000Z`,
    previousDose: '0.5 tabl. (13:00)',
    newDose: '1 tabl. (13:00)',
    previousTimes: ['13:00'],
    newTimes: ['13:00'],
    changeType: 'dose_change',
    changeReason: 'Kontrolna wizyta kardiologiczna – ustalenie dawki podtrzymującej',
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
  const [viewMode, setViewMode] = useState<'simulator' | 'code'>('simulator');
  const [simulatorTab, setSimulatorTab] = useState<SimulatorTab>('today');
  const [activeProfileId, setActiveProfileId] = useState<string>('all');
  const [sidebarShowAllProfiles, setSidebarShowAllProfiles] = useState(false);

  useEffect(() => {
    setSidebarShowAllProfiles(false);
  }, [activeProfileId]);

  // Inline sidebar add profile form state
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRelation, setNewProfileRelation] = useState('Rodzina');
  const [newProfileColor, setNewProfileColor] = useState(PROFILE_COLOR_PALETTE[0]);
  const [profileFormError, setProfileFormError] = useState('');

  // Full Profile Manager modal state (triggered from sidebar)
  const [isSidebarProfileManagerOpen, setIsSidebarProfileManagerOpen] = useState(false);
  const [sidebarEditProfileId, setSidebarEditProfileId] = useState<string | null>(null);
  const [sidebarDeleteProfileId, setSidebarDeleteProfileId] = useState<string | null>(null);
  const [isDesktopPdfReportOpen, setIsDesktopPdfReportOpen] = useState(false);

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

  const [medicationChanges, setMedicationChanges] = useState<MedicationChangeRecord[]>(() => {
    try {
      const saved = localStorage.getItem('medplaner_med_changes');
      return saved ? JSON.parse(saved) : INITIAL_MED_CHANGES;
    } catch {
      return INITIAL_MED_CHANGES;
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

  useEffect(() => {
    localStorage.setItem('medplaner_med_changes', JSON.stringify(medicationChanges));
  }, [medicationChanges]);

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

  const handleUndoDose = (doseId: string) => {
    const result = undoDoseStatusResult(doses, medications, doseId);
    setDoses(result.doses);
    setMedications(result.medications);
  };

  const handleUpdateDoseNote = (
    doseId: string,
    note: string | undefined,
    virtualDose?: DoseItem
  ) => {
    const cleaned = note?.trim() ? note.trim() : undefined;
    setDoses((prev) => {
      const exists = prev.some((d) => d.id === doseId);
      if (exists) {
        return prev.map((d) => (d.id === doseId ? { ...d, note: cleaned } : d));
      }
      if (virtualDose) {
        return [...prev, { ...virtualDose, note: cleaned }];
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

  const handleUpdateTherapy = (updatedTherapy: Therapy) => {
    setTherapies((prev) =>
      prev.map((t) => (t.id === updatedTherapy.id ? updatedTherapy : t))
    );
    setMedications((prev) =>
      prev.map((m) =>
        m.therapyId === updatedTherapy.id
          ? { ...m, profileId: updatedTherapy.profileId || m.profileId }
          : m
      )
    );
    setDoses((prev) =>
      prev.map((d) =>
        d.therapyId === updatedTherapy.id
          ? {
              ...d,
              therapyName: updatedTherapy.name,
              therapyColor: updatedTherapy.color,
              profileId: updatedTherapy.profileId || d.profileId,
            }
          : d
      )
    );
  };

  const handleToggleTherapyActive = (therapyId: string) => {
    const target = therapies.find((t) => t.id === therapyId);
    if (target) {
      const nextIsActive = !target.isActive;
      const statusAudit = buildTherapyStatusChangeRecords({
        therapy: target,
        medications,
        nextIsActive,
      });
      setMedicationChanges((prev) => [...prev, ...statusAudit]);
    }
    setTherapies((prev) =>
      prev.map((t) => (t.id === therapyId ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const handleDeleteTherapy = (therapyId: string) => {
    const removedMedIds = new Set(
      medications.filter((m) => m.therapyId === therapyId).map((m) => m.id)
    );
    setTherapies((prev) => prev.filter((t) => t.id !== therapyId));
    setMedications((prev) => prev.filter((m) => m.therapyId !== therapyId));
    setDoses((prev) =>
      prev.filter((d) => d.therapyId !== therapyId && !removedMedIds.has(d.medicationId))
    );
  };

  const handleAddMedication = (newMedData: Omit<Medication, 'id'>) => {
    const newMed: Medication = {
      ...newMedData,
      id: `med-${Date.now()}`,
    };
    setMedications((prev) => [...prev, newMed]);

    const todayStr = formatLocalDate();
    const therapy = therapies.find((t) => t.id === newMed.therapyId);
    if (!isMedicationActiveOnDate(newMed, todayStr, therapy)) return;

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

  const handleUpdateMedication = (updatedMed: Medication, changeReason?: string) => {
    const prevMed = medications.find((m) => m.id === updatedMed.id);
    if (prevMed) {
      const prevTherapy = therapies.find((t) => t.id === prevMed.therapyId);
      const nextTherapy = therapies.find((t) => t.id === updatedMed.therapyId);
      const changeRecord = buildMedicationChangeRecord({
        prevMed,
        nextMed: updatedMed,
        prevTherapy,
        nextTherapy,
        changeReason,
      });
      if (changeRecord) {
        setMedicationChanges((prev) => [...prev, changeRecord]);
      }
    }

    setMedications((prev) => prev.map((m) => (m.id === updatedMed.id ? updatedMed : m)));
    const therapy = therapies.find((t) => t.id === updatedMed.therapyId);
    const today = formatLocalDate();
    setDoses((prev) => refreshDosesAfterMedicationUpdate(prev, updatedMed, therapy, today));
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

  const handleImportBackupData = (
    payload: MedPlanerBackupPayload,
    mode: 'replace' | 'merge'
  ) => {
    const nextState = applyBackupImport(
      { profiles, therapies, medications, doses, medicationChanges },
      payload,
      mode,
      INITIAL_PROFILES
    );
    setProfiles(nextState.profiles);
    setTherapies(nextState.therapies);
    setMedications(nextState.medications);
    setDoses(nextState.doses);
    setMedicationChanges(nextState.medicationChanges ?? []);
    if (
      activeProfileId !== 'all' &&
      !nextState.profiles.some((p) => p.id === activeProfileId)
    ) {
      setActiveProfileId('all');
    }
  };

  const handleResetSampleData = () => {
    setProfiles(INITIAL_PROFILES);
    setTherapies(INITIAL_THERAPIES);
    setMedications(INITIAL_MEDICATIONS);
    setDoses(generateSampleDoses(INITIAL_THERAPIES, INITIAL_MEDICATIONS));
    setMedicationChanges(INITIAL_MED_CHANGES);
    setActiveProfileId('all');
    localStorage.removeItem('medplaner_profiles');
    localStorage.removeItem('medplaner_therapies');
    localStorage.removeItem('medplaner_meds');
    localStorage.removeItem('medplaner_doses');
    localStorage.removeItem('medplaner_med_changes');
  };

  const handleCreateProfileData = (data: Omit<FamilyProfile, 'id'>): FamilyProfile => {
    const created: FamilyProfile = {
      id: `prof-${Date.now()}`,
      name: data.name.trim(),
      relation: data.relation.trim() || 'Bliski',
      avatarColor: data.avatarColor || PROFILE_COLOR_PALETTE[profiles.length % PROFILE_COLOR_PALETTE.length],
    };
    setProfiles((prev) => [...prev, created]);
    return created;
  };

  const handleUpdateProfile = (updated: FamilyProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProfile = (
    profileId: string,
    options: { mode: 'transfer' | 'cascade'; targetProfileId?: string }
  ) => {
    if (profiles.length <= 1) return;
    const remaining = profiles.filter((p) => p.id !== profileId);

    if (options.mode === 'transfer' && remaining.length > 0) {
      const targetId =
        options.targetProfileId && remaining.some((p) => p.id === options.targetProfileId)
          ? options.targetProfileId
          : remaining[0].id;

      setTherapies((prev) =>
        prev.map((t) => ((t.profileId || 'self') === profileId ? { ...t, profileId: targetId } : t))
      );
      setMedications((prev) =>
        prev.map((m) => ((m.profileId || 'self') === profileId ? { ...m, profileId: targetId } : m))
      );
      setDoses((prev) =>
        prev.map((d) => ((d.profileId || 'self') === profileId ? { ...d, profileId: targetId } : d))
      );
    } else {
      const removedTherapyIds = new Set(
        therapies.filter((t) => (t.profileId || 'self') === profileId).map((t) => t.id)
      );
      const removedMedIds = new Set(
        medications
          .filter((m) => (m.profileId || 'self') === profileId || removedTherapyIds.has(m.therapyId))
          .map((m) => m.id)
      );

      setTherapies((prev) => prev.filter((t) => (t.profileId || 'self') !== profileId));
      setMedications((prev) =>
        prev.filter((m) => (m.profileId || 'self') !== profileId && !removedTherapyIds.has(m.therapyId))
      );
      setDoses((prev) =>
        prev.filter(
          (d) =>
            (d.profileId || 'self') !== profileId &&
            !removedTherapyIds.has(d.therapyId) &&
            !removedMedIds.has(d.medicationId)
        )
      );
    }

    setProfiles(remaining);
    if (activeProfileId === profileId) {
      setActiveProfileId('all');
    }
  };

  const handleCreateProfileFromSidebar = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProfileName.trim();
    if (!trimmed) {
      setProfileFormError('Wpisz imię lub nazwę profilu.');
      return;
    }
    if (isDuplicateProfileName(trimmed, profiles)) {
      setProfileFormError(`Profil o nazwie "${trimmed}" już istnieje.`);
      return;
    }
    const created = handleCreateProfileData({
      name: trimmed,
      relation: newProfileRelation,
      avatarColor: newProfileColor,
    });
    setActiveProfileId(created.id);
    setNewProfileName('');
    setNewProfileRelation('Rodzina');
    setNewProfileColor(PROFILE_COLOR_PALETTE[(profiles.length + 1) % PROFILE_COLOR_PALETTE.length]);
    setProfileFormError('');
    setIsAddingProfile(false);
  };

  const todayStr = formatLocalDate();
  const todayCompliance = useMemo(() => {
    const todayDoses = buildDosesForDate(
      todayStr,
      therapies,
      medications,
      doses,
      activeProfileId
    );
    return calculateCompliance(todayDoses);
  }, [doses, medications, therapies, todayStr, activeProfileId]);

  const sidebarScopeProfileId = sidebarShowAllProfiles ? 'all' : activeProfileId;
  const activeProfileObj = profiles.find((p) => p.id === activeProfileId);
  const sidebarScopeLabel =
    sidebarScopeProfileId === 'all'
      ? 'Wszystkie profile'
      : activeProfileObj?.name || 'Aktywny profil';

  const sidebarMedications = useMemo(() => {
    return medications.filter((m) => {
      if (sidebarScopeProfileId === 'all') return true;
      const therapy = therapies.find((t) => t.id === m.therapyId);
      return resolveProfileId(m.profileId, m, therapy) === sidebarScopeProfileId;
    });
  }, [medications, therapies, sidebarScopeProfileId]);

  const cabinetAlerts = useMemo(
    () =>
      sidebarMedications
        .map((m) => ({ med: m, eval: evaluateCabinetStatus(m) }))
        .filter((x) => x.eval.status !== 'ok'),
    [sidebarMedications]
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
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
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'code'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-teal-700" />
              <span>Kod Flutter</span>
            </button>
          </div>

          {/* Right Zone: Primary Export Action (Always visible, compact icon on narrow viewports) */}
          <button
            type="button"
            onClick={downloadFlutterProjectZip}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 min-h-[40px] min-w-[40px] rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shrink-0"
            title="Pobierz kompletny projekt Flutter jako ZIP"
            aria-label="Pobierz kompletny projekt Flutter jako ZIP"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">Pobierz .ZIP</span>
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
                medicationChanges={medicationChanges}
                activeProfileId={activeProfileId}
                activeTab={simulatorTab}
                onTabChange={setSimulatorTab}
                onSelectProfile={setActiveProfileId}
                onCreateProfile={handleCreateProfileData}
                onUpdateProfile={handleUpdateProfile}
                onDeleteProfile={handleDeleteProfile}
                onTakeDose={handleTakeDose}
                onSnoozeDose={handleSnoozeDose}
                onSkipDose={handleSkipDose}
                onUndoDose={handleUndoDose}
                onUpdateDoseNote={handleUpdateDoseNote}
                onAddTherapy={handleAddTherapy}
                onUpdateTherapy={handleUpdateTherapy}
                onToggleTherapyActive={handleToggleTherapyActive}
                onDeleteTherapy={handleDeleteTherapy}
                onAddMedication={handleAddMedication}
                onUpdateMedication={handleUpdateMedication}
                onDeleteMedication={handleDeleteMedication}
                onRefillMedication={handleRefillMedication}
                onUpdateStockAndExpiry={handleUpdateStockAndExpiry}
                onImportBackupData={handleImportBackupData}
                onResetSampleData={handleResetSampleData}
              />
            </div>

            {/* Companion Desktop Panel */}
            <aside className="lg:col-span-6 space-y-4">
              {/* Quick Clinical Telemetry Summary */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                      Podgląd Terapii i Apteczki · {sidebarScopeLabel}
                    </p>
                    <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                      Wspólna apteczka i realizacja dawek
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Każde odhaczenie dawki w symulatorze automatycznie pomniejsza stan opakowania.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDesktopPdfReportOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shrink-0 whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Raport PDF</span>
                  </button>
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
                    <p className="text-xl font-black text-slate-900 mt-0.5">{sidebarMedications.length}</p>
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-700" />
                    <h3 className="text-sm font-extrabold text-slate-900">Profile bliskich</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarEditProfileId(null);
                        setSidebarDeleteProfileId(null);
                        setIsSidebarProfileManagerOpen(true);
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Zarządzaj</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingProfile(!isAddingProfile);
                        setProfileFormError('');
                        setNewProfileColor(
                          PROFILE_COLOR_PALETTE[profiles.length % PROFILE_COLOR_PALETTE.length]
                        );
                      }}
                      className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Dodaj osobę</span>
                    </button>
                  </div>
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
                    const canDelete = profiles.length > 1;
                    return (
                      <div
                        key={p.id}
                        className={`inline-flex items-center rounded-xl overflow-hidden border transition-colors ${
                          selected
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200/60 hover:bg-slate-200/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveProfileId(p.id)}
                          className="pl-3 pr-2 py-1.5 text-xs font-bold flex items-center gap-2 tabular-nums"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: selected ? '#99F6E4' : p.avatarColor }}
                          />
                          <span>{p.name}</span>
                          <span className="opacity-75">({count})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSidebarDeleteProfileId(null);
                            setSidebarEditProfileId(p.id);
                            setIsSidebarProfileManagerOpen(true);
                          }}
                          title={`Edytuj profil ${p.name}`}
                          aria-label={`Edytuj profil ${p.name}`}
                          className={`p-1.5 transition-colors ${
                            selected
                              ? 'text-teal-100 hover:text-white hover:bg-teal-800'
                              : 'text-slate-400 hover:text-teal-700 hover:bg-white/70'
                          }`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={!canDelete}
                          onClick={() => {
                            setSidebarEditProfileId(null);
                            setSidebarDeleteProfileId(p.id);
                            setIsSidebarProfileManagerOpen(true);
                          }}
                          title={
                            canDelete
                              ? `Usuń profil ${p.name}`
                              : 'Ostatniego profilu nie można usunąć'
                          }
                          aria-label={`Usuń profil ${p.name}`}
                          className={`p-1.5 pr-2 transition-colors ${
                            !canDelete
                              ? 'opacity-30 cursor-not-allowed'
                              : selected
                              ? 'text-teal-100 hover:text-rose-200 hover:bg-teal-800'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-white/70'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {isAddingProfile && (
                  <form
                    onSubmit={handleCreateProfileFromSidebar}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5"
                  >
                    {profileFormError && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{profileFormError}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newProfileName}
                        onChange={(e) => {
                          setNewProfileName(e.target.value);
                          if (profileFormError) setProfileFormError('');
                        }}
                        placeholder="Imię np. Tata, Babcia..."
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                      />
                      <select
                        value={newProfileRelation}
                        onChange={(e) => setNewProfileRelation(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                      >
                        {PROFILE_RELATION_OPTIONS.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-600 mr-1">Kolor:</span>
                        {PROFILE_COLOR_PALETTE.map((hex) => {
                          const active = newProfileColor === hex;
                          return (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setNewProfileColor(hex)}
                              aria-label={`Wybierz kolor ${hex}`}
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                active ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                              }`}
                              style={{ backgroundColor: hex }}
                            >
                              {active && <Check className="w-3 h-3 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingProfile(false);
                            setProfileFormError('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-600 text-xs font-bold"
                        >
                          Anuluj
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold"
                        >
                          Zapisz
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Quick Cabinet Alerts Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Kontrola zapasów i ważności
                    </h3>
                    <p className="text-[11px] text-slate-500">{sidebarScopeLabel}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {activeProfileId !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSidebarShowAllProfiles((v) => !v)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                          sidebarShowAllProfiles
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {sidebarShowAllProfiles
                          ? `Tylko ${activeProfileObj?.name || 'profil'}`
                          : 'Wszystkie profile'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSimulatorTab('cabinet');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="text-xs font-bold text-teal-700 hover:underline whitespace-nowrap"
                    >
                      Otwórz apteczkę w symulatorze &rarr;
                    </button>
                  </div>
                </div>

                {cabinetAlerts.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex items-center gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Wszystkie leki ({sidebarScopeLabel}) mają bezpieczny zapas i ważną datę.
                    </span>
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
        ) : (
          <ProjectIdxStudio />
        )}
      </main>

      {/* Sidebar Profile Manager Modal */}
      <ProfileManagerModal
        isOpen={isSidebarProfileManagerOpen}
        profiles={profiles}
        therapies={therapies}
        medications={medications}
        initialEditProfileId={sidebarEditProfileId}
        initialDeleteProfileId={sidebarDeleteProfileId}
        onClose={() => {
          setIsSidebarProfileManagerOpen(false);
          setSidebarEditProfileId(null);
          setSidebarDeleteProfileId(null);
        }}
        onCreateProfile={handleCreateProfileData}
        onUpdateProfile={handleUpdateProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      {/* Desktop PDF Report Modal */}
      <TherapyPdfReportModal
        isOpen={isDesktopPdfReportOpen}
        onClose={() => setIsDesktopPdfReportOpen(false)}
        profiles={profiles}
        therapies={therapies}
        medications={medications}
        doses={doses}
        medicationChanges={medicationChanges}
        activeProfileId={activeProfileId}
      />

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
