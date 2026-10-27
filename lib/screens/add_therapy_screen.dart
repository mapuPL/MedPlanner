import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/therapy.dart';
import '../services/database_service.dart';

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
    }
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
      startDate: _startDate,
      endDate: _endDate,
      isActive: true,
      createdAt: widget.therapyToEdit?.createdAt ?? DateTime.now(),
    );

    await DatabaseService.instance.insertTherapy(therapy);
    if (mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.therapyToEdit == null ? 'Nowa Terapia' : 'Edytuj Terapię'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
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
