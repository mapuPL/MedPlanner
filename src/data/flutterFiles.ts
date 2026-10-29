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
    content: `name: Build Android APK

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build:
    name: Build Flutter Android APK
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

      - name: Przygotowanie platformy Android i zgodności JVM
        run: |
          # Jeśli w repozytorium brakuje otoczki Gradle/Android, Flutter wygeneruje ją automatycznie
          if [ ! -f "android/build.gradle" ] || [ ! -f "android/settings.gradle" ]; then
            echo "Inicjalizacja brakującej otoczki Android..."
            flutter create . --platforms=android --org=com.example --project-name=medplaner
          fi

          # Wymuszenie zgodności wersji JVM (Java 17 i Kotlin JVM target 17)
          mkdir -p android
          echo "kotlin.jvm.target.validation.mode=warning" >> android/gradle.properties

          if [ -f "android/app/build.gradle" ]; then
            sed -i "s/jvmTarget = '1.8'/jvmTarget = '17'/g" android/app/build.gradle
            sed -i 's/jvmTarget = "1.8"/jvmTarget = "17"/g' android/app/build.gradle
            sed -i "s/JavaVersion.VERSION_1_8/JavaVersion.VERSION_17/g" android/app/build.gradle
            sed -i "s/JavaVersion.VERSION_11/JavaVersion.VERSION_17/g" android/app/build.gradle
            sed -i "s/compileSdkVersion [0-9]\\+/compileSdkVersion 36/g" android/app/build.gradle
            sed -i "s/targetSdkVersion [0-9]\\+/targetSdkVersion 36/g" android/app/build.gradle
            sed -i "s/compileSdk = [0-9]\\+/compileSdk = 36/g" android/app/build.gradle
            sed -i "s/targetSdk = [0-9]\\+/targetSdk = 36/g" android/app/build.gradle
          fi

      - name: Pobranie zależności Flutter (pub get)
        run: flutter pub get

      - name: Odczytaj odciski certyfikatów SHA-1 i SHA-256 dla Google Sign-In
        run: |
          echo "================================================================================"
          echo "ODCISKI KLUCZY CERTYFIKATÓW DLA GOOGLE CLOUD CONSOLE (OAUTH CLIENT ID ANDROID):"
          echo "Pakiet aplikacji (Package name): com.example.medplaner"
          echo "================================================================================"
          if [ -d "android" ]; then
            cd android
            echo "--- Raport podpisów Gradle (signingReport) ---"
            ./gradlew signingReport || true
            cd ..
          fi
          if [ -f "$HOME/.android/debug.keystore" ]; then
            echo "--- Domyślny debug.keystore SHA-1: ---"
            keytool -list -v -keystore "$HOME/.android/debug.keystore" -alias androiddebugkey -storepass android -keypass android | grep -E "SHA1:|SHA256:" || true
          fi
          echo "================================================================================"

      - name: Budowanie pliku APK Release
        run: flutter build apk --release

      - name: Zapisz plik APK jako artefakt
        uses: actions/upload-artifact@v4
        with:
          name: medplaner-release-apk
          path: build/app/outputs/flutter-apk/app-release.apk
          if-no-files-found: error
          retention-days: 14
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
  path_provider: ^2.1.2
  intl: ^0.19.0
  uuid: ^4.5.1
  cupertino_icons: ^1.0.8
  google_sign_in: ^6.2.1
  googleapis: ^13.2.0
  http: ^1.2.2

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
    content: `import 'dart:io';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../models/dose_log.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._internal();
  DatabaseService._internal();

  static const String databaseFileName = 'medications_catalog.db';
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
      await _database!.close();
      _database = null;
    }
  }

  Future<void> reloadDatabase() async {
    await closeDatabase();
    _database = await _initDatabase();
  }

  /// Eksport lokalnej kopii zapasowej do pliku medplaner-backup.db w katalogu dokumentów
  Future<File> exportBackupFile() async {
    final dbPath = await getDatabaseFilePath();
    final dbFile = File(dbPath);
    if (!await dbFile.exists()) {
      await database; // Utworzenie bazy jeśli jeszcze nie powstała
    }
    final dir = await getApplicationDocumentsDirectory();
    final backupFile = File(join(dir.path, 'medplaner-backup.db'));
    return await dbFile.copy(backupFile.path);
  }

  /// Przywrócenie bazy z pliku kopii zapasowej
  Future<bool> restoreFromBackupFile(String filePath) async {
    final backupFile = File(filePath);
    if (!await backupFile.exists()) return false;
    final dbPath = await getDatabaseFilePath();
    await closeDatabase();
    await backupFile.copy(dbPath);
    await reloadDatabase();
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

  Future<void> deleteMedication(String id) async {
    final db = await database;
    await db.delete('medications', where: 'id = ?', whereArgs: [id]);
    await db.delete('dose_logs', where: 'medication_id = ?', whereArgs: [id]);
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
    path: 'lib/services/google_drive_sync_service.dart',
    name: 'google_drive_sync_service.dart',
    category: 'service',
    language: 'dart',
    description: 'Synchronizacja bazy SQLite z Dyskiem Google: logowanie Google, zapis medplaner-backup.db w dedykowanym folderze oraz przywracanie',
    content: `import 'dart:async';
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
    if (sizeBytes < 1024 * 1024) return '\${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    return '\${(sizeBytes / (1024 * 1024)).toStringAsFixed(2)} MB';
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
          message: 'Google Play Services odrzuciło autoryzację z błędem DEVELOPER_ERROR (kod 10).\\n\\n'
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
        message: 'Kopia zapasowa została pomyślnie zapisana na Twoim Dysku Google (\${info.formattedSize}).',
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
        message: 'Baza danych została pomyślnie przywrócona z Dysku Google (\${info.formattedSize}).',
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
`,
  },
  {
    path: 'lib/services/medication_registry_service.dart',
    name: 'medication_registry_service.dart',
    category: 'service',
    language: 'dart',
    description: 'Baza leków offline (>2700 leków z rejestru URPL / NFZ) z normalizacją polskich znaków i autouzupełnianiem',
    content: `class RegisteredMedicine {
  final String id;
  final String name;
  final String substance;
  final String category;
  final String defaultType; // 'capsule', 'drops', 'ml', 'inhaler', 'application', 'other'
  final String defaultDose;
  final String instructions;
  final bool isCustom;

  const RegisteredMedicine({
    required this.id,
    required this.name,
    required this.substance,
    required this.category,
    required this.defaultType,
    required this.defaultDose,
    required this.instructions,
    this.isCustom = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'substance': substance,
      'category': category,
      'default_type': defaultType,
      'default_dose': defaultDose,
      'instructions': instructions,
      'is_custom': isCustom ? 1 : 0,
    };
  }

  factory RegisteredMedicine.fromMap(Map<String, dynamic> map) {
    return RegisteredMedicine(
      id: map['id'] as String,
      name: map['name'] as String,
      substance: map['substance'] as String,
      category: map['category'] as String,
      defaultType: map['default_type'] as String,
      defaultDose: map['default_dose'] as String,
      instructions: map['instructions'] as String,
      isCustom: (map['is_custom'] as int?) == 1,
    );
  }
}

class MedicationRegistryService {
  static final MedicationRegistryService instance = MedicationRegistryService._internal();
  MedicationRegistryService._internal();

  // Baza leków oparta na oficjalnych rejestrach URPL / NFZ
  static final List<RegisteredMedicine> _registry = _buildInitialRegistry();

  static List<RegisteredMedicine> _buildInitialRegistry() {
    final List<RegisteredMedicine> list = [];
    int id = 1;

    final templates = [
      // Antybiotyki
      {'name': 'Amotaks', 'sub': 'Amoxicillinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['500 mg', '1 g'], 'q': '1', 'inst': 'Po posiłku, popić pełną szklanką wody'},
      {'name': 'Amotaks Dispertab', 'sub': 'Amoxicillinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['500 mg', '750 mg', '1 g'], 'q': '1', 'inst': 'Rozpuścić w niewielkiej ilości wody lub połknąć'},
      {'name': 'Auglavin', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['875 mg + 125 mg', '500 mg + 125 mg'], 'q': '1', 'inst': 'Na początku posiłku w równych odstępach co 12h'},
      {'name': 'Auglavin PPH', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['875 mg + 125 mg', '500 mg + 125 mg'], 'q': '1', 'inst': 'Na początku posiłku, popić wodą'},
      {'name': 'Auglavin Extra', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'ml', 'doses': ['zawiesina 400 mg + 57 mg/5 ml'], 'q': '5', 'inst': 'Wstrząsnąć przed użyciem, na początku posiłku'},
      {'name': 'Augmentin', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['625 mg', '1 g (875 mg + 125 mg)'], 'q': '1', 'inst': 'Na początku posiłku'},
      {'name': 'Taromentin', 'sub': 'Amoxicillinum + Acidum clavulanicum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['875 mg + 125 mg', '500 mg + 125 mg'], 'q': '1', 'inst': 'Na początku posiłku'},
      {'name': 'Duomox', 'sub': 'Amoxicillinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['500 mg', '750 mg', '1 g'], 'q': '1', 'inst': 'W trakcie lub po posiłku'},
      {'name': 'Zinnat', 'sub': 'Cefuroximum axetil', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['250 mg', '500 mg'], 'q': '1', 'inst': 'Zaraz po posiłku'},
      {'name': 'Klacid', 'sub': 'Clarithromycinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['250 mg', '500 mg', '500 mg Uno'], 'q': '1', 'inst': 'Niezależnie od posiłków, co 12h'},
      {'name': 'Sumamed', 'sub': 'Azithromycinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['250 mg', '500 mg'], 'q': '1', 'inst': '1h przed lub 2h po posiłku'},
      {'name': 'Macromax', 'sub': 'Azithromycinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['500 mg'], 'q': '1', 'inst': 'Raz na dobę o stałej porze'},
      {'name': 'Biseptol', 'sub': 'Sulfamethoxazolum + Trimethoprimum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['480 mg', '960 mg'], 'q': '1', 'inst': 'Po posiłku z dużą ilością płynu'},
      {'name': 'Cipronex', 'sub': 'Ciprofloxacinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['250 mg', '500 mg'], 'q': '1', 'inst': 'Niezależnie od posiłków, nie z nabiałem'},
      {'name': 'Monural', 'sub': 'Fosfomycinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['3 g saszetka'], 'q': '1', 'inst': 'Wieczorem przed snem, po opróżnieniu pęcherza'},
      {'name': 'Xifaxan', 'sub': 'Rifaximinum', 'cat': 'Antybiotyki', 'type': 'capsule', 'doses': ['200 mg'], 'q': '1', 'inst': 'Doustnie, popić szklanką wody'},

      // Leki przeciwgrzybicze i przeciwwirusowe
      {'name': 'Flucofast', 'sub': 'Fluconazolum', 'cat': 'Przeciwgrzybicze', 'type': 'capsule', 'doses': ['50 mg', '100 mg', '150 mg', '200 mg'], 'q': '1', 'inst': 'Niezależnie od posiłków, popić dużą ilością wody'},
      {'name': 'Diflucan', 'sub': 'Fluconazolum', 'cat': 'Przeciwgrzybicze', 'type': 'capsule', 'doses': ['50 mg', '150 mg'], 'q': '1', 'inst': 'Raz dziennie lub jednorazowo wg zaleceń'},
      {'name': 'Trioxal', 'sub': 'Itraconazolum', 'cat': 'Przeciwgrzybicze', 'type': 'capsule', 'doses': ['100 mg'], 'q': '1', 'inst': 'Bezpośrednio po głównym posiłku'},
      {'name': 'Heviran', 'sub': 'Aciclovirum', 'cat': 'Przeciwwirusowe', 'type': 'capsule', 'doses': ['200 mg', '400 mg', '800 mg'], 'q': '1', 'inst': 'W trakcie posiłku, dbać o nawodnienie'},
      {'name': 'Hascovir', 'sub': 'Aciclovirum', 'cat': 'Przeciwwirusowe', 'type': 'capsule', 'doses': ['200 mg', '400 mg'], 'q': '1', 'inst': 'Co 4 godziny w ciągu dnia'},

      // Glikokortykosteroidy
      {'name': 'Metypred', 'sub': 'Methylprednisolonum', 'cat': 'Kortykosteroidy', 'type': 'capsule', 'doses': ['4 mg', '8 mg', '16 mg'], 'q': '1', 'inst': 'Rano po śniadaniu, z osłoną żołądka'},
      {'name': 'Encorton', 'sub': 'Prednisonum', 'cat': 'Kortykosteroidy', 'type': 'capsule', 'doses': ['1 mg', '5 mg', '10 mg', '20 mg'], 'q': '1', 'inst': 'Rano w trakcie posiłku, nie na czczo'},

      // Przeciwbólowe i NLPZ
      {'name': 'Apap', 'sub': 'Paracetamolum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['500 mg', 'Extra 500 mg + 65 mg'], 'q': '1', 'inst': 'Doraźnie w bólu, co 4-6h'},
      {'name': 'Paracetamol Hasco', 'sub': 'Paracetamolum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['500 mg', '1000 mg'], 'q': '1', 'inst': 'Popić wodą, maks 4 g na dobę'},
      {'name': 'Efferalgan', 'sub': 'Paracetamolum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['500 mg musujące', '1 g musujące'], 'q': '1', 'inst': 'Rozpuścić w szklance wody'},
      {'name': 'Ibuprom', 'sub': 'Ibuprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['200 mg', '400 mg Sprint', '400 mg Max'], 'q': '1', 'inst': 'Po posiłku, popić szklanką wody'},
      {'name': 'Ibum', 'sub': 'Ibuprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['200 mg', '400 mg', '600 mg'], 'q': '1', 'inst': 'Zawsze po posiłku'},
      {'name': 'Ketonal', 'sub': 'Ketoprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['50 mg', '100 mg Forte', '150 mg Duo'], 'q': '1', 'inst': 'Ściśle po jedzeniu z osłoną żołądka'},
      {'name': 'Dexak', 'sub': 'Dexketoprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['25 mg', '25 mg SL saszetki'], 'q': '1', 'inst': '30 min przed posiłkiem'},
      {'name': 'Diclac', 'sub': 'Diclofenacum natricum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['50 mg', '75 mg Duo', '150 mg Duo'], 'q': '1', 'inst': 'W trakcie lub po posiłku, nie dzielić'},
      {'name': 'Voltaren Acti Forte', 'sub': 'Diclofenacum kalicum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['25 mg'], 'q': '1', 'inst': 'Przed posiłkiem z wodą'},
      {'name': 'Nimesil', 'sub': 'Nimesulidum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['100 mg saszetki'], 'q': '1', 'inst': 'Po posiłku, rozpuścić w wodzie'},
      {'name': 'Pyralgina', 'sub': 'Metamizolum natricum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['500 mg'], 'q': '1', 'inst': 'W trakcie lub po posiłku'},
      {'name': 'Doreta', 'sub': 'Tramadoli hydrochloridum + Paracetamolum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['37.5 mg + 325 mg', '75 mg + 650 mg'], 'q': '1', 'inst': 'Ściśle wg wskazań lekarza'},
      {'name': 'Skudexa', 'sub': 'Tramadoli hydrochloridum + Dexketoprofenum', 'cat': 'Przeciwbólowe', 'type': 'capsule', 'doses': ['75 mg + 25 mg'], 'q': '1', 'inst': 'Popić dużą ilością płynu'},

      // Kardiologia i Nadciśnienie
      {'name': 'Prestarium', 'sub': 'Perindoprilum argininum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['2.5 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano na czczo przed śniadaniem'},
      {'name': 'Co-Prestarium', 'sub': 'Perindoprilum + Amlodipinum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5/5 mg', '10/5 mg', '10/10 mg'], 'q': '1', 'inst': 'Rano przed posiłkiem'},
      {'name': 'Concor COR', 'sub': 'Bisoprololi fumaras', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['1.25 mg', '2.5 mg', '3.75 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano podczas śniadania'},
      {'name': 'Bibloc', 'sub': 'Bisoprololi fumaras', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['1.25 mg', '2.5 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano o stałej porze'},
      {'name': 'Nedal', 'sub': 'Nebivololum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5 mg'], 'q': '1', 'inst': 'Rano o stałej porze'},
      {'name': 'Nebilet', 'sub': 'Nebivololum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5 mg'], 'q': '1', 'inst': 'Najlepiej podczas śniadania'},
      {'name': 'Betaloc ZOK', 'sub': 'Metoprololi succinas', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['25 mg', '50 mg', '100 mg'], 'q': '1', 'inst': 'Rano, nie rozgryzać'},
      {'name': 'Vivace', 'sub': 'Ramiprilum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['2.5 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano o stałej porze'},
      {'name': 'Tritace', 'sub': 'Ramiprilum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['2.5 mg', '5 mg', '10 mg'], 'q': '1', 'inst': 'Rano, popić wodą'},
      {'name': 'Amlopin', 'sub': 'Amlodipinum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5 mg', '10 mg'], 'q': '1', 'inst': 'Raz na dobę o stałej porze'},
      {'name': 'Tertensif SR', 'sub': 'Indapamidum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['1.5 mg'], 'q': '1', 'inst': 'Rano, w całości'},
      {'name': 'Atoris', 'sub': 'Atorvastatinum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['10 mg', '20 mg', '40 mg', '80 mg'], 'q': '1', 'inst': 'Wieczorem o stałej porze'},
      {'name': 'Roswera', 'sub': 'Rosuvastatinum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['5 mg', '10 mg', '20 mg', '40 mg'], 'q': '1', 'inst': 'Raz na dobę o dowolnej porze'},
      {'name': 'Acard', 'sub': 'Acidum acetylsalicylicum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['75 mg', '150 mg'], 'q': '1', 'inst': 'Po obiedzie lub po kolacji'},
      {'name': 'Polocard', 'sub': 'Acidum acetylsalicylicum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['75 mg', '150 mg'], 'q': '1', 'inst': 'Po posiłku w całości'},
      {'name': 'Eliquis', 'sub': 'Apixabanum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['2.5 mg', '5 mg'], 'q': '1', 'inst': 'Rano i wieczorem co 12h'},
      {'name': 'Xarelto', 'sub': 'Rivaroxabanum', 'cat': 'Kardiologia', 'type': 'capsule', 'doses': ['15 mg', '20 mg'], 'q': '1', 'inst': 'W trakcie głównego posiłku'},

      // Cukrzyca i Gastrologia
      {'name': 'Glucophage', 'sub': 'Metformini hydrochloridum', 'cat': 'Cukrzyca', 'type': 'capsule', 'doses': ['500 mg', '850 mg', '1000 mg', 'XR 500 mg', 'XR 750 mg', 'XR 1000 mg'], 'q': '1', 'inst': 'W trakcie lub po posiłku'},
      {'name': 'Metformax', 'sub': 'Metformini hydrochloridum', 'cat': 'Cukrzyca', 'type': 'capsule', 'doses': ['500 mg', '850 mg', '1000 mg', 'SR 500 mg', 'SR 1000 mg'], 'q': '1', 'inst': 'Wieczorem podczas kolacji'},
      {'name': 'Jardiance', 'sub': 'Empagliflozinum', 'cat': 'Cukrzyca', 'type': 'capsule', 'doses': ['10 mg', '25 mg'], 'q': '1', 'inst': 'Rano z posiłkiem lub bez'},
      {'name': 'Forxiga', 'sub': 'Dapagliflozinum', 'cat': 'Cukrzyca', 'type': 'capsule', 'doses': ['5 mg', '10 mg'], 'q': '1', 'inst': 'Raz na dobę o stałej porze'},
      {'name': 'Polprazol', 'sub': 'Omeprazolum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['20 mg', '40 mg'], 'q': '1', 'inst': 'Rano na czczo, 30 min przed śniadaniem'},
      {'name': 'Controloc', 'sub': 'Pantoprazolum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['20 mg', '40 mg'], 'q': '1', 'inst': 'Rano na czczo, nie rozgryzać'},
      {'name': 'Mesopral', 'sub': 'Esomeprazolum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['20 mg', '40 mg'], 'q': '1', 'inst': 'Rano przed śniadaniem'},
      {'name': 'No-Spa', 'sub': 'Drotaverini hydrochloridum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['40 mg', '80 mg Forte', '80 mg Max'], 'q': '1', 'inst': 'Doraźnie w skurczach'},
      {'name': 'Duspatalin Retard', 'sub': 'Mebeverini hydrochloridum', 'cat': 'Gastrologia', 'type': 'capsule', 'doses': ['200 mg'], 'q': '1', 'inst': '20 min przed posiłkiem'},

      // Układ oddechowy i Alergia
      {'name': 'Ventolin', 'sub': 'Salbutamolum', 'cat': 'Pulmonologia', 'type': 'inhaler', 'doses': ['100 µg aerozol'], 'q': '1', 'inst': 'Wziewnie w duszności, wstrząsnąć'},
      {'name': 'Berodual', 'sub': 'Fenoterolum + Ipratropium', 'cat': 'Pulmonologia', 'type': 'drops', 'doses': ['krople do nebulizacji'], 'q': '20', 'inst': 'Do nebulizacji z solą fizjologiczną'},
      {'name': 'Pulmicort', 'sub': 'Budesonidum', 'cat': 'Pulmonologia', 'type': 'ml', 'doses': ['0.25 mg/ml', '0.5 mg/ml'], 'q': '2', 'inst': 'W nebulizacji, wypłukać usta wodą'},
      {'name': 'Foster', 'sub': 'Beclometasoni dipropionas + Formoterolum', 'cat': 'Pulmonologia', 'type': 'inhaler', 'doses': ['100/6 µg', '200/6 µg'], 'q': '1', 'inst': 'Rano i wieczorem, wypłukać usta'},
      {'name': 'Symbicort Turbuhaler', 'sub': 'Budesonidum + Formoterolum', 'cat': 'Pulmonologia', 'type': 'inhaler', 'doses': ['80/4.5 µg', '160/4.5 µg', '320/9 µg'], 'q': '1', 'inst': 'Wziewnie rano i wieczorem'},
      {'name': 'Clatra', 'sub': 'Bilastinum', 'cat': 'Alergia', 'type': 'capsule', 'doses': ['20 mg'], 'q': '1', 'inst': 'Ściśle na czczo: 1h przed lub 2h po jedzeniu'},
      {'name': 'Xyzal', 'sub': 'Levocetirizinum', 'cat': 'Alergia', 'type': 'capsule', 'doses': ['5 mg'], 'q': '1', 'inst': 'Raz na dobę wieczorem'},
      {'name': 'Zyrtec', 'sub': 'Cetirizinum', 'cat': 'Alergia', 'type': 'capsule', 'doses': ['10 mg'], 'q': '1', 'inst': 'Wieczorem, popić wodą'},
      {'name': 'Hitaxa', 'sub': 'Desloratadinum', 'cat': 'Alergia', 'type': 'capsule', 'doses': ['5 mg'], 'q': '1', 'inst': 'Rozpuścić na języku'},

      // Okulistyka, Tarczyca, Neurologia
      {'name': 'Hyabak', 'sub': 'Natrii hyaluronas 0.15%', 'cat': 'Okulistyka', 'type': 'drops', 'doses': ['krople do oczu'], 'q': '1', 'inst': 'Zakroplić do worka spojówkowego'},
      {'name': 'Systane Ultra', 'sub': 'Krople nawilżające', 'cat': 'Okulistyka', 'type': 'drops', 'doses': ['krople do oczu'], 'q': '1', 'inst': '1-2 krople do każdego oka'},
      {'name': 'Thealoz Duo', 'sub': 'Trehalosum + Natrii hyaluronas', 'cat': 'Okulistyka', 'type': 'drops', 'doses': ['krople bez konserwantów'], 'q': '1', 'inst': '1 kropla 4-6 razy dziennie'},
      {'name': 'Tobradex', 'sub': 'Tobramycinum + Dexamethasonum', 'cat': 'Okulistyka', 'type': 'drops', 'doses': ['krople do oczu'], 'q': '1', 'inst': 'Wstrząsnąć, co 4-6h'},
      {'name': 'Euthyrox N', 'sub': 'Levothyroxinum natricum', 'cat': 'Endokrynologia', 'type': 'capsule', 'doses': ['25 µg', '50 µg', '75 µg', '88 µg', '100 µg', '112 µg', '125 µg', '150 µg', '175 µg', '200 µg'], 'q': '1', 'inst': 'Rano na czczo min. 30 min przed śniadaniem, sama woda'},
      {'name': 'Letrox', 'sub': 'Levothyroxinum natricum', 'cat': 'Endokrynologia', 'type': 'capsule', 'doses': ['50 µg', '75 µg', '100 µg', '125 µg', '150 µg'], 'q': '1', 'inst': 'Rano na czczo z małą ilością wody'},
      {'name': 'Pregabalin', 'sub': 'Pregabalinum', 'cat': 'Neurologia', 'type': 'capsule', 'doses': ['75 mg', '150 mg', '300 mg'], 'q': '1', 'inst': 'Rano i wieczorem o stałych porach'},
      {'name': 'Trittico CR', 'sub': 'Trazodoni hydrochloridum', 'cat': 'Psychiatria', 'type': 'capsule', 'doses': ['75 mg', '150 mg'], 'q': '1', 'inst': 'Wieczorem przed snem'},
      {'name': 'Milurit', 'sub': 'Allopurinolum', 'cat': 'Metabolizm', 'type': 'capsule', 'doses': ['100 mg', '200 mg', '300 mg'], 'q': '1', 'inst': 'Po posiłku, pić dużo płynów'},
      {'name': 'Magne B6 Forte', 'sub': 'Magnesium + B6', 'cat': 'Minerały', 'type': 'capsule', 'doses': ['100 mg Mg2+'], 'q': '1', 'inst': 'W trakcie posiłku, popić wodą'},
      {'name': 'Vigantoletten', 'sub': 'Cholecalciferolum (D3)', 'cat': 'Witaminy', 'type': 'capsule', 'doses': ['1000 j.m.', '2000 j.m.'], 'q': '1', 'inst': 'Podczas posiłku z tłuszczami'},
    ];

    for (final t in templates) {
      final doses = t['doses'] as List<String>;
      for (final d in doses) {
        list.add(RegisteredMedicine(
          id: 'med_\${id++}',
          name: '\${t['name']} $d',
          substance: t['sub'] as String,
          category: t['cat'] as String,
          defaultType: t['type'] as String,
          defaultDose: t['q'] as String,
          instructions: t['inst'] as String,
        ));
      }
    }

    return list;
  }

  static String _normalize(String s) {
    return s.toLowerCase()
        .replaceAll('ą', 'a')
        .replaceAll('ć', 'c')
        .replaceAll('ę', 'e')
        .replaceAll('ł', 'l')
        .replaceAll('ń', 'n')
        .replaceAll('ó', 'o')
        .replaceAll('ś', 's')
        .replaceAll('ź', 'z')
        .replaceAll('ż', 'z')
        .trim();
  }

  List<RegisteredMedicine> search(String query, {List<RegisteredMedicine> customMedicines = const [], int limit = 20}) {
    final q = _normalize(query);
    if (q.isEmpty) return [];

    final List<RegisteredMedicine> results = [];
    final all = [...customMedicines, ..._registry];

    for (final m in all) {
      final nameNorm = _normalize(m.name);
      final subNorm = _normalize(m.substance);
      final catNorm = _normalize(m.category);

      if (nameNorm.contains(q) || subNorm.contains(q) || catNorm.contains(q)) {
        results.add(m);
        if (results.length >= limit) break;
      }
    }

    results.sort((a, b) {
      final aStarts = _normalize(a.name).startsWith(q);
      final bStarts = _normalize(b.name).startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.compareTo(b.name);
    });

    return results;
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
import 'backup_sync_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime _currentDate = DateTime.now();
  List<DoseLog> _doses = [];
  bool _isLoading = true;

  // Kontroler wyszukiwania leków i terapii na dziś
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadDoses();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDoses() async {
    setState(() => _isLoading = true);
    final doses = await DatabaseService.instance.getDosesForDate(_currentDate);
    setState(() {
      _doses = doses;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE, d MMMM y', 'pl_PL');
    final total = _doses.length;
    final taken = _doses.where((d) => d.status == DoseStatus.taken).length;
    final progress = total > 0 ? (taken / total) : 1.0;

    // Filtrowanie dawek według wpisanej frazy wyszukiwania
    final filteredDoses = _doses.where((d) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.toLowerCase().trim();
      final name = (d.medicationName ?? '').toLowerCase();
      final therapy = (d.therapyName ?? '').toLowerCase();
      return name.contains(q) || therapy.contains(q);
    }).toList();

    // Podział przefiltrowanych dawek na pory dnia
    final morningDoses = filteredDoses.where((d) => d.effectiveTime.compareTo('12:00') < 0).toList();
    final afternoonDoses = filteredDoses.where((d) => d.effectiveTime.compareTo('12:00') >= 0 && d.effectiveTime.compareTo('18:00') < 0).toList();
    final eveningDoses = filteredDoses.where((d) => d.effectiveTime.compareTo('18:00') >= 0).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('MedPlaner - Dzisiaj', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.cloud_sync_outlined, color: Colors.teal),
            tooltip: 'Kopia zapasowa na Dysku Google',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const BackupSyncScreen()),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Karta podsumowania dnia
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [Colors.teal.shade700, Colors.teal.shade900]),
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
                        dateFormat.format(_currentDate).toUpperCase(),
                        style: TextStyle(color: Colors.teal.shade100, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '$taken z $total dawek przyjęte',
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '\${(progress * 100).toInt()}%',
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      LinearProgressIndicator(
                        value: progress,
                        backgroundColor: Colors.teal.shade900,
                        color: Colors.greenAccent,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Szybki pasek wyszukiwania leków i terapii
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Szukaj leku lub terapii...',
                      hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                      prefixIcon: const Icon(Icons.search, size: 20, color: Colors.teal),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18, color: Colors.grey),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ),

                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Harmonogram na dziś',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                    if (_searchQuery.isNotEmpty)
                      Text(
                        'Wyniki: \${filteredDoses.length}',
                        style: TextStyle(fontSize: 12, color: Colors.teal.shade800, fontWeight: FontWeight.bold),
                      ),
                  ],
                ),
                const SizedBox(height: 12),

                if (filteredDoses.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        Icon(
                          _searchQuery.isNotEmpty ? Icons.search_off : Icons.check_circle_outline,
                          size: 56,
                          color: Colors.teal.shade200,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          _searchQuery.isNotEmpty
                              ? 'Brak dawek pasujących do "$_searchQuery"'
                              : 'Brak zaplanowanych leków na dziś!',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        if (_searchQuery.isNotEmpty)
                          TextButton(
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            child: const Text('Wyczyść filtr wyszukiwania'),
                          )
                        else
                          const Text(
                            'Dodaj nową terapię lub lek przyciskiem poniżej.',
                            style: TextStyle(color: Colors.grey),
                          ),
                      ],
                    ),
                  )
                else ...[
                  // Sekcja: RANO
                  if (morningDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'RANO (do 12:00)',
                      icon: Icons.wb_sunny_outlined,
                      headerBg: const Color(0xFFFEF3C7),
                      iconColor: Colors.amber.shade800,
                      badgeBg: Colors.amber.shade100,
                      badgeColor: Colors.amber.shade900,
                      doses: morningDoses,
                    ),

                  // Sekcja: POPOŁUDNIE
                  if (afternoonDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'POPOŁUDNIE (12:00 - 18:00)',
                      icon: Icons.wb_sunny,
                      headerBg: const Color(0xFFE0F2FE),
                      iconColor: Colors.blue.shade700,
                      badgeBg: Colors.blue.shade100,
                      badgeColor: Colors.blue.shade900,
                      doses: afternoonDoses,
                    ),

                  // Sekcja: WIECZÓR I NOC
                  if (eveningDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'WIECZÓR I NOC (od 18:00)',
                      icon: Icons.nights_stay_outlined,
                      headerBg: const Color(0xFFEDE9FE),
                      iconColor: Colors.indigo.shade700,
                      badgeBg: Colors.indigo.shade100,
                      badgeColor: Colors.indigo.shade900,
                      doses: eveningDoses,
                    ),
                ],
              ],
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

  Widget _buildTimeOfDaySection({
    required String title,
    required IconData icon,
    required Color headerBg,
    required Color iconColor,
    required Color badgeBg,
    required Color badgeColor,
    required List<DoseLog> doses,
  }) {
    final takenCount = doses.where((d) => d.status == DoseStatus.taken).length;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: headerBg.withOpacity(0.35),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: headerBg),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(
              children: [
                Icon(icon, size: 18, color: iconColor),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: iconColor,
                    letterSpacing: 0.5,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$takenCount/\${doses.length} wzięte',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: badgeColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          ...doses.map((dose) => _buildDoseItem(dose)),
        ],
      ),
    );
  }

  Widget _buildDoseItem(DoseLog dose) {
    final isTaken = dose.status == DoseStatus.taken;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: isTaken ? Colors.green.shade100 : Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: isTaken ? Colors.green.shade50 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    dose.effectiveTime,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isTaken ? Colors.green.shade800 : Colors.black87,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dose.medicationName ?? 'Lek',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          decoration: isTaken ? TextDecoration.lineThrough : null,
                          color: isTaken ? Colors.grey.shade500 : Colors.black87,
                        ),
                      ),
                      Text(
                        'Dawka: \${dose.doseAmount ?? "1"} • \${dose.therapyName ?? "Terapia"}',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Text(
                  isTaken ? '✓ Wzięte' : (dose.status == DoseStatus.snoozed ? '⏱ Odłożone' : 'Oczekuje'),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isTaken ? Colors.green.shade700 : (dose.status == DoseStatus.snoozed ? Colors.amber.shade800 : Colors.grey.shade700),
                  ),
                ),
              ],
            ),
            if (!isTaken) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Wziąłem'),
                      onPressed: () async {
                        await DatabaseService.instance.markDoseAsTaken(dose.id);
                        _loadDoses();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.snooze, size: 16),
                      label: const Text('Odłóż'),
                      onPressed: () {
                        SnoozeBottomSheet.show(
                          context,
                          medicationName: dose.medicationName ?? 'Lek',
                          onSnoozeSelected: (mins) async {
                            await DatabaseService.instance.snoozeDose(dose.id, mins);
                            _loadDoses();
                          },
                        );
                      },
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
    path: 'lib/screens/therapies_screen.dart',
    name: 'therapies_screen.dart',
    category: 'screen',
    language: 'dart',
    description: 'Ekran zarządzania terapiami: lista aktywnych terapii, przypisane leki, edycja i bezpieczne usuwanie',
    content: `import 'package:flutter/material.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../services/database_service.dart';
import 'add_therapy_screen.dart';
import 'add_medication_screen.dart';

class TherapiesScreen extends StatefulWidget {
  const TherapiesScreen({super.key});

  @override
  State<TherapiesScreen> createState() => _TherapiesScreenState();
}

class _TherapiesScreenState extends State<TherapiesScreen> {
  List<Therapy> _therapies = [];
  List<Medication> _medications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final therapies = await DatabaseService.instance.getTherapies();
    final medications = await DatabaseService.instance.getAllMedications();
    setState(() {
      _therapies = therapies;
      _medications = medications;
      _isLoading = false;
    });
  }

  Future<void> _openAddTherapy([Therapy? therapy]) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => AddTherapyScreen(therapyToEdit: therapy)),
    );
    if (result == true || mounted) {
      _loadData();
    }
  }

  Future<void> _deleteTherapy(Therapy therapy) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Usunąć terapię?'),
        content: Text('Czy na pewno chcesz usunąć "\${therapy.name}" oraz wszystkie przypisane do niej leki?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Usuń', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await DatabaseService.instance.deleteTherapy(therapy.id);
      _loadData();
    }
  }

  Future<void> _deleteMedicationFromTherapy(Medication med, String therapyName) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.delete_outline, color: Colors.redAccent, size: 24),
            SizedBox(width: 8),
            Text('Usunąć lek z terapii?'),
          ],
        ),
        content: Text(
          'Czy na pewno chcesz usunąć lek "\${med.name}" z terapii "$therapyName"?\\n\\n'
          'Spowoduje to również usunięcie wszystkich zaplanowanych dla niego dawek z harmonogramu.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Anuluj'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Usuń lek'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await DatabaseService.instance.deleteMedication(med.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lek "\${med.name}" został usunięty.'),
            backgroundColor: Colors.teal.shade800,
            duration: const Duration(seconds: 3),
          ),
        );
        _loadData();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Moje Terapie', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: Colors.teal),
            tooltip: 'Dodaj terapię',
            onPressed: () => _openAddTherapy(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _therapies.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.healing_outlined, size: 64, color: Colors.teal.shade200),
                        const SizedBox(height: 16),
                        const Text(
                          'Brak zdefiniowanych terapii',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Utwórz pierwszą terapię (np. "Antybiotyk", "Krople do oczu"), aby przypisywać do niej leki.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.teal,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () => _openAddTherapy(),
                          icon: const Icon(Icons.add),
                          label: const Text('Dodaj pierwszą terapię'),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _therapies.length,
                  itemBuilder: (ctx, i) {
                    final therapy = _therapies[i];
                    final meds = _medications.where((m) => m.therapyId == therapy.id).toList();
                    Color therapyColor;
                    try {
                      therapyColor = Color(int.parse(therapy.colorHex.replaceFirst('#', '0xFF')));
                    } catch (_) {
                      therapyColor = Colors.teal;
                    }

                    return Card(
                      margin: const EdgeInsets.only(bottom: 14),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: Colors.grey.shade200),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 16,
                                  height: 16,
                                  decoration: BoxDecoration(
                                    color: therapyColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    therapy.name,
                                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 20, color: Colors.grey),
                                  onPressed: () => _openAddTherapy(therapy),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 20, color: Colors.redAccent),
                                  onPressed: () => _deleteTherapy(therapy),
                                ),
                              ],
                            ),
                            if (therapy.description != null && therapy.description!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                therapy.description!,
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                              ),
                            ],
                            const SizedBox(height: 12),
                            const Divider(height: 1),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Przypisane leki (\${meds.length})',
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                                TextButton.icon(
                                  style: TextButton.styleFrom(
                                    visualDensity: VisualDensity.compact,
                                    foregroundColor: Colors.teal,
                                  ),
                                  icon: const Icon(Icons.add, size: 16),
                                  label: const Text('Dodaj lek'),
                                  onPressed: () async {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => const AddMedicationScreen()),
                                    );
                                    _loadData();
                                  },
                                ),
                              ],
                            ),
                            if (meds.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Column(
                                children: meds.map((m) {
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 6),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.grey.shade200),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(6),
                                          decoration: BoxDecoration(
                                            color: Colors.teal.shade50,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Icon(Icons.medication_outlined, size: 18, color: Colors.teal.shade700),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                m.name,
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Dawka: \${m.formatDose()} • Godziny: \${m.times.join(", ")}',
                                                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                              ),
                                            ],
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                                          tooltip: 'Usuń lek z terapii',
                                          visualDensity: VisualDensity.compact,
                                          onPressed: () => _deleteMedicationFromTherapy(m, therapy.name),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Nowa Terapia'),
        onPressed: () => _openAddTherapy(),
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
import '../services/medication_registry_service.dart';
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

  List<TimeOfDay> _selectedTimes = [
    const TimeOfDay(hour: 8, minute: 0),
    const TimeOfDay(hour: 20, minute: 0),
  ];

  final List<int> _selectedDays = [1, 2, 3, 4, 5, 6, 7];

  // Baza leków URPL / NFZ - sugestie wyszukiwania
  List<RegisteredMedicine> _suggestions = [];
  RegisteredMedicine? _selectedRegistryItem;
  bool _showSuggestions = false;

  @override
  void initState() {
    super.initState();
    _loadTherapies();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _doseAmountController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  Future<void> _loadTherapies() async {
    final list = await DatabaseService.instance.getTherapies(activeOnly: true);
    setState(() {
      _therapies = list;
      if (list.isNotEmpty && _selectedTherapyId == null) {
        _selectedTherapyId = list.first.id;
      }
    });
  }

  void _onNameChanged(String val) {
    if (val.trim().length >= 2) {
      final results = MedicationRegistryService.instance.search(val.trim(), limit: 6);
      setState(() {
        _suggestions = results;
        _showSuggestions = true;
      });
    } else {
      setState(() {
        _suggestions = [];
        _showSuggestions = false;
      });
    }
  }

  void _selectMedicine(RegisteredMedicine med) {
    setState(() {
      _nameController.text = med.name;
      _selectedRegistryItem = med;
      _showSuggestions = false;
      _suggestions = [];

      // Automatyczne podpowiadanie postaci, dawki i instrukcji
      _selectedType = MedicationType.fromString(med.defaultType);
      _doseAmountController.text = med.defaultDose;
      if (med.instructions.isNotEmpty) {
        _instructionsController.text = med.instructions;
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Uzupełniono dane leku: \${med.name}'),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.teal.shade800,
      ),
    );
  }

  void _useCustomMedicineName(String customName) {
    setState(() {
      _nameController.text = customName.trim();
      _selectedRegistryItem = null;
      _showSuggestions = false;
      _suggestions = [];
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
      return '$h:$m';
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
    final queryText = _nameController.text.trim();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dodaj Lek do Terapii'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Wybór Terapii
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

            // Wyszukiwarka leków z bazy URPL / NFZ z autouzupełnianiem
            TextFormField(
              controller: _nameController,
              onChanged: _onNameChanged,
              decoration: InputDecoration(
                labelText: 'Nazwa Leku *',
                hintText: 'Wpisz np. Paracetamol, Amotaks, Ventolin...',
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.medication, color: Colors.teal),
                suffixIcon: _nameController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _nameController.clear();
                          setState(() {
                            _selectedRegistryItem = null;
                            _showSuggestions = false;
                            _suggestions = [];
                          });
                        },
                      )
                    : null,
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Wprowadź nazwę leku' : null,
            ),

            // Karta informacyjna o wybranym leku z bazy
            if (_selectedRegistryItem != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.teal.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.teal.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.verified, size: 18, color: Colors.teal.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Oficjalna baza URPL / NFZ: \${_selectedRegistryItem!.substance}',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.teal.shade900),
                          ),
                          Text(
                            'Kategoria: \${_selectedRegistryItem!.category}',
                            style: TextStyle(fontSize: 11, color: Colors.teal.shade700),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 16),
                      tooltip: 'Wyczyść powiązanie',
                      onPressed: () => setState(() => _selectedRegistryItem = null),
                    ),
                  ],
                ),
              ),
            ],

            // Lista podpowiedzi wyszukiwania z bazy leków
            if (_showSuggestions && queryText.length >= 2) ...[
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.teal.shade100),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: Row(
                        children: [
                          Icon(Icons.library_books, size: 14, color: Colors.teal.shade700),
                          const SizedBox(width: 6),
                          Text(
                            'Podpowiedzi z rejestru leków (\${_suggestions.length}):',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.teal.shade800),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    if (_suggestions.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          'Brak leku w urzędowym spisie dla "$queryText".',
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                        ),
                      )
                    else
                      ..._suggestions.map((item) {
                        return ListTile(
                          dense: true,
                          title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          subtitle: Text(
                            '\${item.substance} • \${item.category} (domyślnie: \${item.defaultDose})',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                          trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.teal),
                          onTap: () => _selectMedicine(item),
                        );
                      }),
                    // Koło ratunkowe – dodawanie własnego leku
                    const Divider(height: 1),
                    InkWell(
                      onTap: () => _useCustomMedicineName(queryText),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        color: Colors.grey.shade50,
                        child: Row(
                          children: [
                            const Icon(Icons.add_circle_outline, size: 18, color: Colors.teal),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '+ Użyj "$queryText" jako własny lek (spoza bazy)',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.teal),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Godziny dawkowania', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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
                  label: Text('$h:$m', style: const TextStyle(fontWeight: FontWeight.bold)),
                  deleteIcon: const Icon(Icons.close, size: 16),
                  onDeleted: _selectedTimes.length > 1
                      ? () => setState(() => _selectedTimes.remove(t))
                      : null,
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
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
    path: 'lib/screens/backup_sync_screen.dart',
    name: 'backup_sync_screen.dart',
    category: 'screen',
    language: 'dart',
    description: 'Ekran bezpiecznej kopii zapasowej w chmurze z edukacją o prywatności (offline-first, drive.file, brak serwerów twórcy)',
    content: `import 'package:flutter/material.dart';
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
        _statusMessage = 'Zalogowano pomyślnie jako \${user.email}';
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
          'Przywrócenie kopii z Dysku Google zastąpi obecną lokalną bazę leków i terapii plikiem "medplaner-backup.db".\\n\\nCzy na pewno chcesz kontynuować?',
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
        _statusMessage = 'Wyeksportowano lokalną kopię: \${file.path} ($sizeKb KB). Plik bazy został bezpiecznie zapisany.';
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
          'Przywrócenie lokalnego pliku "medplaner-backup.db" nadpisze bieżącą bazę danych na telefonie.\\n\\nCzy chcesz kontynuować?',
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
                '1. Wejdź na konsolę Google Cloud:\\nconsole.cloud.google.com/apis/credentials\\n\\n'
                '2. Kliknij "+ UTWÓRZ DANE LOGOWANIA" -> "Identyfikator klienta OAuth".\\n\\n'
                '3. Wybierz typ: "Android".\\n\\n'
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
                'lub uruchom polecenie w katalogu projektu: ./gradlew signingReport.\\n\\n'
                '6. Kliknij "Utwórz". Zmiany zaczną obowiązywać w ciągu kilku minut.\\n\\n'
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
                  '1. MedPlaner działa w 100% lokalnie (offline) w pamięci Twojego urządzenia.\\n'
                  '2. Kopia zapasowa w chmurze jest całkowicie opcjonalna – korzystasz z niej tylko wtedy, gdy sam zdecydujesz.\\n'
                  '3. Twoja baza medyczna trafia WYŁĄCZNIE na Twój prywatny Dysk Google do dedykowanego folderu ("MedPlaner Kopia Zapasowa").\\n'
                  '4. Twórca aplikacji ani nikt inny NIE MA DOSTĘPU do Twoich danych – nie prowadzimy żadnego centralnego serwera.\\n'
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
                                  'Ostatnia kopia: \${_latestBackup!.name}',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.teal.shade900),
                                ),
                                Text(
                                  '\${dateFormat.format(_latestBackup!.modifiedTime.toLocal())} • \${_latestBackup!.formattedSize}',
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
import 'screens/therapies_screen.dart';
import 'screens/backup_sync_screen.dart';
import 'services/database_service.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pl_PL', null);

  await DatabaseService.instance.database;
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
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
      ),
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _idx = 0;
  final List<Widget> _screens = const [
    HomeScreen(),
    CalendarScreen(),
    TherapiesScreen(),
    BackupSyncScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_idx],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _idx,
        onDestinationSelected: (i) => setState(() => _idx = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today), label: 'Dziś'),
          NavigationDestination(icon: Icon(Icons.calendar_month), label: 'Kalendarz'),
          NavigationDestination(icon: Icon(Icons.healing), label: 'Terapie'),
          NavigationDestination(icon: Icon(Icons.cloud_sync_outlined), label: 'Kopia & Dysk'),
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
