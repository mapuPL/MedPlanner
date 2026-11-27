import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/dose_log.dart';
import '../models/user_profile.dart';
import '../services/database_service.dart';
import '../widgets/profile_manager_sheet.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  late DateTime _selectedDate;
  late DateTime _displayedMonth;
  bool _isMonthExpanded = true; // Domyślnie rozwinięta siatka miesiąca

  List<DoseLog> _doses = [];
  List<UserProfile> _profiles = [];
  Map<String, DayScheduleStatus> _monthStatuses = {};
  String? _selectedProfile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
    _displayedMonth = DateTime(now.year, now.month, 1);
    _selectedProfile = DatabaseService.instance.selectedProfileNotifier.value;
    DatabaseService.instance.dataVersion.addListener(_onDatabaseChanged);
    DatabaseService.instance.selectedProfileNotifier.addListener(_onSelectedProfileChanged);
    _loadCalendarData();
  }

  @override
  void dispose() {
    DatabaseService.instance.dataVersion.removeListener(_onDatabaseChanged);
    DatabaseService.instance.selectedProfileNotifier.removeListener(_onSelectedProfileChanged);
    super.dispose();
  }

  void _onDatabaseChanged() {
    if (mounted) _loadCalendarData();
  }

  void _onSelectedProfileChanged() {
    if (!mounted) return;
    setState(() {
      _selectedProfile = DatabaseService.instance.selectedProfileNotifier.value;
    });
    _loadMonthStatusesOnly();
  }

  Future<Map<String, DayScheduleStatus>> _fetchStatusesForVisibleRange() async {
    final monthsToLoad = <DateTime>{_displayedMonth};

    if (_isMonthExpanded) {
      final firstWeekday = _displayedMonth.weekday; // 1=Pn..7=Nd
      if (firstWeekday > 1) {
        monthsToLoad.add(DateTime(_displayedMonth.year, _displayedMonth.month - 1, 1));
      }
      final daysInMonth = DateTime(_displayedMonth.year, _displayedMonth.month + 1, 0).day;
      final totalCells = (firstWeekday - 1) + daysInMonth;
      if (totalCells % 7 != 0) {
        monthsToLoad.add(DateTime(_displayedMonth.year, _displayedMonth.month + 1, 1));
      }
    } else {
      final weekStart = _selectedDate.subtract(Duration(days: _selectedDate.weekday - 1));
      final weekEnd = weekStart.add(const Duration(days: 6));
      monthsToLoad.add(DateTime(weekStart.year, weekStart.month, 1));
      monthsToLoad.add(DateTime(weekEnd.year, weekEnd.month, 1));
    }

    final merged = <String, DayScheduleStatus>{};
    for (final m in monthsToLoad) {
      final part = await DatabaseService.instance.getMonthlyDayStatuses(
        m.year,
        m.month,
        profileName: _selectedProfile,
      );
      merged.addAll(part);
    }
    return merged;
  }

  Future<void> _loadMonthStatusesOnly() async {
    final statuses = await _fetchStatusesForVisibleRange();
    if (!mounted) return;
    setState(() {
      _monthStatuses = statuses;
    });
  }

  Future<void> _loadCalendarData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final results = await Future.wait([
      DatabaseService.instance.getDosesForDate(_selectedDate),
      DatabaseService.instance.getProfiles(),
      _fetchStatusesForVisibleRange(),
    ]);
    if (!mounted) return;
    setState(() {
      _doses = results[0] as List<DoseLog>;
      _profiles = results[1] as List<UserProfile>;
      _monthStatuses = results[2] as Map<String, DayScheduleStatus>;
      _isLoading = false;
    });
  }

  void _selectDay(DateTime day) {
    final normalized = DateTime(day.year, day.month, day.day);
    setState(() {
      _selectedDate = normalized;
      _displayedMonth = DateTime(normalized.year, normalized.month, 1);
    });
    _loadCalendarData();
  }

  void _navigatePrev() {
    if (_isMonthExpanded) {
      setState(() {
        _displayedMonth = DateTime(_displayedMonth.year, _displayedMonth.month - 1, 1);
      });
      _loadMonthStatusesOnly();
    } else {
      _selectDay(_selectedDate.subtract(const Duration(days: 7)));
    }
  }

  void _navigateNext() {
    if (_isMonthExpanded) {
      setState(() {
        _displayedMonth = DateTime(_displayedMonth.year, _displayedMonth.month + 1, 1);
      });
      _loadMonthStatusesOnly();
    } else {
      _selectDay(_selectedDate.add(const Duration(days: 7)));
    }
  }

  void _jumpToToday() {
    final now = DateTime.now();
    _selectDay(DateTime(now.year, now.month, now.day));
  }

  Color _dotColorForStatus(DayScheduleStatus status, {required bool isSelected}) {
    switch (status) {
      case DayScheduleStatus.completed:
        return isSelected ? Colors.greenAccent.shade200 : Colors.green.shade600;
      case DayScheduleStatus.partial:
        return isSelected ? Colors.amber.shade200 : Colors.orange.shade600;
      case DayScheduleStatus.missed:
        return isSelected ? Colors.red.shade200 : Colors.redAccent.shade400;
      case DayScheduleStatus.upcoming:
        return isSelected ? Colors.lightBlue.shade200 : Colors.blue.shade600;
      case DayScheduleStatus.none:
        return Colors.transparent;
    }
  }

  List<DateTime> _buildMonthGridDates() {
    final firstDay = _displayedMonth;
    final leading = firstDay.weekday - 1;
    final daysInMonth = DateTime(_displayedMonth.year, _displayedMonth.month + 1, 0).day;
    final totalNeeded = ((leading + daysInMonth + 6) ~/ 7) * 7;
    final start = firstDay.subtract(Duration(days: leading));
    return List.generate(
      totalNeeded,
      (i) => DateTime(start.year, start.month, start.day + i),
    );
  }

  List<DateTime> _buildWeekDates() {
    final start = _selectedDate.subtract(Duration(days: _selectedDate.weekday - 1));
    return List.generate(
      7,
      (i) => DateTime(start.year, start.month, start.day + i),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final selectedDateLabel = DateFormat('EEEE, d MMMM y', 'pl_PL').format(_selectedDate);
    final monthHeaderRaw = DateFormat('LLLL y', 'pl_PL').format(_displayedMonth);
    final monthHeader = monthHeaderRaw.isNotEmpty
        ? monthHeaderRaw[0].toUpperCase() + monthHeaderRaw.substring(1)
        : monthHeaderRaw;

    final isTodaySelected =
        _isSameDay(_selectedDate, today) &&
        _displayedMonth.year == today.year &&
        _displayedMonth.month == today.month;

    final profileDoses = _selectedProfile == null
        ? _doses
        : _doses.where((d) => (d.profileName ?? 'Mój profil') == _selectedProfile).toList();

    final Map<String, List<DoseLog>> dosesByTherapy = {};
    for (final d in profileDoses) {
      dosesByTherapy.putIfAbsent(d.therapyId, () => []).add(d);
    }

    final takenTotal = profileDoses.where((d) => d.status == DoseStatus.taken).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: const Text('Kalendarz i Historia Terapii', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_profiles.isNotEmpty) ...[
            ProfileFilterBar(
              profiles: _profiles,
              selectedProfile: _selectedProfile,
              onSelected: (name) => DatabaseService.instance.setSelectedProfile(name),
              onManagePressed: () => ProfileManagerSheet.show(
                context,
                onProfileCreated: (newName) => DatabaseService.instance.setSelectedProfile(newName),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Karta siatki miesięcznej / tygodniowej
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      tooltip: _isMonthExpanded ? 'Poprzedni miesiąc' : 'Poprzedni tydzień',
                      onPressed: _navigatePrev,
                    ),
                    Expanded(
                      child: Text(
                        monthHeader,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                    ),
                    if (!isTodaySelected)
                      TextButton(
                        onPressed: _jumpToToday,
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF0F766E),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: const Size(0, 36),
                        ),
                        child: const Text('Dziś', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    const SizedBox(width: 4),
                    FilledButton.tonalIcon(
                      onPressed: () {
                        setState(() => _isMonthExpanded = !_isMonthExpanded);
                        _loadMonthStatusesOnly();
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.grey.shade100,
                        foregroundColor: Colors.grey.shade800,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        minimumSize: const Size(0, 36),
                      ),
                      icon: Icon(
                        _isMonthExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                        size: 18,
                      ),
                      label: Text(
                        _isMonthExpanded ? 'Tydzień' : 'Miesiąc',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      tooltip: _isMonthExpanded ? 'Następny miesiąc' : 'Następny tydzień',
                      onPressed: _navigateNext,
                    ),
                  ],
                ),
                const Divider(height: 16),

                // Nagłówki dni tygodnia Pn - Nd
                Row(
                  children: const ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']
                      .map(
                        (label) => Expanded(
                          child: Center(
                            child: Text(
                              label.toUpperCase(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.grey,
                              ),
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 6),

                // Siatka dni
                ..._buildCalendarRows(today),

                const Divider(height: 18),
                // Legenda kolorów kropek
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 14,
                  runSpacing: 6,
                  children: [
                    _buildLegendItem(Colors.green.shade600, 'Przyjęte'),
                    _buildLegendItem(Colors.orange.shade600, 'Częściowo'),
                    _buildLegendItem(Colors.redAccent.shade400, 'Braki'),
                    _buildLegendItem(Colors.blue.shade600, 'Plan'),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Nagłówek wybranego dnia
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  selectedDateLabel[0].toUpperCase() + selectedDateLabel.substring(1),
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ),
              Text(
                '$takenTotal z ${profileDoses.length} dawek',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (profileDoses.isEmpty)
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  Icon(Icons.calendar_today_outlined, size: 36, color: Colors.grey.shade300),
                  const SizedBox(height: 10),
                  Text(
                    'Brak zaplanowanych leków w dniu ${DateFormat('d MMMM y', 'pl_PL').format(_selectedDate)}.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            )
          else
            ...dosesByTherapy.entries.map((entry) {
              final doses = entry.value;
              final therapyName = doses.first.therapyName ?? 'Terapia';
              final therapyProfile = doses.first.profileName;
              final takenCount = doses.where((d) => d.status == DoseStatus.taken).length;
              final allTaken = takenCount == doses.length;
              final statusLabel = allTaken
                  ? '100% przyjęte'
                  : '$takenCount/${doses.length} przyjęte';

              return Card(
                margin: const EdgeInsets.only(bottom: 14),
                elevation: 0,
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              (_selectedProfile == null && therapyProfile != null)
                                  ? '$therapyName · $therapyProfile'
                                  : therapyName,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            statusLabel,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: allTaken ? Colors.green.shade700 : Colors.amber.shade800,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 18),
                      ...doses.map((d) => _buildCalendarDoseRow(d)),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  List<Widget> _buildCalendarRows(DateTime today) {
    final dates = _isMonthExpanded ? _buildMonthGridDates() : _buildWeekDates();
    final rows = <Widget>[];
    for (int i = 0; i < dates.length; i += 7) {
      final weekSlice = dates.sublist(i, i + 7);
      rows.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            children: weekSlice.map((day) {
              final dateStr = DatabaseService.formatLocalDate(day);
              final isSelected = _isSameDay(day, _selectedDate);
              final isToday = _isSameDay(day, today);
              final inCurrentMonth =
                  !_isMonthExpanded || (day.month == _displayedMonth.month && day.year == _displayedMonth.year);
              final status = _monthStatuses[dateStr] ?? DayScheduleStatus.none;
              final dotColor = _dotColorForStatus(status, isSelected: isSelected);

              return Expanded(
                child: InkWell(
                  onTap: () => _selectDay(day),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 44),
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF0F766E)
                          : (isToday ? const Color(0xFFCCFBF1).withOpacity(0.45) : Colors.transparent),
                      borderRadius: BorderRadius.circular(12),
                      border: isToday && !isSelected
                          ? Border.all(color: const Color(0xFF0F766E), width: 1.3)
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${day.day}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected || isToday ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected
                                ? Colors.white
                                : (inCurrentMonth ? Colors.black87 : Colors.grey.shade400),
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                        const SizedBox(height: 3),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: inCurrentMonth || isSelected
                                ? dotColor
                                : dotColor.withOpacity(0.35),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      );
    }
    return rows;
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildCalendarDoseRow(DoseLog d) {
    final isTaken = d.status == DoseStatus.taken;
    final isSkipped = d.status == DoseStatus.skipped;
    final isSnoozed = d.status == DoseStatus.snoozed;
    final hasInstructions = d.instructions != null && d.instructions!.trim().isNotEmpty;
    final hasNotes = d.notes != null && d.notes!.trim().isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isTaken ? Colors.green.shade50.withOpacity(0.45) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isTaken
              ? Colors.green.shade200
              : (isSnoozed ? Colors.amber.shade300 : Colors.grey.shade200),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Text(
                  d.effectiveTime,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      d.medicationName ?? 'Lek',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        decoration: (isTaken || isSkipped) ? TextDecoration.lineThrough : null,
                        color: (isTaken || isSkipped) ? Colors.grey.shade500 : Colors.black87,
                      ),
                    ),
                    Text(
                      hasInstructions ? '${d.formattedDose} · ${d.instructions!.trim()}' : d.formattedDose,
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (hasNotes) ...[
            const SizedBox(height: 6),
            Text(
              'Notatka: ${d.notes!.trim()}',
              style: TextStyle(fontSize: 11, color: Colors.amber.shade900, fontWeight: FontWeight.w500),
            ),
          ],
          const SizedBox(height: 8),
          if (!isTaken && !isSkipped)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 38),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Wziąłem', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    onPressed: () async {
                      await DatabaseService.instance.markDoseAsTaken(d.id);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey.shade700,
                    minimumSize: const Size(0, 38),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () async {
                    await DatabaseService.instance.markDoseAsSkipped(d.id);
                  },
                  child: const Text('Pomiń', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            )
          else
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isTaken ? Icons.check_circle : Icons.do_not_disturb_on_outlined,
                      size: 16,
                      color: isTaken ? Colors.green.shade700 : Colors.grey.shade600,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isTaken
                          ? (d.actualTakenTime != null
                              ? 'Wzięte o ${DateFormat('HH:mm').format(d.actualTakenTime!)}'
                              : 'Wzięte')
                          : 'Pominięte',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isTaken ? Colors.green.shade700 : Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.teal.shade800,
                    minimumSize: const Size(0, 36),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                  ),
                  icon: const Icon(Icons.undo, size: 15),
                  label: const Text('Cofnij', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () async {
                    await DatabaseService.instance.undoDoseStatus(d.id);
                  },
                ),
              ],
            ),
        ],
      ),
    );
  }
}
