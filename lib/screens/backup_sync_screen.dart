import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
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

  @override
  void initState() {
    super.initState();
    _checkInitialState();
  }

  Future<void> _checkInitialState() async {
    setState(() => _isLoading = true);
    await _syncService.signInSilently();
    if (_syncService.isSignedIn) {
      _latestBackup = await _syncService.getLatestBackupInfo();
    }
    if (mounted) {
      setState(() => _isLoading = false);
    }
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

  Future<void> _handleExportLocalBackup() async {
    setState(() => _isLoading = true);
    try {
      final file = await DatabaseService.instance.exportBackupFile();
      final size = await file.length();
      final sizeKb = (size / 1024).toStringAsFixed(1);
      setState(() {
        _statusMessage = 'Wyeksportowano lokalną kopię: ${file.path} ($sizeKb KB). Plik bazy został bezpiecznie zapisany.';
        _isSuccessMessage = true;
        _isDeveloperError = false;
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lokalna kopia zapasowa została utworzona pomyślnie.'),
            backgroundColor: Colors.teal,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Nie udało się wyeksportować bazy: $e';
        _isSuccessMessage = false;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleRestoreLocalBackup() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Przywrócić lokalną kopię?'),
        content: const Text(
          'Przywrócenie lokalnego pliku "medplaner-backup.db" nadpisze bieżącą bazę danych na telefonie.\n\nCzy chcesz kontynuować?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Przywróć'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isLoading = true);
    try {
      final file = await DatabaseService.instance.exportBackupFile();
      final ok = await DatabaseService.instance.restoreFromBackupFile(file.path);
      setState(() {
        _statusMessage = ok
            ? 'Baza danych została pomyślnie przywrócona z lokalnego pliku.'
            : 'Nie znaleziono pliku kopii "medplaner-backup.db".';
        _isSuccessMessage = ok;
        _isLoading = false;
      });
      if (mounted && ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Baza danych została zsynchronizowana z lokalnego pliku.'),
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
                '5. W pole "Odcisk certyfikatu SHA-1" wklej odcisk z logów GitHub Actions (z sekcji "Odczytaj odciski certyfikatów SHA-1") '
                'lub uruchom polecenie w katalogu projektu: ./gradlew signingReport.\n\n'
                '6. Kliknij "Utwórz". Zmiany zaczną obowiązywać w ciągu kilku minut.\n\n'
                'Wskazówka: Do tego czasu możesz natychmiast korzystać z opcji "Lokalna kopia zapasowa" poniżej!',
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
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Kopia zapasowa (Google Drive)', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Karta Edukacyjno-Prywatnościowa (Ochrona danych użytkownika)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.teal.shade200),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.teal.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.shield_outlined, color: Colors.teal.shade800, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Prywatność i bezpieczeństwo Twoich danych',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.teal.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  '1. MedPlaner działa w 100% lokalnie (offline) w pamięci Twojego urządzenia.\n'
                  '2. Kopia zapasowa w chmurze jest całkowicie opcjonalna – korzystasz z niej tylko wtedy, gdy sam zdecydujesz.\n'
                  '3. Twoja baza medyczna trafia WYŁĄCZNIE na Twój prywatny Dysk Google do dedykowanego folderu ("MedPlaner Kopia Zapasowa").\n'
                  '4. Twórca aplikacji ani nikt inny NIE MA DOSTĘPU do Twoich danych – nie prowadzimy żadnego centralnego serwera.\n'
                  '5. Aplikacja prosi tylko o bezpieczne uprawnienie "drive.file", co oznacza, że widzi wyłącznie utworzony przez siebie plik kopii ("medplaner-backup.db"). Nie ma dostępu do Twoich innych dokumentów, zdjęć czy poczty.',
                  style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF334155)),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Komunikat o statusie operacji
          if (_statusMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _isSuccessMessage ? Colors.green.shade50 : (_isDeveloperError ? Colors.amber.shade50 : Colors.red.shade50),
                borderRadius: BorderRadius.circular(12),
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
                    Row(
                      children: [
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
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Karta Autoryzacji Google
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Konto Google do synchronizacji', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  if (user == null) ...[
                    const Text(
                      'Nie jesteś zalogowany. Zaloguj się, aby zapisać kopię bazy danych na swoim Dysku Google lub przywrócić ją po reinstalacji.',
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black87,
                        side: BorderSide(color: Colors.grey.shade300),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: Image.network(
                        'https://developers.google.com/identity/images/g-logo.png',
                        width: 20,
                        height: 20,
                        errorBuilder: (_, __, ___) => const Icon(Icons.account_circle, color: Colors.blue),
                      ),
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
                              Text(user.email, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: _isLoading ? null : _handleSignOut,
                          child: const Text('Wyloguj', style: TextStyle(color: Colors.redAccent)),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Karta akcji: Kopia i Przywracanie
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Kopia zapasowa w chmurze', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_latestBackup != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.teal.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.cloud_done, color: Colors.teal.shade700, size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Ostatnia kopia: ${_latestBackup!.name}',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.teal.shade900),
                                ),
                                Text(
                                  '${dateFormat.format(_latestBackup!.modifiedTime.toLocal())} • ${_latestBackup!.formattedSize}',
                                  style: TextStyle(fontSize: 12, color: Colors.teal.shade700),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ] else if (user != null) ...[
                    Text(
                      'Brak zapisanej kopii zapasowej na Dysku Google.',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                    ),
                    const SizedBox(height: 16),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.teal,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: _isLoading
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.cloud_upload_outlined),
                          label: const Text('Zapisz kopię na Dysk'),
                          onPressed: (_isLoading || user == null) ? null : _handleBackup,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.teal,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.cloud_download_outlined),
                          label: const Text('Przywróć z Dysku'),
                          onPressed: (_isLoading || user == null) ? null : _handleRestore,
                        ),
                      ),
                    ],
                  ),
                  if (user == null) ...[
                    const SizedBox(height: 8),
                    const Center(
                      child: Text(
                        'Zaloguj się powyżej, aby aktywować tworzenie i przywracanie kopii.',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Karta: Lokalna Kopia Zapasowa (Plik .db na telefonie - działa natychmiast)
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.teal.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.teal.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.folder_zip_outlined, color: Colors.teal, size: 20),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Lokalna kopia zapasowa (Bez logowania)',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Zapis bezpośrednio do pliku w pamięci telefonu',
                              style: TextStyle(color: Colors.grey, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Możesz w każdej chwili zrzucić pełną bazę "medications_catalog.db" do pliku '
                    '"medplaner-backup.db" w pamięci urządzenia i przywrócić ją w razie potrzeby.',
                    style: TextStyle(fontSize: 12, height: 1.4, color: Color(0xFF475569)),
                  ),
                  const SizedBox(height: 14),
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
                          icon: const Icon(Icons.file_upload_outlined, size: 18),
                          label: const Text('Eksportuj do pliku', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: _isLoading ? null : _handleExportLocalBackup,
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
                          icon: const Icon(Icons.file_download_outlined, size: 18),
                          label: const Text('Przywróć z pliku', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: _isLoading ? null : _handleRestoreLocalBackup,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
