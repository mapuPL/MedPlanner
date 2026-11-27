import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../models/medication.dart';
import '../models/therapy.dart';
import '../models/user_profile.dart';
import '../services/database_service.dart';
import '../widgets/profile_manager_sheet.dart';
import '../widgets/therapy_pdf_report_sheet.dart';

class CabinetScreen extends StatefulWidget {
  const CabinetScreen({super.key});

  @override
  State<CabinetScreen> createState() => _CabinetScreenState();
}

class _CabinetScreenState extends State<CabinetScreen> {
  List<Medication> _medications = [];
  List<Therapy> _therapies = [];
  List<UserProfile> _profiles = [];
  String? _selectedProfile;
  bool _isLoading = true;
  bool _showAlertsOnly = false;
  bool _showAllProfilesInCabinet = false;

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
      _showAllProfilesInCabinet = false;
    });
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final meds = await DatabaseService.instance.getAllMedications();
    final therapies = await DatabaseService.instance.getTherapies();
    final profiles = await DatabaseService.instance.getProfiles();
    if (mounted) {
      setState(() {
        _medications = meds;
        _therapies = therapies;
        _profiles = profiles;
        _isLoading = false;
      });
    }
  }

  int? _daysUntilExpiry(Medication med) {
    if (med.expiryDate == null) return null;
    final now = DateTime.now();
    final todayDate = DateTime(now.year, now.month, now.day);
    final expiryDay = DateTime(med.expiryDate!.year, med.expiryDate!.month, med.expiryDate!.day);
    return expiryDay.difference(todayDate).inDays;
  }

  bool _hasAlert(Medication med) {
    if (med.isLowStock) return true;
    final days = _daysUntilExpiry(med);
    if (days != null && days <= 30) return true;
    return false;
  }

  Future<void> _refillPackage(Medication med) async {
    final pkgSize = med.packageSize ?? 30.0;
    final current = med.stockQuantity ?? 0.0;
    await DatabaseService.instance.updateMedicationStock(med.id, current + pkgSize);
    await _loadData();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Dodano nowe opakowanie dla "${med.name}"'),
          backgroundColor: Colors.teal.shade800,
        ),
      );
    }
  }

  Future<void> _showEditStockDialog(Medication med) async {
    final stockCtrl = TextEditingController(
      text: (med.stockQuantity ?? med.packageSize ?? 30).toStringAsFixed(0),
    );
    DateTime? selectedExpiry = med.expiryDate;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Stan: ${med.name}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: stockCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Pozostała ilość (${med.type.shortUnit})',
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today, size: 16),
                label: Text(
                  selectedExpiry != null
                      ? 'Ważność: ${DateFormat('dd.MM.yyyy').format(selectedExpiry!)}'
                      : 'Ustaw termin ważności',
                ),
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: selectedExpiry ?? DateTime.now().add(const Duration(days: 180)),
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2035),
                  );
                  if (picked != null) {
                    setDialogState(() => selectedExpiry = picked);
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Anuluj')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Zapisz'),
            ),
          ],
        ),
      ),
    );

    if (saved == true) {
      final parsed = double.tryParse(stockCtrl.text.replaceAll(',', '.')) ?? 0.0;
      await DatabaseService.instance.updateMedicationStock(
        med.id,
        parsed,
        expiryDate: selectedExpiry,
      );
      _loadData();
    }
  }

  String _buildDoctorReportText(DoctorReportSummary report) {
    final buf = StringBuffer();
    buf.writeln('RAPORT LEKOWY MEDPLANER');
    buf.writeln('Zakres dat: ${report.startDate} – ${report.endDate} (${report.days} dni)');
    buf.writeln('Profil: ${report.profileName ?? "Wszystkie profile"}');
    buf.writeln(
      'Skuteczność ogólna: ${report.overallPercentage}% (${report.totalTaken}/${report.totalScheduled} dawek)',
    );
    buf.writeln('');
    if (report.items.isEmpty) {
      buf.writeln('Brak zarejestrowanych leków dla wybranego zakresu.');
    } else {
      buf.writeln('LEKI I REALIZACJA:');
      for (final item in report.items) {
        final pctStr = item.adherencePercentage != null ? '${item.adherencePercentage}%' : 'brak zaplanowanych';
        buf.writeln(
          '• ${item.medication.name} (${item.medication.formatDose()}) — ${item.therapyName} [${item.profileName}]',
        );
        buf.writeln(
          '  Skuteczność: $pctStr (${item.takenCount}/${item.scheduledCount} przyjętych, pominiętych: ${item.skippedCount})',
        );
        if (item.medication.times.isNotEmpty) {
          buf.writeln('  Godziny: ${item.medication.times.join(", ")}');
        }
        final instr = item.medication.instructions?.trim();
        if (instr != null && instr.isNotEmpty) {
          buf.writeln('  Zalecenia: $instr');
        }
      }
    }
    return buf.toString().trim();
  }

  Future<void> _openDoctorReportSheet() async {
    int reportDays = 7;
    String? reportProfile = _showAllProfilesInCabinet ? null : _selectedProfile;
    Future<DoctorReportSummary> reportFuture = DatabaseService.instance.getDoctorReportData(
      days: reportDays,
      profileName: reportProfile,
    );

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          void refreshReport(int nextDays, String? nextProfile) {
            setSheetState(() {
              reportDays = nextDays;
              reportProfile = nextProfile;
              reportFuture = DatabaseService.instance.getDoctorReportData(
                days: nextDays,
                profileName: nextProfile,
              );
            });
          }

          return SafeArea(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(ctx).size.height * 0.88,
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.teal.shade50,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.assignment_outlined, color: Colors.teal.shade700, size: 20),
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Raport lekowy dla lekarza',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'Zestawienie przyjmowanych leków i skuteczności',
                                style: TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.picture_as_pdf_outlined, color: Colors.teal),
                          tooltip: 'Generuj pełny raport PDF',
                          onPressed: () {
                            Navigator.pop(ctx);
                            TherapyPdfReportSheet.show(
                              context,
                              initialProfileName: reportProfile,
                            );
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Wybór profilu raportu
                    if (_selectedProfile != null) ...[
                      Wrap(
                        spacing: 8,
                        children: [
                          ChoiceChip(
                            label: Text('Profil: $_selectedProfile', style: const TextStyle(fontSize: 12)),
                            selected: reportProfile == _selectedProfile,
                            selectedColor: Colors.teal.shade100,
                            onSelected: (_) => refreshReport(reportDays, _selectedProfile),
                          ),
                          ChoiceChip(
                            label: const Text('Wszystkie profile', style: TextStyle(fontSize: 12)),
                            selected: reportProfile == null,
                            selectedColor: Colors.teal.shade100,
                            onSelected: (_) => refreshReport(reportDays, null),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],
                    // Wybór okresu
                    Row(
                      children: [7, 14, 30].map((d) {
                        final selected = reportDays == d;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text('$d dni', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            selected: selected,
                            selectedColor: Colors.teal.shade700,
                            labelStyle: TextStyle(
                              color: selected ? Colors.white : Colors.black87,
                            ),
                            onSelected: (_) => refreshReport(d, reportProfile),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: FutureBuilder<DoctorReportSummary>(
                        future: reportFuture,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting) {
                            return const Center(child: CircularProgressIndicator());
                          }
                          if (snapshot.hasError || !snapshot.hasData) {
                            return Center(
                              child: Text(
                                'Nie udało się wygenerować raportu: ${snapshot.error ?? ""}',
                                style: const TextStyle(color: Colors.red),
                              ),
                            );
                          }
                          final summary = snapshot.data!;
                          final reportText = _buildDoctorReportText(summary);

                          return Column(
                            children: [
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.teal.shade50,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: Colors.teal.shade200),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Okres: ${summary.startDate} – ${summary.endDate}',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.teal.shade800,
                                            ),
                                          ),
                                          const SizedBox(height: 3),
                                          Text(
                                            'Przyjęto ${summary.totalTaken} z ${summary.totalScheduled} zaplanowanych dawek',
                                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Colors.teal.shade700,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        '${summary.overallPercentage}%',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                              Expanded(
                                child: summary.items.isEmpty
                                    ? const Center(
                                        child: Text(
                                          'Brak leków przypisanych do wybranego profilu.',
                                          style: TextStyle(color: Colors.grey),
                                        ),
                                      )
                                    : ListView.separated(
                                        itemCount: summary.items.length,
                                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                                        itemBuilder: (_, idx) {
                                          final item = summary.items[idx];
                                          final pct = item.adherencePercentage;
                                          final ratio = item.scheduledCount > 0
                                              ? (item.takenCount / item.scheduledCount).clamp(0.0, 1.0)
                                              : 0.0;
                                          final Color badgeColor = pct == null
                                              ? Colors.grey
                                              : (pct >= 80
                                                  ? Colors.teal.shade700
                                                  : (pct >= 50 ? Colors.amber.shade800 : Colors.red.shade700));

                                          return Container(
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: Colors.grey.shade50,
                                              borderRadius: BorderRadius.circular(12),
                                              border: Border.all(color: Colors.grey.shade200),
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        '${item.medication.name} • ${item.medication.formatDose()}',
                                                        style: const TextStyle(
                                                          fontSize: 14,
                                                          fontWeight: FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                    Text(
                                                      pct != null ? '$pct%' : '—',
                                                      style: TextStyle(
                                                        fontSize: 13,
                                                        fontWeight: FontWeight.bold,
                                                        color: badgeColor,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  '${item.therapyName} · ${item.profileName} · godz. ${item.medication.times.join(", ")}',
                                                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                                ),
                                                if (item.medication.instructions?.trim().isNotEmpty == true) ...[
                                                  const SizedBox(height: 3),
                                                  Text(
                                                    'Zalecenia: ${item.medication.instructions!.trim()}',
                                                    style: TextStyle(fontSize: 11, color: Colors.teal.shade800),
                                                  ),
                                                ],
                                                const SizedBox(height: 8),
                                                Row(
                                                  children: [
                                                    Expanded(
                                                      child: ClipRRect(
                                                        borderRadius: BorderRadius.circular(4),
                                                        child: LinearProgressIndicator(
                                                          value: ratio,
                                                          minHeight: 6,
                                                          backgroundColor: Colors.grey.shade200,
                                                          color: badgeColor,
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 10),
                                                    Text(
                                                      '${item.takenCount}/${item.scheduledCount}',
                                                      style: const TextStyle(
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          );
                                        },
                                      ),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: Colors.teal.shade800,
                                        side: BorderSide(color: Colors.teal.shade300),
                                        padding: const EdgeInsets.symmetric(vertical: 12),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      icon: const Icon(Icons.copy, size: 17),
                                      label: const Text('Kopiuj raport', style: TextStyle(fontWeight: FontWeight.bold)),
                                      onPressed: () async {
                                        await Clipboard.setData(ClipboardData(text: reportText));
                                        if (ctx.mounted) {
                                          ScaffoldMessenger.of(ctx).showSnackBar(
                                            const SnackBar(
                                              content: Text('Skopiowano raport lekowy do schowka.'),
                                              backgroundColor: Colors.teal,
                                            ),
                                          );
                                        }
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.teal.shade700,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(vertical: 12),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      icon: const Icon(Icons.share_outlined, size: 17),
                                      label: const Text('Udostępnij', style: TextStyle(fontWeight: FontWeight.bold)),
                                      onPressed: () async {
                                        await SharePlus.instance.share(
                                          ShareParams(
                                            text: reportText,
                                            subject: 'Raport lekowy MedPlaner (${summary.days} dni)',
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String? effectiveProfile = _showAllProfilesInCabinet ? null : _selectedProfile;
    final profileMeds = effectiveProfile == null
        ? _medications
        : _medications.where((med) {
            final therapy = _therapies.cast<Therapy?>().firstWhere(
                  (t) => t?.id == med.therapyId,
                  orElse: () => null,
                );
            return (therapy?.profileName ?? 'Mój profil') == effectiveProfile;
          }).toList();

    final alertCount = profileMeds.where(_hasAlert).length;
    final displayed = _showAlertsOnly ? profileMeds.where(_hasAlert).toList() : profileMeds;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F7),
      appBar: AppBar(
        title: const Text('Domowa Apteczka', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: Icon(Icons.picture_as_pdf_outlined, color: Colors.teal.shade700),
            tooltip: 'Raport Terapii PDF',
            onPressed: () => TherapyPdfReportSheet.show(
              context,
              initialProfileName: _showAllProfilesInCabinet ? null : _selectedProfile,
            ),
          ),
          TextButton.icon(
            icon: Icon(Icons.assignment_outlined, size: 18, color: Colors.teal.shade700),
            label: Text(
              'Raport',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.teal.shade800),
            ),
            onPressed: _openDoctorReportSheet,
          ),
          const SizedBox(width: 4),
          FilterChip(
            label: Text('Alerty ($alertCount)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            selected: _showAlertsOnly,
            selectedColor: Colors.amber.shade100,
            onSelected: (v) => setState(() => _showAlertsOnly = v),
          ),
          const SizedBox(width: 12),
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
                if (_selectedProfile != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            _showAllProfilesInCabinet
                                ? 'Widok apteczki: wszystkie profile (${profileMeds.length})'
                                : 'Widok apteczki: $_selectedProfile (${profileMeds.length})',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                          ),
                        ),
                        TextButton(
                          style: TextButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          ),
                          onPressed: () => setState(() => _showAllProfilesInCabinet = !_showAllProfilesInCabinet),
                          child: Text(
                            _showAllProfilesInCabinet ? 'Tylko $_selectedProfile' : 'Wszystkie profile',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.teal.shade700),
                          ),
                        ),
                      ],
                    ),
                  ),
                Expanded(
                  child: displayed.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.inventory_2_outlined, size: 60, color: Colors.teal.shade200),
                                const SizedBox(height: 12),
                                Text(
                                  _showAlertsOnly ? 'Brak alertów w apteczce' : 'Apteczka jest pusta',
                                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Dodaj leki z określonym rozmiarem opakowania, aby śledzić zużycie i terminy ważności.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: Colors.grey, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: displayed.length,
                          itemBuilder: (ctx, idx) {
                    final med = displayed[idx];
                    final therapy = _therapies.cast<Therapy?>().firstWhere(
                          (t) => t?.id == med.therapyId,
                          orElse: () => null,
                        );
                    final pkg = med.packageSize ?? (med.stockQuantity ?? 30.0);
                    final stock = med.stockQuantity;
                    final ratio = (stock != null && pkg > 0) ? (stock / pkg).clamp(0.0, 1.0) : 1.0;

                    final daysLeft = _daysUntilExpiry(med);
                    final isExpired = daysLeft != null && daysLeft < 0;
                    final isExpiringSoon = daysLeft != null && daysLeft >= 0 && daysLeft <= 30;
                    final alertActive = isExpired || isExpiringSoon || med.isLowStock;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: alertActive ? Colors.amber.shade300 : Colors.grey.shade200,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${therapy?.name ?? "Terapia"} · ${therapy?.profileName ?? "Mój profil"}',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                                ),
                              ),
                              if (isExpired)
                                Text('Przeterminowany', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red.shade700))
                              else if (isExpiringSoon)
                                Text(
                                  daysLeft == 0 ? 'Wygasa dzisiaj!' : 'Wygasa za $daysLeft d',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade800),
                                )
                              else if (med.isLowStock)
                                Text('Kończy się zapas', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade800)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(med.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 10),
                          if (stock != null) ...[
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Pozostało w opakowaniu:', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                Text(
                                  '${stock.toStringAsFixed(stock.truncateToDouble() == stock ? 0 : 1)} / ${pkg.toStringAsFixed(0)} ${med.type.shortUnit}',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: ratio,
                                minHeight: 6,
                                backgroundColor: Colors.grey.shade200,
                                color: alertActive ? Colors.amber.shade600 : Colors.teal.shade700,
                              ),
                            ),
                          ] else
                            Text(
                              'Brak ustawionego stanu opakowania',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                            ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                med.expiryDate != null
                                    ? 'Ważność: ${DateFormat('dd.MM.yyyy').format(med.expiryDate!)}'
                                    : 'Ważność: nie podano',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                              Row(
                                children: [
                                  TextButton(
                                    onPressed: () => _showEditStockDialog(med),
                                    child: const Text('Edytuj', style: TextStyle(fontSize: 12)),
                                  ),
                                  const SizedBox(width: 4),
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.teal.shade700,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      minimumSize: const Size(0, 34),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    icon: const Icon(Icons.add, size: 15),
                                    label: const Text('Opakowanie', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                    onPressed: () => _refillPackage(med),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
                ),
              ],
            ),
    );
  }
}
