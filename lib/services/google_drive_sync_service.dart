import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:googleapis/drive/v3.dart' as drive;
import 'package:http/http.dart' as http;
import 'database_service.dart';

/// Pomocniczy klient HTTP przekazujący nagłówki autoryzacji Google OAuth2
class GoogleAuthClient extends http.BaseClient {
  final Map<String, String> _headers;
  final http.Client _client = http.Client();

  GoogleAuthClient(this._headers);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    return _client.send(request..headers.addAll(_headers));
  }
}

/// Model metadanych kopii zapasowej
class BackupInfo {
  final String id;
  final String name;
  final DateTime modifiedTime;
  final int sizeBytes;

  BackupInfo({
    required this.id,
    required this.name,
    required this.modifiedTime,
    required this.sizeBytes,
  });

  String get formattedSize {
    if (sizeBytes < 1024) return '$sizeBytes B';
    if (sizeBytes < 1024 * 1024) return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(2)} MB';
  }
}

/// Wynik operacji synchronizacji
class SyncResult {
  final bool success;
  final String message;
  final BackupInfo? backupInfo;

  SyncResult({required this.success, required this.message, this.backupInfo});
}

class GoogleAuthException implements Exception {
  final int code;
  final String title;
  final String message;
  final String rawError;

  const GoogleAuthException({
    required this.code,
    required this.title,
    required this.message,
    required this.rawError,
  });

  @override
  String toString() => '$title: $message';
}

class GoogleDriveSyncService {
  static final GoogleDriveSyncService instance = GoogleDriveSyncService._internal();
  GoogleDriveSyncService._internal();

  // Nazwa pliku kopii zapasowej zgodnie z wymaganiami
  static const String backupFileName = 'medplaner-backup.db';
  // Dedykowany folder na Dysku Google
  static const String backupFolderName = 'MedPlaner Kopia Zapasowa';

  // Najbardziej restrykcyjne uprawnienie dające dostęp WYŁĄCZNIE do plików stworzonych przez tę aplikację
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: [
      drive.DriveApi.driveFileScope, // https://www.googleapis.com/auth/drive.file
      'email',
    ],
  );

  GoogleSignInAccount? _currentUser;
  GoogleSignInAccount? get currentUser => _currentUser;
  bool get isSignedIn => _currentUser != null;

  /// Inicjalizacja nasłuchiwania stanu logowania
  void initialize({Function(GoogleSignInAccount?)? onUserChanged}) {
    _googleSignIn.onCurrentUserChanged.listen((account) {
      _currentUser = account;
      if (onUserChanged != null) {
        onUserChanged(account);
      }
    });
  }

  /// Logowanie na żądanie użytkownika
  Future<GoogleSignInAccount?> signIn() async {
    try {
      final account = await _googleSignIn.signIn();
      _currentUser = account;
      return account;
    } catch (e) {
      debugPrint('Błąd logowania Google Sign-In: $e');
      final errorStr = e.toString();
      if (errorStr.contains('ApiException: 10') ||
          errorStr.contains(': 10:') ||
          errorStr.contains('status 10') ||
          errorStr.contains('code: 10')) {
        throw GoogleAuthException(
          code: 10,
          title: 'Wymagana konfiguracja SHA-1 w Google Cloud (ApiException: 10)',
          message: 'Google Play Services odrzuciło autoryzację z błędem DEVELOPER_ERROR (kod 10).\n\n'
              'Oznacza to, że odcisk cyfrowy SHA-1 certyfikatu aplikacji nie został jeszcze zarejestrowany '
              'w Google Cloud Console dla pakietu "com.example.medplaner".',
          rawError: errorStr,
        );
      }
      rethrow;
    }
  }

  /// Ciche logowanie przy ponownym uruchomieniu aplikacji (bez wymuszania okna dialogowego)
  Future<GoogleSignInAccount?> signInSilently() async {
    try {
      final account = await _googleSignIn.signInSilently();
      _currentUser = account;
      return account;
    } catch (_) {
      return null;
    }
  }

  /// Wylogowanie
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    _currentUser = null;
  }

  /// Pobranie uwierzytelnionego klienta Drive API
  Future<drive.DriveApi?> _getDriveApi() async {
    if (_currentUser == null) {
      final account = await _googleSignIn.signInSilently();
      _currentUser = account;
      if (_currentUser == null) return null;
    }

    final authHeaders = await _currentUser!.authHeaders;
    final client = GoogleAuthClient(authHeaders);
    return drive.DriveApi(client);
  }

  /// Wyszukanie lub utworzenie dedykowanego folderu "MedPlaner Kopia Zapasowa"
  Future<String> _getOrCreateBackupFolder(drive.DriveApi driveApi) async {
    final query = "mimeType = 'application/vnd.google-apps.folder' and name = '$backupFolderName' and trashed = false";
    final folderList = await driveApi.files.list(q: query, spaces: 'drive', $fields: 'files(id, name)');

    if (folderList.files != null && folderList.files!.isNotEmpty) {
      return folderList.files!.first.id!;
    }

    // Jeśli folder nie istnieje, tworzymy go
    final folderMetadata = drive.File()
      ..name = backupFolderName
      ..mimeType = 'application/vnd.google-apps.folder'
      ..description = 'Bezpieczny folder z kopiami bazy danych aplikacji MedPlaner';

    final createdFolder = await driveApi.files.create(folderMetadata, $fields: 'id');
    return createdFolder.id!;
  }

  /// Pobranie informacji o istniejącej kopii zapasowej
  Future<BackupInfo?> getLatestBackupInfo() async {
    final driveApi = await _getDriveApi();
    if (driveApi == null) return null;

    try {
      final query = "name = '$backupFileName' and trashed = false";
      final fileList = await driveApi.files.list(
        q: query,
        spaces: 'drive',
        $fields: 'files(id, name, modifiedTime, size)',
      );

      if (fileList.files == null || fileList.files!.isEmpty) {
        return null;
      }

      final file = fileList.files!.first;
      return BackupInfo(
        id: file.id ?? '',
        name: file.name ?? backupFileName,
        modifiedTime: file.modifiedTime ?? DateTime.now(),
        sizeBytes: int.tryParse(file.size ?? '0') ?? 0,
      );
    } catch (e) {
      debugPrint('Błąd pobierania informacji o kopii zapasowej: $e');
      return null;
    }
  }

  /// Eksport i wysłanie lokalnej bazy danych do Google Drive
  Future<SyncResult> backupDatabase() async {
    final driveApi = await _getDriveApi();
    if (driveApi == null) {
      return SyncResult(success: false, message: 'Musisz najpierw zalogować się swoim kontem Google.');
    }

    try {
      // 1. Zlokalizuj lokalną bazę SQLite
      final dbPath = await DatabaseService.instance.getDatabaseFilePath();
      final dbFile = File(dbPath);

      if (!await dbFile.exists()) {
        return SyncResult(success: false, message: 'Nie znaleziono lokalnego pliku bazy danych ($dbPath).');
      }

      final dbLength = await dbFile.length();
      if (dbLength == 0) {
        return SyncResult(success: false, message: 'Lokalna baza danych jest pusta.');
      }

      // 2. Pobierz lub stwórz dedykowany folder w Dysku Google
      final folderId = await _getOrCreateBackupFolder(driveApi);

      // 3. Sprawdź czy plik medplaner-backup.db już istnieje w tym folderze
      final query = "name = '$backupFileName' and '$folderId' in parents and trashed = false";
      final fileList = await driveApi.files.list(q: query, spaces: 'drive', $fields: 'files(id, name)');

      final media = drive.Media(dbFile.openRead(), dbLength);
      drive.File uploadedFile;

      if (fileList.files != null && fileList.files!.isNotEmpty) {
        // Aktualizacja istniejącego pliku
        final existingFileId = fileList.files!.first.id!;
        final fileUpdate = drive.File()..modifiedTime = DateTime.now().toUtc();
        uploadedFile = await driveApi.files.update(
          fileUpdate,
          existingFileId,
          uploadMedia: media,
          $fields: 'id, name, modifiedTime, size',
        );
      } else {
        // Utworzenie nowego pliku
        final newFile = drive.File()
          ..name = backupFileName
          ..parents = [folderId]
          ..description = 'Kopia bazy danych aplikacji MedPlaner SQLite ($dbLength bajtów)';

        uploadedFile = await driveApi.files.create(
          newFile,
          uploadMedia: media,
          $fields: 'id, name, modifiedTime, size',
        );
      }

      final info = BackupInfo(
        id: uploadedFile.id ?? '',
        name: uploadedFile.name ?? backupFileName,
        modifiedTime: uploadedFile.modifiedTime ?? DateTime.now(),
        sizeBytes: int.tryParse(uploadedFile.size ?? '$dbLength') ?? dbLength,
      );

      return SyncResult(
        success: true,
        message: 'Kopia zapasowa została pomyślnie zapisana na Twoim Dysku Google (${info.formattedSize}).',
        backupInfo: info,
      );
    } catch (e) {
      debugPrint('Błąd tworzenia kopii zapasowej w Google Drive: $e');
      return SyncResult(
        success: false,
        message: 'Wystąpił błąd podczas wysyłania kopii do Dysku Google: $e',
      );
    }
  }

  /// Przywrócenie lokalnej bazy danych z pliku w Google Drive
  Future<SyncResult> restoreDatabase() async {
    final driveApi = await _getDriveApi();
    if (driveApi == null) {
      return SyncResult(success: false, message: 'Musisz najpierw zalogować się swoim kontem Google.');
    }

    try {
      // 1. Wyszukaj plik kopii zapasowej
      final query = "name = '$backupFileName' and trashed = false";
      final fileList = await driveApi.files.list(
        q: query,
        spaces: 'drive',
        $fields: 'files(id, name, modifiedTime, size)',
      );

      if (fileList.files == null || fileList.files!.isEmpty) {
        return SyncResult(
          success: false,
          message: 'Na Twoim Dysku Google nie odnaleziono jeszcze żadnej kopii zapasowej ("$backupFileName").',
        );
      }

      final driveBackup = fileList.files!.first;
      final fileId = driveBackup.id!;

      // 2. Pobierz zawartość pliku z Google Drive
      final drive.Media downloadedMedia = await driveApi.files.get(
        fileId,
        downloadOptions: drive.DownloadOptions.fullMedia,
      ) as drive.Media;

      final List<int> bytes = [];
      await for (final chunk in downloadedMedia.stream) {
        bytes.addAll(chunk);
      }

      if (bytes.isEmpty) {
        return SyncResult(success: false, message: 'Pobrany plik kopii zapasowej jest pusty.');
      }

      // 3. Bezpieczne zamknięcie obecnej instancji SQLite przed nadpisaniem
      await DatabaseService.instance.closeDatabase();

      // 4. Nadpisanie lokalnego pliku bazy medications_catalog.db
      final dbPath = await DatabaseService.instance.getDatabaseFilePath();
      final dbFile = File(dbPath);

      // Kopia bezpieczeństwa przed nadpisaniem
      if (await dbFile.exists()) {
        try {
          await dbFile.copy('$dbPath.bak');
        } catch (_) {}
      }

      await dbFile.writeAsBytes(bytes, flush: true);

      // 5. Ponowne zainicjalizowanie i otwarcie bazy SQLite
      await DatabaseService.instance.reloadDatabase();

      final info = BackupInfo(
        id: fileId,
        name: driveBackup.name ?? backupFileName,
        modifiedTime: driveBackup.modifiedTime ?? DateTime.now(),
        sizeBytes: bytes.length,
      );

      return SyncResult(
        success: true,
        message: 'Baza danych została pomyślnie przywrócona z Dysku Google (${info.formattedSize}).',
        backupInfo: info,
      );
    } catch (e) {
      debugPrint('Błąd przywracania bazy danych z Google Drive: $e');
      // Próba przywrócenia z pliku .bak w razie awarii
      try {
        final dbPath = await DatabaseService.instance.getDatabaseFilePath();
        final bakFile = File('$dbPath.bak');
        if (await bakFile.exists()) {
          await bakFile.copy(dbPath);
          await DatabaseService.instance.reloadDatabase();
        }
      } catch (_) {}

      return SyncResult(
        success: false,
        message: 'Wystąpił błąd podczas pobierania bazy z Dysku Google: $e',
      );
    }
  }
}
