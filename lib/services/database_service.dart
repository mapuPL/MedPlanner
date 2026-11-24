import 'dart:io';
import 'dart:typed_data';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../models/dose_log.dart';
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

class DatabaseService {
  static final DatabaseService instance = DatabaseService._internal();
  DatabaseService._internal();

  static const String databaseFileName = 'medications_catalog.db';
  static const String backupFileName = 'medplaner-backup.db';
  static Database? _database;

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
    await NotificationService.instance.rescheduleAllUpcomingDoses();
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
      version: 2,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE therapies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            color_hex TEXT NOT NULL,
            icon_name TEXT NOT NULL,
            profile_name TEXT DEFAULT 'Mój profil',
            start_date TEXT NOT NULL,
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
            FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE,
            FOREIGN KEY (therapy_id) REFERENCES therapies (id) ON DELETE CASCADE
          )
        ''');

        await db.execute('CREATE INDEX idx_dose_logs_date ON dose_logs (scheduled_date)');
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        await _ensureSchemaColumns(db);
      },
      onOpen: (db) async {
        // Zapewnia bezbłędne działanie nawet po przywróceniu starszej kopii v1 z pliku .db
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
  }

  Future<void> insertTherapy(Therapy therapy) async {
    final db = await database;
    await db.insert('therapies', therapy.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> updateTherapy(Therapy therapy) async {
    final db = await database;
    await db.update(
      'therapies',
      therapy.toMap(),
      where: 'id = ?',
      whereArgs: [therapy.id],
    );
  }

  Future<void> deleteTherapy(String id) async {
    final db = await database;
    await db.delete('therapies', where: 'id = ?', whereArgs: [id]);
    await db.delete('medications', where: 'therapy_id = ?', whereArgs: [id]);
    await db.delete('dose_logs', where: 'therapy_id = ?', whereArgs: [id]);
    await NotificationService.instance.rescheduleAllUpcomingDoses();
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
  }

  Future<void> updateMedicationStock(String medicationId, double newStock, {DateTime? expiryDate}) async {
    final db = await database;
    final data = <String, dynamic>{'stock_quantity': newStock};
    if (expiryDate != null) {
      data['expiry_date'] = expiryDate.toIso8601String().substring(0, 10);
    }
    await db.update('medications', data, where: 'id = ?', whereArgs: [medicationId]);
  }

  Future<void> deleteMedication(String id) async {
    final db = await database;
    await db.delete('medications', where: 'id = ?', whereArgs: [id]);
    await db.delete('dose_logs', where: 'medication_id = ?', whereArgs: [id]);
    await NotificationService.instance.rescheduleAllUpcomingDoses();
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
    final dateStr = date.toIso8601String().substring(0, 10);

    await _ensureDosesGeneratedForDate(date);

    final result = await db.rawQuery('''
      SELECT dl.*, 
             m.name AS medication_name, 
             m.dose_amount, 
             m.type AS medication_type,
             t.name AS therapy_name, 
             t.color_hex AS therapy_color_hex
      FROM dose_logs dl
      JOIN medications m ON dl.medication_id = m.id
      JOIN therapies t ON dl.therapy_id = t.id
      WHERE dl.scheduled_date = ?
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
    final dateStr = date.toIso8601String().substring(0, 10);

    final existingCount = Sqflite.firstIntValue(await db.rawQuery(
      'SELECT COUNT(*) FROM dose_logs WHERE scheduled_date = ?',
      [dateStr],
    ));

    if ((existingCount ?? 0) > 0) return;

    final allMeds = await getAllMedications();
    final batch = db.batch();
    final isoWeekday = date.weekday;

    for (final med in allMeds) {
      if (dateStr.compareTo(med.startDate.toIso8601String().substring(0, 10)) < 0) continue;
      if (med.endDate != null && dateStr.compareTo(med.endDate!.toIso8601String().substring(0, 10)) > 0) continue;

      bool shouldSchedule = false;
      if (med.scheduleType == ScheduleType.daily || med.scheduleType == ScheduleType.dateRange) {
        shouldSchedule = true;
      } else if (med.scheduleType == ScheduleType.specificDays) {
        if (med.selectedDays.contains(isoWeekday)) shouldSchedule = true;
      }

      if (shouldSchedule) {
        for (final time in med.times) {
          final doseId = '${med.id}_${dateStr}_${time.replaceAll(':', '')}';
          batch.insert('dose_logs', {
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
          });
        }
      }
    }

    await batch.commit(noResult: true);
  }

  Future<void> markDoseAsTaken(String doseId) async {
    final db = await database;
    final doseRows = await db.query('dose_logs', where: 'id = ?', whereArgs: [doseId], limit: 1);

    await db.update(
      'dose_logs',
      {
        'status': DoseStatus.taken.name,
        'actual_taken_time': DateTime.now().toIso8601String(),
        'snoozed_until': null,
      },
      where: 'id = ?',
      whereArgs: [doseId],
    );

    // Automatyczne odjęcie przyjętej dawki z domowej apteczki (stock_quantity)
    if (doseRows.isNotEmpty) {
      final medId = doseRows.first['medication_id'] as String?;
      final prevStatus = doseRows.first['status'] as String?;
      if (medId != null && prevStatus != DoseStatus.taken.name) {
        final medRows = await db.query('medications', where: 'id = ?', whereArgs: [medId], limit: 1);
        if (medRows.isNotEmpty) {
          final currentStock = (medRows.first['stock_quantity'] as num?)?.toDouble();
          if (currentStock != null && currentStock > 0) {
            final doseStr = (medRows.first['dose_amount'] as String?) ?? '1';
            final match = RegExp(r'(\d+(?:[.,]\d+)?)').firstMatch(doseStr);
            final parsedAmount = match != null ? (double.tryParse(match.group(1)!.replaceAll(',', '.')) ?? 1.0) : 1.0;
            final nextStock = (currentStock - parsedAmount).clamp(0.0, 99999.0);
            await db.update('medications', {'stock_quantity': nextStock}, where: 'id = ?', whereArgs: [medId]);
          }
        }
      }
    }

    await NotificationService.instance.cancelNotificationForDose(doseId);
  }

  Future<void> snoozeDose(String doseId, int minutes) async {
    final db = await database;
    final now = DateTime.now().add(Duration(minutes: minutes));
    final snoozedTimeString = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    await db.rawUpdate('''
      UPDATE dose_logs 
      SET status = ?, snoozed_until = ?, snooze_count = snooze_count + 1 
      WHERE id = ?
    ''', [DoseStatus.snoozed.name, snoozedTimeString, doseId]);
    await NotificationService.instance.scheduleSnoozeNotification(
      doseId: doseId,
      title: '⏰ Odroczone przypomnienie o leku',
      body: 'Czas zażyć dawkę!',
      minutes: minutes,
    );
  }
}
