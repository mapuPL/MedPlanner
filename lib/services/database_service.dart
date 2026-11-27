import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../models/dose_log.dart';
import '../models/user_profile.dart';
import '../models/medication_change.dart';
import 'notification_service.dart';

class LocalBackupCandidate {
  final String path;
  final String locationLabel;
  final DateTime modifiedAt;
  final int sizeBytes;

  const LocalBackupCandidate({
    required this.path,
    required this.locationLabel,
    required this.modifiedAt,
    required this.sizeBytes,
  });

  String get formattedSize {
    if (sizeBytes < 1024) return '$sizeBytes B';
    if (sizeBytes < 1024 * 1024) return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(2)} MB';
  }
}

class LocalExportResult {
  final File primaryFile;
  final String? publicDownloadPath;
  final int sizeBytes;
  final Uint8List bytes;

  const LocalExportResult({
    required this.primaryFile,
    this.publicDownloadPath,
    required this.sizeBytes,
    required this.bytes,
  });
}

enum DayScheduleStatus { none, completed, partial, missed, upcoming }

class DoctorMedicationReportItem {
  final Medication medication;
  final String therapyName;
  final String profileName;
  final int scheduledCount;
  final int takenCount;
  final int skippedCount;

  const DoctorMedicationReportItem({
    required this.medication,
    required this.therapyName,
    required this.profileName,
    required this.scheduledCount,
    required this.takenCount,
    required this.skippedCount,
  });

  int? get adherencePercentage =>
      scheduledCount > 0 ? ((takenCount / scheduledCount) * 100).round() : null;
}

class DoctorReportSummary {
  final int days;
  final String? profileName;
  final String startDate;
  final String endDate;
  final int totalScheduled;
  final int totalTaken;
  final int totalSkipped;
  final List<DoctorMedicationReportItem> items;

  const DoctorReportSummary({
    required this.days,
    this.profileName,
    required this.startDate,
    required this.endDate,
    required this.totalScheduled,
    required this.totalTaken,
    required this.totalSkipped,
    required this.items,
  });

  int get overallPercentage =>
      totalScheduled > 0 ? ((totalTaken / totalScheduled) * 100).round() : 100;
}

class JsonBackupPreview {
  final int profilesCount;
  final int therapiesCount;
  final int medicationsCount;
  final int doseLogsCount;
  final int medicationChangesCount;

  const JsonBackupPreview({
    required this.profilesCount,
    required this.therapiesCount,
    required this.medicationsCount,
    required this.doseLogsCount,
    this.medicationChangesCount = 0,
  });
}

enum TherapyPdfDetailLevel { summary, full }

class TherapyPdfReportConfig {
  final String? profileName;
  final bool includeAllTherapies;
  final List<String> selectedTherapyIds;
  final DateTime startDate;
  final DateTime endDate;
  final TherapyPdfDetailLevel detailLevel;

  const TherapyPdfReportConfig({
    this.profileName,
    this.includeAllTherapies = true,
    this.selectedTherapyIds = const [],
    required this.startDate,
    required this.endDate,
    this.detailLevel = TherapyPdfDetailLevel.full,
  });
}

class TherapyPdfMedicationRow {
  final String medicationId;
  final String name;
  final String currentDoseDisplay;
  final String timesDisplay;
  final String? instructions;
  final int scheduledCount;
  final int takenCount;
  final int skippedCount;
  final int? adherencePercentage;

  const TherapyPdfMedicationRow({
    required this.medicationId,
    required this.name,
    required this.currentDoseDisplay,
    required this.timesDisplay,
    this.instructions,
    required this.scheduledCount,
    required this.takenCount,
    required this.skippedCount,
    this.adherencePercentage,
  });
}

class TherapyPdfTherapySummary {
  final String therapyId;
  final String therapyName;
  final String profileName;
  final bool isActive;
  final String therapyColor;
  final List<TherapyPdfMedicationRow> medications;
  final int totalScheduled;
  final int totalTaken;
  final int totalSkipped;
  final int? adherencePercentage;

  const TherapyPdfTherapySummary({
    required this.therapyId,
    required this.therapyName,
    required this.profileName,
    required this.isActive,
    required this.therapyColor,
    required this.medications,
    required this.totalScheduled,
    required this.totalTaken,
    required this.totalSkipped,
    this.adherencePercentage,
  });
}

class TherapyPdfStockRow {
  final String medicationId;
  final String medicationName;
  final String therapyName;
  final double? stockQuantity;
  final double? packageSize;
  final String unit;
  final int? estimatedDaysLeft;
  final String? expiryDate;
  final String cabinetStatusLabel;
  final bool hasAlert;

  const TherapyPdfStockRow({
    required this.medicationId,
    required this.medicationName,
    required this.therapyName,
    this.stockQuantity,
    this.packageSize,
    required this.unit,
    this.estimatedDaysLeft,
    this.expiryDate,
    required this.cabinetStatusLabel,
    this.hasAlert = false,
  });
}

class TherapyPdfDetailedLogRow {
  final String doseId;
  final String date;
  final String scheduledTime;
  final String? actualTakenTime;
  final String medicationName;
  final String therapyName;
  final String doseSnapshot;
  final DoseStatus status;
  final String statusLabel;
  final String? note;

  const TherapyPdfDetailedLogRow({
    required this.doseId,
    required this.date,
    required this.scheduledTime,
    this.actualTakenTime,
    required this.medicationName,
    required this.therapyName,
    required this.doseSnapshot,
    required this.status,
    required this.statusLabel,
    this.note,
  });
}

class TherapyPdfReportData {
  final DateTime generatedAt;
  final String? profileName;
  final String patientLabel;
  final String startDate;
  final String endDate;
  final TherapyPdfDetailLevel detailLevel;
  final int totalScheduled;
  final int totalTaken;
  final int totalSkipped;
  final int? overallAdherencePercentage;
  final List<TherapyPdfTherapySummary> therapySummaries;
  final List<MedicationChange> doseChanges;
  final List<TherapyPdfStockRow> stockItems;
  final List<TherapyPdfDetailedLogRow> detailedLogs;

  const TherapyPdfReportData({
    required this.generatedAt,
    this.profileName,
    required this.patientLabel,
    required this.startDate,
    required this.endDate,
    required this.detailLevel,
    required this.totalScheduled,
    required this.totalTaken,
    required this.totalSkipped,
    this.overallAdherencePercentage,
    required this.therapySummaries,
    required this.doseChanges,
    required this.stockItems,
    required this.detailedLogs,
  });
}

class DatabaseService {
  static final DatabaseService instance = DatabaseService._internal();
  DatabaseService._internal();

  static const String databaseFileName = 'medications_catalog.db';
  static const String backupFileName = 'medplaner-backup.db';
  static Database? _database;

  final ValueNotifier<int> dataVersion = ValueNotifier<int>(0);
  final ValueNotifier<String?> selectedProfileNotifier = ValueNotifier<String?>(null);

  void notifyDataChanged() => dataVersion.value++;
  void setSelectedProfile(String? profileName) => selectedProfileNotifier.value = profileName;

  static String formatLocalDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<Database> get database async {
    if (_database != null && _database!.isOpen) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<String> getDatabaseFilePath() async {
    final dbPath = await getDatabasesPath();
    return join(dbPath, databaseFileName);
  }

  Future<void> closeDatabase() async {
    if (_database != null && _database!.isOpen) {
      try {
        await _database!.rawQuery('PRAGMA wal_checkpoint(TRUNCATE)');
      } catch (_) {}
      await _database!.close();
      _database = null;
    }
  }

  Future<void> checkpointDatabase() async {
    if (_database != null && _database!.isOpen) {
      try {
        await _database!.rawQuery('PRAGMA wal_checkpoint(TRUNCATE)');
      } catch (_) {}
    }
  }

  Future<void> reloadDatabase() async {
    await closeDatabase();
    _database = await _initDatabase();
  }

  /// Sprawdza nagłówek pliku SQLite ("SQLite format 3\0")
  static bool isValidSqliteBytes(List<int> bytes) {
    if (bytes.length < 16) return false;
    const header = 'SQLite format 3';
    for (int i = 0; i < header.length; i++) {
      if (bytes[i] != header.codeUnitAt(i)) return false;
    }
    return bytes[15] == 0;
  }

  /// Zwraca spójne bajty bazy danych gotowe do eksportu / zapisu poza aplikacją
  Future<Uint8List> getDatabaseBytesForExport() async {
    await database;
    await checkpointDatabase();
    final dbPath = await getDatabaseFilePath();
    final dbFile = File(dbPath);
    if (!await dbFile.exists()) {
      throw Exception('Plik bazy danych jeszcze nie istnieje.');
    }
    return await dbFile.readAsBytes();
  }

  /// Eksport lokalnej kopii zapasowej do folderu aplikacji ORAZ (jeśli system pozwala) do publicznego folderu Pobrane (Download/MedPlaner)
  Future<LocalExportResult> exportBackupWithLocations() async {
    final bytes = await getDatabaseBytesForExport();

    // 1. Zapis w katalogu wewnętrznym aplikacji (zawsze dostępny jako baza pomocnicza do Udostępniania)
    final appDocDir = await getApplicationDocumentsDirectory();
    final internalFile = File(join(appDocDir.path, backupFileName));
    await internalFile.writeAsBytes(bytes, flush: true);

    // 2. Próba zapisu w publicznym folderze Pobrane (przetrwa odinstalowanie aplikacji na Androidzie)
    String? savedPublicPath;
    final publicCandidates = <String>[
      '/storage/emulated/0/Download/MedPlaner/$backupFileName',
      '/storage/emulated/0/Download/$backupFileName',
    ];

    try {
      final dlDir = await getDownloadsDirectory();
      if (dlDir != null) {
        publicCandidates.add(join(dlDir.path, 'MedPlaner', backupFileName));
        publicCandidates.add(join(dlDir.path, backupFileName));
      }
    } catch (_) {}

    for (final candidate in publicCandidates) {
      try {
        final target = File(candidate);
        if (!await target.parent.exists()) {
          await target.parent.create(recursive: true);
        }
        await target.writeAsBytes(bytes, flush: true);
        savedPublicPath = target.path;
        break;
      } catch (_) {
        // Android 11+ Scoped Storage może blokować bezpośredni zapis bez SAF; obsługujemy to przez FilePicker.saveFile
      }
    }

    return LocalExportResult(
      primaryFile: savedPublicPath != null ? File(savedPublicPath) : internalFile,
      publicDownloadPath: savedPublicPath,
      sizeBytes: bytes.length,
      bytes: bytes,
    );
  }

  Future<File> exportBackupFile() async {
    final result = await exportBackupWithLocations();
    return result.primaryFile;
  }

  /// Automatyczne skanowanie typowych lokalizacji na telefonie (szczególnie przydatne po reinstalacji!)
  Future<List<LocalBackupCandidate>> findExistingBackupCandidates() async {
    final List<MapEntry<String, String>> searchTargets = [
      const MapEntry('/storage/emulated/0/Download/MedPlaner/$backupFileName', 'Pobrane / MedPlaner'),
      const MapEntry('/storage/emulated/0/Download/$backupFileName', 'Pobrane (Download)'),
      const MapEntry('/storage/emulated/0/Documents/MedPlaner/$backupFileName', 'Dokumenty / MedPlaner'),
      const MapEntry('/storage/emulated/0/Documents/$backupFileName', 'Dokumenty'),
    ];

    try {
      final dlDir = await getDownloadsDirectory();
      if (dlDir != null) {
        searchTargets.add(MapEntry(join(dlDir.path, 'MedPlaner', backupFileName), 'Pobrane aplikacji / MedPlaner'));
        searchTargets.add(MapEntry(join(dlDir.path, backupFileName), 'Pobrane aplikacji'));
      }
    } catch (_) {}

    try {
      final extDirs = await getExternalStorageDirectories();
      if (extDirs != null) {
        for (final dir in extDirs) {
          searchTargets.add(MapEntry(join(dir.path, backupFileName), 'Pamięć zewnętrzna aplikacji'));
        }
      }
    } catch (_) {}

    try {
      final docDir = await getApplicationDocumentsDirectory();
      searchTargets.add(MapEntry(join(docDir.path, backupFileName), 'Pamięć wewnętrzna MedPlaner'));
    } catch (_) {}

    final seenPaths = <String>{};
    final found = <LocalBackupCandidate>[];

    for (final entry in searchTargets) {
      if (seenPaths.contains(entry.key)) continue;
      seenPaths.add(entry.key);

      try {
        final f = File(entry.key);
        if (await f.exists()) {
          final stat = await f.stat();
          if (stat.size >= 16) {
            final raf = await f.open();
            final headerBytes = await raf.read(16);
            await raf.close();
            if (isValidSqliteBytes(headerBytes)) {
              found.add(LocalBackupCandidate(
                path: entry.key,
                locationLabel: entry.value,
                modifiedAt: stat.modified,
                sizeBytes: stat.size,
              ));
            }
          }
        }
      } catch (_) {}
    }

    found.sort((a, b) => b.modifiedAt.compareTo(a.modifiedAt));
    return found;
  }

  /// Przywrócenie bazy z pliku kopii zapasowej (z walidacją nagłówka SQLite i bezpieczną migracją schematu)
  Future<bool> restoreFromBackupFile(String filePath) async {
    final backupFile = File(filePath);
    if (!await backupFile.exists()) return false;

    final bytes = await backupFile.readAsBytes();
    if (!isValidSqliteBytes(bytes)) {
      throw Exception('Wybrany plik nie jest prawidłową bazą danych SQLite aplikacji MedPlaner.');
    }

    final dbPath = await getDatabaseFilePath();
    final dbFile = File(dbPath);

    await closeDatabase();

    // Zabezpieczenie bieżącej bazy przed nadpisaniem
    if (await dbFile.exists()) {
      try {
        await dbFile.copy('$dbPath.bak');
      } catch (_) {}
    }

    // Usuń stare pliki dziennika WAL/SHM, aby nie wymieszały się z przywracaną bazą
    for (final suffix in ['-wal', '-shm', '-journal']) {
      final aux = File('$dbPath$suffix');
      if (await aux.exists()) {
        try {
          await aux.delete();
        } catch (_) {}
      }
    }

    await dbFile.writeAsBytes(bytes, flush: true);
    await reloadDatabase();
    selectedProfileNotifier.value = null;
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
    return true;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, databaseFileName);

    // Migracja wsteczna: jeśli istniała wcześniejsza baza medplaner.db, a brak medications_catalog.db
    final legacyPath = join(dbPath, 'medplaner.db');
    if (!await File(path).exists() && await File(legacyPath).exists()) {
      try {
        await File(legacyPath).copy(path);
      } catch (_) {}
    }

    return await openDatabase(
      path,
      version: 5,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            color_hex TEXT NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE therapies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            color_hex TEXT NOT NULL,
            icon_name TEXT NOT NULL,
            profile_name TEXT DEFAULT 'Mój profil',
            start_date TEXT,
            end_date TEXT,
            is_active INTEGER NOT NULL,
            created_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE medications (
            id TEXT PRIMARY KEY,
            therapy_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            dose_amount TEXT NOT NULL,
            instructions TEXT,
            times_json TEXT NOT NULL,
            schedule_type TEXT NOT NULL,
            selected_days_json TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT,
            stock_quantity REAL,
            package_size REAL,
            low_stock_threshold REAL DEFAULT 5,
            expiry_date TEXT,
            FOREIGN KEY (therapy_id) REFERENCES therapies (id) ON DELETE CASCADE
          )
        ''');

        await db.execute('''
          CREATE TABLE dose_logs (
            id TEXT PRIMARY KEY,
            medication_id TEXT NOT NULL,
            therapy_id TEXT NOT NULL,
            scheduled_date TEXT NOT NULL,
            scheduled_time TEXT NOT NULL,
            actual_taken_time TEXT,
            status TEXT NOT NULL,
            snoozed_until TEXT,
            snooze_count INTEGER DEFAULT 0,
            notes TEXT,
            dose_snapshot TEXT,
            type_snapshot TEXT,
            medication_name_snapshot TEXT,
            FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE,
            FOREIGN KEY (therapy_id) REFERENCES therapies (id) ON DELETE CASCADE
          )
        ''');

        await db.execute('''
          CREATE TABLE medication_changes (
            id TEXT PRIMARY KEY,
            medication_id TEXT NOT NULL,
            therapy_id TEXT NOT NULL,
            profile_name TEXT NOT NULL,
            medication_name TEXT NOT NULL,
            changed_at TEXT NOT NULL,
            previous_dose TEXT NOT NULL,
            new_dose TEXT NOT NULL,
            previous_times_json TEXT,
            new_times_json TEXT,
            change_type TEXT NOT NULL,
            change_reason TEXT
          )
        ''');

        await db.execute('CREATE INDEX idx_dose_logs_date ON dose_logs (scheduled_date)');
        await db.execute('CREATE INDEX idx_medication_changes_date ON medication_changes (changed_at)');
        await _ensureProfilesReady(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        await _ensureSchemaColumns(db);
      },
      onOpen: (db) async {
        // Zapewnia bezbłędne działanie nawet po przywróceniu starszej kopii v1/v2/v3/v4 z pliku .db
        await _ensureSchemaColumns(db);
      },
    );
  }

  Future<void> _ensureSchemaColumns(Database db) async {
    Future<void> addColumnIfMissing(String table, String column, String definition) async {
      final info = await db.rawQuery('PRAGMA table_info($table)');
      final exists = info.any((row) => row['name'] == column);
      if (!exists) {
        await db.execute('ALTER TABLE $table ADD COLUMN $column $definition');
      }
    }

    await addColumnIfMissing('therapies', 'profile_name', "TEXT DEFAULT 'Mój profil'");
    await addColumnIfMissing('medications', 'stock_quantity', 'REAL');
    await addColumnIfMissing('medications', 'package_size', 'REAL');
    await addColumnIfMissing('medications', 'low_stock_threshold', 'REAL DEFAULT 5');
    await addColumnIfMissing('medications', 'expiry_date', 'TEXT');
    await addColumnIfMissing('dose_logs', 'dose_snapshot', 'TEXT');
    await addColumnIfMissing('dose_logs', 'type_snapshot', 'TEXT');
    await addColumnIfMissing('dose_logs', 'medication_name_snapshot', 'TEXT');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS medication_changes (
        id TEXT PRIMARY KEY,
        medication_id TEXT NOT NULL,
        therapy_id TEXT NOT NULL,
        profile_name TEXT NOT NULL,
        medication_name TEXT NOT NULL,
        changed_at TEXT NOT NULL,
        previous_dose TEXT NOT NULL,
        new_dose TEXT NOT NULL,
        previous_times_json TEXT,
        new_times_json TEXT,
        change_type TEXT NOT NULL,
        change_reason TEXT
      )
    ''');
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_medication_changes_date ON medication_changes (changed_at)',
    );
    await _ensureProfilesReady(db);
  }

  Future<void> _ensureProfilesReady(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color_hex TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    ''');

    final countRes = await db.rawQuery('SELECT COUNT(*) AS cnt FROM profiles');
    final existingCount = Sqflite.firstIntValue(countRes) ?? 0;

    if (existingCount == 0) {
      final now = DateTime.now();
      final defaults = [
        {'id': 'prof_self', 'name': 'Mój profil', 'color_hex': '#0F766E', 'is_default': 1, 'offset': 0},
        {'id': 'prof_mom', 'name': 'Mama', 'color_hex': '#8B5CF6', 'is_default': 0, 'offset': 1},
        {'id': 'prof_dad', 'name': 'Tata', 'color_hex': '#3B82F6', 'is_default': 0, 'offset': 2},
        {'id': 'prof_kid', 'name': 'Dziecko', 'color_hex': '#EC4899', 'is_default': 0, 'offset': 3},
      ];
      for (final d in defaults) {
        await db.insert(
          'profiles',
          {
            'id': d['id'],
            'name': d['name'],
            'color_hex': d['color_hex'],
            'is_default': d['is_default'],
            'created_at': now.add(Duration(milliseconds: d['offset'] as int)).toIso8601String(),
          },
          conflictAlgorithm: ConflictAlgorithm.ignore,
        );
      }
    }

    // Zsynchronizuj niestandardowe nazwy profili z istniejących terapii (np. po imporcie kopii)
    final therapyProfiles = await db.rawQuery(
      "SELECT DISTINCT profile_name FROM therapies WHERE profile_name IS NOT NULL AND TRIM(profile_name) != ''",
    );
    for (final row in therapyProfiles) {
      final pName = (row['profile_name'] as String).trim();
      final existing = await db.query(
        'profiles',
        where: 'LOWER(name) = LOWER(?)',
        whereArgs: [pName],
        limit: 1,
      );
      if (existing.isEmpty) {
        await db.insert(
          'profiles',
          {
            'id': const Uuid().v4(),
            'name': pName,
            'color_hex': '#0F766E',
            'is_default': 0,
            'created_at': DateTime.now().toIso8601String(),
          },
          conflictAlgorithm: ConflictAlgorithm.ignore,
        );
      }
    }
  }

  Future<List<UserProfile>> getProfiles() async {
    final db = await database;
    final maps = await db.query('profiles', orderBy: 'is_default DESC, created_at ASC');
    return maps.map((m) => UserProfile.fromMap(m)).toList();
  }

  Future<UserProfile> insertProfile(String name, {String colorHex = '#0F766E'}) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      throw Exception('Nazwa użytkownika nie może być pusta.');
    }

    final db = await database;
    final all = await getProfiles();
    final normalized = trimmed.toLowerCase();
    final hasDuplicate = all.any((p) => p.name.trim().toLowerCase() == normalized);
    if (hasDuplicate) {
      throw Exception('Użytkownik "$trimmed" już istnieje.');
    }

    final profile = UserProfile(
      id: const Uuid().v4(),
      name: trimmed,
      colorHex: colorHex,
      isDefault: false,
      createdAt: DateTime.now(),
    );
    await db.insert('profiles', profile.toMap());
    notifyDataChanged();
    return profile;
  }

  Future<void> updateProfile(
    UserProfile existing, {
    required String name,
    required String colorHex,
  }) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      throw Exception('Nazwa użytkownika nie może być pusta.');
    }

    final db = await database;
    final all = await getProfiles();
    final normalized = trimmed.toLowerCase();
    final hasDuplicate = all.any(
      (p) => p.id != existing.id && p.name.trim().toLowerCase() == normalized,
    );
    if (hasDuplicate) {
      throw Exception('Użytkownik "$trimmed" już istnieje.');
    }

    await db.transaction((txn) async {
      await txn.update(
        'profiles',
        {'name': trimmed, 'color_hex': colorHex},
        where: 'id = ?',
        whereArgs: [existing.id],
      );
      if (existing.name != trimmed) {
        await txn.update(
          'therapies',
          {'profile_name': trimmed},
          where: 'profile_name = ?',
          whereArgs: [existing.name],
        );
      }
    });

    if (selectedProfileNotifier.value == existing.name) {
      selectedProfileNotifier.value = trimmed;
    }
    notifyDataChanged();
  }

  Future<void> deleteProfile(
    UserProfile profile, {
    String? transferToProfileName,
    bool deleteRelatedData = false,
  }) async {
    final db = await database;
    final all = await getProfiles();
    if (all.length <= 1) {
      throw Exception('Musi pozostać co najmniej jeden profil użytkownika.');
    }

    final fallback = all.firstWhere(
      (p) => p.id != profile.id && p.isDefault,
      orElse: () => all.firstWhere((p) => p.id != profile.id),
    );

    final targetName = (transferToProfileName != null &&
            all.any((p) => p.id != profile.id && p.name == transferToProfileName))
        ? transferToProfileName
        : fallback.name;

    await db.transaction((txn) async {
      if (deleteRelatedData) {
        final therapyRows = await txn.query(
          'therapies',
          columns: ['id'],
          where: 'profile_name = ?',
          whereArgs: [profile.name],
        );
        for (final row in therapyRows) {
          final tId = row['id'] as String;
          await txn.delete('dose_logs', where: 'therapy_id = ?', whereArgs: [tId]);
          await txn.delete('medications', where: 'therapy_id = ?', whereArgs: [tId]);
        }
        await txn.delete('therapies', where: 'profile_name = ?', whereArgs: [profile.name]);
      } else {
        await txn.update(
          'therapies',
          {'profile_name': targetName},
          where: 'profile_name = ?',
          whereArgs: [profile.name],
        );
      }
      await txn.delete('profiles', where: 'id = ?', whereArgs: [profile.id]);
    });

    if (selectedProfileNotifier.value == profile.name) {
      selectedProfileNotifier.value = null;
    }
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  Future<void> insertTherapy(Therapy therapy) async {
    final db = await database;
    await db.insert('therapies', therapy.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  Future<void> updateTherapy(Therapy therapy) async {
    final db = await database;
    await db.update(
      'therapies',
      therapy.toMap(),
      where: 'id = ?',
      whereArgs: [therapy.id],
    );
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  Future<void> setTherapyActive(
    Therapy therapy,
    bool isActive, {
    String? changeReason,
  }) async {
    final db = await database;
    final meds = await getMedicationsForTherapy(therapy.id);
    final now = DateTime.now();
    final prevState = therapy.isActive ? 'Terapia aktywna' : 'Terapia wstrzymana';
    final nextState = isActive ? 'Terapia aktywna' : 'Terapia wstrzymana';
    final reason = (changeReason != null && changeReason.trim().isNotEmpty)
        ? changeReason.trim()
        : (isActive ? 'Wznowienie terapii' : 'Wstrzymanie terapii');

    await db.transaction((txn) async {
      await txn.update(
        'therapies',
        therapy.copyWith(isActive: isActive).toMap(),
        where: 'id = ?',
        whereArgs: [therapy.id],
      );
      if (meds.isEmpty) {
        final change = MedicationChange(
          id: const Uuid().v4(),
          medicationId: '',
          therapyId: therapy.id,
          profileName: therapy.profileName,
          medicationName: therapy.name,
          changedAt: now,
          previousDose: prevState,
          newDose: nextState,
          changeType: 'status_change',
          changeReason: reason,
        );
        await txn.insert('medication_changes', change.toMap());
      } else {
        for (final med in meds) {
          final change = MedicationChange(
            id: const Uuid().v4(),
            medicationId: med.id,
            therapyId: therapy.id,
            profileName: therapy.profileName,
            medicationName: med.name,
            changedAt: now,
            previousDose: '${med.formatDose()} ($prevState)',
            newDose: '${med.formatDose()} ($nextState)',
            changeType: 'status_change',
            changeReason: reason,
          );
          await txn.insert('medication_changes', change.toMap());
        }
      }
    });

    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  Future<void> deleteTherapy(String id) async {
    final db = await database;
    await db.delete('therapies', where: 'id = ?', whereArgs: [id]);
    await db.delete('medications', where: 'therapy_id = ?', whereArgs: [id]);
    await db.delete('dose_logs', where: 'therapy_id = ?', whereArgs: [id]);
    await db.delete('medication_changes', where: 'therapy_id = ?', whereArgs: [id]);
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  Future<List<Therapy>> getTherapies({bool activeOnly = false}) async {
    final db = await database;
    final where = activeOnly ? 'is_active = 1' : null;
    final maps = await db.query('therapies', where: where, orderBy: 'created_at DESC');
    return maps.map((m) => Therapy.fromMap(m)).toList();
  }

  Future<void> insertMedication(Medication medication) async {
    final db = await database;
    await db.insert('medications', medication.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  String _formatScheduleSnapshot(Medication med) {
    final doseText = med.formatDose();
    final timesText = med.times.isNotEmpty ? med.times.join(', ') : 'brak godzin';
    if (med.scheduleType == ScheduleType.specificDays && med.selectedDays.isNotEmpty) {
      const dayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
      final sorted = [...med.selectedDays]..sort();
      final daysText = sorted.map((d) => (d >= 1 && d <= 7) ? dayLabels[d - 1] : d.toString()).join(',');
      return '$doseText ($timesText · $daysText)';
    }
    return '$doseText ($timesText)';
  }

  Future<void> updateMedication(Medication medication, {String? changeReason}) async {
    final db = await database;
    final todayStr = formatLocalDate(DateTime.now());
    final cleanedReason = (changeReason != null && changeReason.trim().isNotEmpty)
        ? changeReason.trim()
        : null;

    await db.transaction((txn) async {
      final prevMedRows = await txn.query(
        'medications',
        where: 'id = ?',
        whereArgs: [medication.id],
        limit: 1,
      );

      if (prevMedRows.isNotEmpty) {
        final prevMed = Medication.fromMap(prevMedRows.first);
        final prevTherapyRows = await txn.query('therapies', where: 'id = ?', whereArgs: [prevMed.therapyId], limit: 1);
        final nextTherapyRows = await txn.query('therapies', where: 'id = ?', whereArgs: [medication.therapyId], limit: 1);
        final prevTherapy = prevTherapyRows.isNotEmpty ? Therapy.fromMap(prevTherapyRows.first) : null;
        final nextTherapy = nextTherapyRows.isNotEmpty ? Therapy.fromMap(nextTherapyRows.first) : null;

        final doseChanged =
            _extractPureDoseAmount(prevMed.doseAmount) != _extractPureDoseAmount(medication.doseAmount) ||
            prevMed.type != medication.type;
        final prevTimesSorted = [...prevMed.times]..sort();
        final nextTimesSorted = [...medication.times]..sort();
        final timesChanged = prevTimesSorted.join(',') != nextTimesSorted.join(',');

        final prevDaysSorted = [...prevMed.selectedDays]..sort();
        final nextDaysSorted = [...medication.selectedDays]..sort();
        final scheduleChanged =
            prevMed.scheduleType != medication.scheduleType ||
            prevDaysSorted.join(',') != nextDaysSorted.join(',') ||
            formatLocalDate(prevMed.startDate) != formatLocalDate(medication.startDate) ||
            (prevMed.endDate != null ? formatLocalDate(prevMed.endDate!) : '') !=
                (medication.endDate != null ? formatLocalDate(medication.endDate!) : '');

        final therapyChanged = prevMed.therapyId != medication.therapyId;
        final instructionsChanged = (prevMed.instructions ?? '') != (medication.instructions ?? '');

        if (doseChanged || timesChanged || scheduleChanged || therapyChanged || instructionsChanged || cleanedReason != null) {
          String changeType = 'general_edit';
          if (doseChanged) {
            changeType = 'dose_change';
          } else if (timesChanged || scheduleChanged) {
            changeType = 'schedule_change';
          }

          String previousDose = _formatScheduleSnapshot(prevMed);
          String newDose = _formatScheduleSnapshot(medication);
          if (doseChanged && !timesChanged && !scheduleChanged) {
            previousDose = prevMed.formatDose();
            newDose = medication.formatDose();
          } else if (!doseChanged && !timesChanged && !scheduleChanged && therapyChanged) {
            previousDose = '${prevMed.formatDose()} · ${prevTherapy?.name ?? "Terapia"}';
            newDose = '${medication.formatDose()} · ${nextTherapy?.name ?? "Terapia"}';
          }

          final change = MedicationChange(
            id: const Uuid().v4(),
            medicationId: medication.id,
            therapyId: medication.therapyId,
            profileName: nextTherapy?.profileName ?? prevTherapy?.profileName ?? 'Mój profil',
            medicationName: medication.name,
            changedAt: DateTime.now(),
            previousDose: previousDose,
            newDose: newDose,
            previousTimes: prevMed.times,
            newTimes: medication.times,
            changeType: changeType,
            changeReason: cleanedReason,
          );
          await txn.insert('medication_changes', change.toMap());
        }
      }

      await txn.update(
        'medications',
        medication.toMap(),
        where: 'id = ?',
        whereArgs: [medication.id],
      );
      // Usuń wyłącznie oczekujące/odroczone dawki od dziś wzwyż, aby odświeżyć harmonogram,
      // zachowując całą historię dawek już przyjętych ('taken') oraz pominiętych ('skipped').
      await txn.delete(
        'dose_logs',
        where: "medication_id = ? AND scheduled_date >= ? AND status IN ('pending', 'snoozed')",
        whereArgs: [medication.id, todayStr],
      );
    });

    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  Future<void> updateDoseNote(String doseId, String? note) async {
    final db = await database;
    final cleaned = (note != null && note.trim().isNotEmpty) ? note.trim() : null;
    await db.update(
      'dose_logs',
      {'notes': cleaned},
      where: 'id = ?',
      whereArgs: [doseId],
    );
    notifyDataChanged();
  }

  Future<void> updateMedicationStock(String medicationId, double newStock, {DateTime? expiryDate}) async {
    final db = await database;
    final data = <String, dynamic>{'stock_quantity': newStock};
    if (expiryDate != null) {
      data['expiry_date'] = formatLocalDate(expiryDate);
    }
    await db.update('medications', data, where: 'id = ?', whereArgs: [medicationId]);
    notifyDataChanged();
  }

  Future<void> deleteMedication(String id) async {
    final db = await database;
    await db.delete('medications', where: 'id = ?', whereArgs: [id]);
    await db.delete('dose_logs', where: 'medication_id = ?', whereArgs: [id]);
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  Future<List<Medication>> getMedicationsForTherapy(String therapyId) async {
    final db = await database;
    final maps = await db.query('medications', where: 'therapy_id = ?', whereArgs: [therapyId]);
    return maps.map((m) => Medication.fromMap(m)).toList();
  }

  Future<List<Medication>> getAllMedications() async {
    final db = await database;
    final maps = await db.query('medications');
    return maps.map((m) => Medication.fromMap(m)).toList();
  }

  Future<List<DoseLog>> getDosesForDate(DateTime date) async {
    final db = await database;
    final dateStr = formatLocalDate(date);

    await _ensureDosesGeneratedForDate(date);

    final result = await db.rawQuery('''
      SELECT dl.*, 
             COALESCE(NULLIF(dl.medication_name_snapshot, ''), m.name) AS medication_name, 
             COALESCE(NULLIF(dl.dose_snapshot, ''), m.dose_amount) AS dose_amount, 
             COALESCE(NULLIF(dl.type_snapshot, ''), m.type) AS medication_type,
             m.instructions AS instructions,
             t.name AS therapy_name, 
             t.color_hex AS therapy_color_hex,
             t.profile_name AS profile_name
      FROM dose_logs dl
      JOIN medications m ON dl.medication_id = m.id
      JOIN therapies t ON dl.therapy_id = t.id
      WHERE dl.scheduled_date = ?
        AND (t.is_active = 1 OR dl.status IN ('taken', 'skipped'))
      ORDER BY 
        CASE 
          WHEN dl.status = 'snoozed' AND dl.snoozed_until IS NOT NULL THEN dl.snoozed_until 
          ELSE dl.scheduled_time 
        END ASC
    ''', [dateStr]);

    return result.map((m) => DoseLog.fromMap(m)).toList();
  }

  Future<void> _ensureDosesGeneratedForDate(DateTime date) async {
    final db = await database;
    final dateStr = formatLocalDate(date);

    final existingRows = await db.query(
      'dose_logs',
      columns: ['id'],
      where: 'scheduled_date = ?',
      whereArgs: [dateStr],
    );
    final existingIds = existingRows.map((row) => row['id'] as String).toSet();

    final activeTherapies = await getTherapies(activeOnly: true);
    final activeTherapyIds = activeTherapies.map((t) => t.id).toSet();
    if (activeTherapyIds.isEmpty) return;

    final allMeds = await getAllMedications();
    final batch = db.batch();
    final isoWeekday = date.weekday;
    bool hasInserts = false;

    for (final med in allMeds) {
      if (!activeTherapyIds.contains(med.therapyId)) continue;
      if (dateStr.compareTo(formatLocalDate(med.startDate)) < 0) continue;
      if (med.endDate != null && dateStr.compareTo(formatLocalDate(med.endDate!)) > 0) continue;

      bool shouldSchedule = false;
      if (med.scheduleType == ScheduleType.daily || med.scheduleType == ScheduleType.dateRange) {
        shouldSchedule = true;
      } else if (med.scheduleType == ScheduleType.specificDays) {
        if (med.selectedDays.contains(isoWeekday)) shouldSchedule = true;
      }

      if (shouldSchedule) {
        for (final time in med.times) {
          final doseId = '${med.id}_${dateStr}_${time.replaceAll(':', '')}';
          if (existingIds.contains(doseId)) continue;

          batch.insert(
            'dose_logs',
            {
              'id': doseId,
              'medication_id': med.id,
              'therapy_id': med.therapyId,
              'scheduled_date': dateStr,
              'scheduled_time': time,
              'actual_taken_time': null,
              'status': DoseStatus.pending.name,
              'snoozed_until': null,
              'snooze_count': 0,
              'notes': null,
            },
            conflictAlgorithm: ConflictAlgorithm.ignore,
          );
          hasInserts = true;
        }
      }
    }

    if (hasInserts) {
      await batch.commit(noResult: true);
    }
  }

  double _parseDoseAmountValue(String doseStr) {
    final match = RegExp(r'(\d+(?:[.,]\d+)?)').firstMatch(doseStr);
    if (match == null) return 1.0;
    final parsed = double.tryParse(match.group(1)!.replaceAll(',', '.')) ?? 1.0;
    return parsed > 0 ? parsed : 1.0;
  }

  Future<void> markDoseAsTaken(String doseId) async {
    final db = await database;
    final doseRows = await db.query('dose_logs', where: 'id = ?', whereArgs: [doseId], limit: 1);

    String? doseSnap;
    String? typeSnap;
    String? medNameSnap;
    Map<String, dynamic>? medRow;

    if (doseRows.isNotEmpty) {
      final medId = doseRows.first['medication_id'] as String?;
      if (medId != null) {
        final medRows = await db.query('medications', where: 'id = ?', whereArgs: [medId], limit: 1);
        if (medRows.isNotEmpty) {
          medRow = medRows.first;
          doseSnap = (medRow['dose_amount'] as String?) ?? '1';
          typeSnap = (medRow['type'] as String?) ?? 'capsule';
          medNameSnap = (medRow['name'] as String?) ?? 'Lek';
        }
      }
    }

    await db.update(
      'dose_logs',
      {
        'status': DoseStatus.taken.name,
        'actual_taken_time': DateTime.now().toIso8601String(),
        'snoozed_until': null,
        if (doseSnap != null) 'dose_snapshot': doseSnap,
        if (typeSnap != null) 'type_snapshot': typeSnap,
        if (medNameSnap != null) 'medication_name_snapshot': medNameSnap,
      },
      where: 'id = ?',
      whereArgs: [doseId],
    );

    // Automatyczne odjęcie przyjętej dawki z domowej apteczki (stock_quantity)
    if (doseRows.isNotEmpty && medRow != null) {
      final medId = doseRows.first['medication_id'] as String?;
      final prevStatus = doseRows.first['status'] as String?;
      if (medId != null && prevStatus != DoseStatus.taken.name) {
        final currentStock = (medRow['stock_quantity'] as num?)?.toDouble();
        if (currentStock != null && currentStock > 0) {
          final doseStr = doseSnap ?? '1';
          final parsedAmount = _parseDoseAmountValue(doseStr);
          final nextStock = (currentStock - parsedAmount).clamp(0.0, 99999.0);
          await db.update('medications', {'stock_quantity': nextStock}, where: 'id = ?', whereArgs: [medId]);
        }
      }
    }

    await NotificationService.instance.cancelNotificationForDose(doseId);
    notifyDataChanged();
  }

  Future<void> markDoseAsSkipped(String doseId) async {
    final db = await database;
    final doseRows = await db.query('dose_logs', where: 'id = ?', whereArgs: [doseId], limit: 1);
    String? doseSnap;
    String? typeSnap;
    String? medNameSnap;

    if (doseRows.isNotEmpty) {
      final medId = doseRows.first['medication_id'] as String?;
      if (medId != null) {
        final medRows = await db.query('medications', where: 'id = ?', whereArgs: [medId], limit: 1);
        if (medRows.isNotEmpty) {
          doseSnap = (medRows.first['dose_amount'] as String?) ?? '1';
          typeSnap = (medRows.first['type'] as String?) ?? 'capsule';
          medNameSnap = (medRows.first['name'] as String?) ?? 'Lek';
        }
      }
    }

    await db.update(
      'dose_logs',
      {
        'status': DoseStatus.skipped.name,
        'actual_taken_time': null,
        'snoozed_until': null,
        if (doseSnap != null) 'dose_snapshot': doseSnap,
        if (typeSnap != null) 'type_snapshot': typeSnap,
        if (medNameSnap != null) 'medication_name_snapshot': medNameSnap,
      },
      where: 'id = ?',
      whereArgs: [doseId],
    );

    await NotificationService.instance.cancelNotificationForDose(doseId);
    notifyDataChanged();
  }

  Future<void> undoDoseStatus(String doseId) async {
    final db = await database;
    final doseRows = await db.query('dose_logs', where: 'id = ?', whereArgs: [doseId], limit: 1);
    if (doseRows.isEmpty) return;

    final prevStatus = doseRows.first['status'] as String?;
    final medId = doseRows.first['medication_id'] as String?;
    final snapshotDose = doseRows.first['dose_snapshot'] as String?;

    await db.update(
      'dose_logs',
      {
        'status': DoseStatus.pending.name,
        'actual_taken_time': null,
        'snoozed_until': null,
        'dose_snapshot': null,
        'type_snapshot': null,
        'medication_name_snapshot': null,
      },
      where: 'id = ?',
      whereArgs: [doseId],
    );

    // Przywróć odjętą dawkę do domowej apteczki, jeśli wcześniej dawka była oznaczona jako wzięta
    if (prevStatus == DoseStatus.taken.name && medId != null) {
      final medRows = await db.query('medications', where: 'id = ?', whereArgs: [medId], limit: 1);
      if (medRows.isNotEmpty) {
        final currentStock = (medRows.first['stock_quantity'] as num?)?.toDouble();
        if (currentStock != null) {
          final doseStr = (snapshotDose != null && snapshotDose.trim().isNotEmpty)
              ? snapshotDose
              : ((medRows.first['dose_amount'] as String?) ?? '1');
          final parsedAmount = _parseDoseAmountValue(doseStr);
          final nextStock = (currentStock + parsedAmount).clamp(0.0, 99999.0);
          await db.update('medications', {'stock_quantity': nextStock}, where: 'id = ?', whereArgs: [medId]);
        }
      }
    }

    await NotificationService.instance.cancelNotificationForDose(doseId);
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();
  }

  Future<void> snoozeDose(String doseId, int minutes) async {
    final db = await database;
    final now = DateTime.now().add(Duration(minutes: minutes));
    final snoozedTimeString = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    final infoRows = await db.rawQuery('''
      SELECT m.name AS medication_name, m.dose_amount, m.type AS medication_type, m.instructions, t.name AS therapy_name
      FROM dose_logs dl
      JOIN medications m ON dl.medication_id = m.id
      JOIN therapies t ON dl.therapy_id = t.id
      WHERE dl.id = ?
      LIMIT 1
    ''', [doseId]);

    String title = '⏰ Odroczone przypomnienie o leku';
    String body = 'Czas zażyć dawkę!';
    if (infoRows.isNotEmpty) {
      final medName = (infoRows.first['medication_name'] as String?) ?? 'Lek';
      final rawDoseAmount = ((infoRows.first['dose_amount'] as String?) ?? '1').trim();
      final medType = MedicationType.fromString((infoRows.first['medication_type'] as String?) ?? 'capsule');
      final formattedDose = RegExp(r'[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]').hasMatch(rawDoseAmount)
          ? rawDoseAmount
          : '$rawDoseAmount ${medType.shortUnit}';
      final therapyName = (infoRows.first['therapy_name'] as String?) ?? 'Terapia';
      final instructions = (infoRows.first['instructions'] as String?)?.trim() ?? '';
      title = '⏰ Odroczony lek: $medName';
      body = instructions.isNotEmpty
          ? 'Dawka: $formattedDose ($therapyName) · $instructions'
          : 'Dawka: $formattedDose ($therapyName)';
    }

    await db.rawUpdate('''
      UPDATE dose_logs 
      SET status = ?, snoozed_until = ?, snooze_count = COALESCE(snooze_count, 0) + 1 
      WHERE id = ?
    ''', [DoseStatus.snoozed.name, snoozedTimeString, doseId]);

    await NotificationService.instance.scheduleSnoozeNotification(
      doseId: doseId,
      title: title,
      body: body,
      minutes: minutes,
    );
    notifyDataChanged();
  }

  /// Zbiorcze obliczenie statusów realizacji dla wszystkich dni wybranego miesiąca
  /// bez tworzenia zbędnych wpisów w SQLite dla dni przyszłych.
  Future<Map<String, DayScheduleStatus>> getMonthlyDayStatuses(
    int year,
    int month, {
    String? profileName,
  }) async {
    final db = await database;
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final monthStr = month.toString().padLeft(2, '0');
    final startStr = '$year-$monthStr-01';
    final endStr = '$year-$monthStr-${daysInMonth.toString().padLeft(2, '0')}';
    final todayStr = formatLocalDate(DateTime.now());

    final therapies = await getTherapies();
    final therapyMap = {for (final t in therapies) t.id: t};
    final allMeds = await getAllMedications();

    final logRows = await db.query(
      'dose_logs',
      columns: ['id', 'therapy_id', 'scheduled_date', 'status'],
      where: 'scheduled_date >= ? AND scheduled_date <= ?',
      whereArgs: [startStr, endStr],
    );

    final Map<String, List<String>> statusesByDate = {};
    final Map<String, Set<String>> seenIdsByDate = {};

    for (final row in logRows) {
      final tId = row['therapy_id'] as String?;
      final dateStr = row['scheduled_date'] as String?;
      final status = (row['status'] as String?) ?? DoseStatus.pending.name;
      final doseId = row['id'] as String?;
      if (tId == null || dateStr == null || doseId == null) continue;

      final therapy = therapyMap[tId];
      if (therapy == null) continue;
      if (profileName != null && (therapy.profileName ?? 'Mój profil') != profileName) {
        continue;
      }
      if (!therapy.isActive &&
          status != DoseStatus.taken.name &&
          status != DoseStatus.skipped.name) {
        continue;
      }

      statusesByDate.putIfAbsent(dateStr, () => []).add(status);
      seenIdsByDate.putIfAbsent(dateStr, () => <String>{}).add(doseId);
    }

    final Map<String, DayScheduleStatus> result = {};

    for (int day = 1; day <= daysInMonth; day++) {
      final dateObj = DateTime(year, month, day);
      final dateStr = formatLocalDate(dateObj);
      final isoWeekday = dateObj.weekday;

      final dayStatuses = statusesByDate[dateStr] ?? const <String>[];
      final seenIds = seenIdsByDate[dateStr] ?? const <String>{};

      int total = dayStatuses.length;
      int taken = dayStatuses.where((s) => s == DoseStatus.taken.name).length;
      int skipped = dayStatuses.where((s) => s == DoseStatus.skipped.name).length;

      for (final med in allMeds) {
        final therapy = therapyMap[med.therapyId];
        if (therapy == null || !therapy.isActive) continue;
        if (profileName != null && (therapy.profileName ?? 'Mój profil') != profileName) {
          continue;
        }
        if (dateStr.compareTo(formatLocalDate(med.startDate)) < 0) continue;
        if (med.endDate != null && dateStr.compareTo(formatLocalDate(med.endDate!)) > 0) {
          continue;
        }

        final bool shouldSchedule =
            med.scheduleType == ScheduleType.daily ||
            med.scheduleType == ScheduleType.dateRange ||
            (med.scheduleType == ScheduleType.specificDays &&
                med.selectedDays.contains(isoWeekday));
        if (!shouldSchedule) continue;

        for (final time in med.times) {
          final doseId = '${med.id}_${dateStr}_${time.replaceAll(':', '')}';
          if (!seenIds.contains(doseId)) {
            total++;
          }
        }
      }

      if (total == 0) {
        result[dateStr] = DayScheduleStatus.none;
      } else if (taken == total) {
        result[dateStr] = DayScheduleStatus.completed;
      } else if (taken > 0) {
        result[dateStr] = DayScheduleStatus.partial;
      } else if (dateStr.compareTo(todayStr) < 0) {
        result[dateStr] = DayScheduleStatus.missed;
      } else if (dateStr == todayStr) {
        result[dateStr] =
            skipped > 0 ? DayScheduleStatus.partial : DayScheduleStatus.upcoming;
      } else {
        result[dateStr] = DayScheduleStatus.upcoming;
      }
    }

    return result;
  }

  /// Wylicza podsumowanie "Raport lekowy dla lekarza" dla wybranego okresu (7/14/30 dni)
  /// oraz profilu (null = wszystkie profile), z dokładną skutecznością dla każdego leku.
  Future<DoctorReportSummary> getDoctorReportData({
    required int days,
    String? profileName,
  }) async {
    final db = await database;
    final now = DateTime.now();
    final todayDate = DateTime(now.year, now.month, now.day);
    final startDateObj = todayDate.subtract(Duration(days: days - 1));
    final startStr = formatLocalDate(startDateObj);
    final endStr = formatLocalDate(todayDate);

    final therapies = await getTherapies();
    final therapyMap = {for (final t in therapies) t.id: t};
    final allMeds = await getAllMedications();

    final scopedMeds = allMeds.where((med) {
      if (profileName == null) return true;
      final therapy = therapyMap[med.therapyId];
      return (therapy?.profileName ?? 'Mój profil') == profileName;
    }).toList();

    final scopedMedIds = scopedMeds.map((m) => m.id).toSet();

    final logRows = await db.query(
      'dose_logs',
      columns: ['id', 'medication_id', 'therapy_id', 'scheduled_date', 'status'],
      where: 'scheduled_date >= ? AND scheduled_date <= ?',
      whereArgs: [startStr, endStr],
    );

    final Map<String, Map<String, String>> storedByDateAndId = {};
    final Map<String, List<Map<String, dynamic>>> storedRowsByMed = {};

    for (final row in logRows) {
      final medId = row['medication_id'] as String?;
      final dateStr = row['scheduled_date'] as String?;
      final doseId = row['id'] as String?;
      final tId = row['therapy_id'] as String?;
      final status = (row['status'] as String?) ?? DoseStatus.pending.name;
      if (medId == null || dateStr == null || doseId == null) continue;
      if (!scopedMedIds.contains(medId)) continue;

      final therapy = tId != null ? therapyMap[tId] : null;
      if (therapy != null &&
          !therapy.isActive &&
          status != DoseStatus.taken.name &&
          status != DoseStatus.skipped.name) {
        continue;
      }

      storedByDateAndId.putIfAbsent(dateStr, () => {})[doseId] = status;
      storedRowsByMed.putIfAbsent(medId, () => []).add(row);
    }

    final Map<String, int> scheduledMap = {for (final m in scopedMeds) m.id: 0};
    final Map<String, int> takenMap = {for (final m in scopedMeds) m.id: 0};
    final Map<String, int> skippedMap = {for (final m in scopedMeds) m.id: 0};

    for (final med in scopedMeds) {
      final seenDoseIds = <String>{};
      final therapy = therapyMap[med.therapyId];

      // 1. Zlicz zapisane wpisy historii w oknie czasowym
      for (final row in (storedRowsByMed[med.id] ?? const [])) {
        final doseId = row['id'] as String;
        final status = (row['status'] as String?) ?? DoseStatus.pending.name;
        seenDoseIds.add(doseId);
        scheduledMap[med.id] = (scheduledMap[med.id] ?? 0) + 1;
        if (status == DoseStatus.taken.name) {
          takenMap[med.id] = (takenMap[med.id] ?? 0) + 1;
        } else if (status == DoseStatus.skipped.name) {
          skippedMap[med.id] = (skippedMap[med.id] ?? 0) + 1;
        }
      }

      // 2. Dodaj wirtualne zaplanowane dawki z harmonogramu (jeśli terapia aktywna)
      if (therapy == null || therapy.isActive) {
        for (int offset = 0; offset < days; offset++) {
          final dObj = startDateObj.add(Duration(days: offset));
          final dStr = formatLocalDate(dObj);
          if (dStr.compareTo(formatLocalDate(med.startDate)) < 0) continue;
          if (med.endDate != null && dStr.compareTo(formatLocalDate(med.endDate!)) > 0) {
            continue;
          }
          final isoWeekday = dObj.weekday;
          final bool shouldSchedule =
              med.scheduleType == ScheduleType.daily ||
              med.scheduleType == ScheduleType.dateRange ||
              (med.scheduleType == ScheduleType.specificDays &&
                  med.selectedDays.contains(isoWeekday));
          if (!shouldSchedule) continue;

          for (final time in med.times) {
            final doseId = '${med.id}_${dStr}_${time.replaceAll(':', '')}';
            if (seenDoseIds.contains(doseId)) continue;
            scheduledMap[med.id] = (scheduledMap[med.id] ?? 0) + 1;
          }
        }
      }
    }

    int totalScheduled = 0;
    int totalTaken = 0;
    int totalSkipped = 0;

    final items = scopedMeds.map((med) {
      final therapy = therapyMap[med.therapyId];
      final sc = scheduledMap[med.id] ?? 0;
      final tk = takenMap[med.id] ?? 0;
      final sk = skippedMap[med.id] ?? 0;
      totalScheduled += sc;
      totalTaken += tk;
      totalSkipped += sk;

      return DoctorMedicationReportItem(
        medication: med,
        therapyName: therapy?.name ?? 'Terapia',
        profileName: therapy?.profileName ?? 'Mój profil',
        scheduledCount: sc,
        takenCount: tk,
        skippedCount: sk,
      );
    }).toList();

    return DoctorReportSummary(
      days: days,
      profileName: profileName,
      startDate: startStr,
      endDate: endStr,
      totalScheduled: totalScheduled,
      totalTaken: totalTaken,
      totalSkipped: totalSkipped,
      items: items,
    );
  }

  Future<List<MedicationChange>> getMedicationChanges({
    String? profileName,
    String? startDate,
    String? endDate,
    Set<String>? therapyIds,
  }) async {
    final db = await database;
    final rows = await db.query('medication_changes', orderBy: 'changed_at ASC');
    return rows.map((r) => MedicationChange.fromMap(r)).where((c) {
      if (profileName != null && c.profileName != profileName) return false;
      final day = formatLocalDate(c.changedAt);
      if (startDate != null && day.compareTo(startDate) < 0) return false;
      if (endDate != null && day.compareTo(endDate) > 0) return false;
      if (therapyIds != null && !therapyIds.contains(c.therapyId)) return false;
      return true;
    }).toList();
  }

  int? estimateStockDaysRemaining(Medication med) {
    final stock = med.stockQuantity;
    if (stock == null) return null;
    if (stock <= 0) return 0;

    final dosePerTaking = _parseDoseAmountValue(med.doseAmount);
    final timesPerDay = med.times.isNotEmpty ? med.times.length : 1;
    final freqFactor = med.scheduleType == ScheduleType.specificDays
        ? (med.selectedDays.isNotEmpty ? med.selectedDays.length.clamp(1, 7) / 7.0 : 1.0)
        : 1.0;
    final avgDaily = dosePerTaking * timesPerDay * freqFactor;
    if (avgDaily <= 0) return null;
    return (stock / avgDaily).floor();
  }

  String _doseStatusLabelPl(DoseStatus status) {
    switch (status) {
      case DoseStatus.taken:
        return 'Przyjęta';
      case DoseStatus.skipped:
        return 'Pominięta';
      case DoseStatus.snoozed:
        return 'Odłożona';
      case DoseStatus.pending:
        return 'Oczekująca';
    }
  }

  Future<TherapyPdfReportData> buildTherapyPdfReportData(TherapyPdfReportConfig config) async {
    final db = await database;
    final rawStart = DateTime(config.startDate.year, config.startDate.month, config.startDate.day);
    final rawEnd = DateTime(config.endDate.year, config.endDate.month, config.endDate.day);
    final startObj = rawStart.isAfter(rawEnd) ? rawEnd : rawStart;
    final endObj = rawStart.isAfter(rawEnd) ? rawStart : rawEnd;
    final startStr = formatLocalDate(startObj);
    final endStr = formatLocalDate(endObj);

    final allTherapies = await getTherapies();
    final profileTherapies = config.profileName == null
        ? allTherapies
        : allTherapies.where((t) => t.profileName == config.profileName).toList();

    final selectedSet = config.includeAllTherapies
        ? profileTherapies.map((t) => t.id).toSet()
        : config.selectedTherapyIds.where((id) => profileTherapies.any((t) => t.id == id)).toSet();

    final scopedTherapies = profileTherapies.where((t) => selectedSet.has(t.id)).toList();
    final therapyMap = {for (final t in scopedTherapies) t.id: t};

    final allMeds = await getAllMedications();
    final scopedMeds = allMeds.where((m) => selectedSet.has(m.therapyId)).toList();
    final medMap = {for (final m in scopedMeds) m.id: m};
    final scopedMedIds = medMap.keys.toSet();

    final logRows = await db.query(
      'dose_logs',
      where: 'scheduled_date >= ? AND scheduled_date <= ?',
      whereArgs: [startStr, endStr],
    );

    final Map<String, Map<String, DoseLog>> logsByDateAndId = {};
    final Map<String, List<DoseLog>> logsByMed = {};

    for (final row in logRows) {
      final log = DoseLog.fromMap(row);
      if (!selectedSet.has(log.therapyId) && !scopedMedIds.contains(log.medicationId)) continue;
      final th = therapyMap[log.therapyId];
      if (th != null && !th.isActive && log.status != DoseStatus.taken && log.status != DoseStatus.skipped) {
        continue;
      }
      logsByDateAndId.putIfAbsent(log.scheduledDate, () => {})[log.id] = log;
      logsByMed.putIfAbsent(log.medicationId, () => []).add(log);
    }

    final Map<String, int> scheduledMap = {for (final m in scopedMeds) m.id: 0};
    final Map<String, int> takenMap = {for (final m in scopedMeds) m.id: 0};
    final Map<String, int> skippedMap = {for (final m in scopedMeds) m.id: 0};
    final List<TherapyPdfDetailedLogRow> detailedLogs = [];

    final totalDays = endObj.difference(startObj).inDays.clamp(0, 400);
    for (int offset = 0; offset <= totalDays; offset++) {
      final dObj = startObj.add(Duration(days: offset));
      final dStr = formatLocalDate(dObj);
      final dayStored = logsByDateAndId[dStr] ?? const <String, DoseLog>{};
      final seenIds = <String>{};

      for (final log in dayStored.values) {
        seenIds.add(log.id);
        final med = medMap[log.medicationId];
        final th = therapyMap[log.therapyId];
        scheduledMap[log.medicationId] = (scheduledMap[log.medicationId] ?? 0) + 1;
        if (log.status == DoseStatus.taken) {
          takenMap[log.medicationId] = (takenMap[log.medicationId] ?? 0) + 1;
        } else if (log.status == DoseStatus.skipped) {
          skippedMap[log.medicationId] = (skippedMap[log.medicationId] ?? 0) + 1;
        }

        final snapRaw = (log.doseSnapshot != null && log.doseSnapshot!.trim().isNotEmpty)
            ? log.doseSnapshot!.trim()
            : (med?.doseAmount ?? '1');
        final snapType = MedicationType.fromString(log.typeSnapshot ?? med?.type.name ?? 'capsule');
        final snapDisplay = RegExp(r'[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]').hasMatch(snapRaw)
            ? snapRaw
            : '$snapRaw ${snapType.shortUnit}';

        String? takenHm;
        if (log.actualTakenTime != null) {
          final dt = log.actualTakenTime!;
          takenHm = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
        }

        detailedLogs.add(
          TherapyPdfDetailedLogRow(
            doseId: log.id,
            date: dStr,
            scheduledTime: log.scheduledTime,
            actualTakenTime: takenHm,
            medicationName: log.medicationNameSnapshot ?? med?.name ?? 'Lek',
            therapyName: th?.name ?? 'Terapia',
            doseSnapshot: snapDisplay,
            status: log.status,
            statusLabel: _doseStatusLabelPl(log.status),
            note: log.notes,
          ),
        );
      }

      for (final med in scopedMeds) {
        final th = therapyMap[med.therapyId];
        if (th == null || !th.isActive) continue;
        if (dStr.compareTo(formatLocalDate(med.startDate)) < 0) continue;
        if (med.endDate != null && dStr.compareTo(formatLocalDate(med.endDate!)) > 0) continue;

        final bool shouldSchedule =
            med.scheduleType == ScheduleType.daily ||
            med.scheduleType == ScheduleType.dateRange ||
            (med.scheduleType == ScheduleType.specificDays && med.selectedDays.contains(dObj.weekday));
        if (!shouldSchedule) continue;

        for (final time in med.times) {
          final doseId = '${med.id}_${dStr}_${time.replaceAll(':', '')}';
          if (seenIds.contains(doseId)) continue;
          seenIds.add(doseId);
          scheduledMap[med.id] = (scheduledMap[med.id] ?? 0) + 1;
          detailedLogs.add(
            TherapyPdfDetailedLogRow(
              doseId: doseId,
              date: dStr,
              scheduledTime: time,
              medicationName: med.name,
              therapyName: th.name,
              doseSnapshot: med.formatDose(),
              status: DoseStatus.pending,
              statusLabel: _doseStatusLabelPl(DoseStatus.pending),
            ),
          );
        }
      }
    }

    int totalScheduled = 0;
    int totalTaken = 0;
    int totalSkipped = 0;

    final therapySummaries = scopedTherapies.map((th) {
      final medsInTherapy = scopedMeds.where((m) => m.therapyId == th.id).toList();
      int thScheduled = 0;
      int thTaken = 0;
      int thSkipped = 0;

      final medRows = medsInTherapy.map((m) {
        final sc = scheduledMap[m.id] ?? 0;
        final tk = takenMap[m.id] ?? 0;
        final sk = skippedMap[m.id] ?? 0;
        thScheduled += sc;
        thTaken += tk;
        thSkipped += sk;
        return TherapyPdfMedicationRow(
          medicationId: m.id,
          name: m.name,
          currentDoseDisplay: m.formatDose(),
          timesDisplay: m.times.join(', '),
          instructions: m.instructions,
          scheduledCount: sc,
          takenCount: tk,
          skippedCount: sk,
          adherencePercentage: sc > 0 ? ((tk / sc) * 100).round() : null,
        );
      }).toList();

      totalScheduled += thScheduled;
      totalTaken += thTaken;
      totalSkipped += thSkipped;

      return TherapyPdfTherapySummary(
        therapyId: th.id,
        therapyName: th.name,
        profileName: th.profileName,
        isActive: th.isActive,
        therapyColor: th.colorHex,
        medications: medRows,
        totalScheduled: thScheduled,
        totalTaken: thTaken,
        totalSkipped: thSkipped,
        adherencePercentage: thScheduled > 0 ? ((thTaken / thScheduled) * 100).round() : null,
      );
    }).toList();

    final doseChanges = await getMedicationChanges(
      profileName: config.profileName,
      startDate: startStr,
      endDate: endStr,
      therapyIds: selectedSet,
    );

    final now = DateTime.now();
    final todayDate = DateTime(now.year, now.month, now.day);
    final stockItems = scopedMeds.map((med) {
      final th = therapyMap[med.therapyId];
      String statusLabel = 'OK';
      bool hasAlert = false;
      if (med.expiryDate != null) {
        final expDay = DateTime(med.expiryDate!.year, med.expiryDate!.month, med.expiryDate!.day);
        final diff = expDay.difference(todayDate).inDays;
        if (diff < 0) {
          statusLabel = 'Przeterminowany';
          hasAlert = true;
        } else if (diff <= 30) {
          statusLabel = 'Wygasa za $diff d';
          hasAlert = true;
        }
      }
      if (statusLabel == 'OK' && med.isLowStock) {
        statusLabel = 'Niski stan';
        hasAlert = true;
      }

      return TherapyPdfStockRow(
        medicationId: med.id,
        medicationName: med.name,
        therapyName: th?.name ?? 'Terapia',
        stockQuantity: med.stockQuantity,
        packageSize: med.packageSize,
        unit: med.type.shortUnit,
        estimatedDaysLeft: estimateStockDaysRemaining(med),
        expiryDate: med.expiryDate != null ? formatLocalDate(med.expiryDate!) : null,
        cabinetStatusLabel: statusLabel,
        hasAlert: hasAlert,
      );
    }).toList();

    detailedLogs.sort((a, b) {
      final d = a.date.compareTo(b.date);
      if (d != 0) return d;
      return a.scheduledTime.compareTo(b.scheduledTime);
    });

    return TherapyPdfReportData(
      generatedAt: DateTime.now(),
      profileName: config.profileName,
      patientLabel: config.profileName ?? 'Wszystkie profile',
      startDate: startStr,
      endDate: endStr,
      detailLevel: config.detailLevel,
      totalScheduled: totalScheduled,
      totalTaken: totalTaken,
      totalSkipped: totalSkipped,
      overallAdherencePercentage: totalScheduled > 0 ? ((totalTaken / totalScheduled) * 100).round() : null,
      therapySummaries: therapySummaries,
      doseChanges: doseChanges,
      stockItems: stockItems,
      detailedLogs: config.detailLevel == TherapyPdfDetailLevel.full ? detailedLogs : const [],
    );
  }

  String _scheduleTypeToCanonicalJson(ScheduleType type) {
    switch (type) {
      case ScheduleType.specificDays:
        return 'specific_days';
      case ScheduleType.dateRange:
        return 'date_range';
      case ScheduleType.daily:
        return 'daily';
    }
  }

  ScheduleType _parseScheduleTypeFromJson(dynamic raw) {
    final s = (raw ?? '').toString().trim();
    if (s == 'specific_days' || s == 'specificDays') return ScheduleType.specificDays;
    if (s == 'date_range' || s == 'dateRange') return ScheduleType.dateRange;
    return ScheduleType.daily;
  }

  String _extractPureDoseAmount(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return '1';
    final match = RegExp(r'^(\d+(?:[.,]\d+)?)').firstMatch(trimmed);
    return match != null ? match.group(1)! : trimmed;
  }

  /// Eksportuje pełną bazę w formacie JSON w 100% kompatybilnym z aplikacją webową MedPlaner
  /// (`profiles`, `therapies`, `medications`, `doseLogs`, `medicationChanges`).
  Future<String> exportBackupJsonString() async {
    final db = await database;
    final profiles = await getProfiles();
    final therapies = await getTherapies();
    final meds = await getAllMedications();
    final logRows = await db.query('dose_logs');
    final changeRows = await db.query('medication_changes', orderBy: 'changed_at ASC');

    final profileByNameLower = <String, UserProfile>{
      for (final p in profiles) p.name.trim().toLowerCase(): p,
    };
    final therapyById = <String, Therapy>{for (final t in therapies) t.id: t};
    final medById = <String, Medication>{for (final m in meds) m.id: m};

    String resolveProfileIdForName(String profileName) {
      final found = profileByNameLower[profileName.trim().toLowerCase()];
      if (found != null) return found.id;
      return profiles.isNotEmpty ? profiles.first.id : 'prof_self';
    }

    final jsonProfiles = profiles
        .map((p) => {
              'id': p.id,
              'name': p.name,
              'relation': p.isDefault ? 'Główny' : 'Rodzina',
              'avatarColor': p.colorHex,
              'colorHex': p.colorHex,
              'isDefault': p.isDefault,
              'createdAt': p.createdAt.toIso8601String(),
            })
        .toList();

    final jsonTherapies = therapies
        .map((t) => {
              'id': t.id,
              'name': t.name,
              'description': t.description,
              'color': t.colorHex,
              'icon': t.iconName,
              'profileId': resolveProfileIdForName(t.profileName),
              'profileName': t.profileName,
              'startDate': t.startDate != null ? formatLocalDate(t.startDate!) : null,
              'endDate': t.endDate != null ? formatLocalDate(t.endDate!) : null,
              'isActive': t.isActive,
              'createdAt': t.createdAt.toIso8601String(),
            })
        .toList();

    final jsonMeds = meds.map((m) {
      final parentTherapy = therapyById[m.therapyId];
      final profId = resolveProfileIdForName(parentTherapy?.profileName ?? 'Mój profil');
      return {
        'id': m.id,
        'therapyId': m.therapyId,
        'profileId': profId,
        'name': m.name,
        'type': m.type.name,
        'doseAmount': _extractPureDoseAmount(m.doseAmount),
        'instructions': m.instructions,
        'times': m.times,
        'scheduleType': _scheduleTypeToCanonicalJson(m.scheduleType),
        'selectedDays': m.selectedDays,
        'startDate': formatLocalDate(m.startDate),
        'endDate': m.endDate != null ? formatLocalDate(m.endDate!) : null,
        'stockQuantity': m.stockQuantity,
        'packageSize': m.packageSize,
        'lowStockThreshold': m.lowStockThreshold,
        'expiryDate': m.expiryDate != null ? formatLocalDate(m.expiryDate!) : null,
      };
    }).toList();

    final jsonDoseLogs = logRows.map((row) {
      final log = DoseLog.fromMap(row);
      final med = medById[log.medicationId];
      final therapy = therapyById[log.therapyId];
      final profId = resolveProfileIdForName(therapy?.profileName ?? 'Mój profil');

      String? takenHm;
      if (log.actualTakenTime != null) {
        final dt = log.actualTakenTime!;
        takenHm = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      }

      return {
        'id': log.id,
        'medicationId': log.medicationId,
        'therapyId': log.therapyId,
        'profileId': profId,
        'medicationName': log.medicationNameSnapshot ?? med?.name ?? 'Lek',
        'therapyName': therapy?.name ?? 'Terapia',
        'therapyColor': therapy?.colorHex ?? '#0F766E',
        'type': log.typeSnapshot ?? med?.type.name ?? 'capsule',
        'doseAmount': log.doseSnapshot ?? med?.doseAmount ?? '1',
        'instructions': med?.instructions,
        'date': log.scheduledDate,
        'time': log.scheduledTime,
        'status': log.status.name,
        'takenAt': takenHm,
        'actualTakenTime': log.actualTakenTime?.toIso8601String(),
        'snoozedUntil': log.snoozedUntil,
        'snoozeCount': log.snoozeCount,
        'note': log.notes,
      };
    }).toList();

    final jsonChanges = changeRows.map((row) {
      final c = MedicationChange.fromMap(row);
      return {
        'id': c.id,
        'medicationId': c.medicationId,
        'therapyId': c.therapyId,
        'profileId': resolveProfileIdForName(c.profileName),
        'profileName': c.profileName,
        'medicationName': c.medicationName,
        'changedAt': c.changedAt.toIso8601String(),
        'previousDose': c.previousDose,
        'newDose': c.newDose,
        'previousTimes': c.previousTimes,
        'newTimes': c.newTimes,
        'changeType': c.changeType,
        'changeReason': c.changeReason,
      };
    }).toList();

    final payload = {
      'app': 'MedPlaner',
      'version': 3,
      'exportedAt': DateTime.now().toIso8601String(),
      'profiles': jsonProfiles,
      'therapies': jsonTherapies,
      'medications': jsonMeds,
      'doseLogs': jsonDoseLogs,
      if (jsonChanges.isNotEmpty) 'medicationChanges': jsonChanges,
    };

    return const JsonEncoder.withIndent('  ').convert(payload);
  }

  /// Waliduje plik kopii JSON i zwraca liczbę rekordów przed wyborem Zastąp / Scal.
  JsonBackupPreview inspectBackupJsonString(String jsonStr) {
    final decoded = jsonDecode(jsonStr);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Nieprawidłowy format JSON — oczekiwano obiektu kopii MedPlaner.');
    }
    final therapies = decoded['therapies'];
    final meds = decoded['medications'];
    if (therapies is! List || meds is! List) {
      throw const FormatException('Plik nie zawiera wymaganych list terapii i leków.');
    }
    final profiles = decoded['profiles'] is List ? decoded['profiles'] as List : const [];
    final rawLogs = decoded['doseLogs'] is List
        ? decoded['doseLogs'] as List
        : (decoded['doses'] is List ? decoded['doses'] as List : const []);
    final rawChanges = decoded['medicationChanges'] is List
        ? decoded['medicationChanges'] as List
        : (decoded['medication_changes'] is List ? decoded['medication_changes'] as List : const []);

    return JsonBackupPreview(
      profilesCount: profiles.length,
      therapiesCount: therapies.length,
      medicationsCount: meds.length,
      doseLogsCount: rawLogs.length,
      medicationChangesCount: rawChanges.length,
    );
  }

  DateTime? _parseOptionalDate(dynamic raw) {
    if (raw == null) return null;
    final s = raw.toString().trim();
    if (s.isEmpty) return null;
    return DateTime.tryParse(s);
  }

  DateTime? _parseTakenDateTime(dynamic rawActual, dynamic rawTakenHm, String dateStr) {
    if (rawActual != null) {
      final parsed = DateTime.tryParse(rawActual.toString().trim());
      if (parsed != null) return parsed;
    }
    if (rawTakenHm != null) {
      final hm = rawTakenHm.toString().trim();
      if (RegExp(r'^\d{2}:\d{2}$').hasMatch(hm)) {
        return DateTime.tryParse('${dateStr}T$hm:00');
      }
      final parsed = DateTime.tryParse(hm);
      if (parsed != null) return parsed;
    }
    return null;
  }

  /// Importuje kopię JSON wyeksportowaną z Weba lub Fluttera z wyborem trybu:
  /// `replaceExisting = true` (Zastąp) albo `replaceExisting = false` (Scal).
  Future<JsonBackupPreview> importBackupJsonString(
    String jsonStr, {
    required bool replaceExisting,
  }) async {
    final decoded = jsonDecode(jsonStr);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Nieprawidłowy format JSON kopii zapasowej.');
    }
    final rawTherapies = decoded['therapies'];
    final rawMeds = decoded['medications'];
    if (rawTherapies is! List || rawMeds is! List) {
      throw const FormatException('Brak listy terapii lub leków w pliku JSON.');
    }

    final rawProfiles = decoded['profiles'] is List ? decoded['profiles'] as List : const [];
    final rawLogs = decoded['doseLogs'] is List
        ? decoded['doseLogs'] as List
        : (decoded['doses'] is List ? decoded['doses'] as List : const []);
    final rawChanges = decoded['medicationChanges'] is List
        ? decoded['medicationChanges'] as List
        : (decoded['medication_changes'] is List ? decoded['medication_changes'] as List : const []);

    final db = await database;

    await db.transaction((txn) async {
      if (replaceExisting) {
        await txn.delete('medication_changes');
        await txn.delete('dose_logs');
        await txn.delete('medications');
        await txn.delete('therapies');
        await txn.delete('profiles');
      }

      // 1. Przetwórz profile i zbuduj mapę ID / Nazwa -> docelowa nazwa profilu w SQLite
      final existingProfileRows = await txn.query('profiles');
      final existingById = <String, Map<String, dynamic>>{
        for (final r in existingProfileRows) r['id'] as String: r,
      };
      final existingByNameLower = <String, Map<String, dynamic>>{
        for (final r in existingProfileRows) (r['name'] as String).trim().toLowerCase(): r,
      };

      final Map<String, String> incomingProfileIdToName = {};

      for (int i = 0; i < rawProfiles.length; i++) {
        final item = rawProfiles[i];
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final id = (map['id']?.toString().trim().isNotEmpty == true)
            ? map['id'].toString().trim()
            : 'prof_${i + 1}';
        final name = (map['name']?.toString().trim().isNotEmpty == true)
            ? map['name'].toString().trim()
            : 'Mój profil';
        final colorHex = (map['avatarColor'] ?? map['colorHex'] ?? map['color_hex'] ?? '#0F766E').toString();
        final isDefault = (map['isDefault'] == true || map['is_default'] == 1 || map['relation'] == 'Główny');
        final createdAt = (map['createdAt'] ?? map['created_at'])?.toString() ?? DateTime.now().toIso8601String();
        final lowerName = name.toLowerCase();

        final matchedByName = existingByNameLower[lowerName];
        if (matchedByName != null) {
          final existingName = matchedByName['name'] as String;
          incomingProfileIdToName[id] = existingName;
          await txn.update(
            'profiles',
            {'color_hex': colorHex},
            where: 'id = ?',
            whereArgs: [matchedByName['id']],
          );
          continue;
        }

        final matchedById = existingById[id];
        if (matchedById != null) {
          final oldNameLower = (matchedById['name'] as String).trim().toLowerCase();
          existingByNameLower.remove(oldNameLower);
          final updatedRow = {
            'id': id,
            'name': name,
            'color_hex': colorHex,
            'is_default': isDefault ? 1 : 0,
            'created_at': createdAt,
          };
          await txn.update('profiles', updatedRow, where: 'id = ?', whereArgs: [id]);
          existingByNameLower[lowerName] = updatedRow;
          incomingProfileIdToName[id] = name;
          continue;
        }

        final newRow = {
          'id': id,
          'name': name,
          'color_hex': colorHex,
          'is_default': isDefault ? 1 : 0,
          'created_at': createdAt,
        };
        await txn.insert('profiles', newRow, conflictAlgorithm: ConflictAlgorithm.ignore);
        existingById[id] = newRow;
        existingByNameLower[lowerName] = newRow;
        incomingProfileIdToName[id] = name;
      }

      if (replaceExisting && existingById.isEmpty) {
        final now = DateTime.now().toIso8601String();
        await txn.insert('profiles', {
          'id': 'prof_self',
          'name': 'Mój profil',
          'color_hex': '#0F766E',
          'is_default': 1,
          'created_at': now,
        });
        incomingProfileIdToName['self'] = 'Mój profil';
      }

      // 2. Terapie
      final Set<String> importedTherapyIds = {};
      final Map<String, String> therapyIdToProfileName = {};
      for (int i = 0; i < rawTherapies.length; i++) {
        final item = rawTherapies[i];
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final id = (map['id']?.toString().trim().isNotEmpty == true)
            ? map['id'].toString().trim()
            : 'th_${i + 1}';
        final name = (map['name']?.toString().trim().isNotEmpty == true)
            ? map['name'].toString().trim()
            : 'Terapia';
        final rawProfId = (map['profileId'] ?? map['profile_id'])?.toString().trim();
        final rawProfName = (map['profileName'] ?? map['profile_name'])?.toString().trim();

        String resolvedProfileName = 'Mój profil';
        if (rawProfId != null && incomingProfileIdToName.containsKey(rawProfId)) {
          resolvedProfileName = incomingProfileIdToName[rawProfId]!;
        } else if (rawProfName != null && rawProfName.isNotEmpty) {
          final existingMatch = existingByNameLower[rawProfName.toLowerCase()];
          resolvedProfileName = existingMatch != null ? (existingMatch['name'] as String) : rawProfName;
        } else if (existingByNameLower.isNotEmpty) {
          resolvedProfileName = existingByNameLower.values.first['name'] as String;
        }

        final isActiveRaw = map['isActive'] ?? map['is_active'];
        final isActive = isActiveRaw is bool
            ? isActiveRaw
            : (isActiveRaw is num ? isActiveRaw != 0 : true);

        final therapy = Therapy(
          id: id,
          name: name,
          description: map['description']?.toString(),
          colorHex: (map['color'] ?? map['colorHex'] ?? map['color_hex'] ?? '#0F766E').toString(),
          iconName: (map['icon'] ?? map['iconName'] ?? map['icon_name'] ?? 'medical_services').toString(),
          profileName: resolvedProfileName,
          startDate: _parseOptionalDate(map['startDate'] ?? map['start_date']),
          endDate: _parseOptionalDate(map['endDate'] ?? map['end_date']),
          isActive: isActive,
          createdAt: _parseOptionalDate(map['createdAt'] ?? map['created_at']) ?? DateTime.now(),
        );

        await txn.insert('therapies', therapy.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
        importedTherapyIds.add(id);
        therapyIdToProfileName[id] = resolvedProfileName;
      }

      // 3. Leki
      final Map<String, String> medIdToTherapyId = {};
      for (int i = 0; i < rawMeds.length; i++) {
        final item = rawMeds[i];
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final id = (map['id']?.toString().trim().isNotEmpty == true)
            ? map['id'].toString().trim()
            : 'med_${i + 1}';
        final therapyId = (map['therapyId'] ?? map['therapy_id'])?.toString().trim() ??
            (importedTherapyIds.isNotEmpty ? importedTherapyIds.first : 'th_1');

        List<String> times = ['08:00'];
        final rawTimes = map['times'] ?? map['times_json'];
        if (rawTimes is List && rawTimes.isNotEmpty) {
          times = rawTimes.map((e) => e.toString()).toList();
        } else if (rawTimes is String) {
          try {
            final dec = jsonDecode(rawTimes);
            if (dec is List && dec.isNotEmpty) {
              times = dec.map((e) => e.toString()).toList();
            }
          } catch (_) {}
        }

        List<int> selectedDays = const [];
        final rawDays = map['selectedDays'] ?? map['selected_days'] ?? map['selected_days_json'];
        if (rawDays is List) {
          selectedDays = rawDays.map((e) => int.tryParse(e.toString()) ?? 0).where((d) => d >= 1 && d <= 7).toList();
        } else if (rawDays is String) {
          try {
            final dec = jsonDecode(rawDays);
            if (dec is List) {
              selectedDays = dec.map((e) => int.tryParse(e.toString()) ?? 0).where((d) => d >= 1 && d <= 7).toList();
            }
          } catch (_) {}
        }

        final med = Medication(
          id: id,
          therapyId: therapyId,
          name: (map['name']?.toString().trim().isNotEmpty == true) ? map['name'].toString().trim() : 'Lek',
          type: MedicationType.fromString((map['type'] ?? 'capsule').toString()),
          doseAmount: _extractPureDoseAmount((map['doseAmount'] ?? map['dose_amount'] ?? '1').toString()),
          instructions: map['instructions']?.toString(),
          times: times,
          scheduleType: _parseScheduleTypeFromJson(map['scheduleType'] ?? map['schedule_type']),
          selectedDays: selectedDays,
          startDate: _parseOptionalDate(map['startDate'] ?? map['start_date']) ?? DateTime.now(),
          endDate: _parseOptionalDate(map['endDate'] ?? map['end_date']),
          stockQuantity: ((map['stockQuantity'] ?? map['stock_quantity']) as num?)?.toDouble(),
          packageSize: ((map['packageSize'] ?? map['package_size']) as num?)?.toDouble(),
          lowStockThreshold: ((map['lowStockThreshold'] ?? map['low_stock_threshold']) as num?)?.toDouble() ?? 5.0,
          expiryDate: _parseOptionalDate(map['expiryDate'] ?? map['expiry_date']),
        );

        await txn.insert('medications', med.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
        medIdToTherapyId[id] = therapyId;
      }

      // 4. Historia dawek (doseLogs / doses)
      for (int i = 0; i < rawLogs.length; i++) {
        final item = rawLogs[i];
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final medId = (map['medicationId'] ?? map['medication_id'] ?? '').toString().trim();
        if (medId.isEmpty) continue;
        final therapyId = (map['therapyId'] ?? map['therapy_id'] ?? medIdToTherapyId[medId] ?? '').toString().trim();
        if (therapyId.isEmpty) continue;

        final rawDate = (map['date'] ?? map['scheduledDate'] ?? map['scheduled_date'] ?? formatLocalDate(DateTime.now())).toString();
        final dateStr = rawDate.length >= 10 ? rawDate.substring(0, 10) : formatLocalDate(DateTime.now());
        final timeStr = (map['time'] ?? map['scheduledTime'] ?? map['scheduled_time'] ?? '08:00').toString();
        final id = (map['id']?.toString().trim().isNotEmpty == true)
            ? map['id'].toString().trim()
            : '${medId}_${dateStr}_${timeStr.replaceAll(':', '')}';

        final status = DoseStatus.fromString((map['status'] ?? 'pending').toString());
        final actualTaken = _parseTakenDateTime(
          map['actualTakenTime'] ?? map['actual_taken_time'],
          map['takenAt'],
          dateStr,
        );

        final doseSnapshot = (status == DoseStatus.taken || status == DoseStatus.skipped)
            ? (map['doseSnapshot'] ?? map['dose_snapshot'] ?? map['doseAmount'] ?? map['dose_amount'])?.toString()
            : null;
        final typeSnapshot = (status == DoseStatus.taken || status == DoseStatus.skipped)
            ? (map['typeSnapshot'] ?? map['type_snapshot'] ?? map['type'] ?? map['medication_type'])?.toString()
            : null;
        final nameSnapshot = (status == DoseStatus.taken || status == DoseStatus.skipped)
            ? (map['medicationNameSnapshot'] ?? map['medication_name_snapshot'] ?? map['medicationName'] ?? map['medication_name'])?.toString()
            : null;

        final log = DoseLog(
          id: id,
          medicationId: medId,
          therapyId: therapyId,
          scheduledDate: dateStr,
          scheduledTime: timeStr,
          actualTakenTime: actualTaken,
          status: status,
          snoozedUntil: (map['snoozedUntil'] ?? map['snoozed_until'])?.toString(),
          snoozeCount: ((map['snoozeCount'] ?? map['snooze_count']) as num?)?.toInt() ?? 0,
          notes: (map['note'] ?? map['notes'])?.toString(),
          doseSnapshot: doseSnapshot,
          typeSnapshot: typeSnapshot,
          medicationNameSnapshot: nameSnapshot,
        );

        await txn.insert('dose_logs', log.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      }

      // 5. Historia zmian dawek (medicationChanges)
      for (int i = 0; i < rawChanges.length; i++) {
        final item = rawChanges[i];
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final id = (map['id']?.toString().trim().isNotEmpty == true)
            ? map['id'].toString().trim()
            : 'chg_${i + 1}';
        final medId = (map['medicationId'] ?? map['medication_id'] ?? '').toString().trim();
        final therapyId = (map['therapyId'] ?? map['therapy_id'] ?? medIdToTherapyId[medId] ?? '').toString().trim();
        final rawProfId = (map['profileId'] ?? map['profile_id'])?.toString().trim();
        final rawProfName = (map['profileName'] ?? map['profile_name'])?.toString().trim();

        String resolvedProfile = therapyIdToProfileName[therapyId] ?? 'Mój profil';
        if (rawProfId != null && incomingProfileIdToName.containsKey(rawProfId)) {
          resolvedProfile = incomingProfileIdToName[rawProfId]!;
        } else if (rawProfName != null && rawProfName.isNotEmpty) {
          resolvedProfile = rawProfName;
        }

        List<String> parseList(dynamic raw) {
          if (raw is List) return raw.map((e) => e.toString()).toList();
          if (raw is String && raw.trim().isNotEmpty) {
            try {
              final d = jsonDecode(raw);
              if (d is List) return d.map((e) => e.toString()).toList();
            } catch (_) {}
          }
          return const [];
        }

        final change = MedicationChange(
          id: id,
          medicationId: medId,
          therapyId: therapyId,
          profileName: resolvedProfile,
          medicationName: (map['medicationName'] ?? map['medication_name'] ?? 'Lek').toString(),
          changedAt: _parseOptionalDate(map['changedAt'] ?? map['changed_at']) ?? DateTime.now(),
          previousDose: (map['previousDose'] ?? map['previous_dose'] ?? '').toString(),
          newDose: (map['newDose'] ?? map['new_dose'] ?? '').toString(),
          previousTimes: parseList(map['previousTimes'] ?? map['previous_times_json']),
          newTimes: parseList(map['newTimes'] ?? map['new_times_json']),
          changeType: (map['changeType'] ?? map['change_type'] ?? 'dose_change').toString(),
          changeReason: (map['changeReason'] ?? map['change_reason'])?.toString(),
        );

        await txn.insert('medication_changes', change.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });

    await _ensureProfilesReady(db);
    if (replaceExisting) {
      selectedProfileNotifier.value = null;
    }
    await NotificationService.instance.rescheduleAllUpcomingDoses();
    notifyDataChanged();

    return JsonBackupPreview(
      profilesCount: rawProfiles.length,
      therapiesCount: rawTherapies.length,
      medicationsCount: rawMeds.length,
      doseLogsCount: rawLogs.length,
      medicationChangesCount: rawChanges.length,
    );
  }
}
