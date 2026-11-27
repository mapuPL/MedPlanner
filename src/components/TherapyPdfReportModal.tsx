import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileDown,
  Printer,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  Package,
  ClipboardList,
} from 'lucide-react';
import {
  FamilyProfile,
  Therapy,
  Medication,
  DoseItem,
  MedicationChangeRecord,
  TherapyPdfDetailLevel,
  formatLocalDate,
  addDaysToDateStr,
  buildTherapyPdfReportData,
  formatTherapyReportFilename,
} from '../utils/medicationLogic';
import { downloadTherapyReportPdf } from '../utils/pdfReportGenerator';

interface TherapyPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: FamilyProfile[];
  therapies: Therapy[];
  medications: Medication[];
  doses: DoseItem[];
  medicationChanges: MedicationChangeRecord[];
  activeProfileId: string;
}

export const TherapyPdfReportModal: React.FC<TherapyPdfReportModalProps> = ({
  isOpen,
  onClose,
  profiles,
  therapies,
  medications,
  doses,
  medicationChanges,
  activeProfileId,
}) => {
  const todayStr = formatLocalDate();

  const defaultConcreteProfileId = useMemo(() => {
    if (activeProfileId !== 'all' && profiles.some((p) => p.id === activeProfileId)) {
      return activeProfileId;
    }
    return profiles[0]?.id || 'self';
  }, [activeProfileId, profiles]);

  const [selectedProfileId, setSelectedProfileId] = useState<string>(defaultConcreteProfileId);
  const [includeAllTherapies, setIncludeAllTherapies] = useState<boolean>(true);
  const [selectedTherapyIds, setSelectedTherapyIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => addDaysToDateStr(todayStr, -29));
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [detailLevel, setDetailLevel] = useState<TherapyPdfDetailLevel>('summary');
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<7 | 30 | 90 | null>(30);

  // Synchronize default profile & therapies when opening
  useEffect(() => {
    if (!isOpen) {
      setDownloadedFilename(null);
      return;
    }
    setSelectedProfileId(defaultConcreteProfileId);
    const profTherapies = therapies
      .filter((t) => (t.profileId || 'self') === defaultConcreteProfileId)
      .map((t) => t.id);
    setSelectedTherapyIds(profTherapies);
    setIncludeAllTherapies(true);
    setDownloadedFilename(null);
  }, [isOpen, defaultConcreteProfileId, therapies]);

  const profileTherapies = useMemo(
    () => therapies.filter((t) => (t.profileId || 'self') === selectedProfileId),
    [therapies, selectedProfileId]
  );

  const handleProfileChange = (nextProfileId: string) => {
    setSelectedProfileId(nextProfileId);
    const nextIds = therapies
      .filter((t) => (t.profileId || 'self') === nextProfileId)
      .map((t) => t.id);
    setSelectedTherapyIds(nextIds);
    setDownloadedFilename(null);
  };

  const applyPreset = (days: 7 | 30 | 90) => {
    const end = formatLocalDate();
    const start = addDaysToDateStr(end, -(days - 1));
    setStartDate(start);
    setEndDate(end);
    setActivePreset(days);
    setDownloadedFilename(null);
  };

  const toggleTherapyCheckbox = (therapyId: string) => {
    setIncludeAllTherapies(false);
    setSelectedTherapyIds((prev) =>
      prev.includes(therapyId) ? prev.filter((id) => id !== therapyId) : [...prev, therapyId]
    );
    setDownloadedFilename(null);
  };

  const reportData = useMemo(
    () =>
      buildTherapyPdfReportData({
        profiles,
        therapies,
        medications,
        doses,
        medicationChanges,
        config: {
          profileId: selectedProfileId,
          includeAllTherapies,
          selectedTherapyIds,
          startDate: startDate || todayStr,
          endDate: endDate || todayStr,
          detailLevel,
        },
      }),
    [
      profiles,
      therapies,
      medications,
      doses,
      medicationChanges,
      selectedProfileId,
      includeAllTherapies,
      selectedTherapyIds,
      startDate,
      endDate,
      detailLevel,
      todayStr,
    ]
  );

  if (!isOpen) return null;

  const targetFilename = formatTherapyReportFilename(
    reportData.patientName,
    reportData.startDate,
    reportData.endDate
  );

  const handleDownloadPdf = () => {
    const savedName = downloadTherapyReportPdf(reportData);
    setDownloadedFilename(savedName);
  };

  const canGenerate =
    includeAllTherapies ? profileTherapies.length > 0 : selectedTherapyIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-report-modal-title"
      >
        {/* Top Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="pdf-report-modal-title" className="text-base font-extrabold text-slate-900 truncate">
                Generuj Raport PDF dla Lekarza
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Karta Przebiegu Terapii A4 z historią zmian dawek i prognozą apteczki (100% offline)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij generator raportu PDF"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column Body: Configurator Left + Live A4 Preview Right */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
          {/* LEFT: Configurator Form */}
          <div className="lg:col-span-5 p-5 space-y-5 bg-white">
            {/* 1. Wybór Profilu Pacjenta */}
            <div>
              <label
                htmlFor="pdf-profile-select"
                className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                1. Pacjent (profil)
              </label>
              <select
                id="pdf-profile-select"
                value={selectedProfileId}
                onChange={(e) => handleProfileChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.relation})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Wybór Terapii */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  2. Zakres terapii
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAllTherapies}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setIncludeAllTherapies(next);
                      if (next) {
                        setSelectedTherapyIds(profileTherapies.map((t) => t.id));
                      }
                      setDownloadedFilename(null);
                    }}
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  <span>Wszystkie terapie profilu</span>
                </label>
              </div>

              {profileTherapies.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Wybrany profil nie ma jeszcze przypisanych terapii.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {profileTherapies.map((th) => {
                    const checked = includeAllTherapies || selectedTherapyIds.includes(th.id);
                    const medsCount = medications.filter((m) => m.therapyId === th.id).length;
                    return (
                      <label
                        key={th.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-teal-50/70 border-teal-300 text-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTherapyCheckbox(th.id)}
                            className="w-4 h-4 accent-teal-700 rounded shrink-0"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: th.color }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{th.name}</p>
                            <p className="text-[11px] text-slate-500 tabular-nums">
                              {medsCount} {medsCount === 1 ? 'lek' : 'leków'} ·{' '}
                              {th.isActive ? 'Aktywna' : 'Wstrzymana'}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Zakres Dat (Od - Do) + Presety */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-700" />
                  3. Zakres dat analizy
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {([7, 30, 90] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => applyPreset(days)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap tabular-nums ${
                      activePreset === days
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Ostatnie {days} dni
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="pdf-start-date" className="block text-[11px] font-bold text-slate-600 mb-1">
                    Od daty
                  </label>
                  <input
                    id="pdf-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setActivePreset(null);
                      setDownloadedFilename(null);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label htmlFor="pdf-end-date" className="block text-[11px] font-bold text-slate-600 mb-1">
                    Do daty
                  </label>
                  <input
                    id="pdf-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setActivePreset(null);
                      setDownloadedFilename(null);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            </div>

            {/* 4. Szczegółowość raportu */}
            <div className="space-y-2">
              <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                4. Szczegółowość raportu
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailLevel('summary');
                    setDownloadedFilename(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    detailLevel === 'summary'
                      ? 'bg-teal-50 border-teal-600 text-teal-950'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-extrabold">Podsumowanie dla lekarza (skrócone)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Skuteczność terapii, oś zmian dawkowania oraz stan apteczki na 1–2 stronach A4.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDetailLevel('full');
                    setDownloadedFilename(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    detailLevel === 'full'
                      ? 'bg-teal-50 border-teal-600 text-teal-950'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-extrabold">
                    Pełny raport ze szczegółowym dziennikiem dawek
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Zawiera dodatkowo chronologiczną tabelę wszystkich dawek z notatkami i dawką historyczną.
                  </div>
                </button>
              </div>
            </div>

            {downloadedFilename && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold">Wygenerowano i pobrano plik PDF</p>
                  <p className="text-[11px] font-mono break-all mt-0.5">{downloadedFilename}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Live A4 Medical Sheet Preview */}
          <div className="lg:col-span-7 p-5 bg-slate-100/80 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Podgląd dokumentu A4</span>
              <span className="font-mono lowercase text-slate-600 truncate max-w-[260px]">
                {targetFilename}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5 text-slate-900">
              {/* Document Header */}
              <div className="rounded-xl bg-teal-700 text-white p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    MedPlaner – Karta Przebiegu Terapii
                  </h3>
                  <p className="text-xs text-teal-100">
                    Pacjent: <strong className="text-white">{reportData.patientName}</strong> (
                    {reportData.patientRelation})
                  </p>
                  <p className="text-[11px] text-teal-100 tabular-nums">
                    Okres: {reportData.startDate} – {reportData.endDate}
                  </p>
                </div>

                <div className="bg-white text-teal-800 rounded-xl px-3.5 py-2 text-center shrink-0 tabular-nums">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Skuteczność</div>
                  <div className="text-xl font-black leading-tight">
                    {reportData.overallAdherencePercentage !== null
                      ? `${reportData.overallAdherencePercentage}%`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800 uppercase tracking-wide">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>1. Podsumowanie terapii i skuteczności</span>
                </div>

                {reportData.therapySummaries.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Zaznacz przynajmniej jedną terapię po lewej stronie.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {reportData.therapySummaries.map((th) => (
                      <div key={th.therapyId} className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: th.therapyColor }}
                            />
                            <span className="text-xs font-extrabold text-slate-900 truncate">
                              {th.therapyName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                th.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {th.isActive ? 'Aktywna' : 'Wstrzymana'}
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-teal-800 tabular-nums shrink-0">
                            {th.adherencePercentage !== null ? `${th.adherencePercentage}%` : '—'}
                          </span>
                        </div>

                        {th.medications.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Brak przypisanych leków.</p>
                        ) : (
                          <div className="space-y-1 pl-4">
                            {th.medications.map((m) => (
                              <div
                                key={m.medicationId}
                                className="flex items-center justify-between gap-2 text-[11px]"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800">{m.name}</span>{' '}
                                  <span className="text-teal-700 font-semibold">
                                    ({m.currentDoseDisplay})
                                  </span>{' '}
                                  <span className="text-slate-400">· {m.timesDisplay}</span>
                                </div>
                                <span className="font-bold text-slate-700 tabular-nums shrink-0">
                                  {m.takenCount}/{m.scheduledCount} ·{' '}
                                  {m.adherencePercentage !== null ? `${m.adherencePercentage}%` : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Section 2: Dose Changes Timeline */}
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800 uppercase tracking-wide">
                  <History className="w-3.5 h-3.5" />
                  <span>2. Oś czasu zmian dawkowania w wybranym okresie</span>
                </div>

                {reportData.doseChanges.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500">
                    Brak zmian dawkowania w wybranym okresie.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {reportData.doseChanges.map((chg) => (
                      <div key={chg.id} className="p-2.5 text-xs space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{chg.medicationName}</span>
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            {new Date(chg.changedAt).toLocaleString('pl-PL', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-teal-800">
                          {chg.previousDose} → {chg.newDose}
                        </p>
                        {chg.changeReason && (
                          <p className="text-[11px] text-slate-500">Powód: {chg.changeReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Section 3: Cabinet Stock & Prescriptions */}
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800 uppercase tracking-wide">
                  <Package className="w-3.5 h-3.5" />
                  <span>3. Stan apteczki i zapotrzebowanie na recepty</span>
                </div>

                {reportData.stockItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Brak leków w wybranych terapiach.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {reportData.stockItems.map((st) => {
                      const lowWarning =
                        st.cabinetStatus !== 'ok' ||
                        (st.estimatedDaysLeft !== null && st.estimatedDaysLeft <= 7);
                      return (
                        <div
                          key={st.medicationId}
                          className="p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{st.medicationName}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {st.therapyName}
                              {st.expiryDate ? ` · Ważność: ${st.expiryDate}` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <p className="font-extrabold text-slate-900">
                              {st.stockQuantity !== null
                                ? `${st.stockQuantity} ${st.unit}`
                                : 'Brak danych'}
                            </p>
                            <p
                              className={`text-[11px] font-bold flex items-center justify-end gap-1 ${
                                lowWarning ? 'text-amber-700' : 'text-slate-500'
                              }`}
                            >
                              {lowWarning && <AlertTriangle className="w-3 h-3 shrink-0" />}
                              <span>
                                {st.estimatedDaysLeft !== null
                                  ? `Wystarczy na ok. ${st.estimatedDaysLeft} dni`
                                  : '—'}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Section 4: Detailed Log (Full mode only) */}
              {detailLevel === 'full' && (
                <section className="space-y-2">
                  <div className="text-xs font-extrabold text-teal-800 uppercase tracking-wide">
                    4. Szczegółowy dziennik przyjęć ({reportData.detailedLogs.length})
                  </div>
                  {reportData.detailedLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Brak zaplanowanych dawek w wybranym zakresie dat.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[11px] tabular-nums">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-2.5">Data</th>
                            <th className="py-2 px-2">Plan</th>
                            <th className="py-2 px-2">Lek</th>
                            <th className="py-2 px-2">Dawka</th>
                            <th className="py-2 px-2">Status</th>
                            <th className="py-2 px-2.5">Notatka</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.detailedLogs.map((row) => (
                            <tr key={row.doseId}>
                              <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-600">
                                {row.date}
                              </td>
                              <td className="py-1.5 px-2 whitespace-nowrap">
                                {row.scheduledTime}
                                {row.actualTakenTime ? ` (${row.actualTakenTime})` : ''}
                              </td>
                              <td className="py-1.5 px-2 font-bold text-slate-900">
                                {row.medicationName}
                              </td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{row.doseSnapshot}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap font-bold">
                                <span
                                  className={
                                    row.status === 'taken'
                                      ? 'text-emerald-700'
                                      : row.status === 'skipped'
                                      ? 'text-rose-700'
                                      : row.status === 'snoozed'
                                      ? 'text-amber-700'
                                      : 'text-slate-500'
                                  }
                                >
                                  {row.statusLabel}
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-500">{row.note || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* Preview Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                <span>Wygenerowano w aplikacji MedPlaner</span>
                <span>Strona 1 z N</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500">
            Plik zapisze się jako <strong className="font-mono text-slate-700">{targetFilename}</strong>
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Zamknij
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Drukuj</span>
            </button>
            <button
              type="button"
              disabled={!canGenerate}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span>Pobierz PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
