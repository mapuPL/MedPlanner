import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/therapy.dart';
import '../models/user_profile.dart';
import '../services/database_service.dart';
import '../widgets/profile_manager_sheet.dart';

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
  String _selectedProfile = 'Mój profil';

  List<UserProfile> _profiles = [];

  final List<String> _colorOptions = [
    '#10B981',
    '#3B82F6',
    '#8B5CF6',
    '#F59E0B',
    '#EC4899',
    '#EF4444',
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
      _selectedProfile = widget.therapyToEdit!.profileName;
    } else if (DatabaseService.instance.selectedProfileNotifier.value != null) {
      _selectedProfile = DatabaseService.instance.selectedProfileNotifier.value!;
    }
    _loadProfiles();
  }

  Future<void> _loadProfiles({String? selectName}) async {
    final loaded = await DatabaseService.instance.getProfiles();
    if (!mounted) return;
    setState(() {
      _profiles = loaded;
      final candidate = selectName ?? _selectedProfile;
      if (loaded.any((p) => p.name == candidate)) {
        _selectedProfile = candidate;
      } else if (loaded.isNotEmpty) {
        _selectedProfile = loaded.first.name;
      }
    });
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
      profileName: _selectedProfile,
      startDate: _startDate,
      endDate: _endDate,
      isActive: true,
      createdAt: widget.therapyToEdit?.createdAt ?? DateTime.now(),
    );

    await DatabaseService.instance.insertTherapy(therapy);
    if (mounted) {
      if (Navigator.canPop(context)) {
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✓ Zapisano terapię: ${therapy.name}'),
            backgroundColor: Colors.teal.shade700,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileNames = _profiles.map((p) => p.name).toList();
    final dropdownValue = profileNames.contains(_selectedProfile)
        ? _selectedProfile
        : (profileNames.isNotEmpty ? profileNames.first : null);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.therapyToEdit == null ? 'Nowa Terapia' : 'Edytuj Terapię'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: dropdownValue,
                    decoration: const InputDecoration(
                      labelText: 'Profil osoby',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    items: _profiles.map((p) {
                      return DropdownMenuItem(
                        value: p.name,
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: parseProfileColor(p.colorHex),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(p.name),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _selectedProfile = v);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  icon: const Icon(Icons.person_add_alt_1),
                  tooltip: 'Dodaj lub edytuj użytkownika',
                  onPressed: () async {
                    String? createdName;
                    await ProfileManagerSheet.show(
                      context,
                      onProfileCreated: (name) => createdName = name,
                    );
                    await _loadProfiles(selectName: createdName);
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
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
