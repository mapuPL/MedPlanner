import { jsPDF } from 'jspdf';
import {
  LIBERATION_SANS_REGULAR_BASE64,
  LIBERATION_SANS_BOLD_BASE64,
} from './liberationFontBase64';
import {
  TherapyPdfReportData,
  formatTherapyReportFilename,
} from './medicationLogic';

const FONT_FAMILY = 'LiberationSans';

function registerPolishFonts(doc: jsPDF): void {
  doc.addFileToVFS('LiberationSans-Regular.ttf', LIBERATION_SANS_REGULAR_BASE64);
  doc.addFont('LiberationSans-Regular.ttf', FONT_FAMILY, 'normal');

  doc.addFileToVFS('LiberationSans-Bold.ttf', LIBERATION_SANS_BOLD_BASE64);
  doc.addFont('LiberationSans-Bold.ttf', FONT_FAMILY, 'bold');

  doc.setFont(FONT_FAMILY, 'normal');
}

function formatDateTimePl(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('pl-PL')} ${d.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function buildTherapyPdfDocument(report: TherapyPdfReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  registerPolishFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomMargin = 18;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - bottomMargin) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionHeading = (title: string, subtitle?: string) => {
    ensureSpace(14);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(marginX, y, contentWidth, subtitle ? 11 : 8, 1.5, 1.5, 'FD');

    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text(title, marginX + 3, y + 5.2);

    if (subtitle) {
      doc.setFont(FONT_FAMILY, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(subtitle, marginX + 3, y + 9.2);
    }

    y += (subtitle ? 11 : 8) + 3.5;
  };

  const drawTableHeader = (
    cols: Array<{ label: string; x: number; width: number; align?: 'left' | 'right' }>
  ) => {
    ensureSpace(8);
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, y, contentWidth, 6.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, y + 6.5, marginX + contentWidth, y + 6.5);

    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    for (const col of cols) {
      if (col.align === 'right') {
        doc.text(col.label, col.x + col.width - 1.5, y + 4.4, { align: 'right' });
      } else {
        doc.text(col.label, col.x + 1.5, y + 4.4);
      }
    }
    y += 7;
  };

  // --- NAGŁÓWEK KARTY ---
  doc.setFillColor(15, 118, 110);
  doc.roundedRect(marginX, y, contentWidth, 24, 2.5, 2.5, 'F');

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('MedPlaner – Karta Przebiegu Terapii', marginX + 5, y + 8.5);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(204, 251, 241);
  doc.text(
    `Pacjent: ${report.patientName} (${report.patientRelation})`,
    marginX + 5,
    y + 14.8
  );
  doc.text(
    `Analizowany okres: ${report.startDate} – ${report.endDate}  |  Wygenerowano: ${formatDateTimePl(
      report.generatedAt
    )}`,
    marginX + 5,
    y + 20.0
  );

  // Kafelek skuteczności po prawej stronie nagłówka
  const badgeW = 36;
  const badgeX = marginX + contentWidth - badgeW - 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(badgeX, y + 4, badgeW, 16, 2, 2, 'F');
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Skuteczność ogólna', badgeX + badgeW / 2, y + 9, { align: 'center' });
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 118, 110);
  doc.text(
    report.overallAdherencePercentage !== null
      ? `${report.overallAdherencePercentage}%`
      : '—',
    badgeX + badgeW / 2,
    y + 16.2,
    { align: 'center' }
  );

  y += 28;

  // Podsumowanie liczbowe pod nagłówkiem
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, y, contentWidth, 10, 1.5, 1.5, 'FD');
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Wybrane terapie: ${report.therapySummaries.length}   |   Zaplanowane dawki: ${report.totalScheduled}   |   Przyjęte: ${report.totalTaken}   |   Pominięte: ${report.totalSkipped}`,
    marginX + 4,
    y + 6.3
  );
  y += 14;

  // --- SEKCJA 1: PODSUMOWANIE WYBRANYCH TERAPII I SKUTECZNOŚCI ---
  drawSectionHeading(
    '1. Podsumowanie wybranych terapii i skuteczności',
    'Obliczenia dotyczą wyłącznie dni aktywnego dawkowania każdego leku w wybranym zakresie dat.'
  );

  if (report.therapySummaries.length === 0) {
    ensureSpace(10);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Brak wybranych terapii do wyświetlenia w raporcie.', marginX + 2, y + 4);
    y += 9;
  } else {
    const s1Cols = [
      { label: 'Terapia / Status', x: marginX, width: 42 },
      { label: 'Lek i aktualna dawka', x: marginX + 42, width: 58 },
      { label: 'Godziny', x: marginX + 100, width: 32 },
      { label: 'Przyjęte / Zapl.', x: marginX + 132, width: 28, align: 'right' as const },
      { label: 'Skuteczność', x: marginX + 160, width: 22, align: 'right' as const },
    ];
    drawTableHeader(s1Cols);

    for (const th of report.therapySummaries) {
      const thStatus = th.isActive ? 'Aktywna' : 'Wstrzymana';
      if (th.medications.length === 0) {
        ensureSpace(9);
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`${th.therapyName} (${thStatus})`, s1Cols[0].x + 1.5, y + 4);
        doc.setFont(FONT_FAMILY, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Brak przypisanych leków', s1Cols[1].x + 1.5, y + 4);
        y += 6.5;
        doc.setDrawColor(241, 245, 249);
        doc.line(marginX, y, marginX + contentWidth, y);
        continue;
      }

      th.medications.forEach((med, idx) => {
        const medLines = doc.splitTextToSize(
          `${med.name} (${med.currentDoseDisplay})`,
          s1Cols[1].width - 3
        );
        const timesLines = doc.splitTextToSize(med.timesDisplay || '—', s1Cols[2].width - 3);
        const thLines =
          idx === 0
            ? doc.splitTextToSize(`${th.therapyName}\n[${thStatus}]`, s1Cols[0].width - 3)
            : [''];
        const maxLines = Math.max(medLines.length, timesLines.length, thLines.length);
        const rowH = Math.max(6.5, maxLines * 3.8 + 2.5);

        ensureSpace(rowH + 2);

        if (idx === 0) {
          doc.setFont(FONT_FAMILY, 'bold');
          doc.setFontSize(7.8);
          doc.setTextColor(15, 23, 42);
          doc.text(thLines, s1Cols[0].x + 1.5, y + 4);
        }

        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(medLines, s1Cols[1].x + 1.5, y + 4);

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(71, 85, 105);
        doc.text(timesLines, s1Cols[2].x + 1.5, y + 4);

        doc.setTextColor(15, 23, 42);
        doc.text(
          `${med.takenCount} / ${med.scheduledCount} (pom. ${med.skippedCount})`,
          s1Cols[3].x + s1Cols[3].width - 1.5,
          y + 4,
          { align: 'right' }
        );

        doc.setFont(FONT_FAMILY, 'bold');
        const pct = med.adherencePercentage;
        if (pct === null) doc.setTextColor(100, 116, 139);
        else if (pct >= 80) doc.setTextColor(15, 118, 110);
        else if (pct >= 50) doc.setTextColor(180, 83, 9);
        else doc.setTextColor(190, 18, 60);
        doc.text(
          pct !== null ? `${pct}%` : '—',
          s1Cols[4].x + s1Cols[4].width - 1.5,
          y + 4,
          { align: 'right' }
        );

        y += rowH;
        doc.setDrawColor(241, 245, 249);
        doc.line(marginX, y, marginX + contentWidth, y);
      });
    }
  }

  y += 5;

  // --- SEKCJA 2: OŚ CZASU ZMIAN DAWKOWANIA ---
  drawSectionHeading(
    '2. Oś czasu zmian dawkowania w wybranym okresie',
    'Chronologiczna historia modyfikacji dawki, godzin przyjmowania lub statusu terapii.'
  );

  if (report.doseChanges.length === 0) {
    ensureSpace(9);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Brak zmian dawkowania w wybranym okresie.', marginX + 2, y + 4);
    y += 9;
  } else {
    const s2Cols = [
      { label: 'Data zmiany', x: marginX, width: 28 },
      { label: 'Lek', x: marginX + 28, width: 38 },
      { label: 'Było -> Jest', x: marginX + 66, width: 66 },
      { label: 'Powód zmiany', x: marginX + 132, width: 50 },
    ];
    drawTableHeader(s2Cols);

    for (const chg of report.doseChanges) {
      const dateStr = formatDateTimePl(chg.changedAt);
      const medLines = doc.splitTextToSize(chg.medicationName, s2Cols[1].width - 3);
      const diffLines = doc.splitTextToSize(
        `${chg.previousDose} -> ${chg.newDose}`,
        s2Cols[2].width - 3
      );
      const reasonLines = doc.splitTextToSize(
        chg.changeReason || 'Nie podano powodu',
        s2Cols[3].width - 3
      );
      const maxLines = Math.max(medLines.length, diffLines.length, reasonLines.length, 1);
      const rowH = Math.max(6.5, maxLines * 3.8 + 2.5);
      ensureSpace(rowH + 2);

      doc.setFont(FONT_FAMILY, 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(71, 85, 105);
      doc.text(dateStr, s2Cols[0].x + 1.5, y + 4);

      doc.setFont(FONT_FAMILY, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(medLines, s2Cols[1].x + 1.5, y + 4);

      doc.setFont(FONT_FAMILY, 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 118, 110);
      doc.text(diffLines, s2Cols[2].x + 1.5, y + 4);

      doc.setTextColor(71, 85, 105);
      doc.text(reasonLines, s2Cols[3].x + 1.5, y + 4);

      y += rowH;
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, y, marginX + contentWidth, y);
    }
  }

  y += 5;

  // --- SEKCJA 3: STAN APTECZKI I ZAPOTRZEBOWANIE NA RECEPTY ---
  drawSectionHeading(
    '3. Stan apteczki i zapotrzebowanie na recepty',
    'Aktualna liczba jednostek, prognoza zapasu na podstawie dawkowania oraz termin ważności.'
  );

  if (report.stockItems.length === 0) {
    ensureSpace(9);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Brak leków w wybranych terapiach.', marginX + 2, y + 4);
    y += 9;
  } else {
    const s3Cols = [
      { label: 'Lek (Terapia)', x: marginX, width: 62 },
      { label: 'Pozostały zapas', x: marginX + 62, width: 38, align: 'right' as const },
      { label: 'Wystarczy na', x: marginX + 100, width: 38, align: 'right' as const },
      { label: 'Ważność / Uwagi', x: marginX + 138, width: 44 },
    ];
    drawTableHeader(s3Cols);

    for (const item of report.stockItems) {
      const nameLines = doc.splitTextToSize(
        `${item.medicationName} (${item.therapyName})`,
        s3Cols[0].width - 3
      );
      const stockText =
        item.stockQuantity !== null
          ? `${item.stockQuantity} ${item.unit}`
          : 'Nie ustawiono';
      const daysText =
        item.estimatedDaysLeft !== null ? `ok. ${item.estimatedDaysLeft} dni` : '—';
      const noteParts: string[] = [];
      if (item.expiryDate) noteParts.push(`Ważny do: ${item.expiryDate}`);
      if (item.cabinetStatus === 'expired') noteParts.push('PRZETERMINOWANY');
      else if (item.cabinetStatus === 'expiring_soon') noteParts.push('Krótki termin');
      else if (
        item.cabinetStatus === 'low_stock' ||
        (item.estimatedDaysLeft !== null && item.estimatedDaysLeft <= 7)
      ) {
        noteParts.push('Rozważyć receptę');
      }
      const noteLines = doc.splitTextToSize(
        noteParts.length > 0 ? noteParts.join(' · ') : 'Zapas w normie',
        s3Cols[3].width - 3
      );

      const maxLines = Math.max(nameLines.length, noteLines.length, 1);
      const rowH = Math.max(6.5, maxLines * 3.8 + 2.5);
      ensureSpace(rowH + 2);

      doc.setFont(FONT_FAMILY, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(nameLines, s3Cols[0].x + 1.5, y + 4);

      doc.setFont(FONT_FAMILY, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(stockText, s3Cols[1].x + s3Cols[1].width - 1.5, y + 4, { align: 'right' });

      if (item.estimatedDaysLeft !== null && item.estimatedDaysLeft <= 7) {
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setTextColor(180, 83, 9);
      } else {
        doc.setTextColor(51, 65, 85);
      }
      doc.text(daysText, s3Cols[2].x + s3Cols[2].width - 1.5, y + 4, { align: 'right' });

      doc.setFont(FONT_FAMILY, 'normal');
      doc.setFontSize(7.5);
      if (item.cabinetStatus === 'expired') doc.setTextColor(190, 18, 60);
      else if (item.cabinetStatus !== 'ok') doc.setTextColor(180, 83, 9);
      else doc.setTextColor(71, 85, 105);
      doc.text(noteLines, s3Cols[3].x + 1.5, y + 4);

      y += rowH;
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, y, marginX + contentWidth, y);
    }
  }

  // --- SEKCJA 4 (TYLKO TRYB PEŁNY): SZCZEGÓŁOWY DZIENNIK PRZYJĘĆ ---
  if (report.detailLevel === 'full') {
    y += 5;
    drawSectionHeading(
      '4. Szczegółowy dziennik przyjęć dawek',
      'Chronologiczne zestawienie zaplanowanych i zrealizowanych dawek z zachowaniem historycznej dawki.'
    );

    if (report.detailedLogs.length === 0) {
      ensureSpace(9);
      doc.setFont(FONT_FAMILY, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Brak zaplanowanych dawek w wybranym okresie.', marginX + 2, y + 4);
      y += 9;
    } else {
      const s4Cols = [
        { label: 'Data', x: marginX, width: 22 },
        { label: 'Plan.', x: marginX + 22, width: 14 },
        { label: 'Przyjęta', x: marginX + 36, width: 16 },
        { label: 'Lek', x: marginX + 52, width: 42 },
        { label: 'Dawka', x: marginX + 94, width: 22 },
        { label: 'Status', x: marginX + 116, width: 22 },
        { label: 'Notatka', x: marginX + 138, width: 44 },
      ];
      drawTableHeader(s4Cols);

      for (const row of report.detailedLogs) {
        const medLines = doc.splitTextToSize(row.medicationName, s4Cols[3].width - 2.5);
        const doseLines = doc.splitTextToSize(row.doseSnapshot, s4Cols[4].width - 2.5);
        const noteLines = doc.splitTextToSize(row.note || '—', s4Cols[6].width - 2.5);
        const maxLines = Math.max(medLines.length, doseLines.length, noteLines.length, 1);
        const rowH = Math.max(6.2, maxLines * 3.6 + 2.2);

        if (y + rowH + 2 > pageHeight - bottomMargin) {
          doc.addPage();
          y = 16;
          drawTableHeader(s4Cols);
        }

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(7.4);
        doc.setTextColor(51, 65, 85);
        doc.text(row.date, s4Cols[0].x + 1.5, y + 4);
        doc.text(row.scheduledTime, s4Cols[1].x + 1.5, y + 4);
        doc.text(row.actualTakenTime || '—', s4Cols[2].x + 1.5, y + 4);

        doc.setFont(FONT_FAMILY, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(medLines, s4Cols[3].x + 1.5, y + 4);

        doc.setFont(FONT_FAMILY, 'normal');
        doc.text(doseLines, s4Cols[4].x + 1.5, y + 4);

        if (row.status === 'taken') doc.setTextColor(15, 118, 110);
        else if (row.status === 'skipped') doc.setTextColor(190, 18, 60);
        else if (row.status === 'snoozed') doc.setTextColor(180, 83, 9);
        else doc.setTextColor(100, 116, 139);
        doc.setFont(FONT_FAMILY, 'bold');
        doc.text(row.statusLabel, s4Cols[5].x + 1.5, y + 4);

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(noteLines, s4Cols[6].x + 1.5, y + 4);

        y += rowH;
        doc.setDrawColor(241, 245, 249);
        doc.line(marginX, y, marginX + contentWidth, y);
      }
    }
  }

  // --- STOPKA NA KAŻDEJ STRONIE ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 13, marginX + contentWidth, pageHeight - 13);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Wygenerowano w aplikacji MedPlaner', marginX, pageHeight - 8);
    doc.text(`Strona ${p} z ${totalPages}`, marginX + contentWidth, pageHeight - 8, {
      align: 'right',
    });
  }

  return doc;
}

export function generateTherapyPdfBytes(report: TherapyPdfReportData): Uint8Array {
  const doc = buildTherapyPdfDocument(report);
  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

export function downloadTherapyReportPdf(report: TherapyPdfReportData): string {
  const doc = buildTherapyPdfDocument(report);
  const filename = formatTherapyReportFilename(
    report.patientName,
    report.startDate,
    report.endDate
  );
  doc.save(filename);
  return filename;
}
