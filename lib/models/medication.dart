import 'dart:convert';

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
  final String doseAmount;
  final String? instructions;
  final List<String> times;
  final ScheduleType scheduleType;
  final List<int> selectedDays;
  final DateTime startDate;
  final DateTime? endDate;
  final double? stockQuantity;
  final double? packageSize;
  final double lowStockThreshold;
  final DateTime? expiryDate;

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
    this.stockQuantity,
    this.packageSize,
    this.lowStockThreshold = 5,
    this.expiryDate,
  });

  Medication copyWith({
    String? id,
    String? therapyId,
    String? name,
    MedicationType? type,
    String? doseAmount,
    String? instructions,
    bool clearInstructions = false,
    List<String>? times,
    ScheduleType? scheduleType,
    List<int>? selectedDays,
    DateTime? startDate,
    DateTime? endDate,
    bool clearEndDate = false,
    double? stockQuantity,
    double? packageSize,
    double? lowStockThreshold,
    DateTime? expiryDate,
    bool clearExpiryDate = false,
  }) {
    return Medication(
      id: id ?? this.id,
      therapyId: therapyId ?? this.therapyId,
      name: name ?? this.name,
      type: type ?? this.type,
      doseAmount: doseAmount ?? this.doseAmount,
      instructions: clearInstructions ? null : (instructions ?? this.instructions),
      times: times ?? this.times,
      scheduleType: scheduleType ?? this.scheduleType,
      selectedDays: selectedDays ?? this.selectedDays,
      startDate: startDate ?? this.startDate,
      endDate: clearEndDate ? null : (endDate ?? this.endDate),
      stockQuantity: stockQuantity ?? this.stockQuantity,
      packageSize: packageSize ?? this.packageSize,
      lowStockThreshold: lowStockThreshold ?? this.lowStockThreshold,
      expiryDate: clearExpiryDate ? null : (expiryDate ?? this.expiryDate),
    );
  }

  String formatDose() {
    final trimmed = doseAmount.trim();
    if (RegExp(r'[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]').hasMatch(trimmed)) {
      return trimmed;
    }
    return '$trimmed ${type.shortUnit}';
  }

  bool get isLowStock => stockQuantity != null && stockQuantity! <= lowStockThreshold;

  static String _formatYmd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

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
      'start_date': _formatYmd(startDate),
      'end_date': endDate != null ? _formatYmd(endDate!) : null,
      'stock_quantity': stockQuantity,
      'package_size': packageSize,
      'low_stock_threshold': lowStockThreshold,
      'expiry_date': expiryDate != null ? _formatYmd(expiryDate!) : null,
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
      stockQuantity: (map['stock_quantity'] as num?)?.toDouble(),
      packageSize: (map['package_size'] as num?)?.toDouble(),
      lowStockThreshold: (map['low_stock_threshold'] as num?)?.toDouble() ?? 5.0,
      expiryDate: map['expiry_date'] != null ? DateTime.parse(map['expiry_date'] as String) : null,
    );
  }
}
