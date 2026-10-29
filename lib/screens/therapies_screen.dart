import 'package:flutter/material.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../services/database_service.dart';
import 'add_therapy_screen.dart';
import 'add_medication_screen.dart';

class TherapiesScreen extends StatefulWidget {
  const TherapiesScreen({super.key});

  @override
  State<TherapiesScreen> createState() => _TherapiesScreenState();
}

class _TherapiesScreenState extends State<TherapiesScreen> {
  List<Therapy> _therapies = [];
  List<Medication> _medications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final therapies = await DatabaseService.instance.getTherapies();
    final medications = await DatabaseService.instance.getAllMedications();
    setState(() {
      _therapies = therapies;
      _medications = medications;
      _isLoading = false;
    });
  }

  Future<void> _openAddTherapy([Therapy? therapy]) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => AddTherapyScreen(therapyToEdit: therapy)),
    );
    if (result == true || mounted) {
      _loadData();
    }
  }

  Future<void> _deleteTherapy(Therapy therapy) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Usunąć terapię?'),
        content: Text('Czy na pewno chcesz usunąć "${therapy.name}" oraz wszystkie przypisane do niej leki?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Usuń', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await DatabaseService.instance.deleteTherapy(therapy.id);
      _loadData();
    }
  }

  Future<void> _deleteMedicationFromTherapy(Medication med, String therapyName) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.delete_outline, color: Colors.redAccent, size: 24),
            SizedBox(width: 8),
            Text('Usunąć lek z terapii?'),
          ],
        ),
        content: Text(
          'Czy na pewno chcesz usunąć lek "${med.name}" z terapii "$therapyName"?\n\n'
          'Spowoduje to również usunięcie wszystkich zaplanowanych dla niego dawek z harmonogramu.',
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
            child: const Text('Usuń lek'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await DatabaseService.instance.deleteMedication(med.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lek "${med.name}" został usunięty.'),
            backgroundColor: Colors.teal.shade800,
            duration: const Duration(seconds: 3),
          ),
        );
        _loadData();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Moje Terapie', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: Colors.teal),
            tooltip: 'Dodaj terapię',
            onPressed: () => _openAddTherapy(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _therapies.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.healing_outlined, size: 64, color: Colors.teal.shade200),
                        const SizedBox(height: 16),
                        const Text(
                          'Brak zdefiniowanych terapii',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Utwórz pierwszą terapię (np. "Antybiotyk", "Krople do oczu"), aby przypisywać do niej leki.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.teal,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () => _openAddTherapy(),
                          icon: const Icon(Icons.add),
                          label: const Text('Dodaj pierwszą terapię'),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _therapies.length,
                  itemBuilder: (ctx, i) {
                    final therapy = _therapies[i];
                    final meds = _medications.where((m) => m.therapyId == therapy.id).toList();
                    Color therapyColor;
                    try {
                      therapyColor = Color(int.parse(therapy.colorHex.replaceFirst('#', '0xFF')));
                    } catch (_) {
                      therapyColor = Colors.teal;
                    }

                    return Card(
                      margin: const EdgeInsets.only(bottom: 14),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: Colors.grey.shade200),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 16,
                                  height: 16,
                                  decoration: BoxDecoration(
                                    color: therapyColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    therapy.name,
                                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 20, color: Colors.grey),
                                  onPressed: () => _openAddTherapy(therapy),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 20, color: Colors.redAccent),
                                  onPressed: () => _deleteTherapy(therapy),
                                ),
                              ],
                            ),
                            if (therapy.description != null && therapy.description!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                therapy.description!,
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                              ),
                            ],
                            const SizedBox(height: 12),
                            const Divider(height: 1),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Przypisane leki (${meds.length})',
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                                TextButton.icon(
                                  style: TextButton.styleFrom(
                                    visualDensity: VisualDensity.compact,
                                    foregroundColor: Colors.teal,
                                  ),
                                  icon: const Icon(Icons.add, size: 16),
                                  label: const Text('Dodaj lek'),
                                  onPressed: () async {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => const AddMedicationScreen()),
                                    );
                                    _loadData();
                                  },
                                ),
                              ],
                            ),
                            if (meds.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Column(
                                children: meds.map((m) {
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 6),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(10),
                                      border: BorderSide(color: Colors.grey.shade200),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(6),
                                          decoration: BoxDecoration(
                                            color: Colors.teal.shade50,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Icon(Icons.medication_outlined, size: 18, color: Colors.teal.shade700),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                m.name,
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Dawka: ${m.formatDose()} • Godziny: ${m.times.join(", ")}',
                                                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                              ),
                                            ],
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                                          tooltip: 'Usuń lek z terapii',
                                          visualDensity: VisualDensity.compact,
                                          onPressed: () => _deleteMedicationFromTherapy(m, therapy.name),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Nowa Terapia'),
        onPressed: () => _openAddTherapy(),
      ),
    );
  }
}
