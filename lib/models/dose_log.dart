import 'medication.dart';

enum DoseStatus {
  pending,  // Oczekuje
  taken,    // Wzięte
  snoozed,  // Odroczone
  skipped;  // Pominięte

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
  final String scheduledDate;
  final String scheduledTime;
  final DateTime? actualTakenTime;
  final DoseStatus status;
  final String? snoozedUntil;
  final int snoozeCount;
  final String? notes;
  final String? doseSnapshot;
  final String? typeSnapshot;
  final String? medicationNameSnapshot;

  final String? medicationName;
  final String? therapyName;
  final String? doseAmount;
  final String? medicationType;
  final String? instructions;
  final String? therapyColorHex;
  final String? profileName;

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
    this.doseSnapshot,
    this.typeSnapshot,
    this.medicationNameSnapshot,
    this.medicationName,
    this.therapyName,
    this.doseAmount,
    this.medicationType,
    this.instructions,
    this.therapyColorHex,
    this.profileName,
  });

  String get effectiveTime =>
      (status == DoseStatus.snoozed && snoozedUntil != null) ? snoozedUntil! : scheduledTime;

  String get formattedDose {
    final raw = (doseSnapshot ?? doseAmount ?? '1').trim();
    if (RegExp(r'[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]').hasMatch(raw)) {
      return raw;
    }
    final medType = MedicationType.fromString(typeSnapshot ?? medicationType ?? 'capsule');
    return '$raw ${medType.shortUnit}';
  }

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
      'dose_snapshot': doseSnapshot,
      'type_snapshot': typeSnapshot,
      'medication_name_snapshot': medicationNameSnapshot,
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
      doseSnapshot: map['dose_snapshot'] as String?,
      typeSnapshot: map['type_snapshot'] as String?,
      medicationNameSnapshot: map['medication_name_snapshot'] as String?,
      medicationName: map['medication_name'] as String?,
      therapyName: map['therapy_name'] as String?,
      doseAmount: map['dose_amount'] as String?,
      medicationType: map['medication_type'] as String?,
      instructions: map['instructions'] as String?,
      therapyColorHex: map['therapy_color_hex'] as String?,
      profileName: map['profile_name'] as String?,
    );
  }
}
