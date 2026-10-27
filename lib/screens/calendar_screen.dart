import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/dose_log.dart';
import '../services/database_service.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  DateTime _selectedDate = DateTime.now();
  List<DoseLog> _doses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDosesForSelectedDate();
  }

  Future<void> _loadDosesForSelectedDate() async {
    setState(() => _isLoading = true);
    final doses = await DatabaseService.instance.getDosesForDate(_selectedDate);
    setState(() {
      _doses = doses;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('d MMMM y', 'pl_PL').format(_selectedDate);

    final Map<String, List<DoseLog>> dosesByTherapy = {};
    for (final d in _doses) {
      final th = d.therapyName ?? 'Pozostałe';
      dosesByTherapy.putIfAbsent(th, () => []).add(d);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kalendarz i Historia Terapii'),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () {
                    setState(() => _selectedDate = _selectedDate.subtract(const Duration(days: 1)));
                    _loadDosesForSelectedDate();
                  },
                ),
                Text(
                  dateStr,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {
                    setState(() => _selectedDate = _selectedDate.add(const Duration(days: 1)));
                    _loadDosesForSelectedDate();
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _doses.isEmpty
                    ? Center(
                        child: Text(
                          'Brak zaplanowanych leków w dniu $dateStr.',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: dosesByTherapy.entries.map((entry) {
                          final therapyName = entry.key;
                          final doses = entry.value;
                          final allTaken = doses.every((d) => d.status == DoseStatus.taken);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        therapyName,
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: allTaken ? Colors.green.shade50 : Colors.amber.shade50,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          allTaken ? 'Terapia zażyta w 100%' : 'Częściowo przyjęte',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: allTaken ? Colors.green.shade700 : Colors.amber.shade800,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 20),
                                  ...doses.map((d) => ListTile(
                                        contentPadding: EdgeInsets.zero,
                                        leading: Text(d.effectiveTime, style: const TextStyle(fontWeight: FontWeight.bold)),
                                        title: Text(d.medicationName ?? 'Lek'),
                                        subtitle: Text('Dawka: ${d.doseAmount ?? "1"}'),
                                        trailing: Icon(
                                          d.status == DoseStatus.taken
                                              ? Icons.check_circle
                                              : (d.status == DoseStatus.snoozed ? Icons.snooze : Icons.radio_button_unchecked),
                                          color: d.status == DoseStatus.taken ? Colors.teal : Colors.grey,
                                        ),
                                      )),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
          ),
        ],
      ),
    );
  }
}
