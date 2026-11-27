import 'dart:convert';

class MedicationChange {
  final String id;
  final String medicationId;
  final String therapyId;
  final String profileName;
  final String medicationName;
  final DateTime changedAt;
  final String previousDose;
  final String newDose;
  final List<String> previousTimes;
  final List<String> newTimes;
  final String changeType; // dose_change | schedule_change | status_change | general_edit
  final String? changeReason;

  const MedicationChange({
    required this.id,
    required this.medicationId,
    required this.therapyId,
    required this.profileName,
    required this.medicationName,
    required this.changedAt,
    required this.previousDose,
    required this.newDose,
    this.previousTimes = const [],
    this.newTimes = const [],
    this.changeType = 'dose_change',
    this.changeReason,
  });

  String get changeTypeLabel {
    switch (changeType) {
      case 'dose_change':
        return 'Zmiana dawki';
      case 'schedule_change':
        return 'Zmiana harmonogramu';
      case 'status_change':
        return 'Zmiana statusu terapii';
      default:
        return 'Edycja leku';
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'medication_id': medicationId,
      'therapy_id': therapyId,
      'profile_name': profileName,
      'medication_name': medicationName,
      'changed_at': changedAt.toIso8601String(),
      'previous_dose': previousDose,
      'new_dose': newDose,
      'previous_times_json': jsonEncode(previousTimes),
      'new_times_json': jsonEncode(newTimes),
      'change_type': changeType,
      'change_reason': changeReason,
    };
  }

  factory MedicationChange.fromMap(Map<String, dynamic> map) {
    List<String> parseTimes(dynamic raw) {
      if (raw is List) return raw.map((e) => e.toString()).toList();
      if (raw is String && raw.trim().isNotEmpty) {
        try {
          final decoded = jsonDecode(raw);
          if (decoded is List) return decoded.map((e) => e.toString()).toList();
        } catch (_) {}
      }
      return const [];
    }

    return MedicationChange(
      id: (map['id'] as String?) ?? '',
      medicationId: (map['medication_id'] as String?) ?? '',
      therapyId: (map['therapy_id'] as String?) ?? '',
      profileName: (map['profile_name'] as String?) ?? 'Mój profil',
      medicationName: (map['medication_name'] as String?) ?? 'Lek',
      changedAt: DateTime.tryParse((map['changed_at'] as String?) ?? '') ?? DateTime.now(),
      previousDose: (map['previous_dose'] as String?) ?? '',
      newDose: (map['new_dose'] as String?) ?? '',
      previousTimes: parseTimes(map['previous_times_json']),
      newTimes: parseTimes(map['new_times_json']),
      changeType: (map['change_type'] as String?) ?? 'dose_change',
      changeReason: map['change_reason'] as String?,
    );
  }
}
