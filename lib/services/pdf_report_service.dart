import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'database_service.dart';

class PdfReportService {
  static final PdfReportService instance = PdfReportService._internal();
  PdfReportService._internal();

  static const PdfColor _brandTeal = PdfColor.fromInt(0xFF0F766E);
  static const PdfColor _brandTealLight = PdfColor.fromInt(0xFFF0FDFA);
  static const PdfColor _brandTealBorder = PdfColor.fromInt(0xFF99F6E4);
  static const PdfColor _slate900 = PdfColor.fromInt(0xFF0F172A);
  static const PdfColor _slate600 = PdfColor.fromInt(0xFF475569);
  static const PdfColor _slate400 = PdfColor.fromInt(0xFF94A3B8);
  static const PdfColor _slate200 = PdfColor.fromInt(0xFFE2E8F0);
  static const PdfColor _slate50 = PdfColor.fromInt(0xFFF8FAFC);
  static const PdfColor _amberBg = PdfColor.fromInt(0xFFFFFBEB);
  static const PdfColor _amberText = PdfColor.fromInt(0xFFB45309);
  static const PdfColor _redText = PdfColor.fromInt(0xFFBE123C);

  pw.Font? _cachedRegular;
  pw.Font? _cachedBold;

  Future<void> _ensureFontsLoaded() async {
    if (_cachedRegular != null && _cachedBold != null) return;
    final regData = await rootBundle.load('assets/fonts/LiberationSans-Regular.ttf');
    final boldData = await rootBundle.load('assets/fonts/LiberationSans-Bold.ttf');
    _cachedRegular = pw.Font.ttf(regData);
    _cachedBold = pw.Font.ttf(boldData);
  }

  static String buildFilename(TherapyPdfReportData report) {
    String slug = report.patientLabel
        .replaceAll('ą', 'a')
        .replaceAll('ć', 'c')
        .replaceAll('ę', 'e')
        .replaceAll('ł', 'l')
        .replaceAll('ń', 'n')
        .replaceAll('ó', 'o')
        .replaceAll('ś', 's')
        .replaceAll('ź', 'z')
        .replaceAll('ż', 'z')
        .replaceAll('Ą', 'A')
        .replaceAll('Ć', 'C')
        .replaceAll('Ę', 'E')
        .replaceAll('Ł', 'L')
        .replaceAll('Ń', 'N')
        .replaceAll('Ó', 'O')
        .replaceAll('Ś', 'S')
        .replaceAll('Ź', 'Z')
        .replaceAll('Ż', 'Z')
        .replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_')
        .replaceAll(RegExp(r'^_+|_+$'), '');
    if (slug.isEmpty) slug = 'Pacjent';
    return 'MedPlaner_Raport_${slug}_${report.startDate}_${report.endDate}.pdf';
  }

  Future<Uint8List> generateTherapyReportPdf(TherapyPdfReportData report) async {
    await _ensureFontsLoaded();

    final doc = pw.Document(
      title: 'Raport Terapii MedPlaner - ${report.patientLabel}',
      author: 'MedPlaner',
      theme: pw.ThemeData.withFont(
        base: _cachedRegular!,
        bold: _cachedBold!,
      ),
    );

    final generatedStr = DateFormat('dd.MM.yyyy HH:mm').format(report.generatedAt);
    final adherenceStr =
        report.overallAdherencePercentage != null ? '${report.overallAdherencePercentage}%' : 'Brak danych';

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(28, 28, 28, 34),
        footer: (ctx) => pw.Container(
          margin: const pw.EdgeInsets.only(top: 10),
          padding: const pw.EdgeInsets.only(top: 6),
          decoration: const pw.BoxDecoration(
            border: pw.Border(top: pw.BorderSide(color: _slate200, width: 0.7)),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                'MedPlaner · Raport terapii i historii dawkowania (wygenerowano offline)',
                style: const pw.TextStyle(fontSize: 8, color: _slate400),
              ),
              pw.Text(
                'Strona ${ctx.pageNumber} z ${ctx.pagesCount}',
                style: const pw.TextStyle(fontSize: 8, color: _slate600),
              ),
            ],
          ),
        ),
        build: (ctx) => [
          // Nagłówek dokumentu
          pw.Container(
            padding: const pw.EdgeInsets.all(14),
            decoration: pw.BoxDecoration(
              color: _brandTealLight,
              borderRadius: pw.BorderRadius.circular(8),
              border: pw.Border.all(color: _brandTealBorder, width: 1),
            ),
            child: pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'MEDPLANER — RAPORT TERAPII LEKOWEJ',
                        style: pw.TextStyle(
                          fontSize: 9,
                          fontWeight: pw.FontWeight.bold,
                          color: _brandTeal,
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Pacjent / Profil: ${report.patientLabel}',
                        style: pw.TextStyle(
                          fontSize: 15,
                          fontWeight: pw.FontWeight.bold,
                          color: _slate900,
                        ),
                      ),
                      pw.SizedBox(height: 3),
                      pw.Text(
                        'Okres analizy: ${report.startDate} – ${report.endDate}  |  Wygenerowano: $generatedStr',
                        style: const pw.TextStyle(fontSize: 9, color: _slate600),
                      ),
                    ],
                  ),
                ),
                pw.SizedBox(width: 12),
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: pw.BoxDecoration(
                    color: _brandTeal,
                    borderRadius: pw.BorderRadius.circular(6),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.center,
                    children: [
                      pw.Text(
                        adherenceStr,
                        style: pw.TextStyle(
                          fontSize: 16,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColors.white,
                        ),
                      ),
                      pw.Text(
                        'Skuteczność',
                        style: const pw.TextStyle(fontSize: 8, color: PdfColors.white),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          pw.SizedBox(height: 10),

          // Pasek KPI
          pw.Row(
            children: [
              _kpiBox('Zaplanowane dawki', '${report.totalScheduled}'),
              pw.SizedBox(width: 8),
              _kpiBox('Przyjęte dawki', '${report.totalTaken}'),
              pw.SizedBox(width: 8),
              _kpiBox('Pominięte dawki', '${report.totalSkipped}'),
              pw.SizedBox(width: 8),
              _kpiBox('Zmiany dawkowania', '${report.doseChanges.length}'),
            ],
          ),

          pw.SizedBox(height: 16),
          _sectionTitle('1. Podsumowanie terapii i realizacji zaleceń'),
          pw.SizedBox(height: 6),

          if (report.therapySummaries.isEmpty)
            _emptyBox('Brak terapii spełniających wybrane kryteria filtrowania.')
          else
            ...report.therapySummaries.map((th) => _buildTherapyBlock(th)),

          pw.SizedBox(height: 14),
          _sectionTitle('2. Historia zmian dawkowania i statusu terapii'),
          pw.SizedBox(height: 6),

          if (report.doseChanges.isEmpty)
            _emptyBox('Brak zarejestrowanych zmian dawkowania ani przerw w wybranym okresie.')
          else
            _buildChangesTable(report),

          pw.SizedBox(height: 14),
          _sectionTitle('3. Stan domowej apteczki i prognoza zapasów'),
          pw.SizedBox(height: 6),

          if (report.stockItems.isEmpty)
            _emptyBox('Brak leków w apteczce dla wybranych terapii.')
          else
            _buildStockTable(report),

          if (report.detailLevel == TherapyPdfDetailLevel.full) ...[
            pw.SizedBox(height: 14),
            _sectionTitle('4. Szczegółowy dziennik dawek (chronologiczny)'),
            pw.SizedBox(height: 6),
            if (report.detailedLogs.isEmpty)
              _emptyBox('Brak zaplanowanych ani zrealizowanych dawek w wybranym zakresie dat.')
            else
              _buildDetailedLogsTable(report),
          ],
        ],
      ),
    );

    return doc.save();
  }

  Future<void> shareReportPdf(TherapyPdfReportData report) async {
    final bytes = await generateTherapyReportPdf(report);
    final filename = buildFilename(report);
    await Printing.sharePdf(bytes: bytes, filename: filename);
  }

  Future<void> previewAndPrintPdf(TherapyPdfReportData report) async {
    final bytes = await generateTherapyReportPdf(report);
    final filename = buildFilename(report);
    await Printing.layoutPdf(
      name: filename,
      onLayout: (_) async => bytes,
    );
  }

  pw.Widget _kpiBox(String label, String value) {
    return pw.Expanded(
      child: pw.Container(
        padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: pw.BoxDecoration(
          color: _slate50,
          borderRadius: pw.BorderRadius.circular(6),
          border: pw.Border.all(color: _slate200, width: 0.7),
        ),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(label, style: const pw.TextStyle(fontSize: 7.5, color: _slate600)),
            pw.SizedBox(height: 2),
            pw.Text(
              value,
              style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: _slate900),
            ),
          ],
        ),
      ),
    );
  }

  pw.Widget _sectionTitle(String title) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.only(bottom: 4),
      decoration: const pw.BoxDecoration(
        border: pw.Border(bottom: pw.BorderSide(color: _brandTeal, width: 1.2)),
      ),
      child: pw.Text(
        title,
        style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: _brandTeal),
      ),
    );
  }

  pw.Widget _emptyBox(String msg) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        color: _slate50,
        borderRadius: pw.BorderRadius.circular(6),
        border: pw.Border.all(color: _slate200, width: 0.7),
      ),
      child: pw.Text(msg, style: const pw.TextStyle(fontSize: 9, color: _slate600)),
    );
  }

  pw.Widget _buildTherapyBlock(TherapyPdfTherapySummary th) {
    final pctStr = th.adherencePercentage != null ? '${th.adherencePercentage}%' : '—';
    final statusBadge = th.isActive ? 'Aktywna' : 'Wstrzymana';

    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 10),
      decoration: pw.BoxDecoration(
        borderRadius: pw.BorderRadius.circular(6),
        border: pw.Border.all(color: _slate200, width: 0.8),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: const pw.BoxDecoration(
              color: _slate50,
              borderRadius: pw.BorderRadius.vertical(top: pw.Radius.circular(6)),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Expanded(
                  child: pw.Text(
                    '${th.therapyName}  (${th.profileName} · $statusBadge)',
                    style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: _slate900),
                  ),
                ),
                pw.Text(
                  'Skuteczność: $pctStr (${th.totalTaken}/${th.totalScheduled})',
                  style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: _brandTeal),
                ),
              ],
            ),
          ),
          if (th.medications.isEmpty)
            pw.Padding(
              padding: const pw.EdgeInsets.all(8),
              child: pw.Text('Brak przypisanych leków.', style: const pw.TextStyle(fontSize: 8.5, color: _slate600)),
            )
          else
            pw.Table(
              border: pw.TableBorder.symmetric(
                inside: const pw.BorderSide(color: _slate200, width: 0.5),
              ),
              columnWidths: const {
                0: pw.FlexColumnWidth(2.6),
                1: pw.FlexColumnWidth(1.5),
                2: pw.FlexColumnWidth(1.6),
                3: pw.FlexColumnWidth(1.2),
                4: pw.FlexColumnWidth(1.0),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.white),
                  children: [
                    _cellHeader('Lek / Zalecenia'),
                    _cellHeader('Aktualna dawka'),
                    _cellHeader('Godziny'),
                    _cellHeader('Przyjęte'),
                    _cellHeader('Skuteczność'),
                  ],
                ),
                ...th.medications.map((m) {
                  final medLabel = (m.instructions != null && m.instructions!.trim().isNotEmpty)
                      ? '${m.name}\n(${m.instructions!.trim()})'
                      : m.name;
                  final mPct = m.adherencePercentage != null ? '${m.adherencePercentage}%' : '—';
                  return pw.TableRow(
                    children: [
                      _cellText(medLabel),
                      _cellText(m.currentDoseDisplay),
                      _cellText(m.timesDisplay.isNotEmpty ? m.timesDisplay : '—'),
                      _cellText('${m.takenCount}/${m.scheduledCount}'),
                      _cellText(mPct, bold: true, color: _brandTeal),
                    ],
                  );
                }),
              ],
            ),
        ],
      ),
    );
  }

  pw.Widget _buildChangesTable(TherapyPdfReportData report) {
    return pw.Table(
      border: pw.TableBorder.all(color: _slate200, width: 0.6),
      columnWidths: const {
        0: pw.FlexColumnWidth(1.5),
        1: pw.FlexColumnWidth(2.0),
        2: pw.FlexColumnWidth(2.2),
        3: pw.FlexColumnWidth(2.2),
        4: pw.FlexColumnWidth(2.0),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: _slate50),
          children: [
            _cellHeader('Data zmiany'),
            _cellHeader('Lek / Typ'),
            _cellHeader('Poprzednio'),
            _cellHeader('Po zmianie'),
            _cellHeader('Powód zmiany'),
          ],
        ),
        ...report.doseChanges.map((c) {
          final dateStr = DateFormat('dd.MM.yyyy HH:mm').format(c.changedAt);
          return pw.TableRow(
            children: [
              _cellText(dateStr),
              _cellText('${c.medicationName}\n[${c.changeTypeLabel}]'),
              _cellText(c.previousDose),
              _cellText(c.newDose, bold: true),
              _cellText(c.changeReason?.trim().isNotEmpty == true ? c.changeReason!.trim() : '—'),
            ],
          );
        }),
      ],
    );
  }

  pw.Widget _buildStockTable(TherapyPdfReportData report) {
    return pw.Table(
      border: pw.TableBorder.all(color: _slate200, width: 0.6),
      columnWidths: const {
        0: pw.FlexColumnWidth(2.6),
        1: pw.FlexColumnWidth(1.6),
        2: pw.FlexColumnWidth(1.6),
        3: pw.FlexColumnWidth(1.4),
        4: pw.FlexColumnWidth(1.5),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: _slate50),
          children: [
            _cellHeader('Lek (Terapia)'),
            _cellHeader('Stan w apteczce'),
            _cellHeader('Szacowany zapas'),
            _cellHeader('Ważność'),
            _cellHeader('Status'),
          ],
        ),
        ...report.stockItems.map((s) {
          final qtyStr = s.stockQuantity != null
              ? '${s.stockQuantity!.toStringAsFixed(s.stockQuantity!.truncateToDouble() == s.stockQuantity ? 0 : 1)} ${s.unit}'
              : 'Nie podano';
          final daysStr = s.estimatedDaysLeft != null ? '~${s.estimatedDaysLeft} dni' : '—';
          final lowDays = s.estimatedDaysLeft != null && s.estimatedDaysLeft! < 7;

          return pw.TableRow(
            decoration: (s.hasAlert || lowDays) ? const pw.BoxDecoration(color: _amberBg) : null,
            children: [
              _cellText('${s.medicationName}\n(${s.therapyName})'),
              _cellText(qtyStr),
              _cellText(daysStr, bold: lowDays, color: lowDays ? _amberText : _slate900),
              _cellText(s.expiryDate ?? '—'),
              _cellText(
                s.cabinetStatusLabel,
                bold: s.hasAlert,
                color: s.cabinetStatusLabel == 'Przeterminowany'
                    ? _redText
                    : (s.hasAlert ? _amberText : _brandTeal),
              ),
            ],
          );
        }),
      ],
    );
  }

  pw.Widget _buildDetailedLogsTable(TherapyPdfReportData report) {
    return pw.Table(
      border: pw.TableBorder.all(color: _slate200, width: 0.5),
      columnWidths: const {
        0: pw.FlexColumnWidth(1.4),
        1: pw.FlexColumnWidth(1.2),
        2: pw.FlexColumnWidth(2.3),
        3: pw.FlexColumnWidth(1.4),
        4: pw.FlexColumnWidth(1.3),
        5: pw.FlexColumnWidth(2.0),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: _slate50),
          children: [
            _cellHeader('Data'),
            _cellHeader('Godz. (faktyczna)'),
            _cellHeader('Lek / Terapia'),
            _cellHeader('Dawka (z dnia)'),
            _cellHeader('Status'),
            _cellHeader('Notatka'),
          ],
        ),
        ...report.detailedLogs.map((log) {
          final timeCell = log.actualTakenTime != null
              ? '${log.scheduledTime} (${log.actualTakenTime})'
              : log.scheduledTime;
          PdfColor statusColor = _slate600;
          if (log.status == DoseStatus.taken) statusColor = _brandTeal;
          if (log.status == DoseStatus.skipped) statusColor = _redText;
          if (log.status == DoseStatus.snoozed) statusColor = _amberText;

          return pw.TableRow(
            children: [
              _cellText(log.date),
              _cellText(timeCell),
              _cellText('${log.medicationName}\n(${log.therapyName})'),
              _cellText(log.doseSnapshot, bold: true),
              _cellText(log.statusLabel, bold: true, color: statusColor),
              _cellText(log.note?.trim().isNotEmpty == true ? log.note!.trim() : '—'),
            ],
          );
        }),
      ],
    );
  }

  pw.Widget _cellHeader(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      child: pw.Text(
        text,
        style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: _slate600),
      ),
    );
  }

  pw.Widget _cellText(String text, {bool bold = false, PdfColor color = _slate900}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      child: pw.Text(
        text,
        style: pw.TextStyle(
          fontSize: 8,
          fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
          color: color,
        ),
      ),
    );
  }
}
