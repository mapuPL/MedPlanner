import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/google_drive_sync_service.dart';

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
    });

    try {
      final user = await _syncService.signIn();
      if (user != null) {
        _latestBackup = await _syncService.getLatestBackupInfo();
        _statusMessage = 'Zalogowano pomyślnie jako ${user.email}';
        _isSuccessMessage = true;
      }
    } catch (e) {
      _statusMessage = 'Logowanie zostało przerwane lub wystąpił błąd: $e';
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
                color: _isSuccessMessage ? Colors.green.shade50 : Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _isSuccessMessage ? Colors.green.shade300 : Colors.red.shade300),
              ),
              child: Row(
                children: [
                  Icon(
                    _isSuccessMessage ? Icons.check_circle : Icons.error_outline,
                    color: _isSuccessMessage ? Colors.green.shade800 : Colors.red.shade800,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _statusMessage!,
                      style: TextStyle(
                        color: _isSuccessMessage ? Colors.green.shade900 : Colors.red.shade900,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
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
        ],
      ),
    );
  }
}
