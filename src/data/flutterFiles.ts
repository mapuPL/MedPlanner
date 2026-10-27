export interface FlutterFile {
  path: string;
  name: string;
  category: 'config' | 'model' | 'service' | 'screen' | 'widget' | 'main';
  language: 'yaml' | 'xml' | 'groovy' | 'dart' | 'markdown';
  content: string;
  description: string;
}

export const FLUTTER_PROJECT_FILES: FlutterFile[] = [
  {
    path: '.github/workflows/build.yml',
    name: 'build.yml',
    category: 'config',
    language: 'yaml',
    description: 'Automatyczne budowanie pliku APK i publikacja artefaktu przy każdym pushu na GitHub Actions',
    content: `name: Build Flutter APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch: # Pozwala na reczne uruchomienie z zakladki Actions w GitHub

jobs:
  build-apk:
    name: Build Android APK
    runs-on: ubuntu-latest

    steps:
      - name: Pobierz kod repozytorium (Checkout)
        uses: actions/checkout@v4

      - name: Konfiguracja Java (JDK 17)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Konfiguracja Flutter SDK
        uses: subosito/flutter-action@v2
        with:
          channel: 'stable'

      - name: Weryfikacja struktury Androida
        run: |
          if [ ! -f "android/build.gradle" ] || [ ! -f "android/settings.gradle" ]; then
            echo "Inicjalizacja otoczki platformy Android..."
            flutter create . --platforms=android --org=com.example --project-name=medplaner
          fi

      - name: Pobranie zaleznosci (pub get)
        run: flutter pub get

      - name: Budowanie pliku APK Release
        run: flutter build apk --release

      - name: Zapisz plik APK jako artefakt do pobrania
        uses: actions/upload-artifact@v4
        with:
          name: medplaner-app-release-apk
          path: build/app/outputs/flutter-apk/app-release.apk
          if-no-files-found: error
          retention-days: 30
`,
  },
  {
    path: 'pubspec.yaml',
    name: 'pubspec.yaml',
    category: 'config',
    language: 'yaml',
    description: 'Konfiguracja pakietów Flutter, sqflite, flutter_local_notifications i timezone',
    content: `name: medplaner
description: "Aplikacja do zarzadzania terapiami medycznymi i elastycznym dawkowaniem lekow"
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_local_notifications: ^17.2.3
  timezone: ^0.9.4
  flutter_timezone: ^3.0.1
  sqflite: ^2.4.1
  path: ^1.9.0
  intl: ^0.19.0
  uuid: ^4.5.1
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
`,
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'config',
    language: 'xml',
    description: 'Uprawnienia do dokładnych alarmów (SCHEDULE_EXACT_ALARM), powiadomień w tle i boot receiver',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.medplaner">

    <!-- Uprawnienia do powiadomień i dokładnych alarmów -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
    <uses-permission android:name="android.permission.USE_EXACT_ALARM"/>

    <application
        android:label="MedPlaner"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>

        <!-- Odbiornik powiadomień w tle dla flutter_local_notifications -->
        <receiver 
            android:exported="false" 
            android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver" />
        <receiver 
            android:exported="false" 
            android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED"/>
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`,
  },
  {
    path: 'android/app/build.gradle',
    name: 'build.gradle',
    category: 'config',
    language: 'groovy',
    description: 'Konfiguracja Android Gradle z włączonym Core Library Desugaring dla stref czasowych',
    content: `plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}

def localProperties = new Properties()
def localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {
    localPropertiesFile.withReader('UTF-8') { reader ->
        localProperties.load(reader)
    }
}

def flutterVersionCode = localProperties.getProperty('flutter.versionCode')
if (flutterVersionCode == null) {
    flutterVersionCode = '1'
}

def flutterVersionName = localProperties.getProperty('flutter.versionName')
if (flutterVersionName == null) {
    flutterVersionName = '1.0'
}

android {
    namespace "com.example.medplaner"
    compileSdkVersion 36
    ndkVersion flutter.ndkVersion

    compileOptions {
        coreLibraryDesugaringEnabled true
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }

    defaultConfig {
        applicationId "com.example.medplaner"
        minSdkVersion 21
        targetSdkVersion 36
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
        multiDexEnabled true
    }

    buildTypes {
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
            shrinkResources false
        }
    }
}

flutter {
    source '../..'
}

dependencies {
    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.0.4'
}
`,
  },
  {
    path: 'lib/models/therapy.dart',
    name: 'therapy.dart',
    category: 'model',
    language: 'dart',
    description: 'Model danych Terapii (np. Terapia antybiotykowa, Krople, Leki codzienne)',
    content: `class Therapy {
  final String id;
  final String name;
  final String? description;
  final String colorHex;
  final String iconName;
  final DateTime startDate;
  final DateTime? endDate;
  final bool isActive;
  final DateTime createdAt;

  Therapy({
    required this.id,
    required this.name,
    this.description,
    this.colorHex = '#10B981',
    this.iconName = 'medical_services',
    required this.startDate,
    this.endDate,
    this.isActive = true,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'color_hex': colorHex,
      'icon_name': iconName,
      'start_date': startDate.toIso8601String().substring(0, 10),
      'end_date': endDate?.toIso8601String().substring(0, 10),
      'is_active': isActive ? 1 : 0,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory Therapy.fromMap(Map<String, dynamic> map) {
    return Therapy(
      id: map['id'] as String,
      name: map['name'] as String,
      description: map['description'] as String?,
      colorHex: (map['color_hex'] as String?) ?? '#10B981',
      iconName: (map['icon_name'] as String?) ?? 'medical_services',
      startDate: DateTime.parse(map['start_date'] as String),
      endDate: map['end_date'] != null ? DateTime.parse(map['end_date'] as String) : null,
      isActive: (map['is_active'] as int) == 1,
      createdAt: DateTime.parse(map['created_at'] as String),
    );
  }

  Therapy copyWith({
    String? id,
    String? name,
    String? description,
    String? colorHex,
    String? iconName,
    DateTime? startDate,
    DateTime? endDate,
    bool? isActive,
    DateTime? createdAt,
  }) {
    return Therapy(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      colorHex: colorHex ?? this.colorHex,
      iconName: iconName ?? this.iconName,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
`,
  },
  {
    path: 'lib/models/medication.dart',
    name: 'medication.dart',
    category: 'model',
    language: 'dart',
    description: 'Model leku z typami (Kapsułka, Krople, ml, Wziew, Aplikacja, Inne) i elastycznymi porami',
    content: `import 'dart:convert';

enum MedicationType {
  capsule,     // Kapsułka / Tabletka
  drops,       // Krople
  ml,          // ml
  inhaler,     // Wziew
  application, // Aplikacja
  other;       // Inne

  String get displayName {
    switch (this) {
      case MedicationType.capsule:
        return 'Kapsułka / Tabletka';
      case MedicationType.drops:
        return 'Krople';
      case MedicationType.ml:
        return 'ml (płyn / syrop)';
      case MedicationType.inhaler:
        return 'Wziew';
      case MedicationType.application:
        return 'Aplikacja (maść / aerozol)';
      case MedicationType.other:
        return 'Inne';
    }
  }

  String get shortUnit {
    switch (this) {
      case MedicationType.capsule:
        return 'tabl.';
      case MedicationType.drops:
        return 'kropli';
      case MedicationType.ml:
        return 'ml';
      case MedicationType.inhaler:
        return 'wziew';
      case MedicationType.application:
        return 'aplik.';
      case MedicationType.other:
        return 'dawka';
    }
  }

  static MedicationType fromString(String val) {
    return MedicationType.values.firstWhere(
      (e) => e.name == val,
      orElse: () => MedicationType.capsule,
    );
  }
}

enum ScheduleType {
  daily,        // Codziennie
  specificDays, // Wybrane dni tygodnia
  dateRange;    // Określony przedział dat

  String get displayName {
    switch (this) {
      case ScheduleType.daily:
        return 'Codziennie';
      case ScheduleType.specificDays:
        return 'Wybrane dni tygodnia';
      case ScheduleType.dateRange:
        return 'Określony przedział dat';
    }
  }

  static ScheduleType fromString(String val) {
    return ScheduleType.values.firstWhere(
      (e) => e.name == val,
      orElse: () => ScheduleType.daily,
    );
  }
}

class Medication {
  final String id;
  final String therapyId;
  final String name;
  final MedicationType type;
  final String doseAmount; // np. "1", "5", "2.5"
  final String? instructions; // np. "Po posiłku", "Na czczo"
  final List<String> times; // ["07:30", "15:15", "21:00"]
  final ScheduleType scheduleType;
  final List<int> selectedDays; // [1, 3, 5] (1=Pn, 7=Nd)
  final DateTime startDate;
  final DateTime? endDate;

  Medication({
    required this.id,
    required this.therapyId,
    required this.name,
    required this.type,
    required this.doseAmount,
    this.instructions,
    required this.times,
    required this.scheduleType,
    this.selectedDays = const [],
    required this.startDate,
    this.endDate,
  });

  String formatDose() {
    return '\$doseAmount \${type.shortUnit}';
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'therapy_id': therapyId,
      'name': name,
      'type': type.name,
      'dose_amount': doseAmount,
      'instructions': instructions,
      'times_json': jsonEncode(times),
      'schedule_type': scheduleType.name,
      'selected_days_json': jsonEncode(selectedDays),
      'start_date': startDate.toIso8601String().substring(0, 10),
      'end_date': endDate?.toIso8601String().substring(0, 10),
    };
  }

  factory Medication.fromMap(Map<String, dynamic> map) {
    List<String> parsedTimes = [];
    if (map['times_json'] != null) {
      try {
        parsedTimes = List<String>.from(jsonDecode(map['times_json'] as String));
      } catch (_) {}
    }

    List<int> parsedDays = [];
    if (map['selected_days_json'] != null) {
      try {
        parsedDays = List<int>.from(jsonDecode(map['selected_days_json'] as String));
      } catch (_) {}
    }

    return Medication(
      id: map['id'] as String,
      therapyId: map['therapy_id'] as String,
      name: map['name'] as String,
      type: MedicationType.fromString(map['type'] as String),
      doseAmount: (map['dose_amount'] as String?) ?? '1',
      instructions: map['instructions'] as String?,
      times: parsedTimes,
      scheduleType: ScheduleType.fromString(map['schedule_type'] as String),
      selectedDays: parsedDays,
      startDate: DateTime.parse(map['start_date'] as String),
      endDate: map['end_date'] != null ? DateTime.parse(map['end_date'] as String) : null,
    );
  }
}
`,
  },
  {
    path: 'lib/models/dose_log.dart',
    name: 'dose_log.dart',
    category: 'model',
    language: 'dart',
    description: 'Model pojedynczej dawki leku ze statusem (Oczekuje, Wzięte, Odroczone, Pominięte)',
    content: `enum DoseStatus {
  pending,  // Oczekuje
  taken,    // Wzięte
  snoozed,  // Odroczone
  skipped;  // Pominięte

  String get displayName {
    switch (this) {
      case DoseStatus.pending:
        return 'Oczekuje';
      case DoseStatus.taken:
        return 'Wzięte';
      case DoseStatus.snoozed:
        return 'Odroczone';
      case DoseStatus.skipped:
        return 'Pominięte';
    }
  }

  static DoseStatus fromString(String val) {
    return DoseStatus.values.firstWhere(
      (e) => e.name == val,
      orElse: () => DoseStatus.pending,
    );
  }
}

class DoseLog {
  final String id;
  final String medicationId;
  final String therapyId;
  final String scheduledDate; // YYYY-MM-DD
  final String scheduledTime; // HH:mm
  final DateTime? actualTakenTime;
  final DoseStatus status;
  final String? snoozedUntil; // HH:mm
  final int snoozeCount;
  final String? notes;

  // Pola pomocnicze do prezentacji (z joinów z tabelami medications i therapies)
  final String? medicationName;
  final String? therapyName;
  final String? doseAmount;
  final String? medicationType;
  final String? therapyColorHex;

  DoseLog({
    required this.id,
    required this.medicationId,
    required this.therapyId,
    required this.scheduledDate,
    required this.scheduledTime,
    this.actualTakenTime,
    this.status = DoseStatus.pending,
    this.snoozedUntil,
    this.snoozeCount = 0,
    this.notes,
    this.medicationName,
    this.therapyName,
    this.doseAmount,
    this.medicationType,
    this.therapyColorHex,
  });

  String get effectiveTime => (status == DoseStatus.snoozed && snoozedUntil != null) ? snoozedUntil! : scheduledTime;

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'medication_id': medicationId,
      'therapy_id': therapyId,
      'scheduled_date': scheduledDate,
      'scheduled_time': scheduledTime,
      'actual_taken_time': actualTakenTime?.toIso8601String(),
      'status': status.name,
      'snoozed_until': snoozedUntil,
      'snooze_count': snoozeCount,
      'notes': notes,
    };
  }

  factory DoseLog.fromMap(Map<String, dynamic> map) {
    return DoseLog(
      id: map['id'] as String,
      medicationId: map['medication_id'] as String,
      therapyId: map['therapy_id'] as String,
      scheduledDate: map['scheduled_date'] as String,
      scheduledTime: map['scheduled_time'] as String,
      actualTakenTime: map['actual_taken_time'] != null
          ? DateTime.parse(map['actual_taken_time'] as String)
          : null,
      status: DoseStatus.fromString(map['status'] as String),
      snoozedUntil: map['snoozed_until'] as String?,
      snoozeCount: (map['snooze_count'] as int?) ?? 0,
      notes: map['notes'] as String?,
      medicationName: map['medication_name'] as String?,
      therapyName: map['therapy_name'] as String?,
      doseAmount: map['dose_amount'] as String?,
      medicationType: map['medication_type'] as String?,
      therapyColorHex: map['therapy_color_hex'] as String?,
    );
  }

  DoseLog copyWith({
    String? id,
    String? medicationId,
    String? therapyId,
    String? scheduledDate,
    String? scheduledTime,
    DateTime? actualTakenTime,
    DoseStatus? status,
    String? snoozedUntil,
    int? snoozeCount,
    String? notes,
  }) {
    return DoseLog(
      id: id ?? this.id,
      medicationId: medicationId ?? this.medicationId,
      therapyId: therapyId ?? this.therapyId,
      scheduledDate: scheduledDate ?? this.scheduledDate,
      scheduledTime: scheduledTime ?? this.scheduledTime,
      actualTakenTime: actualTakenTime ?? this.actualTakenTime,
      status: status ?? this.status,
      snoozedUntil: snoozedUntil ?? this.snoozedUntil,
      snoozeCount: snoozeCount ?? this.snoozeCount,
      notes: notes ?? this.notes,
      medicationName: medicationName,
      therapyName: therapyName,
      doseAmount: doseAmount,
      medicationType: medicationType,
      therapyColorHex: therapyColorHex,
    );
  }
}
`,
  },
  {
    path: 'lib/services/database_service.dart',
    name: 'database_service.dart',
    category: 'service',
    language: 'dart',
    description: 'Lokalna baza SQLite (sqflite) w 100% offline do zapisu terapii, leków i rejestru dawek',
    content: `import 'package:sqflite/sqflite.dart';
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

        // Indeksy dla szybkiego wyszukiwania wg daty
        await db.execute('CREATE INDEX idx_dose_logs_date ON dose_logs (scheduled_date)');
      },
    );
  }

  // --- TERAPIE ---
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

  Future<Therapy?> getTherapy(String id) async {
    final db = await database;
    final maps = await db.query('therapies', where: 'id = ?', whereArgs: [id], limit: 1);
    if (maps.isNotEmpty) return Therapy.fromMap(maps.first);
    return null;
  }

  Future<void> deleteTherapy(String id) async {
    final db = await database;
    await db.delete('therapies', where: 'id = ?', whereArgs: [id]);
    await db.delete('medications', where: 'therapy_id = ?', whereArgs: [id]);
    await db.delete('dose_logs', where: 'therapy_id = ?', whereArgs: [id]);
  }

  // --- LEKI ---
  Future<void> insertMedication(Medication medication) async {
    final db = await database;
    await db.insert('medications', medication.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
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

  Future<void> deleteMedication(String id) async {
    final db = await database;
    await db.delete('medications', where: 'id = ?', whereArgs: [id]);
    await db.delete('dose_logs', where: 'medication_id = ?', whereArgs: [id]);
  }

  // --- GENEROWANIE I POBIERANIE DAWEK NA DANY DZIEŃ ---
  Future<List<DoseLog>> getDosesForDate(DateTime date) async {
    final db = await database;
    final dateStr = date.toIso8601String().substring(0, 10);

    // 1. Upewnij się, że dawki na ten dzień zostały wygenerowane
    await _ensureDosesGeneratedForDate(date);

    // 2. Pobierz dawki wraz z nazwami leku i terapii
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

    if ((existingCount ?? 0) > 0) return; // Już wygenerowane

    // Pobierz wszystkie leki i sprawdź, które przypadają na ten dzień
    final allMeds = await getAllMedications();
    final batch = db.batch();

    final isoWeekday = date.weekday; // 1=Mon, 7=Sun

    for (final med in allMeds) {
      if (dateStr.compareTo(med.startDate.toIso8601String().substring(0, 10)) < 0) continue;
      if (med.endDate != null && dateStr.compareTo(med.endDate!.toIso8601String().substring(0, 10)) > 0) continue;

      bool shouldSchedule = false;
      if (med.scheduleType == ScheduleType.daily || med.scheduleType == ScheduleType.dateRange) {
        shouldSchedule = true;
      } else if (med.scheduleType == ScheduleType.specificDays) {
        if (med.selectedDays.contains(isoWeekday)) {
          shouldSchedule = true;
        }
      }

      if (shouldSchedule) {
        for (final time in med.times) {
          final doseId = '\${med.id}_\${dateStr}_\${time.replaceAll(':', '')}';
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

  // Akcje: Wziąłem, Odłóż, Pomiń
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
    final snoozedTimeString = '\${now.hour.toString().padLeft(2, '0')}:\${now.minute.toString().padLeft(2, '0')}';

    await db.rawUpdate('''
      UPDATE dose_logs 
      SET status = ?, snoozed_until = ?, snooze_count = snooze_count + 1 
      WHERE id = ?
    ''', [DoseStatus.snoozed.name, snoozedTimeString, doseId]);
  }

  Future<void> skipDose(String doseId) async {
    final db = await database;
    await db.update(
      'dose_logs',
      {'status': DoseStatus.skipped.name},
      where: 'id = ?',
      whereArgs: [doseId],
    );
  }
}
`,
  },
  {
    path: 'lib/services/notification_service.dart',
    name: 'notification_service.dart',
    category: 'service',
    language: 'dart',
    description: 'System powiadomień flutter_local_notifications z dokładnymi alarmami i akcjami Wziąłem / Odłóż',
    content: `import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:flutter_timezone/flutter_timezone.dart';
import 'database_service.dart';

class NotificationService {
  static final NotificationService instance = NotificationService._internal();
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  static const String channelId = 'medication_reminders_exact';
  static const String channelName = 'Przypomnienia o Lekach';
  static const String channelDesc = 'Dokładne alarmy o porach zażywania leków';

  // ID akcji przycisków w powiadomieniu
  static const String actionTake = 'ACTION_TAKE';
  static const String actionSnooze5 = 'ACTION_SNOOZE_5';
  static const String actionSnooze15 = 'ACTION_SNOOZE_15';
  static const String actionSnooze30 = 'ACTION_SNOOZE_30';

  Future<void> initialize({Function(String doseId)? onDoseTaken}) async {
    tz.initializeTimeZones();
    try {
      final String timeZoneName = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(timeZoneName));
    } catch (_) {
      tz.setLocalLocation(tz.getLocation('Europe/Warsaw'));
    }

    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    final InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
    );

    await _notificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) async {
        final payload = response.payload;
        if (payload == null) return;

        if (response.actionId == actionTake) {
          // Użytkownik kliknął "Wziąłem" bezpośrednio na powiadomieniu!
          await DatabaseService.instance.markDoseAsTaken(payload);
          if (onDoseTaken != null) onDoseTaken(payload);
        } else if (response.actionId == actionSnooze5) {
          await DatabaseService.instance.snoozeDose(payload, 5);
          scheduleSnoozeNotification(doseId: payload, title: 'Odroczony lek', body: 'Czas przyjąć lek!', minutes: 5);
        } else if (response.actionId == actionSnooze15) {
          await DatabaseService.instance.snoozeDose(payload, 15);
          scheduleSnoozeNotification(doseId: payload, title: 'Odroczony lek', body: 'Czas przyjąć lek!', minutes: 15);
        } else if (response.actionId == actionSnooze30) {
          await DatabaseService.instance.snoozeDose(payload, 30);
          scheduleSnoozeNotification(doseId: payload, title: 'Odroczony lek', body: 'Czas przyjąć lek!', minutes: 30);
        }
      },
    );

    await requestPermissions();
  }

  Future<void> requestPermissions() async {
    final androidImpl = _notificationsPlugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (androidImpl != null) {
      await androidImpl.requestNotificationsPermission();
      await androidImpl.requestExactAlarmsPermission();
    }
  }

  /// Zaplanuj dokładny alarm o podanej godzinie (SCHEDULE_EXACT_ALARM)
  Future<void> scheduleExactDoseNotification({
    required int notificationId,
    required String doseId,
    required String medicationName,
    required String doseAmount,
    required String therapyName,
    required DateTime scheduledDateTime,
  }) async {
    final tz.TZDateTime tzTime = tz.TZDateTime.from(scheduledDateTime, tz.local);

    // Nie planuj powiadomień w przeszłości
    if (tzTime.isBefore(tz.TZDateTime.now(tz.local))) return;

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      actions: <AndroidNotificationAction>[
        const AndroidNotificationAction(
          actionTake,
          'Wziąłem',
          showsUserInterface: false,
          cancelNotification: true,
        ),
        const AndroidNotificationAction(
          actionSnooze15,
          'Odłóż (15 min)',
          showsUserInterface: false,
          cancelNotification: true,
        ),
      ],
    );

    await _notificationsPlugin.zonedSchedule(
      notificationId,
      '💊 Czas na lek: \$medicationName',
      'Dawka: \$doseAmount (\$therapyName)',
      tzTime,
      NotificationDetails(android: androidDetails),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: doseId,
    );
  }

  /// Zaplanuj odroczenie powiadomienia (snooze)
  Future<void> scheduleSnoozeNotification({
    required String doseId,
    required String title,
    required String body,
    required int minutes,
  }) async {
    final scheduledTime = tz.TZDateTime.now(tz.local).add(Duration(minutes: minutes));
    final notificationId = doseId.hashCode + minutes;

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      actions: const <AndroidNotificationAction>[
        AndroidNotificationAction(
          actionTake,
          'Wziąłem',
          showsUserInterface: false,
          cancelNotification: true,
        ),
      ],
    );

    await _notificationsPlugin.zonedSchedule(
      notificationId,
      title,
      body,
      scheduledTime,
      NotificationDetails(android: androidDetails),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: doseId,
    );
  }

  Future<void> cancelNotification(int id) async {
    await _notificationsPlugin.cancel(id);
  }

  Future<void> cancelAll() async {
    await _notificationsPlugin.cancelAll();
  }
}
`,
  },
  {
    path: 'lib/widgets/snooze_bottom_sheet.dart',
    name: 'snooze_bottom_sheet.dart',
    category: 'widget',
    language: 'dart',
    description: 'Dolne menu szybkiego wyboru odroczenia dawki (5 min, 15 min, 30 min)',
    content: `import 'package:flutter/material.dart';

class SnoozeBottomSheet extends StatelessWidget {
  final String medicationName;
  final Function(int minutes) onSnoozeSelected;

  const SnoozeBottomSheet({
    super.key,
    required this.medicationName,
    required this.onSnoozeSelected,
  });

  static void show(BuildContext context, {
    required String medicationName,
    required Function(int minutes) onSnoozeSelected,
  }) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SnoozeBottomSheet(
        medicationName: medicationName,
        onSnoozeSelected: onSnoozeSelected,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Icon(Icons.snooze, color: Colors.amber, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Odłóż przypomnienie',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        medicationName,
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildOptionButton(context, 5, 'Za 5 minut', Icons.timer_outlined),
            const SizedBox(height: 10),
            _buildOptionButton(context, 15, 'Za 15 minut (rekomendowane)', Icons.timelapse),
            const SizedBox(height: 10),
            _buildOptionButton(context, 30, 'Za 30 minut', Icons.alarm),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Anuluj', style: TextStyle(color: Colors.grey)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOptionButton(BuildContext context, int minutes, String label, IconData icon) {
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        side: BorderSide(color: Colors.grey.shade300),
      ),
      icon: Icon(icon, color: Colors.teal),
      label: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          label,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black87),
        ),
      ),
      onPressed: () {
        Navigator.pop(context);
        onSnoozeSelected(minutes);
      },
    );
  }
}
`,
  },
  {
    path: 'lib/screens/home_screen.dart',
    name: 'home_screen.dart',
    category: 'screen',
    language: 'dart',
    description: 'Ekran główny z harmonogramem dziennym, statusem dawek i natychmiastowym przyciskiem Wziąłem',
    content: `import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/dose_log.dart';
import '../services/database_service.dart';
import '../widgets/snooze_bottom_sheet.dart';
import 'add_medication_screen.dart';
import 'add_therapy_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime _currentDate = DateTime.now();
  List<DoseLog> _doses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDoses();
  }

  Future<void> _loadDoses() async {
    setState(() => _isLoading = true);
    final doses = await DatabaseService.instance.getDosesForDate(_currentDate);
    setState(() {
      _doses = doses;
      _isLoading = false;
    });
  }

  Future<void> _markAsTaken(DoseLog dose) async {
    await DatabaseService.instance.markDoseAsTaken(dose.id);
    _loadDoses();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✓ Zażyto lek: \${dose.medicationName ?? "Lek"}'),
          backgroundColor: Colors.teal.shade700,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _openSnoozeDialog(DoseLog dose) async {
    SnoozeBottomSheet.show(
      context,
      medicationName: dose.medicationName ?? 'Lek',
      onSnoozeSelected: (minutes) async {
        await DatabaseService.instance.snoozeDose(dose.id, minutes);
        _loadDoses();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('⏱ Odłożono o \$minutes min.'),
              backgroundColor: Colors.amber.shade800,
            ),
          );
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE, d MMMM y', 'pl_PL');
    final dateDisplay = dateFormat.format(_currentDate);

    final totalDoses = _doses.length;
    final takenDoses = _doses.where((d) => d.status == DoseStatus.taken).length;
    final progress = totalDoses > 0 ? (takenDoses / totalDoses) : 1.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('MedPlaner', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            Text('Harmonogram dzienny', style: TextStyle(fontSize: 12, color: Colors.black54)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: Colors.teal),
            tooltip: 'Dodaj terapię',
            onPressed: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddTherapyScreen()));
              _loadDoses();
            },
          ),
          IconButton(
            icon: const Icon(Icons.medication, color: Colors.teal),
            tooltip: 'Dodaj lek',
            onPressed: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddMedicationScreen()));
              _loadDoses();
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDoses,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Karta postępu dnia
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.teal.shade700, Colors.teal.shade900],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.teal.withOpacity(0.2),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          dateDisplay.toUpperCase(),
                          style: TextStyle(
                            color: Colors.teal.shade100,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '\$takenDoses z \$totalDoses dawek przyjęte',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '\${(progress * 100).toInt()}%',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: progress,
                            minHeight: 8,
                            backgroundColor: Colors.teal.shade900,
                            valueColor: const AlwaysStoppedAnimation<Color>(Colors.greenAccent),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Harmonogram na dziś',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '\${_doses.length} dawek',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (_doses.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      alignment: Alignment.center,
                      child: Column(
                        children: [
                          Icon(Icons.check_circle_outline, size: 64, color: Colors.teal.shade200),
                          const SizedBox(height: 16),
                          const Text(
                            'Brak zaplanowanych leków na dziś!',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Dodaj nową terapię lub lek przyciskiem poniżej.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () async {
                              await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddMedicationScreen()));
                              _loadDoses();
                            },
                            icon: const Icon(Icons.add),
                            label: const Text('Dodaj pierwszy lek'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.teal,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._doses.map((dose) => _buildDoseCard(dose)),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Dodaj lek'),
        onPressed: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddMedicationScreen()));
          _loadDoses();
        },
      ),
    );
  }

  Widget _buildDoseCard(DoseLog dose) {
    Color statusBg;
    Color statusColor;
    String statusLabel;

    switch (dose.status) {
      case DoseStatus.taken:
        statusBg = const Color(0xFFDCFCE7);
        statusColor = const Color(0xFF15803D);
        final takenTime = dose.actualTakenTime != null
            ? DateFormat('HH:mm').format(dose.actualTakenTime!)
            : dose.scheduledTime;
        statusLabel = 'Wzięte o \$takenTime';
        break;
      case DoseStatus.snoozed:
        statusBg = const Color(0xFFFEF3C7);
        statusColor = const Color(0xFFB45309);
        statusLabel = 'Odroczone do \${dose.snoozedUntil ?? ""}';
        break;
      case DoseStatus.skipped:
        statusBg = const Color(0xFFFEE2E2);
        statusColor = const Color(0xFFB91C1C);
        statusLabel = 'Pominięte';
        break;
      case DoseStatus.pending:
      default:
        statusBg = const Color(0xFFF1F5F9);
        statusColor = const Color(0xFF475569);
        statusLabel = 'Oczekuje';
        break;
    }

    final isTaken = dose.status == DoseStatus.taken;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isTaken ? Colors.teal.shade100 : Colors.grey.shade200,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Godzina
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: isTaken ? Colors.teal.shade50 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.access_time, size: 16, color: isTaken ? Colors.teal : Colors.grey.shade700),
                      const SizedBox(height: 4),
                      Text(
                        dose.effectiveTime,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isTaken ? Colors.teal.shade800 : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),

                // Szczegóły leku
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              dose.medicationName ?? 'Lek',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                decoration: isTaken ? TextDecoration.lineThrough : null,
                                color: isTaken ? Colors.grey.shade500 : Colors.black87,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusBg,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              statusLabel,
                              style: TextStyle(
                                color: statusColor,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Dawka: \${dose.doseAmount ?? "1"} • Terapia: \${dose.therapyName ?? "Ogólna"}',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            if (!isTaken) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('Wziąłem', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: () => _markAsTaken(dose),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.amber.shade900,
                        side: BorderSide(color: Colors.amber.shade400),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      icon: const Icon(Icons.snooze, size: 18),
                      label: const Text('Odłóż'),
                      onPressed: () => _openSnoozeDialog(dose),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/add_therapy_screen.dart',
    name: 'add_therapy_screen.dart',
    category: 'screen',
    language: 'dart',
    description: 'Formularz tworzenia i edycji Terapii (np. Terapia antybiotykowa, Krople do oczu i nosa)',
    content: `import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/therapy.dart';
import '../services/database_service.dart';

class AddTherapyScreen extends StatefulWidget {
  final Therapy? therapyToEdit;

  const AddTherapyScreen({super.key, this.therapyToEdit});

  @override
  State<AddTherapyScreen> createState() => _AddTherapyScreenState();
}

class _AddTherapyScreenState extends State<AddTherapyScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _descController;
  DateTime _startDate = DateTime.now();
  DateTime? _endDate;
  String _selectedColor = '#10B981';

  final List<String> _colorOptions = [
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#EF4444', // Red
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.therapyToEdit?.name ?? '');
    _descController = TextEditingController(text: widget.therapyToEdit?.description ?? '');
    if (widget.therapyToEdit != null) {
      _startDate = widget.therapyToEdit!.startDate;
      _endDate = widget.therapyToEdit!.endDate;
      _selectedColor = widget.therapyToEdit!.colorHex;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final therapy = Therapy(
      id: widget.therapyToEdit?.id ?? const Uuid().v4(),
      name: _nameController.text.trim(),
      description: _descController.text.trim().isNotEmpty ? _descController.text.trim() : null,
      colorHex: _selectedColor,
      iconName: 'medical_services',
      startDate: _startDate,
      endDate: _endDate,
      isActive: true,
      createdAt: widget.therapyToEdit?.createdAt ?? DateTime.now(),
    );

    await DatabaseService.instance.insertTherapy(therapy);
    if (mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.therapyToEdit == null ? 'Nowa Terapia' : 'Edytuj Terapię'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nazwa Terapii *',
                hintText: 'np. Terapia antybiotykowa, Krople do oczu',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.healing),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Wprowadź nazwę terapii' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descController,
              decoration: const InputDecoration(
                labelText: 'Opis / Zalecenia lekarza (opcjonalnie)',
                hintText: 'np. Przyjmować ściśle przez 7 dni po jedzeniu',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.notes),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 20),
            const Text('Kolor wyróżniający:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: _colorOptions.map((hex) {
                final color = Color(int.parse(hex.replaceFirst('#', '0xFF')));
                final isSelected = _selectedColor == hex;
                return GestureDetector(
                  onTap: () => setState(() => _selectedColor = hex),
                  child: Container(
                    margin: const EdgeInsets.only(right: 12),
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                      border: isSelected ? Border.all(color: Colors.black, width: 3) : null,
                    ),
                    child: isSelected ? const Icon(Icons.check, color: Colors.white, size: 20) : null,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _save,
              child: const Text('Zapisz Terapię', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/add_medication_screen.dart',
    name: 'add_medication_screen.dart',
    category: 'screen',
    language: 'dart',
    description: 'Formularz dodawania leku z rozwijaną listą typów, dawką i elastycznymi godzinami alarmów',
    content: `import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../services/database_service.dart';
import 'add_therapy_screen.dart';

class AddMedicationScreen extends StatefulWidget {
  const AddMedicationScreen({super.key});

  @override
  State<AddMedicationScreen> createState() => _AddMedicationScreenState();
}

class _AddMedicationScreenState extends State<AddMedicationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _doseAmountController = TextEditingController(text: '1');
  final _instructionsController = TextEditingController();

  List<Therapy> _therapies = [];
  String? _selectedTherapyId;

  MedicationType _selectedType = MedicationType.capsule;
  ScheduleType _selectedSchedule = ScheduleType.daily;

  // Elastyczne godziny dawkowania (brak sztywnych pór!)
  List<TimeOfDay> _selectedTimes = [
    const TimeOfDay(hour: 8, minute: 0),
    const TimeOfDay(hour: 20, minute: 0),
  ];

  List<int> _selectedDays = [1, 2, 3, 4, 5, 6, 7]; // Pn-Nd

  @override
  void initState() {
    super.initState();
    _loadTherapies();
  }

  Future<void> _loadTherapies() async {
    final list = await DatabaseService.instance.getTherapies(activeOnly: true);
    setState(() {
      _therapies = list;
      if (list.isNotEmpty) {
        _selectedTherapyId = list.first.id;
      }
    });
  }

  Future<void> _addTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      helpText: 'WYBIERZ DOKŁADNĄ GODZINĘ DAWKI',
    );
    if (picked != null) {
      setState(() {
        _selectedTimes.add(picked);
        _selectedTimes.sort((a, b) => (a.hour * 60 + a.minute).compareTo(b.hour * 60 + b.minute));
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedTherapyId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Najpierw utwórz lub wybierz Terapię!')),
      );
      return;
    }
    if (_selectedTimes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dodaj co najmniej jedną godzinę dawki!')),
      );
      return;
    }

    final formattedTimes = _selectedTimes.map((t) {
      final h = t.hour.toString().padLeft(2, '0');
      final m = t.minute.toString().padLeft(2, '0');
      return '\$h:\$m';
    }).toList();

    final med = Medication(
      id: const Uuid().v4(),
      therapyId: _selectedTherapyId!,
      name: _nameController.text.trim(),
      type: _selectedType,
      doseAmount: _doseAmountController.text.trim(),
      instructions: _instructionsController.text.trim().isNotEmpty ? _instructionsController.text.trim() : null,
      times: formattedTimes,
      scheduleType: _selectedSchedule,
      selectedDays: _selectedDays,
      startDate: DateTime.now(),
    );

    await DatabaseService.instance.insertMedication(med);
    if (mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dodaj Lek do Terapii'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Wybór terapii
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Przypisz do Terapii *',
                      border: OutlineInputBorder(),
                    ),
                    value: _selectedTherapyId,
                    items: _therapies.map((t) {
                      return DropdownMenuItem(value: t.id, child: Text(t.name));
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedTherapyId = val),
                    validator: (v) => v == null ? 'Wybierz terapię' : null,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  icon: const Icon(Icons.add),
                  tooltip: 'Stwórz nową terapię',
                  onPressed: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddTherapyScreen()));
                    _loadTherapies();
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Nazwa leku
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nazwa Leku *',
                hintText: 'np. Amotaks, Krople Hyabak, Ventolin',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.medication),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Wprowadź nazwę leku' : null,
            ),
            const SizedBox(height: 16),

            // Typ leku i dawka
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Typ leku (Dropdown)
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<MedicationType>(
                    decoration: const InputDecoration(
                      labelText: 'Typ leku *',
                      border: OutlineInputBorder(),
                    ),
                    value: _selectedType,
                    items: MedicationType.values.map((t) {
                      return DropdownMenuItem(value: t, child: Text(t.displayName));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedType = val);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                // Ilość / dawka
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    controller: _doseAmountController,
                    decoration: InputDecoration(
                      labelText: 'Dawka *',
                      hintText: 'np. 1, 5, 2.5',
                      suffixText: _selectedType.shortUnit,
                      border: const OutlineInputBorder(),
                    ),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Podaj ilość' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Instrukcje
            TextFormField(
              controller: _instructionsController,
              decoration: const InputDecoration(
                labelText: 'Zalecenia (opcjonalnie)',
                hintText: 'np. Po posiłku, Popić szklanką wody',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.info_outline),
              ),
            ),
            const SizedBox(height: 24),

            // Elastyczne godziny dawkowania
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Godziny dawkowania',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                TextButton.icon(
                  onPressed: _addTime,
                  icon: const Icon(Icons.add_alarm),
                  label: const Text('Dodaj godzinę'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _selectedTimes.map((t) {
                final h = t.hour.toString().padLeft(2, '0');
                final m = t.minute.toString().padLeft(2, '0');
                return Chip(
                  avatar: const Icon(Icons.access_time, size: 16, color: Colors.teal),
                  label: Text('\$h:\$m', style: const TextStyle(fontWeight: FontWeight.bold)),
                  deleteIcon: const Icon(Icons.close, size: 16),
                  onDeleted: _selectedTimes.length > 1
                      ? () => setState(() => _selectedTimes.remove(t))
                      : null,
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Harmonogram
            const Text('Harmonogram:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SegmentedButton<ScheduleType>(
              segments: const [
                ButtonSegment(value: ScheduleType.daily, label: Text('Codziennie')),
                ButtonSegment(value: ScheduleType.specificDays, label: Text('Dni tyg.')),
                ButtonSegment(value: ScheduleType.dateRange, label: Text('Zakres dat')),
              ],
              selected: {_selectedSchedule},
              onSelectionChanged: (set) => setState(() => _selectedSchedule = set.first),
            ),
            const SizedBox(height: 32),

            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _save,
              child: const Text('Zapisz Lek i Ustaw Alarmy', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/calendar_screen.dart',
    name: 'calendar_screen.dart',
    category: 'screen',
    language: 'dart',
    description: 'Widok kalendarza pozwalający cofnąć się do dowolnego dnia i sprawdzić realizację terapii',
    content: `import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/dose_log.dart';
import '../services/database_service.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  DateTime _selectedDate = DateTime.now();
  List<DoseLog> _doses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDosesForSelectedDate();
  }

  Future<void> _loadDosesForSelectedDate() async {
    setState(() => _isLoading = true);
    final doses = await DatabaseService.instance.getDosesForDate(_selectedDate);
    setState(() {
      _doses = doses;
      _isLoading = false;
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2024),
      lastDate: DateTime(2030),
      locale: const Locale('pl', 'PL'),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
      _loadDosesForSelectedDate();
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('d MMMM y', 'pl_PL').format(_selectedDate);
    final isToday = DateUtils.isSameDay(_selectedDate, DateTime.now());

    // Grupowanie dawek wg terapii
    final Map<String, List<DoseLog>> dosesByTherapy = {};
    for (final d in _doses) {
      final th = d.therapyName ?? 'Pozostałe';
      dosesByTherapy.putIfAbsent(th, () => []).add(d);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kalendarz i Historia Terapii'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month),
            onPressed: _pickDate,
            tooltip: 'Wybierz datę z kalendarza',
          ),
        ],
      ),
      body: Column(
        children: [
          // Pasek wyboru dnia
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () {
                    setState(() => _selectedDate = _selectedDate.subtract(const Duration(days: 1)));
                    _loadDosesForSelectedDate();
                  },
                ),
                GestureDetector(
                  onTap: _pickDate,
                  child: Row(
                    children: [
                      const Icon(Icons.event, color: Colors.teal, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        isToday ? 'Dziś, \$dateStr' : dateStr,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {
                    setState(() => _selectedDate = _selectedDate.add(const Duration(days: 1)));
                    _loadDosesForSelectedDate();
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _doses.isEmpty
                    ? Center(
                        child: Text(
                          'Brak zaplanowanych leków w dniu \$dateStr.',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: dosesByTherapy.entries.map((entry) {
                          final therapyName = entry.key;
                          final doses = entry.value;
                          final allTaken = doses.every((d) => d.status == DoseStatus.taken);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        therapyName,
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: allTaken ? Colors.green.shade50 : Colors.amber.shade50,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              allTaken ? Icons.check_circle : Icons.schedule,
                                              size: 14,
                                              color: allTaken ? Colors.green.shade700 : Colors.amber.shade800,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              allTaken ? 'Terapia zażyta w 100%' : 'Częściowo przyjęte',
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                                color: allTaken ? Colors.green.shade700 : Colors.amber.shade800,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 20),
                                  ...doses.map((d) => ListTile(
                                        contentPadding: EdgeInsets.zero,
                                        leading: Text(
                                          d.effectiveTime,
                                          style: const TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                        title: Text(d.medicationName ?? 'Lek'),
                                        subtitle: Text('Dawka: \${d.doseAmount ?? "1"}'),
                                        trailing: Icon(
                                          d.status == DoseStatus.taken
                                              ? Icons.check_circle
                                              : (d.status == DoseStatus.snoozed ? Icons.snooze : Icons.radio_button_unchecked),
                                          color: d.status == DoseStatus.taken
                                              ? Colors.teal
                                              : (d.status == DoseStatus.snoozed ? Colors.amber : Colors.grey),
                                        ),
                                      )),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/main.dart',
    name: 'main.dart',
    category: 'main',
    language: 'dart',
    description: 'Punkt wejścia aplikacji Flutter z dolną nawigacją (Dziś, Kalendarz, Terapie)',
    content: `import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'screens/home_screen.dart';
import 'screens/calendar_screen.dart';
import 'screens/add_therapy_screen.dart';
import 'services/database_service.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pl_PL', null);

  // Inicjalizacja lokalnej bazy danych SQLite
  await DatabaseService.instance.database;

  // Inicjalizacja powiadomień i dokładnych alarmów
  await NotificationService.instance.initialize();

  runApp(const MedPlanerApp());
}

class MedPlanerApp extends StatelessWidget {
  const MedPlanerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MedPlaner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F766E), // Głęboki morski / teal
          brightness: Brightness.light,
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
        ),
      ),
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    CalendarScreen(),
    AddTherapyScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.today_outlined),
            selectedIcon: Icon(Icons.today),
            label: 'Dziś',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Kalendarz',
          ),
          NavigationDestination(
            icon: Icon(Icons.healing_outlined),
            selectedIcon: Icon(Icons.healing),
            label: 'Terapie',
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'config',
    language: 'markdown',
    description: 'Instrukcja krok po kroku jak zbudować plik APK w Google Project IDX bez Android Studio',
    content: `# MedPlaner - Aplikacja Flutter do Dawkowania Leków

Aplikacja mobilna w języku Dart / Flutter przygotowana do skompilowania pliku APK w **Google Project IDX** (w chmurze, bez potrzeby instalacji lokalnego Android Studio i emulatorów).

---

## 🚀 Instrukcja: Jak zbudować plik .apk w Google Project IDX

### Krok 1: Otwórz Google Project IDX
1. Wejdź na stronę: [https://idx.google.com](https://idx.google.com)
2. Zaloguj się kontem Google.
3. Wybierz szablon **Flutter** (lub kliknij *Create a workspace* -> *Flutter*).
4. Nazwij przestrzeń roboczą, np. \`medplaner\`, i wybierz platformę **Android**.

---

### Krok 2: Wklejenie lub wgranie plików
W lewym panelu plików Google Project IDX:
1. Zastąp zawartość pliku \`pubspec.yaml\` kodem z tej aplikacji.
2. Wklej pliki do folderu \`lib/\`:
   - \`lib/main.dart\`
   - \`lib/models/therapy.dart\`, \`medication.dart\`, \`dose_log.dart\`
   - \`lib/services/database_service.dart\`, \`notification_service.dart\`
   - \`lib/screens/home_screen.dart\`, \`add_medication_screen.dart\`, \`add_therapy_screen.dart\`, \`calendar_screen.dart\`
   - \`lib/widgets/snooze_bottom_sheet.dart\`
3. Zaktualizuj pliki konfiguracyjne Androida:
   - \`android/app/src/main/AndroidManifest.xml\` (uprawnienia do alarmów i powiadomień)
   - \`android/app/build.gradle\` (desugaring dla stref czasowych)

*Wskazówka: Możesz również kliknąć przycisk "Pobierz Projekt (.zip)" w naszym narzędziu i przeciągnąć rozpakowane pliki bezpośrednio do przeglądarki w Project IDX!*

---

### Krok 3: Pobranie zależności w terminalu Project IDX
W dolnym oknie terminala IDX wpisz:
\`\`\`bash
flutter pub get
\`\`\`

---

### Krok 4: Kompilacja pliku APK w chmurze
Wpisz w terminalu polecenie budujące plik APK:
\`\`\`bash
flutter build apk --release
\`\`\`
*(Projekt IDX skompiluje plik na serwerach Google w 2-3 minuty, bez obciążania Twojego komputera).*

---

### Krok 5: Pobranie gotowego pliku APK na telefon
1. W lewym panelu eksploratora plików IDX rozwiń folder:
   \`build/app/outputs/flutter-apk/\`
2. Kliknij prawym przyciskiem myszy na plik:
   \`app-release.apk\`
3. Wybierz **Download** (Pobierz).
4. Prześlij plik na telefon z Androidem (np. przez Dysk Google, kabel USB lub WhatsApp/Telegram) i zainstaluj!
`,
  },
];
