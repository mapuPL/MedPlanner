import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../services/database_service.dart';
import '../services/medication_registry_service.dart';
import 'add_therapy_screen.dart';

class AddMedicationScreen extends StatefulWidget {
  final String? initialTherapyId;
  final Medication? existingMedication;

  const AddMedicationScreen({
    super.key,
    this.initialTherapyId,
    this.existingMedication,
  });

  @override
  State<AddMedicationScreen> createState() => _AddMedicationScreenState();
}

class _AddMedicationScreenState extends State<AddMedicationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _doseAmountController = TextEditingController(text: '1');
  final _instructionsController = TextEditingController();
  final _packageSizeController = TextEditingController(text: '30');
  final _changeReasonController = TextEditingController();
  DateTime? _expiryDate;
  DateTime? _startDate;
  DateTime? _endDate;
  String? _dateError;

  List<Therapy> _therapies = [];
  String? _selectedTherapyId;

  MedicationType _selectedType = MedicationType.capsule;
  ScheduleType _selectedSchedule = ScheduleType.daily;

  List<TimeOfDay> _selectedTimes = [
    const TimeOfDay(hour: 8, minute: 0),
    const TimeOfDay(hour: 20, minute: 0),
  ];

  final List<int> _selectedDays = [1, 2, 3, 4, 5, 6, 7];

  // Baza leków URPL / NFZ - sugestie wyszukiwania i filtrowanie kategorii
  List<RegisteredMedicine> _suggestions = [];
  RegisteredMedicine? _selectedRegistryItem;
  bool _showSuggestions = false;
  String _selectedCategory = 'Wszystkie';
  late final List<String> _categories = MedicationRegistryService.instance.getAllCategories();

  bool get _isEditing => widget.existingMedication != null;

  static String _extractPureDoseAmount(String raw) {
    final trimmed = raw.trim();
    final match = RegExp(r'^(\d+(?:[.,]\d+)?)').firstMatch(trimmed);
    return match != null ? match.group(1)! : (trimmed.isNotEmpty ? trimmed : '1');
  }

  static String _formatStockValue(double? value) {
    if (value == null) return '';
    if (value == value.roundToDouble()) {
      return value.toInt().toString();
    }
    return value.toString();
  }

  @override
  void initState() {
    super.initState();
    final existing = widget.existingMedication;
    if (existing != null) {
      _selectedTherapyId = existing.therapyId;
      _nameController.text = existing.name;
      _selectedType = existing.type;
      _doseAmountController.text = _extractPureDoseAmount(existing.doseAmount);
      _instructionsController.text = existing.instructions ?? '';
      _selectedSchedule = existing.scheduleType;
      if (existing.selectedDays.isNotEmpty) {
        _selectedDays
          ..clear()
          ..addAll(existing.selectedDays);
      }
      if (existing.times.isNotEmpty) {
        _selectedTimes = existing.times.map((t) {
          final parts = t.split(':');
          final h = int.tryParse(parts[0]) ?? 8;
          final m = parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0;
          return TimeOfDay(hour: h.clamp(0, 23), minute: m.clamp(0, 59));
        }).toList();
      }
      _startDate = existing.startDate;
      _endDate = existing.endDate;
      final stock = existing.stockQuantity ?? existing.packageSize;
      _packageSizeController.text = stock != null ? _formatStockValue(stock) : '';
      _expiryDate = existing.expiryDate;
    }
    _loadTherapies();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _doseAmountController.dispose();
    _instructionsController.dispose();
    _packageSizeController.dispose();
    _changeReasonController.dispose();
    super.dispose();
  }

  Future<void> _loadTherapies() async {
    final list = await DatabaseService.instance.getTherapies();
    if (!mounted) return;
    setState(() {
      _therapies = list;
      if (list.isNotEmpty) {
        if (_selectedTherapyId != null && list.any((t) => t.id == _selectedTherapyId)) {
          return;
        }
        if (widget.initialTherapyId != null &&
            list.any((t) => t.id == widget.initialTherapyId)) {
          _selectedTherapyId = widget.initialTherapyId;
        } else {
          final activeList = list.where((t) => t.isActive).toList();
          final pool = activeList.isNotEmpty ? activeList : list;
          final activeProfile = DatabaseService.instance.selectedProfileNotifier.value;
          final matching = activeProfile != null
              ? pool.cast<Therapy?>().firstWhere((t) => t?.profileName == activeProfile, orElse: () => null)
              : null;
          _selectedTherapyId = (matching ?? pool.first).id;
        }
      } else {
        _selectedTherapyId = null;
      }
    });
  }

  void _refreshSuggestions(String query, String category) {
    final trimmed = query.trim();
    if (trimmed.length >= 2 || category != 'Wszystkie') {
      final results = MedicationRegistryService.instance.search(
        trimmed,
        category: category,
        limit: 12,
      );
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

  void _onNameChanged(String val) {
    _refreshSuggestions(val, _selectedCategory);
  }

  void _selectMedicine(RegisteredMedicine med) {
    setState(() {
      _nameController.text = med.name;
      _selectedRegistryItem = med;
      _showSuggestions = false;
      _suggestions = [];

      // Automatyczne podpowiadanie postaci, czystej ilości dawki i instrukcji
      _selectedType = MedicationType.fromString(med.defaultType);
      _doseAmountController.text = _extractPureDoseAmount(med.defaultDose);
      if (med.instructions.isNotEmpty) {
        _instructionsController.text = med.instructions;
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Uzupełniono dane leku: ${med.name}'),
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
      final exists = _selectedTimes.any((t) => t.hour == picked.hour && t.minute == picked.minute);
      if (exists) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ta godzina jest już na liście')),
          );
        }
        return;
      }
      setState(() {
        _selectedTimes.add(picked);
        _selectedTimes.sort((a, b) => (a.hour * 60 + a.minute).compareTo(b.hour * 60 + b.minute));
      });
    }
  }

  String? _validateDateRange() {
    if (_startDate != null && _endDate != null) {
      final start = DateTime(_startDate!.year, _startDate!.month, _startDate!.day);
      final end = DateTime(_endDate!.year, _endDate!.month, _endDate!.day);
      if (end.isBefore(start)) {
        return 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.';
      }
    }
    return null;
  }

  Future<void> _save() async {
    final formValid = _formKey.currentState!.validate();
    final dateErr = _validateDateRange();
    setState(() => _dateError = dateErr);
    if (!formValid || dateErr != null) {
      if (dateErr != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(dateErr), backgroundColor: Colors.redAccent),
        );
      }
      return;
    }
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
    if (_selectedSchedule == ScheduleType.specificDays && _selectedDays.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Wybierz przynajmniej jeden dzień tygodnia!')),
      );
      return;
    }

    final formattedTimes = _selectedTimes.map((t) {
      final h = t.hour.toString().padLeft(2, '0');
      final m = t.minute.toString().padLeft(2, '0');
      return '$h:$m';
    }).toList();

    final parsedPkg = double.tryParse(_packageSizeController.text.replaceAll(',', '.'));
    final now = DateTime.now();
    final effectiveStart = _startDate ?? widget.existingMedication?.startDate ?? now;
    final normalizedStart = DateTime(effectiveStart.year, effectiveStart.month, effectiveStart.day);
    final normalizedEnd = _endDate != null
        ? DateTime(_endDate!.year, _endDate!.month, _endDate!.day)
        : null;

    final existing = widget.existingMedication;
    final nextPackageSize = existing != null
        ? (parsedPkg != null
            ? ((existing.packageSize != null && existing.packageSize! > parsedPkg)
                ? existing.packageSize
                : parsedPkg)
            : existing.packageSize)
        : parsedPkg;

    final med = Medication(
      id: existing?.id ?? const Uuid().v4(),
      therapyId: _selectedTherapyId!,
      name: _nameController.text.trim(),
      type: _selectedType,
      doseAmount: _extractPureDoseAmount(_doseAmountController.text),
      instructions: _instructionsController.text.trim().isNotEmpty ? _instructionsController.text.trim() : null,
      times: formattedTimes,
      scheduleType: _selectedSchedule,
      selectedDays: _selectedSchedule == ScheduleType.specificDays ? List<int>.from(_selectedDays) : const [],
      startDate: normalizedStart,
      endDate: normalizedEnd,
      packageSize: nextPackageSize,
      stockQuantity: parsedPkg,
      lowStockThreshold: nextPackageSize != null ? (nextPackageSize * 0.15).clamp(3, 15) : (existing?.lowStockThreshold ?? 5),
      expiryDate: _expiryDate,
    );

    if (existing != null) {
      await DatabaseService.instance.updateMedication(
        med,
        changeReason: _changeReasonController.text,
      );
    } else {
      await DatabaseService.instance.insertMedication(med);
    }

    if (mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final queryText = _nameController.text.trim();
    final selectedTherapy = _therapies.cast<Therapy?>().firstWhere(
          (t) => t?.id == _selectedTherapyId,
          orElse: () => null,
        );

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edytuj Lek' : 'Dodaj Lek do Terapii'),
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
                      final statusSuffix = t.isActive ? '' : ' · Wstrzymana';
                      return DropdownMenuItem(
                        value: t.id,
                        child: Text('${t.name} (${t.profileName}$statusSuffix)', overflow: TextOverflow.ellipsis),
                      );
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
                    final created = await Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AddTherapyScreen()),
                    );
                    await _loadTherapies();
                    if (created is Therapy && mounted) {
                      setState(() => _selectedTherapyId = created.id);
                    }
                  },
                ),
              ],
            ),
            if (selectedTherapy != null) ...[
              const SizedBox(height: 6),
              Text(
                'Profil terapii: ${selectedTherapy.profileName}',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.teal.shade800),
              ),
            ],
            const SizedBox(height: 14),

            // Filtry kategorii bazy leków URPL / NFZ
            SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (context, idx) {
                  final cat = _categories[idx];
                  final selected = _selectedCategory == cat;
                  return ChoiceChip(
                    label: Text(cat, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                    selected: selected,
                    selectedColor: Colors.teal.shade100,
                    visualDensity: VisualDensity.compact,
                    onSelected: (_) {
                      setState(() => _selectedCategory = cat);
                      _refreshSuggestions(_nameController.text, cat);
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 10),

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
                            _selectedCategory = 'Wszystkie';
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
                            'Oficjalna baza URPL / NFZ: ${_selectedRegistryItem!.substance}',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.teal.shade900),
                          ),
                          Text(
                            'Kategoria: ${_selectedRegistryItem!.category}',
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
            if (_showSuggestions && (queryText.length >= 2 || _selectedCategory != 'Wszystkie')) ...[
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.teal.shade100),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(15),
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
                          Expanded(
                            child: Text(
                              _selectedCategory != 'Wszystkie'
                                  ? 'Baza leków · $_selectedCategory (${_suggestions.length}):'
                                  : 'Podpowiedzi z rejestru leków (${_suggestions.length}):',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.teal.shade800),
                            ),
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
                            '${item.substance} • ${item.category} (domyślnie: ${item.defaultDose} ${item.medicationType.shortUnit})',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                          trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.teal),
                          onTap: () => _selectMedicine(item),
                        );
                      }),
                    if (queryText.isNotEmpty) ...[
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
                      labelText: 'Typ / jednostka *',
                      border: OutlineInputBorder(),
                    ),
                    value: _selectedType,
                    items: MedicationRegistryService.unifiedDosageTypes.map((t) {
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
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _packageSizeController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: _isEditing
                          ? 'Stan apteczki (${_selectedType.shortUnit})'
                          : 'Stan opakowania (${_selectedType.shortUnit})',
                      border: const OutlineInputBorder(),
                      prefixIcon: const Icon(Icons.inventory_2_outlined),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.event_outlined, size: 18),
                    label: Text(
                      _expiryDate != null
                          ? '${_expiryDate!.day.toString().padLeft(2, '0')}.${_expiryDate!.month.toString().padLeft(2, '0')}.${_expiryDate!.year}'
                          : 'Ważność (opcj.)',
                      style: const TextStyle(fontSize: 12),
                    ),
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _expiryDate ?? DateTime.now().add(const Duration(days: 180)),
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2035),
                      );
                      if (picked != null) setState(() => _expiryDate = picked);
                    },
                  ),
                ),
              ],
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
            const SizedBox(height: 20),
            const Text('Harmonogram dawkowania', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SegmentedButton<ScheduleType>(
              segments: const [
                ButtonSegment(value: ScheduleType.daily, label: Text('Codziennie', style: TextStyle(fontSize: 12))),
                ButtonSegment(value: ScheduleType.specificDays, label: Text('Dni tyg.', style: TextStyle(fontSize: 12))),
                ButtonSegment(value: ScheduleType.dateRange, label: Text('Okres', style: TextStyle(fontSize: 12))),
              ],
              selected: {_selectedSchedule},
              onSelectionChanged: (sel) => setState(() => _selectedSchedule = sel.first),
            ),
            if (_selectedSchedule == ScheduleType.specificDays) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: const [
                  MapEntry(1, 'Pn'),
                  MapEntry(2, 'Wt'),
                  MapEntry(3, 'Śr'),
                  MapEntry(4, 'Cz'),
                  MapEntry(5, 'Pt'),
                  MapEntry(6, 'Sb'),
                  MapEntry(7, 'Nd'),
                ].map((entry) {
                  final selected = _selectedDays.contains(entry.key);
                  return FilterChip(
                    label: Text(entry.value, style: const TextStyle(fontWeight: FontWeight.bold)),
                    selected: selected,
                    selectedColor: Colors.teal.shade100,
                    onSelected: (val) {
                      setState(() {
                        if (val) {
                          if (!_selectedDays.contains(entry.key)) {
                            _selectedDays.add(entry.key);
                            _selectedDays.sort();
                          }
                        } else if (_selectedDays.length > 1) {
                          _selectedDays.remove(entry.key);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
            ],
            const SizedBox(height: 14),
            const Text(
              'Zakres dat stosowania (opcjonalnie)',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
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
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _startDate ?? DateTime.now(),
                                firstDate: DateTime(2020),
                                lastDate: DateTime(2035),
                              );
                              if (picked != null) {
                                setState(() {
                                  _startDate = DateTime(picked.year, picked.month, picked.day);
                                  _dateError = _validateDateRange();
                                });
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Text(
                                _startDate != null
                                    ? DatabaseService.formatLocalDate(_startDate!)
                                    : 'Od dziś (opcj.)',
                                style: TextStyle(
                                  fontSize: 12,
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
                              _dateError = _validateDateRange();
                            }),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
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
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _endDate ?? (_startDate ?? DateTime.now()).add(const Duration(days: 7)),
                                firstDate: DateTime(2020),
                                lastDate: DateTime(2035),
                              );
                              if (picked != null) {
                                setState(() {
                                  _endDate = DateTime(picked.year, picked.month, picked.day);
                                  _dateError = _validateDateRange();
                                });
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Text(
                                _endDate != null
                                    ? DatabaseService.formatLocalDate(_endDate!)
                                    : 'Bez limitu',
                                style: TextStyle(
                                  fontSize: 12,
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
                              _dateError = _validateDateRange();
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
            if (_isEditing) ...[
              const SizedBox(height: 16),
              TextFormField(
                controller: _changeReasonController,
                decoration: const InputDecoration(
                  labelText: 'Powód zmiany dawki / schematu (opcjonalnie, do raportu PDF)',
                  hintText: 'np. Zalecenie lekarza rodzinnego z dnia...',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.history_edu_outlined, color: Colors.teal),
                ),
              ),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _save,
              child: Text(
                _isEditing ? 'Zapisz Zmiany' : 'Zapisz Lek i Ustaw Alarmy',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
