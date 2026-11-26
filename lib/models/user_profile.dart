class UserProfile {
  final String id;
  final String name;
  final String colorHex;
  final bool isDefault;
  final DateTime createdAt;

  const UserProfile({
    required this.id,
    required this.name,
    this.colorHex = '#0F766E',
    this.isDefault = false,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'color_hex': colorHex,
      'is_default': isDefault ? 1 : 0,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      id: map['id'] as String,
      name: map['name'] as String,
      colorHex: (map['color_hex'] as String?) ?? '#0F766E',
      isDefault: ((map['is_default'] as int?) ?? 0) == 1,
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'] as String)
          : DateTime.now(),
    );
  }
}
