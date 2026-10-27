class Therapy {
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
}
