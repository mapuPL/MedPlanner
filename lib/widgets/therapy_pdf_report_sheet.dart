import 'package:flutter/material.dart';
import '../models/therapy.dart';
import '../models/user_profile.dart';
import '../services/database_service.dart';
import '../services/pdf_report_service.dart';

class TherapyPdfReportSheet extends StatefulWidget {
  final String? initialProfileName;

  const TherapyPdfReportSheet({super.key, this.initialProfileName});

  static Future<void> show(BuildContext context, {String? initialProfileName}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => TherapyPdfReportSheet(initialProfileName: initialProfileName),
    );
  }

  @override
  State<TherapyPdfReportSheet> createState() => _TherapyPdfReportSheetState();
}

class _TherapyPdfReportSheetState extends State<TherapyPdfReportSheet> {
  List<UserProfile> _profiles = [];
  List<Therapy> _therapies = [];

  String? _selectedProfileName; // null = Wszystkie profile
  bool _includeAllTherapies = true;
  Set<String> _selectedTherapyIds = {};
  late DateTime _startDate;
  late DateTime _endDate;
  TherapyPdfDetailLevel _detailLevel = TherapyPdfDetailLevel.full;

  TherapyPdfReportData? _previewData;
  bool _isLoading = true;
  bool _isGenerating = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _endDate = DateTime(now.year, now.month, now.day);
    _startDate = _endDate.subtract(const Duration(days: 29));
    _selectedProfileName = widget.initialProfileName;
    _loadInitial();
  }

  Future<void> _loadInitial() async {
    final profiles = await DatabaseService.instance.getProfiles();
    final therapies = await DatabaseService.instance.getTherapies();
    if (!mounted) return;
    setState(() {
      _profiles = profiles;
      _therapies = therapies;
      _syncSelectedTherapies();
      _isLoading = false;
    });
    await _refreshPreview();
  }

  List<Therapy> get _profileTherapies {
    if (_selectedProfileName == null) return _therapies;
    return _therapies.where((t) => t.profileName == _selectedProfileName).toList();
  }

  void _syncSelectedTherapies() {
    final validIds = _profileTherapies.map((t) => t.id).toSet();
    if (_includeAllTherapies) {
      _selectedTherapyIds = validIds;
    } else {
      _selectedTherapyIds = _selectedTherapyIds.intersection(validIds);
      if (_selectedTherapyIds.isEmpty && validIds.isNotEmpty) {
        _selectedTherapyIds = {validIds.first};
      }
    }
  }

  Future<void> _refreshPreview() async {
    final config = TherapyPdfReportConfig(
      profileName: _selectedProfileName,
      includeAllTherapies: _includeAllTherapies,
      selectedTherapyIds: _selectedTherapyIds.toList(),
      startDate: _startDate,
      endDate: _endDate,
      detailLevel: _detailLevel,
    );
    final data = await DatabaseService.instance.buildTherapyPdfReportData(config);
    if (!mounted) return;
    setState(() => _previewData = data);
  }

  void _applyDaysPreset(int days) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    setState(() {
      _endDate = today;
      _startDate = today.subtract(Duration(days: days - 1));
    });
    _refreshPreview();
  }

  void _applyCurrentMonthPreset() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    setState(() {
      _startDate = DateTime(now.year, now.month, 1);
      _endDate = today;
    });
    _refreshPreview();
  }

  Future<void> _handleExport({required bool preview}) async {
    if (_previewData == null || _isGenerating) return;
    setState(() => _isGenerating = true);
    try {
      if (preview) {
        await PdfReportService.instance.previewAndPrintPdf(_previewData!);
      } else {
        await PdfReportService.instance.shareReportPdf(_previewData!);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Nie udało się wygenerować PDF: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scopedTherapies = _profileTherapies;
    final preview = _previewData;

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.90,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Column(
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
                    child: Icon(Icons.picture_as_pdf_outlined, color: Colors.teal.shade700, size: 22),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Generator Raportu PDF',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Dokument A4 dla lekarza z historią zmian dawek',
                          style: TextStyle(fontSize: 11.5, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : ListView(
                        children: [
                          const Text(
                            '1. Profil pacjenta',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              ChoiceChip(
                                label: const Text('Wszystkie profile', style: TextStyle(fontSize: 12)),
                                selected: _selectedProfileName == null,
                                selectedColor: Colors.teal.shade100,
                                onSelected: (_) {
                                  setState(() {
                                    _selectedProfileName = null;
                                    _syncSelectedTherapies();
                                  });
                                  _refreshPreview();
                                },
                              ),
                              ..._profiles.map((p) {
                                final selected = _selectedProfileName == p.name;
                                return ChoiceChip(
                                  label: Text(p.name, style: const TextStyle(fontSize: 12)),
                                  selected: selected,
                                  selectedColor: Colors.teal.shade100,
                                  onSelected: (_) {
                                    setState(() {
                                      _selectedProfileName = p.name;
                                      _syncSelectedTherapies();
                                    });
                                    _refreshPreview();
                                  },
                                );
                              }),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '2. Zakres terapii',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                              Row(
                                children: [
                                  const Text('Wszystkie', style: TextStyle(fontSize: 12)),
                                  Switch(
                                    value: _includeAllTherapies,
                                    activeColor: Colors.teal,
                                    onChanged: (v) {
                                      setState(() {
                                        _includeAllTherapies = v;
                                        _syncSelectedTherapies();
                                      });
                                      _refreshPreview();
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                          if (!_includeAllTherapies)
                            if (scopedTherapies.isEmpty)
                              Text(
                                'Brak terapii dla wybranego profilu.',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              )
                            else
                              Column(
                                children: scopedTherapies.map((t) {
                                  final checked = _selectedTherapyIds.contains(t.id);
                                  return CheckboxListTile(
                                    dense: true,
                                    contentPadding: EdgeInsets.zero,
                                    activeColor: Colors.teal,
                                    title: Text(t.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                    subtitle: Text(
                                      '${t.profileName} · ${t.isActive ? "Aktywna" : "Wstrzymana"}',
                                      style: const TextStyle(fontSize: 11),
                                    ),
                                    value: checked,
                                    onChanged: (val) {
                                      setState(() {
                                        if (val == true) {
                                          _selectedTherapyIds.add(t.id);
                                        } else if (_selectedTherapyIds.length > 1) {
                                          _selectedTherapyIds.remove(t.id);
                                        }
                                      });
                                      _refreshPreview();
                                    },
                                  );
                                }).toList(),
                              ),
                          const SizedBox(height: 12),
                          const Text(
                            '3. Zakres dat raportu',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              ActionChip(
                                label: const Text('7 dni', style: TextStyle(fontSize: 11.5)),
                                onPressed: () => _applyDaysPreset(7),
                              ),
                              ActionChip(
                                label: const Text('14 dni', style: TextStyle(fontSize: 11.5)),
                                onPressed: () => _applyDaysPreset(14),
                              ),
                              ActionChip(
                                label: const Text('30 dni', style: TextStyle(fontSize: 11.5)),
                                onPressed: () => _applyDaysPreset(30),
                              ),
                              ActionChip(
                                label: const Text('Bieżący miesiąc', style: TextStyle(fontSize: 11.5)),
                                onPressed: _applyCurrentMonthPreset,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  icon: const Icon(Icons.date_range, size: 16),
                                  label: Text(
                                    'Od: ${DatabaseService.formatLocalDate(_startDate)}',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  onPressed: () async {
                                    final picked = await showDatePicker(
                                      context: context,
                                      initialDate: _startDate,
                                      firstDate: DateTime(2020),
                                      lastDate: DateTime(2035),
                                    );
                                    if (picked != null) {
                                      setState(() => _startDate = picked);
                                      _refreshPreview();
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  icon: const Icon(Icons.date_range, size: 16),
                                  label: Text(
                                    'Do: ${DatabaseService.formatLocalDate(_endDate)}',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  onPressed: () async {
                                    final picked = await showDatePicker(
                                      context: context,
                                      initialDate: _endDate,
                                      firstDate: DateTime(2020),
                                      lastDate: DateTime(2035),
                                    );
                                    if (picked != null) {
                                      setState(() => _endDate = picked);
                                      _refreshPreview();
                                    }
                                  },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            '4. Szczegółowość dokumentu',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          SegmentedButton<TherapyPdfDetailLevel>(
                            segments: const [
                              ButtonSegment(
                                value: TherapyPdfDetailLevel.summary,
                                label: Text('Podsumowanie', style: TextStyle(fontSize: 12)),
                              ),
                              ButtonSegment(
                                value: TherapyPdfDetailLevel.full,
                                label: Text('Pełny + dziennik', style: TextStyle(fontSize: 12)),
                              ),
                            ],
                            selected: {_detailLevel},
                            onSelectionChanged: (sel) {
                              setState(() => _detailLevel = sel.first);
                              _refreshPreview();
                            },
                          ),
                          if (preview != null) ...[
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.teal.shade50,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Colors.teal.shade200),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Podsumowanie danych do PDF',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.teal.shade900,
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: Colors.teal.shade700,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          preview.overallAdherencePercentage != null
                                              ? '${preview.overallAdherencePercentage}%'
                                              : '—',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Terapie: ${preview.therapySummaries.length} · Dawki przyjęte: ${preview.totalTaken}/${preview.totalScheduled}',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  Text(
                                    'Zmiany dawkowania: ${preview.doseChanges.length} · Pozycje apteczki: ${preview.stockItems.length}',
                                    style: TextStyle(fontSize: 11.5, color: Colors.grey.shade700),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
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
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.print_outlined, size: 18),
                      label: const Text('Podgląd / Drukuj', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
                      onPressed: (_previewData == null || _isGenerating) ? null : () => _handleExport(preview: true),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: _isGenerating
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.picture_as_pdf, size: 18),
                      label: Text(
                        _isGenerating ? 'Generuję...' : 'Eksportuj PDF',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
                      ),
                      onPressed: (_previewData == null || _isGenerating) ? null : () => _handleExport(preview: false),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
