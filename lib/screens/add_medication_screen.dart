import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../services/database_service.dart';
import 'add_therapy_screen.dart';

class AddMedicationScreen extends StatefulWidget {
  const AddMedicationScreen({super.key});

  @override
  State<AddMedicationScreen> createState() => _AddMedicationScreenState();
}

class _AddMedicationScreenState extends State<AddMedicationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _doseAmountController = TextEditingController(text: '1');
  final _instructionsController = TextEditingController();

  List<Therapy> _therapies = [];
  String? _selectedTherapyId;

  MedicationType _selectedType = MedicationType.capsule;
  ScheduleType _selectedSchedule = ScheduleType.daily;

  List<TimeOfDay> _selectedTimes = [
    const TimeOfDay(hour: 8, minute: 0),
    const TimeOfDay(hour: 20, minute: 0),
  ];

  List<int> _selectedDays = [1, 2, 3, 4, 5, 6, 7];

  @override
  void initState() {
    super.initState();
    _loadTherapies();
  }

  Future<void> _loadTherapies() async {
    final list = await DatabaseService.instance.getTherapies(activeOnly: true);
    setState(() {
      _therapies = list;
      if (list.isNotEmpty) {
        _selectedTherapyId = list.first.id;
      }
    });
  }

  Future<void> _addTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      helpText: 'WYBIERZ DOKŁADNĄ GODZINĘ DAWKI',
    );
    if (picked != null) {
      setState(() {
        _selectedTimes.add(picked);
        _selectedTimes.sort((a, b) => (a.hour * 60 + a.minute).compareTo(b.hour * 60 + b.minute));
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
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

    final formattedTimes = _selectedTimes.map((t) {
      final h = t.hour.toString().padLeft(2, '0');
      final m = t.minute.toString().padLeft(2, '0');
      return '$h:$m';
    }).toList();

    final med = Medication(
      id: const Uuid().v4(),
      therapyId: _selectedTherapyId!,
      name: _nameController.text.trim(),
      type: _selectedType,
      doseAmount: _doseAmountController.text.trim(),
      instructions: _instructionsController.text.trim().isNotEmpty ? _instructionsController.text.trim() : null,
      times: formattedTimes,
      scheduleType: _selectedSchedule,
      selectedDays: _selectedDays,
      startDate: DateTime.now(),
    );

    await DatabaseService.instance.insertMedication(med);
    if (mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dodaj Lek do Terapii'),
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
                    decoration: const InputDecoration(
                      labelText: 'Przypisz do Terapii *',
                      border: OutlineInputBorder(),
                    ),
                    value: _selectedTherapyId,
                    items: _therapies.map((t) {
                      return DropdownMenuItem(value: t.id, child: Text(t.name));
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
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddTherapyScreen()));
                    _loadTherapies();
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nazwa Leku *',
                hintText: 'np. Amotaks, Krople Hyabak, Ventolin',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.medication),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Wprowadź nazwę leku' : null,
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<MedicationType>(
                    decoration: const InputDecoration(
                      labelText: 'Typ leku *',
                      border: OutlineInputBorder(),
                    ),
                    value: _selectedType,
                    items: MedicationType.values.map((t) {
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
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _save,
              child: const Text('Zapisz Lek i Ustaw Alarmy', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
