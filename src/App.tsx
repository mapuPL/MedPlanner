import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Code2, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  Heart,
  Pill,
  RotateCcw
} from 'lucide-react';
import { 
  Therapy, 
  Medication, 
  DoseItem, 
  DoseStatus,
  calculateSnoozeTime 
} from './utils/medicationLogic';
import { PhoneSimulator } from './components/PhoneSimulator';
import { ProjectIdxStudio } from './components/ProjectIdxStudio';
import { downloadFlutterProjectZip } from './utils/zipExport';

const INITIAL_THERAPIES: Therapy[] = [
  {
    id: 'th-1',
    name: 'Terapia antybiotykowa',
    description: 'Antybiotykoterapia zalecona na 7 dni. Przyjmować ściśle w stałych odstępach.',
    color: '#8b5cf6', // Fioletowy
    icon: 'medical_services',
    startDate: new Date(Date.now() - 2 * 86400000).toISOString().substring(0, 10),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'th-2',
    name: 'Krople do oczu i nosa',
    description: 'Nawilżanie rogówki i leczenie zapalenia zatok.',
    color: '#3b82f6', // Błękitny
    icon: 'droplet',
    startDate: new Date(Date.now() - 5 * 86400000).toISOString().substring(0, 10),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'th-3',
    name: 'Leki codzienne & Profilaktyka',
    description: 'Codzienna suplementacja i ochrona układu krążenia.',
    color: '#10b981', // Szmaragdowy
    icon: 'heart',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().substring(0, 10),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    therapyId: 'th-1',
    name: 'Amotaks 1g (Amoksycylina)',
    type: 'capsule',
    doseAmount: '1',
    instructions: 'Po posiłku, popić pełną szklanką wody',
    times: ['08:00', '20:00'],
    scheduleType: 'daily',
    startDate: new Date(Date.now() - 2 * 86400000).toISOString().substring(0, 10),
  },
  {
    id: 'med-2',
    therapyId: 'th-2',
    name: 'Hyabak krople nawilżające',
    type: 'drops',
    doseAmount: '2',
    instructions: 'Zakroplić do worka spojówkowego obu oczu',
    times: ['08:30', '14:00', '21:00'],
    scheduleType: 'daily',
    startDate: new Date(Date.now() - 5 * 86400000).toISOString().substring(0, 10),
  },
  {
    id: 'med-3',
    therapyId: 'th-3',
    name: 'Acard 75 mg',
    type: 'capsule',
    doseAmount: '1',
    instructions: 'W trakcie obiadu',
    times: ['13:00'],
    scheduleType: 'daily',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().substring(0, 10),
  },
  {
    id: 'med-4',
    therapyId: 'th-3',
    name: 'Syrop prawoślazowy',
    type: 'ml',
    doseAmount: '10',
    instructions: 'Przed snem łagodząco',
    times: ['21:30'],
    scheduleType: 'daily',
    startDate: new Date().toISOString().substring(0, 10),
  },
];

function generateSampleDoses(therapies: Therapy[], medications: Medication[]): DoseItem[] {
  const doses: DoseItem[] = [];
  const todayStr = new Date().toISOString().substring(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

  const dates = [yesterdayStr, todayStr];

  for (const date of dates) {
    const isYesterday = date === yesterdayStr;

    for (const med of medications) {
      const therapy = therapies.find((t) => t.id === med.therapyId) || therapies[0];

      for (const time of med.times) {
        let status: DoseStatus = 'pending';
        let takenAt: string | undefined = undefined;
        let snoozedUntil: string | undefined = undefined;

        if (isYesterday) {
          // Yesterday all doses were taken
          status = 'taken';
          takenAt = time;
        } else {
          // Today: realistic progress
          if (time <= '09:00') {
            status = 'taken';
            takenAt = time;
          } else if (time === '14:00') {
            status = 'snoozed';
            snoozedUntil = '14:15';
          } else {
            status = 'pending';
          }
        }

        doses.push({
          id: `${med.id}_${date}_${time.replace(':', '')}`,
          medicationId: med.id,
          therapyId: therapy.id,
          medicationName: med.name,
          therapyName: therapy.name,
          therapyColor: therapy.color,
          type: med.type,
          doseAmount: `${med.doseAmount}`,
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

  const [therapies, setTherapies] = useState<Therapy[]>(() => {
    const saved = localStorage.getItem('medplaner_therapies');
    return saved ? JSON.parse(saved) : INITIAL_THERAPIES;
  });

  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('medplaner_meds');
    return saved ? JSON.parse(saved) : INITIAL_MEDICATIONS;
  });

  const [doses, setDoses] = useState<DoseItem[]>(() => {
    const saved = localStorage.getItem('medplaner_doses');
    return saved ? JSON.parse(saved) : generateSampleDoses(INITIAL_THERAPIES, INITIAL_MEDICATIONS);
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('medplaner_therapies', JSON.stringify(therapies));
  }, [therapies]);

  useEffect(() => {
    localStorage.setItem('medplaner_meds', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem('medplaner_doses', JSON.stringify(doses));
  }, [doses]);

  const handleTakeDose = (doseId: string) => {
    const nowTime = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    setDoses((prev) =>
      prev.map((d) => (d.id === doseId ? { ...d, status: 'taken', takenAt: nowTime, snoozedUntil: undefined } : d))
    );
  };

  const handleSnoozeDose = (doseId: string, minutes: number) => {
    setDoses((prev) =>
      prev.map((d) => {
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
      })
    );
  };

  const handleSkipDose = (doseId: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === doseId ? { ...d, status: 'skipped', snoozedUntil: undefined } : d))
    );
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

    // Generate doses for today for this medication
    const todayStr = new Date().toISOString().substring(0, 10);
    const therapy = therapies.find((t) => t.id === newMed.therapyId);

    const newDoses: DoseItem[] = newMed.times.map((time) => ({
      id: `${newMed.id}_${todayStr}_${time.replace(':', '')}`,
      medicationId: newMed.id,
      therapyId: newMed.therapyId,
      medicationName: newMed.name,
      therapyName: therapy?.name || 'Terapia',
      therapyColor: therapy?.color || '#10b981',
      type: newMed.type,
      doseAmount: `${newMed.doseAmount}`,
      instructions: newMed.instructions,
      date: todayStr,
      time,
      status: 'pending',
    }));

    setDoses((prev) => [...prev, ...newDoses]);
  };

  const handleResetSampleData = () => {
    setTherapies(INITIAL_THERAPIES);
    setMedications(INITIAL_MEDICATIONS);
    setDoses(generateSampleDoses(INITIAL_THERAPIES, INITIAL_MEDICATIONS));
    localStorage.removeItem('medplaner_therapies');
    localStorage.removeItem('medplaner_meds');
    localStorage.removeItem('medplaner_doses');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Application Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 tracking-tight">MedPlaner</span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-2xs font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                  Flutter &amp; Project IDX
                </span>
              </div>
              <p className="text-2xs text-slate-500 font-medium hidden sm:block">
                Zarządzanie terapiami medycznymi i elastycznym dawkowaniem leków
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('simulator')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'simulator'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span>Symulator Android</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'code'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-4 h-4 text-teal-600" />
                <span>Kod Flutter &amp; IDX</span>
              </button>
            </div>

            <button
              type="button"
              onClick={downloadFlutterProjectZip}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs"
              title="Pobierz kompletny projekt Flutter jako ZIP"
            >
              <Download className="w-4 h-4" />
              <span>Pobierz .ZIP</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start py-6">
        {viewMode === 'simulator' ? (
          <PhoneSimulator
            therapies={therapies}
            medications={medications}
            doses={doses}
            onTakeDose={handleTakeDose}
            onSnoozeDose={handleSnoozeDose}
            onSkipDose={handleSkipDose}
            onAddTherapy={handleAddTherapy}
            onAddMedication={handleAddMedication}
            onResetSampleData={handleResetSampleData}
          />
        ) : (
          <ProjectIdxStudio />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>100% Offline • Dane w lokalnej bazie SQLite • Brak zewnętrznych serwerów</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Dostosowane do Google Project IDX</span>
            <span>•</span>
            <code>flutter build apk --release</code>
          </div>
        </div>
      </footer>
    </div>
  );
}
