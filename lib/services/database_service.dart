import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../models/dose_log.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._internal();
  DatabaseService._internal();

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'medplaner.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE therapies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            color_hex TEXT NOT NULL,
            icon_name TEXT NOT NULL,
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
    );
  }

  Future<void> insertTherapy(Therapy therapy) async {
    final db = await database;
    await db.insert('therapies', therapy.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
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
  }
}
