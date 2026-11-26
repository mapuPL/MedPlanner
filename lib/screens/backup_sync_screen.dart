import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:share_plus/share_plus.dart';
import '../services/google_drive_sync_service.dart';
import '../services/database_service.dart';

class BackupSyncScreen extends StatefulWidget {
  const BackupSyncScreen({super.key});

  @override
  State<BackupSyncScreen> createState() => _BackupSyncScreenState();
}

class _BackupSyncScreenState extends State<BackupSyncScreen> {
  final _syncService = GoogleDriveSyncService.instance;
  bool _isLoading = false;
  String? _statusMessage;
  bool _isSuccessMessage = true;
  bool _isDeveloperError = false;
  BackupInfo? _latestBackup;
  List<LocalBackupCandidate> _detectedLocalBackups = [];

  @override
  void initState() {
    super.initState();
    _checkInitialState();
  }

  Future<void> _checkInitialState() async {
    setState(() => _isLoading = true);
    await _scanLocalBackups();
    await _syncService.signInSilently();
    if (_syncService.isSignedIn) {
      _latestBackup = await _syncService.getLatestBackupInfo();
    }
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _scanLocalBackups() async {
    try {
      final found = await DatabaseService.instance.findExistingBackupCandidates();
      if (mounted) {
        setState(() => _detectedLocalBackups = found);
      }
    } catch (_) {}
  }

  Future<void> _handleSignIn() async {
    setState(() {
      _isLoading = true;
      _statusMessage = null;
      _isDeveloperError = false;
    });

    try {
      final user = await _syncService.signIn();
      if (user != null) {
        _latestBackup = await _syncService.getLatestBackupInfo();
        _statusMessage = 'Zalogowano pomyślnie jako ${user.email}';
        _isSuccessMessage = true;
        _isDeveloperError = false;
      }
    } catch (e) {
      final errorStr = e.toString();
      if (e is GoogleAuthException && e.code == 10) {
        _statusMessage = e.message;
        _isDeveloperError = true;
      } else if (errorStr.contains('ApiException: 10') || errorStr.contains(': 10:')) {
        _statusMessage = 'Wymagana konfiguracja SHA-1 w Google Cloud (kod 10: DEVELOPER_ERROR). '
            'Certyfikat tej kompilacji APK nie został dodany do identyfikatora OAuth dla pakietu "com.example.medplaner".';
        _isDeveloperError = true;
      } else {
        _statusMessage = 'Logowanie zostało przerwane lub wystąpił błąd: $e';
        _isDeveloperError = false;
      }
      _isSuccessMessage = false;
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSignOut() async {
    setState(() => _isLoading = true);
    await _syncService.signOut();
    setState(() {
      _latestBackup = null;
      _statusMessage = 'Wylogowano z konta Google.';
      _isSuccessMessage = true;
      _isLoading = false;
    });
  }

  Future<void> _handleBackup() async {
    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });

    final result = await _syncService.backupDatabase();
    if (result.success && result.backupInfo != null) {
      _latestBackup = result.backupInfo;
    }

    if (mounted) {
      setState(() {
        _statusMessage = result.message;
        _isSuccessMessage = result.success;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleRestore() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 28),
            SizedBox(width: 8),
            Text('Przywrócić dane?'),
          ],
        ),
        content: const Text(
          'Przywrócenie kopii z Dysku Google zastąpi obecną lokalną bazę leków i terapii plikiem "medplaner-backup.db".\n\nCzy na pewno chcesz kontynuować?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Anuluj'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Przywróć bazę'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });

    final result = await _syncService.restoreDatabase();
    if (result.success && result.backupInfo != null) {
      _latestBackup = result.backupInfo;
    }

    if (mounted) {
      setState(() {
        _statusMessage = result.message;
        _isSuccessMessage = result.success;
        _isLoading = false;
      });

      if (result.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Baza danych została zaktualizowana.'),
            backgroundColor: Colors.teal,
          ),
        );
      }
    }
  }

  /// Eksport do publicznego folderu telefonu za pomocą systemowego okna "Zapisz jako" (SAF)
  Future<void> _handleExportWithPicker() async {
    setState(() => _isLoading = true);
    try {
      final exportResult = await DatabaseService.instance.exportBackupWithLocations();
      final sizeKb = (exportResult.sizeBytes / 1024).toStringAsFixed(1);

      String? savedUserPath;
      try {
        savedUserPath = await FilePicker.saveFile(
          dialogTitle: 'Zapisz kopię bazy MedPlaner (np. w Pobrane)',
          fileName: DatabaseService.backupFileName,
          bytes: exportResult.bytes,
        );
      } catch (_) {}

      await _scanLocalBackups();

      final finalLocation = savedUserPath ??
          exportResult.publicDownloadPath ??
          exportResult.primaryFile.path;

      setState(() {
        _statusMessage = 'Zapisano kompletną kopię bazy ($sizeKb KB) w:\n$finalLocation\n\n'
            'Plik przetrwa odinstalowanie aplikacji i będzie widoczny w aplikacji Pliki / Pobrane.';
        _isSuccessMessage = true;
        _isDeveloperError = false;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Nie udało się wyeksportować bazy: $e';
        _isSuccessMessage = false;
        _isLoading = false;
      });
    }
  }

  /// Udostępnienie pliku .db do dowolnej aplikacji (Dysk, Gmail, Pliki, Bluetooth)
  Future<void> _handleShareBackup() async {
    setState(() => _isLoading = true);
    try {
      final exportResult = await DatabaseService.instance.exportBackupWithLocations();
      setState(() => _isLoading = false);

      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(exportResult.primaryFile.path, name: DatabaseService.backupFileName)],
          subject: 'Kopia bazy leków MedPlaner (medplaner-backup.db)',
          text: 'Kopia zapasowa bazy leków i terapii MedPlaner. Zachowaj ten plik, aby przywrócić dane po reinstalacji.',
        ),
      );
    } catch (e) {
      setState(() {
        _statusMessage = 'Nie udało się udostępnić pliku kopii: $e';
        _isSuccessMessage = false;
        _isLoading = false;
      });
    }
  }

  /// Wybór pliku .db z dowolnego miejsca na telefonie (Pobrane, Dysk, Dokumenty) po reinstalacji!
  Future<void> _handlePickAndRestoreBackup() async {
    try {
      final PlatformFile? picked = await FilePicker.pickFile(
        dialogTitle: 'Wskaż plik kopii (medplaner-backup.db)',
        type: FileType.any,
      );

      if (picked == null) return;
      final selectedPath = picked.path;
      if (selectedPath == null) {
        if (!mounted) return;
        setState(() {
          _statusMessage = 'Nie udało się odczytać ścieżki wybranego pliku.';
          _isSuccessMessage = false;
        });
        return;
      }

      if (!mounted) return;
      await _confirmAndRestorePath(selectedPath, picked.name);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _statusMessage = 'Błąd wyboru pliku kopii: $e';
        _isSuccessMessage = false;
      });
    }
  }

  Future<void> _confirmAndRestorePath(String filePath, String displayName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Przywrócić wybraną kopię?'),
        content: Text(
          'Plik: "$displayName"\n\n'
          'Przywrócenie tej kopii zastąpi obecne terapie i leki w nowo zainstalowanej aplikacji.\n\n'
          'Czy chcesz kontynuować?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Przywróć teraz'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isLoading = true);
    try {
      final ok = await DatabaseService.instance.restoreFromBackupFile(filePath);
      setState(() {
        _statusMessage = ok
            ? 'Baza danych została pomyślnie przywrócona z pliku:\n$filePath'
            : 'Nie znaleziono wskazanego pliku kopii zapasowej.';
        _isSuccessMessage = ok;
        _isLoading = false;
      });
      if (mounted && ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Wszystkie terapie i leki zostały przywrócone!'),
            backgroundColor: Colors.teal,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Błąd przywracania bazy: $e';
        _isSuccessMessage = false;
        _isLoading = false;
      });
    }
  }

  void _showSha1HelpDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.vpn_key_outlined, color: Colors.teal),
            SizedBox(width: 8),
            Text('Konfiguracja SHA-1', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Błąd "ApiException: 10" (DEVELOPER_ERROR) oznacza, że Google Play Services na Twoim telefonie '
                'nie ma jeszcze zarejestrowanego certyfikatu SHA-1 tej kompilacji aplikacji w konsoli Google Cloud.',
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 12),
              const Text('Kroki do rozwiązania w 2 minuty:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              const Text(
                '1. Wejdź na konsolę Google Cloud:\nconsole.cloud.google.com/apis/credentials\n\n'
                '2. Kliknij "+ UTWÓRZ DANE LOGOWANIA" -> "Identyfikator klienta OAuth".\n\n'
                '3. Wybierz typ: "Android".\n\n'
                '4. Wpisz nazwę pakietu:',
                style: TextStyle(fontSize: 12, height: 1.4),
              ),
              Container(
                margin: const EdgeInsets.symmetric(vertical: 6),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text('com.example.medplaner', style: TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy, size: 16),
                      tooltip: 'Kopiuj nazwę pakietu',
                      onPressed: () {
                        Clipboard.setData(const ClipboardData(text: 'com.example.medplaner'));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Skopiowano nazwę pakietu.'), duration: Duration(seconds: 2)),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const Text(
                '5. W pole "Odcisk certyfikatu SHA-1" wklej odcisk z logów GitHub Actions (z sekcji "Odczytaj odciski certyfikatów SHA-1").\n\n'
                'Wskazówka: Lokalna kopia w folderze Pobrane (poniżej) działa zawsze od razu bez Google Cloud!',
                style: TextStyle(fontSize: 12, height: 1.4),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Zamknij'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd.MM.yyyy HH:mm', 'pl_PL');
    final user = _syncService.currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F7),
      appBar: AppBar(
        title: const Text('Kopia Zapasowa i Przywracanie', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.teal),
            tooltip: 'Przeszukaj pamięć w poszukiwaniu kopii',
            onPressed: _isLoading ? null : _scanLocalBackups,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Komunikat o statusie operacji
          if (_statusMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _isSuccessMessage ? Colors.green.shade50 : (_isDeveloperError ? Colors.amber.shade50 : Colors.red.shade50),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _isSuccessMessage
                      ? Colors.green.shade300
                      : (_isDeveloperError ? Colors.amber.shade400 : Colors.red.shade300),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        _isSuccessMessage
                            ? Icons.check_circle
                            : (_isDeveloperError ? Icons.warning_amber_rounded : Icons.error_outline),
                        color: _isSuccessMessage
                            ? Colors.green.shade800
                            : (_isDeveloperError ? Colors.amber.shade900 : Colors.red.shade800),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _statusMessage!,
                          style: TextStyle(
                            color: _isSuccessMessage
                                ? Colors.green.shade900
                                : (_isDeveloperError ? const Color(0xFF78350F) : Colors.red.shade900),
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_isDeveloperError) ...[
                    const SizedBox(height: 10),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber.shade800,
                        foregroundColor: Colors.white,
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.help_outline, size: 16),
                      label: const Text('Jak rozwiązać ten błąd? (Instrukcja SHA-1)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      onPressed: _showSha1HelpDialog,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // KARTA 1: Automatycznie wykryte kopie na urządzeniu (po reinstalacji!)
          if (_detectedLocalBackups.isNotEmpty) ...[
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: Colors.teal.shade300, width: 1.5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.find_in_page_outlined, color: Colors.teal.shade700, size: 22),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Wykryto kopie zapasowe w pamięci telefonu',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Nowo zainstalowana aplikacja automatycznie odnalazła poniższe pliki kopii bazy:',
                      style: TextStyle(fontSize: 12, color: Color(0xFF475569)),
                    ),
                    const SizedBox(height: 10),
                    ..._detectedLocalBackups.map((cand) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.teal.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.teal.shade100),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    cand.locationLabel,
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.teal.shade900),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${dateFormat.format(cand.modifiedAt)} • ${cand.formattedSize}',
                                    style: TextStyle(fontSize: 11, color: Colors.teal.shade700),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.teal.shade700,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: _isLoading
                                  ? null
                                  : () => _confirmAndRestorePath(cand.path, cand.locationLabel),
                              child: const Text('Przywróć', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // KARTA 2: Lokalna Kopia Zapasowa (Zapisz w Pobrane / Udostępnij / Wybierz plik z telefonu)
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.teal.shade50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.save_alt, color: Colors.teal, size: 22),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Kopia do pliku w Pobrane / Wybór ręczny',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Przetrwa usunięcie aplikacji • bez logowania',
                              style: TextStyle(color: Colors.grey, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Zapisz plik "medplaner-backup.db" bezpośrednio do publicznego folderu Pobrane (Download), wyślij na Dyska/email lub wskaż dowolny zapisany wcześniej plik po ponownej instalacji.',
                    style: TextStyle(fontSize: 12, height: 1.45, color: Color(0xFF475569)),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.create_new_folder_outlined, size: 18),
                      label: const Text('Zapisz kopię w Pobrane / Wybierz folder', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: _isLoading ? null : _handleExportWithPicker,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.teal.shade800,
                            side: BorderSide(color: Colors.teal.shade300),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.share_outlined, size: 17),
                          label: const Text('Udostępnij .db', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: _isLoading ? null : _handleShareBackup,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.teal.shade800,
                            side: BorderSide(color: Colors.teal.shade300),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.folder_open_outlined, size: 17),
                          label: const Text('Wskaż plik .db', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: _isLoading ? null : _handlePickAndRestoreBackup,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // KARTA 3: Prywatność i Dysk Google
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Opcjonalna kopia na Dysku Google', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  const Text(
                    'Twoja baza trafia wyłącznie do prywatnego folderu "MedPlaner Kopia Zapasowa" na Twoim Dysku Google (zakres drive.file). Żadne dane nie trafiają do twórcy aplikacji.',
                    style: TextStyle(color: Color(0xFF475569), fontSize: 12, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  if (user == null) ...[
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black87,
                        side: BorderSide(color: Colors.grey.shade300),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.account_circle, color: Colors.teal),
                      label: const Text('Zaloguj przez Google', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: _isLoading ? null : _handleSignIn,
                    ),
                  ] else ...[
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.teal.shade100,
                          child: Text(
                            (user.displayName ?? user.email).substring(0, 1).toUpperCase(),
                            style: TextStyle(color: Colors.teal.shade900, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(user.displayName ?? 'Użytkownik Google', style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text(user.email, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: _isLoading ? null : _handleSignOut,
                          child: const Text('Wyloguj', style: TextStyle(color: Colors.redAccent)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_latestBackup != null) ...[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.teal.shade50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.cloud_done, color: Colors.teal.shade700, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${_latestBackup!.name} • ${dateFormat.format(_latestBackup!.modifiedTime.toLocal())} (${_latestBackup!.formattedSize})',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.teal.shade900),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.teal,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.cloud_upload_outlined, size: 18),
                            label: const Text('Zapisz na Dysk', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            onPressed: _isLoading ? null : _handleBackup,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.teal,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.cloud_download_outlined, size: 18),
                            label: const Text('Przywróć z Dysku', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            onPressed: _isLoading ? null : _handleRestore,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
