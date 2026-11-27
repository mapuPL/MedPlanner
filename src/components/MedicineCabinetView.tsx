import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Calendar,
  Plus,
  FileText,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  X,
  Users,
} from 'lucide-react';
import {
  Medication,
  Therapy,
  FamilyProfile,
  DoseItem,
  DoctorReportPeriodDays,
  MEDICATION_TYPE_LABELS,
  evaluateCabinetStatus,
  calculateDoctorReportSummary,
  resolveProfileId,
  formatDoseDisplay,
} from '../utils/medicationLogic';

interface MedicineCabinetViewProps {
  medications: Medication[];
  therapies: Therapy[];
  profiles: FamilyProfile[];
  doses: DoseItem[];
  activeProfileId: string;
  onRefillMedication: (medicationId: string, addAmount?: number) => void;
  onUpdateStockAndExpiry: (medicationId: string, stockQuantity: number, expiryDate?: string) => void;
  onOpenPdfReport?: () => void;
  compact?: boolean;
}

export const MedicineCabinetView: React.FC<MedicineCabinetViewProps> = ({
  medications,
  therapies,
  profiles,
  doses,
  activeProfileId,
  onRefillMedication,
  onUpdateStockAndExpiry,
  onOpenPdfReport,
  compact = false,
}) => {
  const [filterAlert, setFilterAlert] = useState<'all' | 'alerts'>('all');
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editStockVal, setEditStockVal] = useState<string>('');
  const [editExpiryVal, setEditExpiryVal] = useState<string>('');
  const [isDoctorReportOpen, setIsDoctorReportOpen] = useState(false);
  const [reportDays, setReportDays] = useState<DoctorReportPeriodDays>(7);
  const [copiedReport, setCopiedReport] = useState(false);

  useEffect(() => {
    setShowAllProfiles(false);
  }, [activeProfileId]);

  const effectiveProfileId = showAllProfiles ? 'all' : activeProfileId;
  const activeProfileObj = profiles.find((p) => p.id === activeProfileId);
  const scopeLabel =
    effectiveProfileId === 'all'
      ? 'Wszystkie profile'
      : activeProfileObj?.name || 'Wybrany profil';

  const visibleMeds = useMemo(() => {
    return medications.filter((m) => {
      if (effectiveProfileId === 'all') return true;
      const therapy = therapies.find((t) => t.id === m.therapyId);
      return resolveProfileId(m.profileId, m, therapy) === effectiveProfileId;
    });
  }, [medications, therapies, effectiveProfileId]);

  const enriched = useMemo(() => {
    return visibleMeds.map((med) => {
      const therapy = therapies.find((t) => t.id === med.therapyId);
      const profId = resolveProfileId(med.profileId, med, therapy);
      const profile = profiles.find((p) => p.id === profId) || profiles[0];
      const evalResult = evaluateCabinetStatus(med);
      return { med, therapy, profile, ...evalResult };
    });
  }, [visibleMeds, therapies, profiles]);

  const alertCount = enriched.filter((item) => item.status !== 'ok').length;
  const displayed =
    filterAlert === 'alerts' ? enriched.filter((item) => item.status !== 'ok') : enriched;

  const doctorReport = useMemo(
    () =>
      calculateDoctorReportSummary(
        therapies,
        medications,
        doses,
        effectiveProfileId,
        reportDays
      ),
    [therapies, medications, doses, effectiveProfileId, reportDays]
  );

  const startEdit = (med: Medication) => {
    setEditingMedId(med.id);
    setEditStockVal(
      typeof med.stockQuantity === 'number' ? String(med.stockQuantity) : String(med.packageSize ?? 30)
    );
    setEditExpiryVal(med.expiryDate || '');
  };

  const saveEdit = (medId: string) => {
    const num = parseFloat(editStockVal.replace(',', '.'));
    const validNum = Number.isFinite(num) && num >= 0 ? num : 0;
    onUpdateStockAndExpiry(medId, validNum, editExpiryVal.trim() || undefined);
    setEditingMedId(null);
  };

  const buildReportText = () => {
    const dateStr = new Date().toLocaleDateString('pl-PL');
    const lines = [
      `RAPORT LEKOWY DLA LEKARZA — MEDPLANER (${dateStr})`,
      `Profil: ${scopeLabel}`,
      `Okres analizy: ostatnie ${reportDays} dni (${doctorReport.startDate} – ${doctorReport.endDate})`,
      `Ogólna skuteczność przyjmowania: ${doctorReport.overallPercentage}% (${doctorReport.totalTaken}/${doctorReport.totalScheduled} dawek)`,
      '',
      ...doctorReport.items.map((item) => {
        const { medication: med, therapy, profileId, scheduledCount, takenCount, adherencePercentage } = item;
        const prof = profiles.find((p) => p.id === profileId);
        const exp = med.expiryDate ? ` · Ważność: ${med.expiryDate}` : '';
        const stock =
          typeof med.stockQuantity === 'number'
            ? ` · Zapas: ${med.stockQuantity} ${MEDICATION_TYPE_LABELS[med.type]?.unit || 'szt.'}`
            : '';
        const adherenceStr =
          adherencePercentage !== null
            ? `${adherencePercentage}% (${takenCount}/${scheduledCount} dawek)`
            : 'brak zaplanowanych dawek w tym okresie';
        return `• ${med.name} [${prof?.name || 'Mój profil'}]\n  Terapia: ${therapy?.name || 'Ogólna'}\n  Dawka: ${formatDoseDisplay(med.doseAmount, med.type)} · Godziny: ${med.times.join(', ')}\n  Skuteczność (${reportDays} dni): ${adherenceStr}${stock}${exp}${med.instructions ? `\n  Zalecenia: ${med.instructions}` : ''}`;
      }),
    ];
    return lines.join('\n');
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText());
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (_) {}
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      {/* Summary Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Domowa Apteczka · {scopeLabel}
            </p>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              Zapasy i terminy ważności
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {visibleMeds.length} leków ·{' '}
              <span className={alertCount > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                {alertCount > 0 ? `${alertCount} wymaga uwagi` : 'Wszystkie zapasy w normie'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenPdfReport && (
              <button
                type="button"
                onClick={onOpenPdfReport}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shrink-0 whitespace-nowrap"
                title="Konfiguruj i pobierz kartę terapii PDF dla lekarza"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Raport PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDoctorReportOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors shrink-0 whitespace-nowrap"
              title="Szybki podgląd tekstowy"
            >
              <span>Skrót</span>
            </button>
          </div>
        </div>

        {/* Clean segmented filter + optional All Profiles toggle */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex bg-slate-100 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterAlert('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all tabular-nums whitespace-nowrap ${
                filterAlert === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Wszystkie ({enriched.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAlert('alerts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all tabular-nums whitespace-nowrap ${
                filterAlert === 'alerts'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Alerty ({alertCount})
            </button>
          </div>

          {activeProfileId !== 'all' ? (
            <button
              type="button"
              onClick={() => setShowAllProfiles((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap ${
                showAllProfiles
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>{showAllProfiles ? `Tylko ${activeProfileObj?.name || 'aktywny'}` : 'Wszystkie profile'}</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Automatyczne odliczanie po dawce
            </span>
          )}
        </div>
      </div>

      {/* Medications Stock Cards */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
          <Package className="w-8 h-8 text-teal-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">
            {filterAlert === 'alerts'
              ? 'Brak alertów o niskim zapasie lub terminie'
              : 'Apteczka jest pusta dla wybranego profilu'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Dodaj leki z określoną wielkością opakowania, aby śledzić zużycie.
          </p>
        </div>
      ) : (
        <div className={compact ? 'space-y-2.5' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
          {displayed.map(({ med, therapy, profile, status, daysUntilExpiry, isLowStock }) => {
            const unit = MEDICATION_TYPE_LABELS[med.type]?.unit || 'szt.';
            const stock = typeof med.stockQuantity === 'number' ? med.stockQuantity : null;
            const pkgSize = med.packageSize || (stock ? Math.max(stock, 30) : 30);
            const pct = stock !== null ? Math.min(100, Math.round((stock / pkgSize) * 100)) : null;

            const isEditing = editingMedId === med.id;

            let alertLabel = 'Zapas w normie';
            let alertColor = 'text-emerald-700';
            let barColor = 'bg-teal-600';

            if (status === 'expired') {
              alertLabel = 'Przeterminowany';
              alertColor = 'text-rose-700';
              barColor = 'bg-rose-500';
            } else if (status === 'expiring_soon') {
              alertLabel = `Ważny jeszcze ${daysUntilExpiry} dni`;
              alertColor = 'text-amber-700';
              barColor = 'bg-amber-500';
            } else if (isLowStock) {
              alertLabel = 'Kończy się zapas';
              alertColor = 'text-amber-700';
              barColor = 'bg-amber-500';
            }

            return (
              <div
                key={med.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: therapy?.color || '#0F766E' }}
                      />
                      <span className="truncate">{therapy?.name || 'Terapia'}</span>
                      <span>·</span>
                      <span className="text-slate-700">{profile?.name || 'Mój profil'}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-0.5 truncate">{med.name}</h4>
                  </div>

                  <span className={`text-[11px] font-bold shrink-0 flex items-center gap-1 ${alertColor}`}>
                    {status !== 'ok' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {alertLabel}
                  </span>
                </div>

                {/* Stock bar */}
                {stock !== null ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs tabular-nums">
                      <span className="text-slate-500">
                        Pozostało w opakowaniu:
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {Number.isInteger(stock) ? stock : stock.toFixed(1)} / {pkgSize} {unit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Nie ustawiono stanu opakowania — kliknij Edytuj, aby śledzić zapas.
                  </p>
                )}

                {/* Meta row: expiry date + actions */}
                {!isEditing ? (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Ważność:{' '}
                        <strong className={status === 'expired' ? 'text-rose-700' : 'text-slate-700'}>
                          {med.expiryDate || 'Nie podano'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(med)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        onClick={() => onRefillMedication(med.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-colors"
                        title="Dodaj nowe opakowanie do apteczki"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Opakowanie</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          Aktualny zapas ({unit})
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editStockVal}
                          onChange={(e) => setEditStockVal(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          Termin ważności
                        </label>
                        <input
                          type="date"
                          value={editExpiryVal}
                          onChange={(e) => setEditExpiryVal(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingMedId(null)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Anuluj
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(med.id)}
                        className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold"
                      >
                        Zapisz stan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Doctor Report Modal */}
      {isDoctorReportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-report-title"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 id="doctor-report-title" className="font-extrabold text-sm text-slate-900">
                    Raport lekowy dla lekarza
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {scopeLabel} · Ostatnie {reportDays} dni
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDoctorReportOpen(false)}
                aria-label="Zamknij raport"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              {/* Period + Profile Scope Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex bg-slate-100 p-0.5 rounded-xl">
                  {([7, 14, 30] as DoctorReportPeriodDays[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setReportDays(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all tabular-nums whitespace-nowrap ${
                        reportDays === d
                          ? 'bg-white text-teal-800 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {d} dni
                    </button>
                  ))}
                </div>

                {activeProfileId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setShowAllProfiles((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap ${
                      showAllProfiles
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>
                      {showAllProfiles
                        ? `Wróć do: ${activeProfileObj?.name || 'profil'}`
                        : 'Wszystkie profile'}
                    </span>
                  </button>
                )}
              </div>

              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-900">
                  Skuteczność przyjmowania ({reportDays} dni):
                </span>
                <span className="font-extrabold text-teal-800 tabular-nums">
                  {doctorReport.overallPercentage}% ({doctorReport.totalTaken}/{doctorReport.totalScheduled})
                </span>
              </div>

              {doctorReport.items.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                  Brak leków przypisanych dla wybranego profilu.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50/50">
                  {doctorReport.items.map(
                    ({ medication: med, therapy, profileId, scheduledCount, takenCount, adherencePercentage }) => {
                      const profile = profiles.find((p) => p.id === profileId);
                      return (
                        <div key={med.id} className="p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-slate-900 truncate">{med.name}</span>
                            <span
                              className={`text-[11px] font-extrabold tabular-nums shrink-0 ${
                                adherencePercentage === null
                                  ? 'text-slate-400'
                                  : adherencePercentage >= 80
                                  ? 'text-emerald-700'
                                  : adherencePercentage >= 50
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {adherencePercentage !== null
                                ? `${adherencePercentage}% (${takenCount}/${scheduledCount})`
                                : 'Brak w tym okresie'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {profile?.name || 'Mój profil'} · {therapy?.name || 'Terapia'} ·{' '}
                            <strong className="text-teal-800">
                              {formatDoseDisplay(med.doseAmount, med.type)}
                            </strong>{' '}
                            · Godziny:{' '}
                            <span className="font-semibold text-slate-700 tabular-nums">
                              {med.times.join(', ')}
                            </span>
                          </p>
                          {med.instructions && (
                            <p className="text-[11px] text-slate-500 italic">{med.instructions}</p>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Wygenerowano całkowicie offline z lokalnych danych aplikacji.</span>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Skopiowano</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiuj tekst</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Drukuj</span>
              </button>
              {onOpenPdfReport && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDoctorReportOpen(false);
                    onOpenPdfReport();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generuj PDF A4</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
