import 'package:flutter/material.dart';
import '../models/user_profile.dart';
import '../services/database_service.dart';

Color parseProfileColor(String hex) {
  try {
    return Color(int.parse(hex.replaceFirst('#', '0xFF')));
  } catch (_) {
    return const Color(0xFF0F766E);
  }
}

const List<String> profileColorPalette = [
  '#0F766E',
  '#8B5CF6',
  '#3B82F6',
  '#EC4899',
  '#F59E0B',
  '#EF4444',
];

class ProfileFilterBar extends StatelessWidget {
  final List<UserProfile> profiles;
  final String? selectedProfile;
  final ValueChanged<String?> onSelected;
  final VoidCallback onManagePressed;

  const ProfileFilterBar({
    super.key,
    required this.profiles,
    required this.selectedProfile,
    required this.onSelected,
    required this.onManagePressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: const Text(
                'Wszyscy',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              selected: selectedProfile == null,
              selectedColor: const Color(0xFF0F766E),
              backgroundColor: Colors.white,
              labelStyle: TextStyle(
                color: selectedProfile == null ? Colors.white : Colors.black87,
              ),
              side: BorderSide(
                color: selectedProfile == null ? const Color(0xFF0F766E) : Colors.grey.shade300,
              ),
              showCheckmark: false,
              onSelected: (_) => onSelected(null),
            ),
          ),
          ...profiles.map((p) {
            final isSelected = selectedProfile == p.name;
            final dotColor = parseProfileColor(p.colorHex);
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                avatar: Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white : dotColor,
                    shape: BoxShape.circle,
                  ),
                ),
                label: Text(
                  p.name,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : Colors.black87,
                  ),
                ),
                selected: isSelected,
                selectedColor: dotColor,
                backgroundColor: Colors.white,
                side: BorderSide(
                  color: isSelected ? dotColor : Colors.grey.shade300,
                ),
                showCheckmark: false,
                onSelected: (_) => onSelected(p.name),
              ),
            );
          }),
          ActionChip(
            avatar: const Icon(Icons.person_add_alt_1, size: 16, color: Color(0xFF0F766E)),
            label: const Text(
              'Osoby',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F766E),
              ),
            ),
            backgroundColor: Colors.teal.shade50,
            side: BorderSide(color: Colors.teal.shade200),
            onPressed: onManagePressed,
          ),
        ],
      ),
    );
  }
}

class QuickAddProfileDialog {
  static Future<UserProfile?> show(BuildContext context) async {
    final nameController = TextEditingController();
    final existing = await DatabaseService.instance.getProfiles();
    String selectedColor = profileColorPalette[existing.length % profileColorPalette.length];
    String? errorText;

    if (!context.mounted) {
      nameController.dispose();
      return null;
    }

    final result = await showDialog<UserProfile>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.person_add_alt_1, color: Color(0xFF0F766E), size: 22),
              SizedBox(width: 8),
              Text(
                'Nowy profil osoby',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: nameController,
                autofocus: true,
                textInputAction: TextInputAction.done,
                onChanged: (_) {
                  if (errorText != null) {
                    setDialogState(() => errorText = null);
                  }
                },
                decoration: InputDecoration(
                  labelText: 'Imię lub nazwa profilu *',
                  hintText: 'Np. Babcia, Marek, Zosia...',
                  border: const OutlineInputBorder(),
                  errorText: errorText,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Kolor profilu:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                children: profileColorPalette.map((hex) {
                  final color = parseProfileColor(hex);
                  final active = selectedColor == hex;
                  return GestureDetector(
                    onTap: () => setDialogState(() => selectedColor = hex),
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: active ? Border.all(color: Colors.black, width: 2.5) : null,
                      ),
                      child: active ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, null),
              child: const Text('Anuluj'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F766E),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                final trimmed = nameController.text.trim();
                if (trimmed.isEmpty) {
                  setDialogState(() => errorText = 'Wpisz imię lub nazwę profilu.');
                  return;
                }
                final normalized = trimmed.toLowerCase();
                if (existing.any((p) => p.name.trim().toLowerCase() == normalized)) {
                  setDialogState(() => errorText = 'Profil o nazwie "$trimmed" już istnieje.');
                  return;
                }
                try {
                  final created = await DatabaseService.instance.insertProfile(
                    trimmed,
                    colorHex: selectedColor,
                  );
                  if (ctx.mounted) Navigator.pop(ctx, created);
                } catch (e) {
                  setDialogState(() {
                    errorText = e.toString().replaceFirst('Exception: ', '');
                  });
                }
              },
              child: const Text('Dodaj i wybierz'),
            ),
          ],
        ),
      ),
    );

    nameController.dispose();
    return result;
  }
}

class ProfileManagerSheet extends StatefulWidget {
  final ValueChanged<String>? onProfileCreated;

  const ProfileManagerSheet({super.key, this.onProfileCreated});

  static Future<void> show(
    BuildContext context, {
    ValueChanged<String>? onProfileCreated,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => ProfileManagerSheet(onProfileCreated: onProfileCreated),
    );
  }

  @override
  State<ProfileManagerSheet> createState() => _ProfileManagerSheetState();
}

class _ProfileManagerSheetState extends State<ProfileManagerSheet> {
  final _nameController = TextEditingController();
  String _selectedColor = '#0F766E';
  List<UserProfile> _profiles = [];
  Map<String, int> _therapyCounts = {};
  Map<String, int> _medicationCounts = {};
  bool _isLoading = true;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _loadProfiles();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _loadProfiles() async {
    final profiles = await DatabaseService.instance.getProfiles();
    final therapies = await DatabaseService.instance.getTherapies();
    final meds = await DatabaseService.instance.getAllMedications();

    final tCounts = <String, int>{};
    final therapyProfileMap = <String, String>{};
    for (final t in therapies) {
      tCounts[t.profileName] = (tCounts[t.profileName] ?? 0) + 1;
      therapyProfileMap[t.id] = t.profileName;
    }

    final mCounts = <String, int>{};
    for (final m in meds) {
      final pName = therapyProfileMap[m.therapyId];
      if (pName != null) {
        mCounts[pName] = (mCounts[pName] ?? 0) + 1;
      }
    }

    if (!mounted) return;
    setState(() {
      _profiles = profiles;
      _therapyCounts = tCounts;
      _medicationCounts = mCounts;
      _isLoading = false;
    });
  }

  bool _isDuplicateName(String candidate, {String? excludeId}) {
    final normalized = candidate.trim().toLowerCase();
    return _profiles.any(
      (p) => p.id != excludeId && p.name.trim().toLowerCase() == normalized,
    );
  }

  Future<void> _addProfile() async {
    final raw = _nameController.text.trim();
    if (raw.isEmpty) {
      setState(() => _errorMsg = 'Wpisz imię lub nazwę profilu.');
      return;
    }
    if (_isDuplicateName(raw)) {
      setState(() => _errorMsg = 'Profil o nazwie "$raw" już istnieje.');
      return;
    }

    try {
      final created = await DatabaseService.instance.insertProfile(
        raw,
        colorHex: _selectedColor,
      );
      _nameController.clear();
      setState(() => _errorMsg = null);
      await _loadProfiles();
      widget.onProfileCreated?.call(created.name);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Dodano użytkownika: ${created.name}'),
            backgroundColor: Colors.teal.shade800,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMsg = e.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  Future<void> _editProfileDialog(UserProfile profile) async {
    final editController = TextEditingController(text: profile.name);
    String editColor = profile.colorHex;
    String? dialogError;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text(
            'Edytuj użytkownika',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: editController,
                autofocus: true,
                onChanged: (_) {
                  if (dialogError != null) {
                    setDialogState(() => dialogError = null);
                  }
                },
                decoration: InputDecoration(
                  labelText: 'Nazwa / Imię',
                  border: const OutlineInputBorder(),
                  errorText: dialogError,
                ),
              ),
              const SizedBox(height: 14),
              const Text('Kolor profilu:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                children: profileColorPalette.map((hex) {
                  final color = parseProfileColor(hex);
                  final active = editColor == hex;
                  return GestureDetector(
                    onTap: () => setDialogState(() => editColor = hex),
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: active ? Border.all(color: Colors.black, width: 2.5) : null,
                      ),
                      child: active ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Anuluj'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F766E),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                final trimmed = editController.text.trim();
                if (trimmed.isEmpty) {
                  setDialogState(() => dialogError = 'Nazwa użytkownika nie może być pusta.');
                  return;
                }
                if (_isDuplicateName(trimmed, excludeId: profile.id)) {
                  setDialogState(() => dialogError = 'Profil o nazwie "$trimmed" już istnieje.');
                  return;
                }
                try {
                  await DatabaseService.instance.updateProfile(
                    profile,
                    name: trimmed,
                    colorHex: editColor,
                  );
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } catch (e) {
                  setDialogState(() {
                    dialogError = e.toString().replaceFirst('Exception: ', '');
                  });
                }
              },
              child: const Text('Zapisz'),
            ),
          ],
        ),
      ),
    );

    editController.dispose();
    if (saved == true) {
      await _loadProfiles();
    }
  }

  Future<void> _deleteProfile(UserProfile profile) async {
    if (_profiles.length <= 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Musi pozostać co najmniej jeden profil.')),
      );
      return;
    }

    final therapyCount = _therapyCounts[profile.name] ?? 0;
    final medCount = _medicationCounts[profile.name] ?? 0;
    final remaining = _profiles.where((p) => p.id != profile.id).toList();
    String selectedTarget = remaining
        .firstWhere((p) => p.isDefault, orElse: () => remaining.first)
        .name;
    bool deleteAllData = false;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Usunąć użytkownika?', style: TextStyle(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (therapyCount == 0 && medCount == 0)
                Text('Czy na pewno chcesz usunąć profil "${profile.name}"?')
              else ...[
                Text(
                  'Profil "${profile.name}" ma przypisane terapie ($therapyCount) oraz leki ($medCount). Wybierz sposób postępowania:',
                  style: const TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 12),
                RadioListTile<bool>(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  value: false,
                  groupValue: deleteAllData,
                  title: const Text('Przenieś terapie na inny profil', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  onChanged: (val) => setDialogState(() => deleteAllData = val ?? false),
                ),
                if (!deleteAllData)
                  Padding(
                    padding: const EdgeInsets.only(left: 12, bottom: 8),
                    child: DropdownButtonFormField<String>(
                      value: selectedTarget,
                      decoration: const InputDecoration(
                        labelText: 'Docelowy profil',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      items: remaining
                          .map((p) => DropdownMenuItem(value: p.name, child: Text(p.name)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setDialogState(() => selectedTarget = val);
                      },
                    ),
                  ),
                RadioListTile<bool>(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  value: true,
                  groupValue: deleteAllData,
                  title: const Text(
                    'Usuń profil wraz z powiązanymi danymi',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.redAccent),
                  ),
                  subtitle: const Text(
                    'Usunie wszystkie przypisane terapie, leki i historię dawek.',
                    style: TextStyle(fontSize: 11),
                  ),
                  onChanged: (val) => setDialogState(() => deleteAllData = val ?? true),
                ),
              ],
            ],
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
              child: Text(deleteAllData ? 'Usuń wszystko' : 'Usuń profil'),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      await DatabaseService.instance.deleteProfile(
        profile,
        transferToProfileName: deleteAllData ? null : selectedTarget,
        deleteRelatedData: deleteAllData,
      );
      await _loadProfiles();
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottomInset),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.82,
        ),
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
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.people_outline, color: Color(0xFF0F766E)),
                    SizedBox(width: 8),
                    Text(
                      'Użytkownicy i Profile',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF4F7F7),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Dodaj nową osobę',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _nameController,
                          textInputAction: TextInputAction.done,
                          onChanged: (_) {
                            if (_errorMsg != null) setState(() => _errorMsg = null);
                          },
                          onSubmitted: (_) => _addProfile(),
                          decoration: InputDecoration(
                            hintText: 'Np. Babcia, Marek, Córka...',
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            errorText: _errorMsg,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F766E),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _addProfile,
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Dodaj', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text('Kolor:', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                      const SizedBox(width: 10),
                      ...profileColorPalette.map((hex) {
                        final color = parseProfileColor(hex);
                        final selected = _selectedColor == hex;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedColor = hex),
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                              border: selected ? Border.all(color: Colors.black, width: 2.5) : null,
                            ),
                            child: selected ? const Icon(Icons.check, color: Colors.white, size: 14) : null,
                          ),
                        );
                      }),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Zapisane profile (${_profiles.length})',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey.shade800),
            ),
            const SizedBox(height: 8),
            Flexible(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.separated(
                      shrinkWrap: true,
                      itemCount: _profiles.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (ctx, idx) {
                        final p = _profiles[idx];
                        final tCount = _therapyCounts[p.name] ?? 0;
                        final mCount = _medicationCounts[p.name] ?? 0;
                        final color = parseProfileColor(p.colorHex);
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: color.withAlpha(30),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(Icons.person, color: color, size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      p.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    Text(
                                      'Terapie: $tCount · Leki: $mCount',
                                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.edit_outlined, size: 19, color: Colors.grey),
                                tooltip: 'Edytuj nazwę lub kolor',
                                onPressed: () => _editProfileDialog(p),
                              ),
                              if (_profiles.length > 1)
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 19, color: Colors.redAccent),
                                  tooltip: 'Usuń użytkownika',
                                  onPressed: () => _deleteProfile(p),
                                ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
