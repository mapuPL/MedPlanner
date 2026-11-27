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
  DateTime? _startDate;
  DateTime? _endDate;
  bool _isActive = true;
  String _selectedColor = '#10B981';
  String _selectedProfile = 'Mój profil';
  String? _dateError;

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
      _isActive = widget.therapyToEdit!.isActive;
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

  String? _validateDates() {
    if (_startDate != null && _endDate != null) {
      final start = DateTime(_startDate!.year, _startDate!.month, _startDate!.day);
      final end = DateTime(_endDate!.year, _endDate!.month, _endDate!.day);
      if (end.isBefore(start)) {
        return 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.';
      }
    }
    return null;
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null) {
      setState(() {
        _startDate = DateTime(picked.year, picked.month, picked.day);
        _dateError = _validateDates();
      });
    }
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? (_startDate ?? DateTime.now()).add(const Duration(days: 7)),
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null) {
      setState(() {
        _endDate = DateTime(picked.year, picked.month, picked.day);
        _dateError = _validateDates();
      });
    }
  }

  Future<void> _save() async {
    final formValid = _formKey.currentState!.validate();
    final dateErr = _validateDates();
    setState(() => _dateError = dateErr);
    if (!formValid || dateErr != null) return;

    final therapy = Therapy(
      id: widget.therapyToEdit?.id ?? const Uuid().v4(),
      name: _nameController.text.trim(),
      description: _descController.text.trim().isNotEmpty ? _descController.text.trim() : null,
      colorHex: _selectedColor,
      iconName: widget.therapyToEdit?.iconName ?? 'medical_services',
      profileName: _selectedProfile,
      startDate: _startDate,
      endDate: _endDate,
      isActive: _isActive,
      createdAt: widget.therapyToEdit?.createdAt ?? DateTime.now(),
    );

    if (widget.therapyToEdit != null) {
      await DatabaseService.instance.updateTherapy(therapy);
    } else {
      await DatabaseService.instance.insertTherapy(therapy);
    }

    if (mounted) {
      if (Navigator.canPop(context)) {
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Zapisano terapię: ${therapy.name}'),
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
              crossAxisAlignment: CrossAxisAlignment.center,
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
                FilledButton.tonalIcon(
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  ),
                  icon: const Icon(Icons.person_add_alt_1, size: 18),
                  label: const Text('+ Nowy profil', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () async {
                    final created = await QuickAddProfileDialog.show(context);
                    if (created != null) {
                      await _loadProfiles(selectName: created.name);
                    }
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
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _isActive ? Colors.teal.shade50 : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _isActive ? Colors.teal.shade200 : Colors.grey.shade300,
                ),
              ),
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _isActive,
                activeColor: const Color(0xFF0F766E),
                title: Text(
                  _isActive ? 'Status: Terapia aktywna' : 'Status: Wstrzymana / Archiwum',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                subtitle: Text(
                  _isActive
                      ? 'Generuje dawki na ekranie „Dziś” i wysyła powiadomienia.'
                      : 'Nie generuje bieżących dawek ani alarmów, ale zachowuje historię.',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                ),
                onChanged: (val) => setState(() => _isActive = val),
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Okres kuracji (opcjonalnie, informacyjnie)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Od daty',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: _pickStartDate,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Text(
                                _startDate != null
                                    ? DatabaseService.formatLocalDate(_startDate!)
                                    : 'Nie ustawiono',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: _startDate != null ? Colors.black87 : Colors.grey.shade600,
                                ),
                              ),
                            ),
                          ),
                        ),
                        if (_startDate != null)
                          IconButton(
                            icon: const Icon(Icons.close, size: 16),
                            visualDensity: VisualDensity.compact,
                            onPressed: () => setState(() {
                              _startDate = null;
                              _dateError = _validateDates();
                            }),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Do daty',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: _pickEndDate,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Text(
                                _endDate != null
                                    ? DatabaseService.formatLocalDate(_endDate!)
                                    : 'Nie ustawiono',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: _endDate != null ? Colors.black87 : Colors.grey.shade600,
                                ),
                              ),
                            ),
                          ),
                        ),
                        if (_endDate != null)
                          IconButton(
                            icon: const Icon(Icons.close, size: 16),
                            visualDensity: VisualDensity.compact,
                            onPressed: () => setState(() {
                              _endDate = null;
                              _dateError = _validateDates();
                            }),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            if (_dateError != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(
                  _dateError!,
                  style: TextStyle(color: Colors.red.shade800, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
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
