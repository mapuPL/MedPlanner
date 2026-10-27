import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  FolderTree, 
  ExternalLink, 
  Sparkles, 
  HelpCircle,
  Smartphone,
  ShieldCheck,
  Search
} from 'lucide-react';
import { FLUTTER_PROJECT_FILES, FlutterFile } from '../data/flutterFiles';
import { downloadFlutterProjectZip } from '../utils/zipExport';

export const ProjectIdxStudio: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FlutterFile>(FLUTTER_PROJECT_FILES[0]);
  const [activeTab, setActiveTab] = useState<'files' | 'guide'>('files');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'config' | 'model' | 'service' | 'screen' | 'main'>('all');

  const filteredFiles = FLUTTER_PROJECT_FILES.filter((file) => {
    const matchesSearch = file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          file.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || file.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCopyCode = async (content: string, key: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(key);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCommand = async (cmd: string, key: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCommand(key);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch {}
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await downloadFlutterProjectZip();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-teal-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Gotowy projekt Flutter do Google Project IDX</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Centrum Kodu Flutter & Generator APK
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Kompletny kod źródłowy aplikacji mobilnej w języku Dart i konfiguracja Androida. 
              Zbuduj plik <code className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-xs">app-release.apk</code> bezpośrednio 
              w przeglądarce w Google Project IDX bez konieczności instalowania Android Studio!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="px-5 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/40 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Generowanie archiwum...' : 'Pobierz Projekt (.ZIP)'}</span>
            </button>
            <a
              href="https://idx.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <span>Otwórz Project IDX</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-colors ${
              activeTab === 'files'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Przeglądarka Plików Projektu ({FLUTTER_PROJECT_FILES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Instrukcja Krok po Kroku (IDX APK)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FILE EXPLORER & CODE VIEWER */}
      {activeTab === 'files' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: File Tree */}
          <div className="lg:col-span-4 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj pliku lub modelu..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Category filter buttons */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'Wszystkie' },
                { id: 'config', label: 'Konfig' },
                { id: 'model', label: 'Modele' },
                { id: 'service', label: 'Serwisy' },
                { id: 'screen', label: 'Ekrany' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-colors ${
                    categoryFilter === c.id
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* File List */}
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-[600px] overflow-y-auto shadow-2xs">
              {filteredFiles.map((file) => {
                const isSelected = selectedFile.path === file.path;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left p-3 flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <FileCode
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isSelected ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-xs font-bold truncate ${
                            isSelected ? 'text-teal-900' : 'text-slate-800'
                          }`}
                        >
                          {file.name}
                        </span>
                        <span className="text-3xs uppercase font-extrabold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 ml-1">
                          {file.language}
                        </span>
                      </div>
                      <div className="text-3xs text-slate-400 font-mono truncate mt-0.5">
                        {file.path}
                      </div>
                      <p className="text-2xs text-slate-500 mt-1 line-clamp-1">
                        {file.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Code Viewer */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
              {/* Code Header Bar */}
              <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="font-mono text-xs text-slate-300 font-bold ml-2">
                    {selectedFile.path}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedFile.content, selectedFile.path)}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {copiedFile === selectedFile.path ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Skopiowano!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopiuj cały plik</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Pre Block */}
              <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto text-xs font-mono text-slate-200 leading-relaxed bg-slate-900">
                <pre>
                  <code>{selectedFile.content}</code>
                </pre>
              </div>

              {/* Code Footer */}
              <div className="bg-slate-950/80 px-4 py-2 border-t border-slate-800/80 text-2xs text-slate-400 flex items-center justify-between">
                <span>{selectedFile.description}</span>
                <span className="font-mono">{selectedFile.content.split('\n').length} linii</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STEP-BY-STEP PROJECT IDX GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-teal-600" />
              Budowanie pliku APK w chmurze bez Android Studio
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Google Project IDX (<a href="https://idx.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-semibold">idx.google.com</a>) 
              działa w 100% w chmurze Google Cloud. Posiada preinstalowane środowisko Flutter, Android SDK oraz narzędzia Gradle, dzięki czemu zbudujesz plik instalacyjny APK 
              w kilka minut nawet na słabym laptopie lub Chromebooku!
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {[
              {
                step: '1',
                title: 'Utwórz przestrzeń roboczą Flutter w Project IDX',
                desc: 'Otwórz idx.google.com, zaloguj się kontem Google i wybierz szablon "Flutter". Wybierz platformę Android i nadaj nazwę (np. medplaner).',
                cmd: null,
              },
              {
                step: '2',
                title: 'Wklej lub rozpakuj pliki projektu',
                desc: 'Zastąp standardowy plik pubspec.yaml oraz wklej pliki z folderu lib/ (modele, serwisy, ekrany). Upewnij się, że w pliku AndroidManifest.xml dodane są uprawnienia do dokładnych alarmów i powiadomień.',
                cmd: null,
              },
              {
                step: '3',
                title: 'Pobierz zależności Fluttera',
                desc: 'W dolnym terminalu Project IDX wpisz poniższe polecenie, aby zainstalować pakiety flutter_local_notifications, sqflite i timezone:',
                cmd: 'flutter pub get',
              },
              {
                step: '4',
                title: 'Skompiluj plik APK (Release)',
                desc: 'Uruchom kompilację produkcyjną APK bez konieczności podłączania telefonu ani instalowania lokalnego Android Studio:',
                cmd: 'flutter build apk --release',
              },
              {
                step: '5',
                title: 'Pobierz gotowy plik APK na komputer lub telefon',
                desc: 'Po zakończeniu kompilacji (zazwyczaj 1-3 minuty) plik APK znajdziesz w folderze: build/app/outputs/flutter-apk/app-release.apk. Kliknij na niego prawym przyciskiem myszy i wybierz "Download". Gotowe!',
                cmd: null,
              },
            ].map((s) => (
              <div
                key={s.step}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-extrabold flex items-center justify-center shrink-0 text-sm">
                  {s.step}
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-bold text-slate-900 text-base">{s.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                  
                  {s.cmd && (
                    <div className="mt-2 bg-slate-900 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-teal-300">
                      <code>{s.cmd}</code>
                      <button
                        type="button"
                        onClick={() => handleCopyCommand(s.cmd!, s.cmd!)}
                        className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans text-2xs flex items-center gap-1 transition-colors"
                      >
                        {copiedCommand === s.cmd ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Skopiowano</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopiuj komendę</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Key Advantages Box */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-teal-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              Dlaczego ta architektura działa w 100% offline i niezawodnie?
            </h4>
            <ul className="text-xs text-teal-800 space-y-1.5 list-disc pl-5">
              <li>
                <strong>Baza danych SQLite (sqflite):</strong> Żadne dane medyczne ani historia dawek nie wychodzą poza urządzenie użytkownika. Działa w samolocie, szpitalu i miejscach bez zasięgu.
              </li>
              <li>
                <strong>SCHEDULE_EXACT_ALARM:</strong> Powiadomienia wybudzają telefon dokładnie o wyznaczonej minucie, ignorując tryb Doze Mode w systemie Android.
              </li>
              <li>
                <strong>Akcje bezpośrednie w powiadomieniu:</strong> Kliknięcie "Wziąłem" lub "Odłóż (15 min)" od razu zapisuje stan w lokalnej bazie bez konieczności otwierania aplikacji.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
