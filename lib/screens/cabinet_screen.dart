import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/medication.dart';
import '../models/therapy.dart';
import '../services/database_service.dart';

class CabinetScreen extends StatefulWidget {
  const CabinetScreen({super.key});

  @override
  State<CabinetScreen> createState() => _CabinetScreenState();
}

class _CabinetScreenState extends State<CabinetScreen> {
  List<Medication> _medications = [];
  List<Therapy> _therapies = [];
  bool _isLoading = true;
  bool _showAlertsOnly = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final meds = await DatabaseService.instance.getAllMedications();
    final therapies = await DatabaseService.instance.getTherapies();
    if (mounted) {
      setState(() {
        _medications = meds;
        _therapies = therapies;
        _isLoading = false;
      });
    }
  }

  bool _hasAlert(Medication med) {
    if (med.isLowStock) return true;
    if (med.expiryDate != null) {
      final days = med.expiryDate!.difference(DateTime.now()).inDays;
      if (days <= 30) return true;
    }
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

  @override
  Widget build(BuildContext context) {
    final alertCount = _medications.where(_hasAlert).length;
    final displayed = _showAlertsOnly ? _medications.where(_hasAlert).toList() : _medications;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F7),
      appBar: AppBar(
        title: const Text('Domowa Apteczka', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
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
          : displayed.isEmpty
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

                    final isExpired = med.expiryDate != null && med.expiryDate!.isBefore(DateTime.now());
                    final daysLeft = med.expiryDate?.difference(DateTime.now()).inDays;
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
                                Text('Wygasa za $daysLeft d', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade800))
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
    );
  }
}
