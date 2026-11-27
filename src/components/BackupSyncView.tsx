import React, { useState, useRef } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  LogOut,
  Database,
  FolderSearch,
  Info,
} from 'lucide-react';
import {
  Therapy,
  Medication,
  DoseItem,
  FamilyProfile,
  MedicationChangeRecord,
  MedPlanerBackupPayload,
  formatLocalDate,
  serializeBackupPayload,
  normalizeImportedBackupPayload,
} from '../utils/medicationLogic';

export type { MedPlanerBackupPayload };

interface BackupSyncViewProps {
  therapies: Therapy[];
  medications: Medication[];
  doses: DoseItem[];
  profiles: FamilyProfile[];
  medicationChanges?: MedicationChangeRecord[];
  onImportBackupData: (payload: MedPlanerBackupPayload, mode: 'replace' | 'merge') => void;
  onRestoreSampleBackup?: () => void;
}

export const BackupSyncView: React.FC<BackupSyncViewProps> = ({
  therapies,
  medications,
  doses,
  profiles,
  medicationChanges = [],
  onImportBackupData,
  onRestoreSampleBackup,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail] = useState<string>('uzytkownik@gmail.com');
  const [userName] = useState<string>('Konto Prywatne');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [lastBackupSize, setLastBackupSize] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [pendingJsonImport, setPendingJsonImport] = useState<{
    fileName: string;
    payload: MedPlanerBackupPayload;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignIn = () => {
    setIsProcessing(true);
    setStatusMessage(null);
    setTimeout(() => {
      setIsLoggedIn(true);
      setIsProcessing(false);
      setStatusMessage({
        text: 'Połączono konto demonstracyjne Google. Pamiętaj, że jest to lokalna symulacja — do realnego zapisu użyj pliku .json powyżej.',
      });
    }, 550);
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setStatusMessage({
      text: 'Wylogowano z trybu demonstracyjnego Google Drive. Wszystkie dane pozostają bezpieczne lokalnie.',
    });
  };

  const handleCloudBackup = () => {
    setIsProcessing(true);
    setStatusMessage(null);

    setTimeout(() => {
      const now = new Date();
      const formatted =
        now.toLocaleDateString('pl-PL') +
        ' ' +
        now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const approxBytes = 48 * 1024 + therapies.length * 2048 + medications.length * 1024;
      const sizeStr = `${(approxBytes / 1024).toFixed(1)} KB`;

      setLastBackupDate(formatted);
      setLastBackupSize(sizeStr);
      setIsProcessing(false);
      setStatusMessage({
        text: `Symulacja kopii na Dysku Google (medplaner-backup.db, ${sizeStr}) zakończona. Aby zapisać prawdziwy plik na urządzeniu, kliknij "Pobierz kopię" powyżej.`,
      });
    }, 650);
  };

  const handleConfirmCloudRestore = () => {
    setShowConfirmRestore(false);
    setIsProcessing(true);
    setStatusMessage(null);

    setTimeout(() => {
      setIsProcessing(false);
      if (onRestoreSampleBackup) {
        onRestoreSampleBackup();
      }
      setStatusMessage({
        text: 'Przywrócono przykładowe dane demonstracyjne (symulacja lokalna) i odświeżono przypomnienia.',
      });
    }, 650);
  };

  const handleDownloadRealBackup = () => {
    const payload = serializeBackupPayload({
      profiles,
      therapies,
      medications,
      doses,
      medicationChanges,
    });

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStamp = formatLocalDate();
    const filename = `medplaner-backup-${dateStamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const sizeKb = (blob.size / 1024).toFixed(1);
    setStatusMessage({
      text: `Pobrano plik kopii "${filename}" (${sizeKb} KB) w formacie kompatybilnym z aplikacją Android/Flutter.`,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rawParsed = JSON.parse(text);
      const normalized = normalizeImportedBackupPayload(rawParsed, profiles);
      setPendingJsonImport({
        fileName: file.name,
        payload: normalized,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Nie udało się wczytać pliku kopii. Upewnij się, że wybierasz plik JSON z MedPlanera.';
      setStatusMessage({
        text: msg,
        isError: true,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExecuteJsonImport = (mode: 'replace' | 'merge') => {
    if (!pendingJsonImport) return;
    const { fileName, payload } = pendingJsonImport;
    onImportBackupData(payload, mode);
    setPendingJsonImport(null);
    setStatusMessage({
      text:
        mode === 'replace'
          ? `Zastąpiono dane kopią z "${fileName}" (${payload.therapies.length} terapii, ${payload.medications.length} leków, ${payload.doseLogs.length} wpisów dawek).`
          : `Scalono dane z pliku "${fileName}" z obecną bazą (${payload.therapies.length} terapii, ${payload.medications.length} leków).`,
    });
  };

  return (
    <div className="flex flex-col gap-3.5 text-slate-800">
      {/* Privacy Guarantee Card */}
      <div className="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-teal-700 text-white rounded-xl shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-teal-950">
              Pełna suwerenność i prywatność danych
            </h3>
            <p className="text-xs text-teal-900/90 mt-1 leading-relaxed">
              MedPlaner działa w <strong>100% offline</strong>. Kopia do pliku{' '}
              <code className="bg-white/70 px-1 rounded font-mono">.json</code> jest w pełni
              wymienna pomiędzy wersją webową a aplikacją Android/Flutter.
            </p>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-teal-200/60 space-y-1.5 text-[11px] text-teal-950">
          <div className="flex items-start gap-2">
            <FolderSearch className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
            <span>
              <strong>Na Androidzie (Flutter):</strong> oprócz wymiany{' '}
              <code className="bg-white/70 px-1 rounded font-mono">.json</code> aplikacja zapisuje także bazę{' '}
              <code className="bg-white/70 px-1 rounded font-mono">medplaner-backup.db</code> w{' '}
              <code className="bg-white/70 px-1 rounded font-mono">Pobrane/MedPlaner</code>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
            <span>
              <strong>Zakres Google Drive (drive.file):</strong> w pełnej kompilacji Android dostęp wyłącznie do folderu aplikacji.
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {statusMessage.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-relaxed">{statusMessage.text}</span>
        </div>
      )}

      {/* Local File Backup & Restore (Real .json file download + file picker) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Lokalna kopia do pliku (.json)</h4>
              <p className="text-[11px] text-slate-500">
                Realny zapis na urządzeniu · Zgodna z Flutterem
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700">Offline</span>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          Eksportuj i importuj pełny zestaw danych (<code className="bg-slate-100 px-1 rounded font-mono text-teal-900">profiles</code>,{' '}
          <code className="bg-slate-100 px-1 rounded font-mono text-teal-900">therapies</code>,{' '}
          <code className="bg-slate-100 px-1 rounded font-mono text-teal-900">medications</code>,{' '}
          <code className="bg-slate-100 px-1 rounded font-mono text-teal-900">doseLogs</code>) w pliku{' '}
          <code className="bg-slate-100 px-1 rounded font-mono text-teal-900">.json</code> — bez logowania i z wyborem zastąpienia lub scalenia.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadRealBackup}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz kopię</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-teal-700" />
            <span>Wczytaj plik kopii</span>
          </button>
        </div>
      </div>

      {/* Optional Google Drive Backup (Demo simulation clearly labeled) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Opcjonalna kopia na Dysku Google</h4>
              <p className="text-[11px] font-semibold text-amber-800">
                Tryb demonstracyjny (symulacja lokalna)
              </p>
            </div>
          </div>
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-[11px] text-rose-600 hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              <LogOut className="w-3 h-3" />
              Wyloguj
            </button>
          )}
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-950 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
          <span>
            W podglądzie webowym integracja z Dyskiem Google działa jako{' '}
            <strong>symulacja lokalna</strong>. Do realnego zapisu i przeniesienia danych na urządzenie
            użyj sekcji <strong>Lokalna kopia do pliku (.json)</strong> powyżej.
          </span>
        </div>

        {!isLoggedIn ? (
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <span>{isProcessing ? 'Łączenie...' : 'Symuluj logowanie Google (Demo)'}</span>
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-xs">
                  K
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{userName}</p>
                  <p className="text-[11px] text-slate-500">{userEmail} · Demo</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800">Symulacja aktywna</span>
            </div>

            {lastBackupDate && (
              <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 flex items-center justify-between tabular-nums">
                <span>Ostatnia symulacja: {lastBackupDate}</span>
                <span className="font-bold text-teal-800">{lastBackupSize}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCloudBackup}
                disabled={isProcessing}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Zapisz na Dysk</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmRestore(true)}
                disabled={isProcessing}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-teal-700 text-teal-800 hover:bg-teal-50 font-bold text-xs"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                <span>Przywróć z Dysku</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Import Replace vs Merge Choice Modal */}
      {pendingJsonImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3"
            role="dialog"
            aria-modal="true"
            aria-labelledby="json-import-choice-title"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h4 id="json-import-choice-title" className="font-extrabold text-sm text-slate-900">
                  Jak wczytać kopię JSON?
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 break-all">
                  Plik: {pendingJsonImport.fileName}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1 tabular-nums">
              <p className="font-semibold text-slate-900">Zawartość pliku kopii:</p>
              <p className="text-[11px] text-slate-600">
                {pendingJsonImport.payload.profiles.length} profili ·{' '}
                {pendingJsonImport.payload.therapies.length} terapii ·{' '}
                {pendingJsonImport.payload.medications.length} leków ·{' '}
                {pendingJsonImport.payload.doseLogs.length} wpisów dawek
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Wybierz, czy chcesz nadpisać obecne dane w aplikacji, czy bezpiecznie scalić je z istniejącą listą.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleExecuteJsonImport('merge')}
                className="w-full py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors"
              >
                Scal z obecnymi danymi
              </button>
              <button
                type="button"
                onClick={() => handleExecuteJsonImport('replace')}
                className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-colors"
              >
                Zastąp bieżące dane
              </button>
              <button
                type="button"
                onClick={() => setPendingJsonImport(null)}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Demo Confirmation Modal */}
      {showConfirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900">
              Przywrócić dane demonstracyjne?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              To działanie jest częścią lokalnej symulacji Dysku Google i przywróci przykładowy zestaw terapii oraz leków.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmRestore(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmCloudRestore}
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl"
              >
                Przywróć dane demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
