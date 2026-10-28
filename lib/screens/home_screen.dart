import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/dose_log.dart';
import '../services/database_service.dart';
import '../widgets/snooze_bottom_sheet.dart';
import 'add_medication_screen.dart';
import 'backup_sync_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime _currentDate = DateTime.now();
  List<DoseLog> _doses = [];
  bool _isLoading = true;

  // Kontroler wyszukiwania leków i terapii na dziś
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadDoses();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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

    // Filtrowanie dawek według wpisanej frazy wyszukiwania
    final filteredDoses = _doses.where((d) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.toLowerCase().trim();
      final name = (d.medicationName ?? '').toLowerCase();
      final therapy = (d.therapyName ?? '').toLowerCase();
      return name.contains(q) || therapy.contains(q);
    }).toList();

    // Podział przefiltrowanych dawek na pory dnia
    final morningDoses = filteredDoses.where((d) => d.effectiveTime.compareTo('12:00') < 0).toList();
    final afternoonDoses = filteredDoses.where((d) => d.effectiveTime.compareTo('12:00') >= 0 && d.effectiveTime.compareTo('18:00') < 0).toList();
    final eveningDoses = filteredDoses.where((d) => d.effectiveTime.compareTo('18:00') >= 0).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('MedPlaner - Dzisiaj', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.cloud_sync_outlined, color: Colors.teal),
            tooltip: 'Kopia zapasowa na Dysku Google',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const BackupSyncScreen()),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Karta podsumowania dnia
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [Colors.teal.shade700, Colors.teal.shade900]),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.teal.withOpacity(0.2),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dateFormat.format(_currentDate).toUpperCase(),
                        style: TextStyle(color: Colors.teal.shade100, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '$taken z $total dawek przyjęte',
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '${(progress * 100).toInt()}%',
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      LinearProgressIndicator(
                        value: progress,
                        backgroundColor: Colors.teal.shade900,
                        color: Colors.greenAccent,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Szybki pasek wyszukiwania leków i terapii
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Szukaj leku lub terapii...',
                      hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                      prefixIcon: const Icon(Icons.search, size: 20, color: Colors.teal),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18, color: Colors.grey),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ),

                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Harmonogram na dziś',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                    if (_searchQuery.isNotEmpty)
                      Text(
                        'Wyniki: ${filteredDoses.length}',
                        style: TextStyle(fontSize: 12, color: Colors.teal.shade800, fontWeight: FontWeight.bold),
                      ),
                  ],
                ),
                const SizedBox(height: 12),

                if (filteredDoses.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        Icon(
                          _searchQuery.isNotEmpty ? Icons.search_off : Icons.check_circle_outline,
                          size: 56,
                          color: Colors.teal.shade200,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          _searchQuery.isNotEmpty
                              ? 'Brak dawek pasujących do "$_searchQuery"'
                              : 'Brak zaplanowanych leków na dziś!',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        if (_searchQuery.isNotEmpty)
                          TextButton(
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            child: const Text('Wyczyść filtr wyszukiwania'),
                          )
                        else
                          const Text(
                            'Dodaj nową terapię lub lek przyciskiem poniżej.',
                            style: TextStyle(color: Colors.grey),
                          ),
                      ],
                    ),
                  )
                else ...[
                  // Sekcja: RANO
                  if (morningDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'RANO (do 12:00)',
                      icon: Icons.wb_sunny_outlined,
                      headerBg: const Color(0xFFFEF3C7),
                      iconColor: Colors.amber.shade800,
                      badgeBg: Colors.amber.shade100,
                      badgeColor: Colors.amber.shade900,
                      doses: morningDoses,
                    ),

                  // Sekcja: POPOŁUDNIE
                  if (afternoonDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'POPOŁUDNIE (12:00 - 18:00)',
                      icon: Icons.wb_sunny,
                      headerBg: const Color(0xFFE0F2FE),
                      iconColor: Colors.blue.shade700,
                      badgeBg: Colors.blue.shade100,
                      badgeColor: Colors.blue.shade900,
                      doses: afternoonDoses,
                    ),

                  // Sekcja: WIECZÓR I NOC
                  if (eveningDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'WIECZÓR I NOC (od 18:00)',
                      icon: Icons.nights_stay_outlined,
                      headerBg: const Color(0xFFEDE9FE),
                      iconColor: Colors.indigo.shade700,
                      badgeBg: Colors.indigo.shade100,
                      badgeColor: Colors.indigo.shade900,
                      doses: eveningDoses,
                    ),
                ],
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

  Widget _buildTimeOfDaySection({
    required String title,
    required IconData icon,
    required Color headerBg,
    required Color iconColor,
    required Color badgeBg,
    required Color badgeColor,
    required List<DoseLog> doses,
  }) {
    final takenCount = doses.where((d) => d.status == DoseStatus.taken).length;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: headerBg.withOpacity(0.35),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: headerBg),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(
              children: [
                Icon(icon, size: 18, color: iconColor),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: iconColor,
                    letterSpacing: 0.5,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$takenCount/${doses.length} wzięte',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: badgeColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          ...doses.map((dose) => _buildDoseItem(dose)),
        ],
      ),
    );
  }

  Widget _buildDoseItem(DoseLog dose) {
    final isTaken = dose.status == DoseStatus.taken;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: isTaken ? Colors.green.shade100 : Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: isTaken ? Colors.green.shade50 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    dose.effectiveTime,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isTaken ? Colors.green.shade800 : Colors.black87,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dose.medicationName ?? 'Lek',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          decoration: isTaken ? TextDecoration.lineThrough : null,
                          color: isTaken ? Colors.grey.shade500 : Colors.black87,
                        ),
                      ),
                      Text(
                        'Dawka: ${dose.doseAmount ?? "1"} • ${dose.therapyName ?? "Terapia"}',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Text(
                  isTaken ? '✓ Wzięte' : (dose.status == DoseStatus.snoozed ? '⏱ Odłożone' : 'Oczekuje'),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isTaken ? Colors.green.shade700 : (dose.status == DoseStatus.snoozed ? Colors.amber.shade800 : Colors.grey.shade700),
                  ),
                ),
              ],
            ),
            if (!isTaken) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
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
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
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
