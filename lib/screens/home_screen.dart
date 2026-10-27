import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/dose_log.dart';
import '../services/database_service.dart';
import '../widgets/snooze_bottom_sheet.dart';
import 'add_medication_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime _currentDate = DateTime.now();
  List<DoseLog> _doses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDoses();
  }

  Future<void> _loadDoses() async {
    setState(() => _isLoading = true);
    final doses = await DatabaseService.instance.getDosesForDate(_currentDate);
    setState(() {
      _doses = doses;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE, d MMMM y', 'pl_PL');
    final total = _doses.length;
    final taken = _doses.where((d) => d.status == DoseStatus.taken).length;
    final progress = total > 0 ? (taken / total) : 1.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('MedPlaner - Dzisiaj', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [Colors.teal.shade700, Colors.teal.shade900]),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(dateFormat.format(_currentDate).toUpperCase(),
                          style: TextStyle(color: Colors.teal.shade100, fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text('$taken z $total dawek przyjęte',
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 10),
                      LinearProgressIndicator(value: progress, backgroundColor: Colors.teal.shade950, color: Colors.greenAccent),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const Text('Harmonogram na dziś', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ..._doses.map((dose) => _buildDoseItem(dose)),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Dodaj lek'),
        onPressed: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddMedicationScreen()));
          _loadDoses();
        },
      ),
    );
  }

  Widget _buildDoseItem(DoseLog dose) {
    final isTaken = dose.status == DoseStatus.taken;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isTaken ? Colors.green.shade50 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    dose.effectiveTime,
                    style: TextStyle(fontWeight: FontWeight.bold, color: isTaken ? Colors.green.shade800 : Colors.black87),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dose.medicationName ?? 'Lek',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          decoration: isTaken ? TextDecoration.lineThrough : null,
                        ),
                      ),
                      Text('Dawka: ${dose.doseAmount ?? "1"} • ${dose.therapyName ?? "Terapia"}',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                    ],
                  ),
                ),
                Text(
                  isTaken ? '✓ Wzięte' : (dose.status == DoseStatus.snoozed ? '⏱ Odłożone' : 'Oczekuje'),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isTaken ? Colors.green : (dose.status == DoseStatus.snoozed ? Colors.amber.shade800 : Colors.grey),
                  ),
                ),
              ],
            ),
            if (!isTaken) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Wziąłem'),
                      onPressed: () async {
                        await DatabaseService.instance.markDoseAsTaken(dose.id);
                        _loadDoses();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.snooze, size: 16),
                      label: const Text('Odłóż'),
                      onPressed: () {
                        SnoozeBottomSheet.show(
                          context,
                          medicationName: dose.medicationName ?? 'Lek',
                          onSnoozeSelected: (mins) async {
                            await DatabaseService.instance.snoozeDose(dose.id, mins);
                            _loadDoses();
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
