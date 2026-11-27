class Therapy {
  final String id;
  final String name;
  final String? description;
  final String colorHex;
  final String iconName;
  final String profileName;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool isActive;
  final DateTime createdAt;

  Therapy({
    required this.id,
    required this.name,
    this.description,
    this.colorHex = '#10B981',
    this.iconName = 'medical_services',
    this.profileName = 'Mój profil',
    this.startDate,
    this.endDate,
    this.isActive = true,
    required this.createdAt,
  });

  Therapy copyWith({
    String? id,
    String? name,
    String? description,
    bool clearDescription = false,
    String? colorHex,
    String? iconName,
    String? profileName,
    DateTime? startDate,
    bool clearStartDate = false,
    DateTime? endDate,
    bool clearEndDate = false,
    bool? isActive,
    DateTime? createdAt,
  }) {
    return Therapy(
      id: id ?? this.id,
      name: name ?? this.name,
      description: clearDescription ? null : (description ?? this.description),
      colorHex: colorHex ?? this.colorHex,
      iconName: iconName ?? this.iconName,
      profileName: profileName ?? this.profileName,
      startDate: clearStartDate ? null : (startDate ?? this.startDate),
      endDate: clearEndDate ? null : (endDate ?? this.endDate),
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  static String _formatYmd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'color_hex': colorHex,
      'icon_name': iconName,
      'profile_name': profileName,
      'start_date': startDate != null ? _formatYmd(startDate!) : '',
      'end_date': endDate != null ? _formatYmd(endDate!) : null,
      'is_active': isActive ? 1 : 0,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory Therapy.fromMap(Map<String, dynamic> map) {
    final rawStart = map['start_date'] as String?;
    final rawEnd = map['end_date'] as String?;
    final rawCreated = map['created_at'] as String?;

    return Therapy(
      id: map['id'] as String,
      name: map['name'] as String,
      description: map['description'] as String?,
      colorHex: (map['color_hex'] as String?) ?? '#10B981',
      iconName: (map['icon_name'] as String?) ?? 'medical_services',
      profileName: (map['profile_name'] as String?) ?? 'Mój profil',
      startDate: (rawStart != null && rawStart.trim().isNotEmpty)
          ? DateTime.tryParse(rawStart.trim())
          : null,
      endDate: (rawEnd != null && rawEnd.trim().isNotEmpty)
          ? DateTime.tryParse(rawEnd.trim())
          : null,
      isActive: ((map['is_active'] as int?) ?? 1) == 1,
      createdAt: (rawCreated != null && rawCreated.trim().isNotEmpty)
          ? (DateTime.tryParse(rawCreated) ?? DateTime.now())
          : DateTime.now(),
    );
  }
}
