import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/dose_log.dart';
import '../services/database_service.dart';
import '../services/notification_service.dart';
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
    DatabaseService.instance.dataVersion.addListener(_onDatabaseChanged);
    _loadDoses();
  }

  @override
  void dispose() {
    DatabaseService.instance.dataVersion.removeListener(_onDatabaseChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onDatabaseChanged() {
    if (mounted) _loadDoses();
  }

  Future<void> _loadDoses() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final doses = await DatabaseService.instance.getDosesForDate(_currentDate);
    if (!mounted) return;
    setState(() {
      _doses = doses;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE, d MMMM', 'pl_PL');
    final total = _doses.length;
    final taken = _doses.where((d) => d.status == DoseStatus.taken).length;
    final progress = total > 0 ? (taken / total) : 1.0;

    // 7-dniowy pasek wyboru dnia (-2 do +4)
    final today = DateTime.now();
    final weekDays = List.generate(7, (i) => DateTime(today.year, today.month, today.day).add(Duration(days: i - 2)));

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
      backgroundColor: const Color(0xFFF4F7F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'assets/images/logo_icon.png',
                width: 30,
                height: 30,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(Icons.medication, color: Color(0xFF0F766E)),
              ),
            ),
            const SizedBox(width: 10),
            const Text('MedPlaner', style: TextStyle(fontWeight: FontWeight.w800)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_active_outlined, color: Colors.teal),
            tooltip: 'Powiadomienia w tle (gdy apka zamknięta)',
            onPressed: () => _showBackgroundNotificationDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.cloud_sync_outlined, color: Colors.teal),
            tooltip: 'Kopia zapasowa i przywracanie',
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
                // 7-dniowy poziomy pasek wyboru dnia
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: weekDays.map((day) {
                      final isSelected = day.year == _currentDate.year &&
                          day.month == _currentDate.month &&
                          day.day == _currentDate.day;
                      final shortDay = DateFormat('E', 'pl_PL').format(day).replaceAll('.', '');
                      return GestureDetector(
                        onTap: () {
                          setState(() => _currentDate = day);
                          _loadDoses();
                        },
                        child: Container(
                          width: 44,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF0F766E) : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            children: [
                              Text(
                                shortDay.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.teal.shade100 : Colors.grey.shade500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${day.day}',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: isSelected ? Colors.white : Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 14),

                // Karta podsumowania dnia z okrągłym pierścieniem realizacji (Dawko style)
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              dateFormat.format(_currentDate).toUpperCase(),
                              style: TextStyle(
                                color: Colors.teal.shade800,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '$taken z $total dawek',
                              style: const TextStyle(
                                color: Colors.black87,
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              total == 0
                                  ? 'Brak zaplanowanych dawek'
                                  : taken == total
                                      ? 'Wszystkie leki na ten dzień przyjęte'
                                      : 'Pozostało ${total - taken} do przyjęcia',
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      SizedBox(
                        width: 64,
                        height: 64,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            CircularProgressIndicator(
                              value: progress,
                              strokeWidth: 6,
                              backgroundColor: Colors.grey.shade200,
                              color: const Color(0xFF0F766E),
                            ),
                            Center(
                              child: Text(
                                '${(progress * 100).toInt()}%',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13,
                                  color: Colors.black87,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // Szybki pasek wyszukiwania leków i terapii
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
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

                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Harmonogram dawek',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
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
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        Icon(
                          _searchQuery.isNotEmpty ? Icons.search_off : Icons.check_circle_outline,
                          size: 52,
                          color: Colors.teal.shade200,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _searchQuery.isNotEmpty
                              ? 'Brak dawek pasujących do "$_searchQuery"'
                              : 'Brak zaplanowanych leków na wybrany dzień!',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
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
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                      ],
                    ),
                  )
                else ...[
                  if (morningDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'RANO · DO 12:00',
                      icon: Icons.wb_sunny_outlined,
                      iconColor: Colors.amber.shade700,
                      doses: morningDoses,
                    ),
                  if (afternoonDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'POPOŁUDNIE · 12:00–18:00',
                      icon: Icons.wb_sunny,
                      iconColor: Colors.blue.shade700,
                      doses: afternoonDoses,
                    ),
                  if (eveningDoses.isNotEmpty)
                    _buildTimeOfDaySection(
                      title: 'WIECZÓR · OD 18:00',
                      icon: Icons.nights_stay_outlined,
                      iconColor: Colors.indigo.shade700,
                      doses: eveningDoses,
                    ),
                ],
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF0F766E),
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
    required Color iconColor,
    required List<DoseLog> doses,
  }) {
    final takenCount = doses.where((d) => d.status == DoseStatus.taken).length;

    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(
              children: [
                Icon(icon, size: 16, color: iconColor),
                const SizedBox(width: 6),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Colors.grey.shade700,
                    letterSpacing: 0.6,
                  ),
                ),
                const Spacer(),
                Text(
                  '$takenCount/${doses.length}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          ...doses.map((dose) => _buildDoseItem(dose)),
        ],
      ),
    );
  }

  Widget _buildDoseItem(DoseLog dose) {
    final isTaken = dose.status == DoseStatus.taken;
    final isSnoozed = dose.status == DoseStatus.snoozed;
    final isSkipped = dose.status == DoseStatus.skipped;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isTaken
              ? Colors.green.shade200
              : (isSnoozed ? Colors.amber.shade300 : Colors.grey.shade200),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
                decoration: BoxDecoration(
                  color: isTaken
                      ? Colors.green.shade50
                      : (isSnoozed
                          ? Colors.amber.shade50
                          : (isSkipped ? Colors.grey.shade200 : Colors.grey.shade100)),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Text(
                  dose.effectiveTime,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: isTaken
                        ? Colors.green.shade800
                        : (isSkipped ? Colors.grey.shade600 : Colors.black87),
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
                        decoration: (isTaken || isSkipped) ? TextDecoration.lineThrough : null,
                        color: (isTaken || isSkipped) ? Colors.grey.shade500 : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${dose.doseAmount ?? "1"} · ${dose.therapyName ?? "Terapia"}',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Text(
                isTaken
                    ? 'Wzięte'
                    : (isSnoozed ? 'Odłożone' : (isSkipped ? 'Pominięte' : 'Plan')),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isTaken
                      ? Colors.green.shade700
                      : (isSnoozed
                          ? Colors.amber.shade800
                          : (isSkipped ? Colors.grey.shade500 : Colors.grey.shade600)),
                ),
              ),
            ],
          ),
          if (!isTaken && !isSkipped) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Wziąłem', style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () async {
                      await DatabaseService.instance.markDoseAsTaken(dose.id);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.snooze, size: 16),
                    label: const Text('Odłóż'),
                    onPressed: () {
                      SnoozeBottomSheet.show(
                        context,
                        medicationName: dose.medicationName ?? 'Lek',
                        onSnoozeSelected: (mins) async {
                          await DatabaseService.instance.snoozeDose(dose.id, mins);
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(width: 4),
                TextButton(
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey.shade600,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  ),
                  onPressed: () async {
                    await DatabaseService.instance.markDoseAsSkipped(dose.id);
                  },
                  child: const Text('Pomiń', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  foregroundColor: Colors.teal.shade800,
                  visualDensity: VisualDensity.compact,
                ),
                icon: const Icon(Icons.undo, size: 15),
                label: const Text('Cofnij', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                onPressed: () async {
                  await DatabaseService.instance.undoDoseStatus(dose.id);
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _showBackgroundNotificationDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.alarm_on, color: Colors.teal),
            SizedBox(width: 8),
            Text('Powiadomienia w tle', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Aplikacja MedPlaner wysyła dokładne alarmy z poziomu systemu Android nawet wtedy, gdy aplikacja jest całkowicie ZAMKNIĘTA lub ekran jest wygaszony.',
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Wymagane ustawienia Androida:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.brown)),
                    SizedBox(height: 4),
                    Text('1. Bateria -> "Bez ograniczeń" (Unrestricted) zamiast "Zoptymalizowane".', style: TextStyle(fontSize: 11)),
                    Text('2. Uprawnienie "Alarmy i przypomnienia" włączone w ustawieniach aplikacji.', style: TextStyle(fontSize: 11)),
                    Text('3. Dla Xiaomi / Huawei: Włącz "Autostart".', style: TextStyle(fontSize: 11)),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Możesz przetestować powiadomienie za 5 sekund. Kliknij przycisk poniżej, wyjdź na pulpit lub zablokuj ekran!',
                style: TextStyle(fontSize: 12, color: Colors.black87),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Zamknij'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.teal.shade800,
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.timer, size: 16),
            label: const Text('Test za 5 sek (zablokuj ekran)'),
            onPressed: () async {
              Navigator.pop(ctx);
              await NotificationService.instance.scheduleTestBackgroundNotification(secondsDelay: 5);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Zaplanowano test za 5 sekund! Możesz zablokować telefon.'),
                    backgroundColor: Colors.teal,
                    duration: Duration(seconds: 4),
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}

