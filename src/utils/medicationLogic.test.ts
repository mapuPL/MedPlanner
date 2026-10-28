import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDoseDisplay,
  calculateSnoozeTime,
  isMedicationActiveOnDate,
  sortDosesChronologically,
  calculateCompliance,
  isTherapyCompletedForDate,
  Medication,
  DoseItem
} from './medicationLogic.ts';

test('formatDoseDisplay formats units properly in Polish', () => {
  assert.equal(formatDoseDisplay('2', 'capsule'), '2 tabl.');
  assert.equal(formatDoseDisplay('10', 'drops'), '10 kropli');
  assert.equal(formatDoseDisplay('5', 'ml'), '5 ml');
  assert.equal(formatDoseDisplay('1', 'inhaler'), '1 wziew');
  assert.equal(formatDoseDisplay('2', 'application'), '2 aplik.');
  assert.equal(formatDoseDisplay('1', 'other'), '1 dawka');
});

test('calculateSnoozeTime calculates future snooze time correctly', () => {
  assert.equal(calculateSnoozeTime('08:00', 5), '08:05');
  assert.equal(calculateSnoozeTime('08:45', 15), '09:00');
  assert.equal(calculateSnoozeTime('23:45', 30), '00:15');
  assert.equal(calculateSnoozeTime('12:30', 0), '12:30');
});

test('isMedicationActiveOnDate respects date boundaries and specific days', () => {
  const dailyMed: Medication = {
    id: 'med-1',
    therapyId: 'th-1',
    name: 'Amotaks',
    type: 'capsule',
    doseAmount: '1',
    times: ['08:00', '20:00'],
    scheduleType: 'daily',
    startDate: '2026-10-01',
    endDate: '2026-10-10',
  };

  assert.equal(isMedicationActiveOnDate(dailyMed, '2026-09-30'), false, 'Before start date');
  assert.equal(isMedicationActiveOnDate(dailyMed, '2026-10-05'), true, 'Within active period');
  assert.equal(isMedicationActiveOnDate(dailyMed, '2026-10-11'), false, 'After end date');

  // Specific weekdays: Monday (1) and Wednesday (3)
  // 2026-10-05 is a Monday (1)
  // 2026-10-06 is a Tuesday (2)
  const weekdayMed: Medication = {
    id: 'med-2',
    therapyId: 'th-2',
    name: 'Krople nawilżające',
    type: 'drops',
    doseAmount: '2',
    times: ['10:00'],
    scheduleType: 'specific_days',
    selectedDays: [1, 3], // Mon, Wed
    startDate: '2026-10-01',
  };

  assert.equal(isMedicationActiveOnDate(weekdayMed, '2026-10-05'), true, 'Monday is included');
  assert.equal(isMedicationActiveOnDate(weekdayMed, '2026-10-06'), false, 'Tuesday is excluded');
});

test('sortDosesChronologically correctly sorts by standard and snoozed times', () => {
  const doses: DoseItem[] = [
    {
      id: 'd1',
      medicationId: 'm1',
      therapyId: 't1',
      medicationName: 'Med A',
      therapyName: 'Therapy 1',
      therapyColor: '#10b981',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-10-27',
      time: '20:00',
      status: 'pending',
    },
    {
      id: 'd2',
      medicationId: 'm2',
      therapyId: 't1',
      medicationName: 'Med B',
      therapyName: 'Therapy 1',
      therapyColor: '#10b981',
      type: 'drops',
      doseAmount: '5',
      date: '2026-10-27',
      time: '07:30',
      status: 'pending',
    },
    {
      id: 'd3',
      medicationId: 'm3',
      therapyId: 't1',
      medicationName: 'Med C',
      therapyName: 'Therapy 1',
      therapyColor: '#10b981',
      type: 'ml',
      doseAmount: '10',
      date: '2026-10-27',
      time: '08:00',
      status: 'snoozed',
      snoozedUntil: '08:15',
    },
  ];

  const sorted = sortDosesChronologically(doses);
  assert.equal(sorted[0].id, 'd2', '07:30 comes first');
  assert.equal(sorted[1].id, 'd3', '08:15 snoozed comes second');
  assert.equal(sorted[2].id, 'd1', '20:00 comes last');
});

test('calculateCompliance and isTherapyCompletedForDate report correct values', () => {
  const doses: DoseItem[] = [
    {
      id: 'd1',
      medicationId: 'm1',
      therapyId: 't1',
      medicationName: 'Med A',
      therapyName: 'Therapy 1',
      therapyColor: '#10b981',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-10-27',
      time: '08:00',
      status: 'taken',
    },
    {
      id: 'd2',
      medicationId: 'm2',
      therapyId: 't1',
      medicationName: 'Med B',
      therapyName: 'Therapy 1',
      therapyColor: '#10b981',
      type: 'drops',
      doseAmount: '2',
      date: '2026-10-27',
      time: '14:00',
      status: 'taken',
    },
    {
      id: 'd3',
      medicationId: 'm3',
      therapyId: 't2',
      medicationName: 'Med C',
      therapyName: 'Therapy 2',
      therapyColor: '#3b82f6',
      type: 'inhaler',
      doseAmount: '1',
      date: '2026-10-27',
      time: '20:00',
      status: 'pending',
    },
  ];

  const compliance = calculateCompliance(doses);
  assert.equal(compliance.total, 3);
  assert.equal(compliance.taken, 2);
  assert.equal(compliance.percentage, 67);

  assert.equal(isTherapyCompletedForDate(doses, 't1'), true, 'Therapy 1 has all taken');
  assert.equal(isTherapyCompletedForDate(doses, 't2'), false, 'Therapy 2 has pending dose');
});

test('searchMedicines supports Polish diacritics, case-insensitivity, and substances', async () => {
  const { searchMedicines, normalizePolishText, POLISH_MEDICATIONS_REGISTRY } = await import('../data/polishMedicationsRegistry.ts');

  assert.ok(POLISH_MEDICATIONS_REGISTRY.length > 2000, 'Registry contains over 2000 items');

  // Normalization check
  assert.equal(normalizePolishText('Żółć i Gęśl'), 'zolc i gesl');

  // Search without Polish accents finding accented names
  const resultsNoAccent = searchMedicines('apap');
  assert.ok(resultsNoAccent.length > 0, 'Found Apap');
  assert.equal(resultsNoAccent[0].name.startsWith('Apap'), true);

  // Search by active substance
  const resultsBySubstance = searchMedicines('paracetamol');
  assert.ok(resultsBySubstance.some(m => m.substance.toLowerCase().includes('paracetamol')), 'Found by Paracetamol substance');

  // Search with Polish accents
  const resultsWithAccents = searchMedicines('krople');
  assert.ok(resultsWithAccents.length > 0);

  // Custom medication fallback
  const customList = [{
    id: 'custom-1',
    name: 'Własny Syrop Ziołowy',
    substance: 'Ekstrakt ziołowy',
    category: 'Własne',
    defaultType: 'ml' as const,
    defaultDose: '5',
    instructions: 'Po posiłku',
    isCustom: true
  }];
  const customFound = searchMedicines('wlasny', customList);
  assert.ok(customFound.length > 0 && customFound[0].name === 'Własny Syrop Ziołowy');
});

