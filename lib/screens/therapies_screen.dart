import 'package:flutter/material.dart';
import '../models/therapy.dart';
import '../models/medication.dart';
import '../models/user_profile.dart';
import '../services/database_service.dart';
import '../widgets/profile_manager_sheet.dart';
import '../widgets/therapy_pdf_report_sheet.dart';
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
  List<UserProfile> _profiles = [];
  String? _selectedProfile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _selectedProfile = DatabaseService.instance.selectedProfileNotifier.value;
    DatabaseService.instance.dataVersion.addListener(_onDatabaseChanged);
    DatabaseService.instance.selectedProfileNotifier.addListener(_onSelectedProfileChanged);
    _loadData();
  }

  @override
  void dispose() {
    DatabaseService.instance.dataVersion.removeListener(_onDatabaseChanged);
    DatabaseService.instance.selectedProfileNotifier.removeListener(_onSelectedProfileChanged);
    super.dispose();
  }

  void _onDatabaseChanged() {
    if (mounted) _loadData();
  }

  void _onSelectedProfileChanged() {
    if (!mounted) return;
    setState(() {
      _selectedProfile = DatabaseService.instance.selectedProfileNotifier.value;
    });
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final therapies = await DatabaseService.instance.getTherapies();
    final medications = await DatabaseService.instance.getAllMedications();
    final profiles = await DatabaseService.instance.getProfiles();
    if (!mounted) return;
    setState(() {
      _therapies = therapies;
      _medications = medications;
      _profiles = profiles;
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

  Future<void> _toggleTherapyStatus(Therapy therapy) async {
    final nextActive = !therapy.isActive;
    await DatabaseService.instance.setTherapyActive(therapy, nextActive);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          nextActive
              ? 'Wznowiono terapię: ${therapy.name}'
              : 'Wstrzymano terapię "${therapy.name}" (historia zachowana)',
        ),
        backgroundColor: Colors.teal.shade800,
        duration: const Duration(seconds: 3),
      ),
    );
    _loadData();
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

  Widget _buildTherapyCard(Therapy therapy) {
    final meds = _medications.where((m) => m.therapyId == therapy.id).toList();
    final isPaused = !therapy.isActive;
    Color therapyColor;
    try {
      therapyColor = Color(int.parse(therapy.colorHex.replaceFirst('#', '0xFF')));
    } catch (_) {
      therapyColor = Colors.teal;
    }

    String? dateSummary;
    if (therapy.startDate != null && therapy.endDate != null) {
      dateSummary =
          'Okres: ${DatabaseService.formatLocalDate(therapy.startDate!)} – ${DatabaseService.formatLocalDate(therapy.endDate!)}';
    } else if (therapy.startDate != null) {
      dateSummary = 'Od: ${DatabaseService.formatLocalDate(therapy.startDate!)}';
    } else if (therapy.endDate != null) {
      dateSummary = 'Do: ${DatabaseService.formatLocalDate(therapy.endDate!)}';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      elevation: 0,
      color: isPaused ? Colors.grey.shade50 : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isPaused ? Colors.grey.shade300 : Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 14,
                  height: 14,
                  margin: const EdgeInsets.only(top: 4),
                  decoration: BoxDecoration(
                    color: isPaused ? Colors.grey.shade400 : therapyColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        therapy.name,
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: isPaused ? Colors.grey.shade700 : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isPaused
                            ? 'Profil: ${therapy.profileName} · Wstrzymana'
                            : 'Profil: ${therapy.profileName} · Aktywna',
                        style: TextStyle(
                          fontSize: 11,
                          color: isPaused ? Colors.amber.shade900 : Colors.teal.shade700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (dateSummary != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          dateSummary,
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                        ),
                      ],
                    ],
                  ),
                ),
                if (isPaused)
                  FilledButton.tonalIcon(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.teal.shade50,
                      foregroundColor: Colors.teal.shade800,
                      visualDensity: VisualDensity.compact,
                    ),
                    icon: const Icon(Icons.play_arrow, size: 17),
                    label: const Text('Wznów', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    onPressed: () => _toggleTherapyStatus(therapy),
                  )
                else
                  IconButton(
                    icon: const Icon(Icons.pause_circle_outline, size: 21, color: Colors.amber),
                    tooltip: 'Wstrzymaj terapię',
                    onPressed: () => _toggleTherapyStatus(therapy),
                  ),
                IconButton(
                  icon: const Icon(Icons.edit_outlined, size: 20, color: Colors.grey),
                  tooltip: 'Edytuj terapię',
                  onPressed: () => _openAddTherapy(therapy),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20, color: Colors.redAccent),
                  tooltip: 'Usuń terapię',
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
                      MaterialPageRoute(
                        builder: (_) => AddMedicationScreen(initialTherapyId: therapy.id),
                      ),
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
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: isPaused ? Colors.grey.shade100 : Colors.teal.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.medication_outlined,
                            size: 18,
                            color: isPaused ? Colors.grey.shade600 : Colors.teal.shade700,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                m.name,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: isPaused ? Colors.grey.shade700 : Colors.black87,
                                ),
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
                          icon: const Icon(Icons.edit_outlined, size: 18, color: Colors.teal),
                          tooltip: 'Edytuj lek',
                          visualDensity: VisualDensity.compact,
                          onPressed: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => AddMedicationScreen(existingMedication: m),
                              ),
                            );
                            _loadData();
                          },
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
  }

  @override
  Widget build(BuildContext context) {
    final displayedTherapies = _selectedProfile == null
        ? _therapies
        : _therapies.where((t) => t.profileName == _selectedProfile).toList();
    final activeTherapies = displayedTherapies.where((t) => t.isActive).toList();
    final pausedTherapies = displayedTherapies.where((t) => !t.isActive).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Moje Terapie', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_outlined, color: Colors.teal),
            tooltip: 'Raport Terapii PDF',
            onPressed: () => TherapyPdfReportSheet.show(
              context,
              initialProfileName: _selectedProfile,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.people_outline, color: Colors.teal),
            tooltip: 'Zarządzaj użytkownikami',
            onPressed: () => ProfileManagerSheet.show(
              context,
              onProfileCreated: (newName) => DatabaseService.instance.setSelectedProfile(newName),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle, color: Colors.teal),
            tooltip: 'Dodaj terapię',
            onPressed: () => _openAddTherapy(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_profiles.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: ProfileFilterBar(
                      profiles: _profiles,
                      selectedProfile: _selectedProfile,
                      onSelected: (name) => DatabaseService.instance.setSelectedProfile(name),
                      onManagePressed: () => ProfileManagerSheet.show(
                        context,
                        onProfileCreated: (newName) => DatabaseService.instance.setSelectedProfile(newName),
                      ),
                    ),
                  ),
                Expanded(
                  child: displayedTherapies.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.healing_outlined, size: 64, color: Colors.teal.shade200),
                                const SizedBox(height: 16),
                                Text(
                                  _selectedProfile == null
                                      ? 'Brak zdefiniowanych terapii'
                                      : 'Brak terapii dla: $_selectedProfile',
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
                      : ListView(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                          children: [
                            if (activeTherapies.isNotEmpty) ...[
                              Padding(
                                padding: const EdgeInsets.only(bottom: 10, left: 4),
                                child: Text(
                                  'Aktywne terapie (${activeTherapies.length})',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.teal.shade800,
                                  ),
                                ),
                              ),
                              ...activeTherapies.map(_buildTherapyCard),
                            ],
                            if (pausedTherapies.isNotEmpty) ...[
                              Padding(
                                padding: EdgeInsets.only(
                                  top: activeTherapies.isNotEmpty ? 12 : 0,
                                  bottom: 10,
                                  left: 4,
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.pause_circle_outline, size: 16, color: Colors.grey.shade700),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Zarchiwizowane / Wstrzymane (${pausedTherapies.length})',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.grey.shade700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              ...pausedTherapies.map(_buildTherapyCard),
                            ],
                          ],
                        ),
                ),
              ],
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
