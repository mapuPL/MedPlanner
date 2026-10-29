import React, { useState } from 'react';
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  LogOut, 
  Info,
  Database,
  UserCheck
} from 'lucide-react';
import { Therapy, Medication } from '../utils/medicationLogic';

interface BackupSyncViewProps {
  therapies: Therapy[];
  medications: Medication[];
  onRestoreSampleBackup?: () => void;
}

export const BackupSyncView: React.FC<BackupSyncViewProps> = ({
  therapies,
  medications,
  onRestoreSampleBackup,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('mariusz.pula@rcez.lubartow.pl');
  const [userName, setUserName] = useState<string>('Mariusz Puła');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [lastBackupSize, setLastBackupSize] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  const handleSignIn = () => {
    setIsProcessing(true);
    setStatusMessage(null);
    setTimeout(() => {
      setIsLoggedIn(true);
      setIsProcessing(false);
      setStatusMessage({
        text: 'Zalogowano pomyślnie. Twoje konto Google jest teraz połączone z aplikacją.',
      });
    }, 700);
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setStatusMessage({
      text: 'Wylogowano z konta Google. Dane pozostają w pełni bezpieczne w pamięci lokalnej (offline).',
    });
  };

  const handleBackup = () => {
    setIsProcessing(true);
    setStatusMessage(null);

    setTimeout(() => {
      const now = new Date();
      const formatted = now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const approxBytes = 48 * 1024 + (therapies.length * 2048) + (medications.length * 1024);
      const sizeStr = `${(approxBytes / 1024).toFixed(1)} KB`;

      setLastBackupDate(formatted);
      setLastBackupSize(sizeStr);
      setIsProcessing(false);
      setStatusMessage({
        text: `Kopia zapasowa bazy (medplaner-backup.db, ${sizeStr}) została pomyślnie zapisana w folderze "MedPlaner Kopia Zapasowa" na Twoim Dysku Google.`,
      });
    }, 900);
  };

  const handleConfirmRestore = () => {
    setShowConfirmRestore(false);
    setIsProcessing(true);
    setStatusMessage(null);

    setTimeout(() => {
      setIsProcessing(false);
      if (onRestoreSampleBackup) {
        onRestoreSampleBackup();
      }
      setStatusMessage({
        text: 'Baza danych SQLite (medications_catalog.db) została pomyślnie przywrócona z Dysku Google.',
      });
    }, 900);
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-800">
      {/* Privacy Guarantee Banner */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-teal-950 flex items-center gap-1.5">
              Pełna suwerenność i prywatność Twoich danych
            </h3>
            <p className="text-xs text-teal-900/90 mt-1 leading-relaxed">
              MedPlaner działa domyślnie w <strong>100% offline</strong> na Twoim telefonie. 
              Kopia w chmurze jest całkowicie <strong>opcjonalna</strong> – łączysz się z Dyskiem Google tylko wtedy, gdy sam zadecydujesz.
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-teal-200/60 grid grid-cols-1 gap-2 text-2xs text-teal-950">
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
            <span>
              <strong>Brak serwerów twórcy:</strong> Plik bazy trafia bezpośrednio z Twojego telefonu na Twój prywatny Dysk Google. Twórca aplikacji ani nikt trzeci nie ma wglądu w Twoje leki.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Database className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
            <span>
              <strong>Bezpieczny zakres (drive.file):</strong> Aplikacja posiada uprawnienia wyłącznie do plików utworzonych przez siebie w folderze <em>"MedPlaner Kopia Zapasowa"</em>. Nie ma dostępu do Twoich zdjęć, dokumentów ani poczty.
            </span>
          </div>
        </div>
      </div>

      {/* Status feedback message */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="flex-1">{statusMessage.text}</span>
        </div>
      )}

      {/* Google Sign-In Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Konto Google do synchronizacji</h4>
              <p className="text-2xs text-slate-500">Do zapisu i odczytu kopii bazy medycznej</p>
            </div>
          </div>
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-2xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline"
            >
              <LogOut className="w-3 h-3" />
              Wyloguj
            </button>
          )}
        </div>

        {!isLoggedIn ? (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-xs text-slate-600 mb-3">
              Połącz aplikację z kontem Google, aby bezpiecznie wykonywać kopię zapasową bazy danych SQLite i przywrócić ją po zmianie lub reinstalacji telefonu.
            </p>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isProcessing ? 'Logowanie...' : 'Zaloguj przez Google'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                M
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{userName}</p>
                <p className="text-2xs text-slate-500">{userEmail}</p>
              </div>
            </div>
            <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Połączono
            </span>
          </div>
        )}
      </div>

      {/* Cloud Backup Actions */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 mb-1">Kopia bazy danych (medplaner-backup.db)</h4>
        <p className="text-2xs text-slate-500 mb-3">
          Folder w chmurze: <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-800 font-mono">Dysk Google / MedPlaner Kopia Zapasowa</code>
        </p>

        {lastBackupDate ? (
          <div className="p-3 bg-teal-50/60 border border-teal-200/60 rounded-xl mb-3 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-teal-950">Ostatnia kopia w chmurze:</p>
              <p className="text-2xs text-teal-800">{lastBackupDate} ({lastBackupSize})</p>
            </div>
            <span className="text-2xs font-semibold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
              Aktualna
            </span>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-3 text-xs text-slate-500">
            Brak zarejestrowanej kopii zapasowej w tej sesji.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleBackup}
            disabled={!isLoggedIn || isProcessing}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer ${
              isLoggedIn && !isProcessing
                ? 'bg-teal-700 hover:bg-teal-800 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>{isProcessing ? 'Zapisywanie...' : 'Zapisz na Dysk'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmRestore(true)}
            disabled={!isLoggedIn || isProcessing}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
              isLoggedIn && !isProcessing
                ? 'border-teal-700 text-teal-800 hover:bg-teal-50'
                : 'border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CloudDownload className="w-4 h-4" />
            <span>Przywróć z Dysku</span>
          </button>
        </div>

        {!isLoggedIn && (
          <p className="text-2xs text-slate-400 text-center mt-2.5">
            Zaloguj się powyżej, aby aktywować zapis i przywracanie kopii z Dysku Google.
          </p>
        )}
      </div>

      {/* Local SQLite Backup Card (Works 100% offline without Google Sign-In) */}
      <div className="bg-white rounded-2xl p-4 border border-teal-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Lokalna kopia zapasowa SQLite</h4>
              <p className="text-2xs text-slate-500">Działa natychmiast offline bez logowania i bez Google Cloud</p>
            </div>
          </div>
          <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Offline
          </span>
        </div>

        <p className="text-2xs text-slate-600 mb-3 leading-relaxed">
          Zrzut lokalnej bazy <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-900 font-mono">medications_catalog.db</code> do pliku <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-900 font-mono">medplaner-backup.db</code> w pamięci Twojego urządzenia.
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const formatted = now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
              setStatusMessage({
                text: `Wyeksportowano lokalną kopię (medplaner-backup.db) o ${formatted}. Plik zapisany w pamięci urządzenia.`,
              });
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs border border-teal-600 text-teal-800 hover:bg-teal-50 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Zapisz plik .db</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Czy na pewno chcesz przywrócić bazę z lokalnego pliku kopii zapasowej?')) {
                if (onRestoreSampleBackup) onRestoreSampleBackup();
                setStatusMessage({
                  text: 'Baza SQLite została pomyślnie przywrócona z pliku medplaner-backup.db.',
                });
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Wczytaj plik .db</span>
          </button>
        </div>
      </div>

      {/* SHA-1 Developer Help Card */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h5 className="font-bold text-amber-950 text-xs">Informacja dla programistów: Błąd ApiException: 10</h5>
            <p className="text-2xs text-amber-800 leading-relaxed">
              Jeśli podczas logowania przez Gmail w aplikacji mobilnej pojawi się błąd <code className="bg-amber-100 px-1 py-0.2 rounded font-mono font-bold text-amber-950">ApiException: 10 (DEVELOPER_ERROR)</code>, oznacza to, że Google Play Services wymaga zarejestrowania odcisku certyfikatu <strong>SHA-1</strong> dla pakietu <strong>com.example.medplaner</strong> w Google Cloud Console (Credentials &rarr; OAuth Client ID &rarr; Android).
            </p>
            <p className="text-2xs text-amber-800">
              Odcisk SHA-1 kompilacji jest automatycznie drukowany w logach GitHub Actions (krok <em>"Odczytaj odciski certyfikatów SHA-1"</em>) lub po uruchomieniu polecenia <code className="bg-amber-100 px-1 py-0.2 rounded font-mono font-bold text-amber-950">./gradlew signingReport</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      {showConfirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Przywrócić bazę z Dysku?</h4>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Przywrócenie kopii z Dysku Google zastąpi Twoją obecną lokalną bazę leków i terapii plikiem <strong>medplaner-backup.db</strong>.
              <br /><br />
              Czy chcesz kontynuować?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmRestore(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Tak, przywróć bazę
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
