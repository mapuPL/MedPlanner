import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDoseDisplay,
  formatLocalDate,
  addDaysToDateStr,
  calculateSnoozeTime,
  isMedicationActiveOnDate,
  sortDosesChronologically,
  calculateCompliance,
  isTherapyCompletedForDate,
  parseNumericDose,
  evaluateCabinetStatus,
  isDuplicateProfileName,
  validateDateRange,
  isDoseVisibleForTherapy,
  extractPureDoseAmount,
  refreshDosesAfterMedicationUpdate,
  buildDosesForDate,
  getDayComplianceStatus,
  getMonthCalendarCells,
  getWeekCalendarDates,
  undoDoseStatusResult,
  UNIFIED_DOSAGE_TYPES,
  calculateDoctorReportSummary,
  serializeBackupPayload,
  normalizeImportedBackupPayload,
  applyBackupImport,
  buildMedicationChangeRecord,
  buildTherapyStatusChangeRecords,
  estimateStockDaysRemaining,
  buildTherapyPdfReportData,
  formatTherapyReportFilename,
} from './medicationLogic.ts';
import type {
  Medication,
  DoseItem,
  FamilyProfile,
  Therapy,
  MedicationChangeRecord,
} from './medicationLogic.ts';

test('formatDoseDisplay formats units properly in Polish without duplication', () => {
  assert.equal(formatDoseDisplay('2', 'capsule'), '2 tabl.');
  assert.equal(formatDoseDisplay('10', 'drops'), '10 kropli');
  assert.equal(formatDoseDisplay('5', 'ml'), '5 ml');
  assert.equal(formatDoseDisplay('1', 'inhaler'), '1 wziew');
  assert.equal(formatDoseDisplay('2', 'application'), '2 aplik.');
  assert.equal(formatDoseDisplay('1', 'other'), '1 dawka');
  assert.equal(formatDoseDisplay('1 tabl. powlekana', 'capsule'), '1 tabl. powlekana');
});

test('parseNumericDose and extractPureDoseAmount extract numeric quantities cleanly', () => {
  assert.equal(parseNumericDose('2'), 2);
  assert.equal(parseNumericDose('1.5'), 1.5);
  assert.equal(parseNumericDose('2,5 ml'), 2.5);
  assert.equal(parseNumericDose('1 tabl. powlekana'), 1);

  assert.equal(extractPureDoseAmount('1 tabl. powlekana'), '1');
  assert.equal(extractPureDoseAmount('2,5 ml'), '2,5');
  assert.equal(extractPureDoseAmount(' 10 kropli '), '10');
  assert.equal(extractPureDoseAmount(''), '1');
  assert.equal(UNIFIED_DOSAGE_TYPES.length, 6);
});

test('evaluateCabinetStatus detects expired, expiring soon, and low stock medications', () => {
  const baseMed: Medication = {
    id: 'm1',
    therapyId: 't1',
    name: 'Amotaks',
    type: 'capsule',
    doseAmount: '1',
    times: ['08:00'],
    scheduleType: 'daily',
    startDate: '2026-01-01',
    packageSize: 20,
    stockQuantity: 15,
    lowStockThreshold: 5,
    expiryDate: '2026-12-31',
  };

  assert.equal(evaluateCabinetStatus(baseMed, '2026-06-01').status, 'ok');
  assert.equal(evaluateCabinetStatus({ ...baseMed, stockQuantity: 4 }, '2026-06-01').status, 'low_stock');
  assert.equal(evaluateCabinetStatus({ ...baseMed, expiryDate: '2026-06-20' }, '2026-06-01').status, 'expiring_soon');
  assert.equal(evaluateCabinetStatus({ ...baseMed, expiryDate: '2026-05-15' }, '2026-06-01').status, 'expired');
});

test('calculateSnoozeTime calculates future snooze time correctly', () => {
  assert.equal(calculateSnoozeTime('08:00', 5), '08:05');
  assert.equal(calculateSnoozeTime('08:45', 15), '09:00');
  assert.equal(calculateSnoozeTime('23:45', 30), '00:15');
  assert.equal(calculateSnoozeTime('12:30', 0), '12:30');
});

test('isMedicationActiveOnDate respects date boundaries, specific days, and therapy status', () => {
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

  const activeTherapyWithFutureEnd: Therapy = {
    id: 'th-1',
    name: 'Antybiotyk',
    color: '#10b981',
    icon: 'pill',
    startDate: '2026-10-12', // informational only
    endDate: '2026-10-02', // informational only
    isActive: true,
    createdAt: '2026-10-01T00:00:00Z',
  };
  assert.equal(
    isMedicationActiveOnDate(dailyMed, '2026-10-05', activeTherapyWithFutureEnd),
    true,
    'Active therapy dates are informational only and do not block scheduled medication'
  );

  const pausedTherapy: Therapy = {
    ...activeTherapyWithFutureEnd,
    isActive: false,
  };
  assert.equal(
    isMedicationActiveOnDate(dailyMed, '2026-10-05', pausedTherapy),
    false,
    'Paused therapy blocks dose generation'
  );

  // Specific weekdays: Monday (1) and Wednesday (3)
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

test('isDuplicateProfileName ignores case, surrounding whitespace, and excluded profile', () => {
  const profiles: FamilyProfile[] = [
    { id: 'self', name: 'Mój profil', relation: 'Główny', avatarColor: '#0F766E' },
    { id: 'mom', name: 'Mama', relation: 'Rodzina', avatarColor: '#8B5CF6' },
    { id: 'zyta', name: 'Żaneta', relation: 'Rodzina', avatarColor: '#3B82F6' },
  ];

  assert.equal(isDuplicateProfileName('  mama  ', profiles), true);
  assert.equal(isDuplicateProfileName('żANETA', profiles), true);
  assert.equal(isDuplicateProfileName('  ', profiles), false);
  assert.equal(isDuplicateProfileName('Mama', profiles, 'mom'), false);
  assert.equal(isDuplicateProfileName('Tata', profiles), false);
});

test('validateDateRange blocks endDate earlier than startDate and allows valid or open bounds', () => {
  assert.equal(validateDateRange(undefined, undefined), null);
  assert.equal(validateDateRange('2026-10-05', undefined), null);
  assert.equal(validateDateRange(undefined, '2026-10-05'), null);
  assert.equal(validateDateRange('2026-10-05', '2026-10-05'), null);
  assert.equal(validateDateRange('2026-10-05', '2026-10-12'), null);
  assert.ok(validateDateRange('2026-10-10', '2026-10-05') !== null);
});

test('isDoseVisibleForTherapy hides pending/snoozed doses when paused and preserves taken/skipped history', () => {
  const pausedTherapy: Therapy = {
    id: 't1',
    name: 'Kuracja',
    color: '#10b981',
    icon: 'pill',
    isActive: false,
    createdAt: '2026-10-01T00:00:00Z',
  };
  const activeTherapy: Therapy = { ...pausedTherapy, isActive: true };

  const baseDose: DoseItem = {
    id: 'd1',
    medicationId: 'm1',
    therapyId: 't1',
    medicationName: 'Amotaks',
    therapyName: 'Kuracja',
    therapyColor: '#10b981',
    type: 'capsule',
    doseAmount: '1',
    date: '2026-10-27',
    time: '08:00',
    status: 'pending',
  };

  assert.equal(isDoseVisibleForTherapy({ ...baseDose, status: 'pending' }, activeTherapy), true);
  assert.equal(isDoseVisibleForTherapy({ ...baseDose, status: 'pending' }, pausedTherapy), false);
  assert.equal(isDoseVisibleForTherapy({ ...baseDose, status: 'snoozed' }, pausedTherapy), false);
  assert.equal(isDoseVisibleForTherapy({ ...baseDose, status: 'taken' }, pausedTherapy), true);
  assert.equal(isDoseVisibleForTherapy({ ...baseDose, status: 'skipped' }, pausedTherapy), true);
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

  assert.equal(normalizePolishText('Żółć i Gęśl'), 'zolc i gesl');

  const resultsNoAccent = searchMedicines('apap');
  assert.ok(resultsNoAccent.length > 0, 'Found Apap');
  assert.equal(resultsNoAccent[0].name.startsWith('Apap'), true);

  const resultsBySubstance = searchMedicines('paracetamol');
  assert.ok(resultsBySubstance.some(m => m.substance.toLowerCase().includes('paracetamol')), 'Found by Paracetamol substance');

  const resultsWithAccents = searchMedicines('krople');
  assert.ok(resultsWithAccents.length > 0);

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

test('formatLocalDate and addDaysToDateStr handle calendar dates and month/year boundaries', () => {
  const localMidnight = new Date(2026, 2, 15, 0, 15, 0); // 2026-03-15 00:15 local
  assert.equal(formatLocalDate(localMidnight), '2026-03-15');

  assert.equal(addDaysToDateStr('2026-03-31', 1), '2026-04-01');
  assert.equal(addDaysToDateStr('2026-01-01', -1), '2025-12-31');
  assert.equal(addDaysToDateStr('2024-02-28', 1), '2024-02-29'); // leap year
  assert.equal(addDaysToDateStr('2026-10-25', 7), '2026-11-01');
});

test('refreshDosesAfterMedicationUpdate refreshes today pending/snoozed doses and preserves taken/skipped history', () => {
  const therapy: Therapy = {
    id: 'th-1',
    name: 'Kuracja',
    color: '#0F766E',
    icon: 'pill',
    profileId: 'self',
    isActive: true,
    createdAt: '2026-10-01T00:00:00Z',
  };

  const todayStr = '2026-10-27';
  const yesterdayStr = '2026-10-26';

  const existingDoses: DoseItem[] = [
    {
      id: 'med-1_2026-10-26_0800',
      medicationId: 'med-1',
      therapyId: 'th-1',
      medicationName: 'Amotaks',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: yesterdayStr,
      time: '08:00',
      status: 'taken',
      takenAt: '08:05',
      note: 'History note',
    },
    {
      id: 'med-1_2026-10-27_0800',
      medicationId: 'med-1',
      therapyId: 'th-1',
      medicationName: 'Amotaks',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: todayStr,
      time: '08:00',
      status: 'taken',
      takenAt: '08:02',
    },
    {
      id: 'med-1_2026-10-27_1400',
      medicationId: 'med-1',
      therapyId: 'th-1',
      medicationName: 'Amotaks',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: todayStr,
      time: '14:00',
      status: 'skipped',
    },
    {
      id: 'med-1_2026-10-27_2000',
      medicationId: 'med-1',
      therapyId: 'th-1',
      medicationName: 'Amotaks',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: todayStr,
      time: '20:00',
      status: 'snoozed',
      snoozedUntil: '20:30',
    },
  ];

  const updatedMed: Medication = {
    id: 'med-1',
    therapyId: 'th-1',
    profileId: 'self',
    name: 'Amotaks Forte',
    type: 'capsule',
    doseAmount: '2',
    instructions: 'Po posiłku',
    times: ['08:00', '21:00'],
    scheduleType: 'daily',
    startDate: '2026-10-20',
  };

  const refreshed = refreshDosesAfterMedicationUpdate(existingDoses, updatedMed, therapy, todayStr);

  // Yesterday's taken log preserved
  assert.ok(refreshed.some((d) => d.id === 'med-1_2026-10-26_0800' && d.note === 'History note'));
  // Today's 08:00 taken and 14:00 skipped logs preserved without duplicating 08:00
  assert.equal(refreshed.filter((d) => d.id === 'med-1_2026-10-27_0800').length, 1);
  assert.equal(refreshed.find((d) => d.id === 'med-1_2026-10-27_0800')?.status, 'taken');
  assert.equal(refreshed.find((d) => d.id === 'med-1_2026-10-27_1400')?.status, 'skipped');
  // Old snoozed 20:00 removed and replaced with fresh pending 21:00 with new instructions/doseAmount
  assert.equal(refreshed.some((d) => d.id === 'med-1_2026-10-27_2000'), false);
  const newEvening = refreshed.find((d) => d.id === 'med-1_2026-10-27_2100');
  assert.ok(newEvening);
  assert.equal(newEvening.status, 'pending');
  assert.equal(newEvening.doseAmount, '2');
  assert.equal(newEvening.instructions, 'Po posiłku');
});

test('buildDosesForDate generates schedules for arbitrary dates respecting profiles, paused therapies, and stored history', () => {
  const therapies: Therapy[] = [
    {
      id: 't-self',
      name: 'Terapia Ja',
      color: '#0F766E',
      icon: 'pill',
      profileId: 'self',
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 't-mom-paused',
      name: 'Wstrzymana Mamy',
      color: '#8B5CF6',
      icon: 'pill',
      profileId: 'mom',
      isActive: false,
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];

  const meds: Medication[] = [
    {
      id: 'm1',
      therapyId: 't-self',
      profileId: 'self',
      name: 'Witamina D',
      type: 'capsule',
      doseAmount: '1',
      times: ['08:00', '20:00'],
      scheduleType: 'specific_days',
      selectedDays: [1, 3, 5], // Mon, Wed, Fri
      startDate: '2026-11-01',
    },
    {
      id: 'm2',
      therapyId: 't-mom-paused',
      profileId: 'mom',
      name: 'Lek Mamy',
      type: 'drops',
      doseAmount: '2',
      times: ['09:00'],
      scheduleType: 'daily',
      startDate: '2026-11-01',
    },
  ];

  const stored: DoseItem[] = [
    {
      id: 'm1_2026-11-09_0800',
      medicationId: 'm1',
      therapyId: 't-self',
      profileId: 'self',
      medicationName: 'Witamina D',
      therapyName: 'Terapia Ja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-09', // Monday
      time: '08:00',
      status: 'taken',
      takenAt: '08:05',
    },
    {
      id: 'm2_2026-11-09_0900',
      medicationId: 'm2',
      therapyId: 't-mom-paused',
      profileId: 'mom',
      medicationName: 'Lek Mamy',
      therapyName: 'Wstrzymana Mamy',
      therapyColor: '#8B5CF6',
      type: 'drops',
      doseAmount: '2',
      date: '2026-11-09',
      time: '09:00',
      status: 'skipped',
    },
  ];

  // Monday 2026-11-09 for 'self' -> 08:00 taken + 20:00 virtual pending
  const selfMon = buildDosesForDate('2026-11-09', therapies, meds, stored, 'self');
  assert.equal(selfMon.length, 2);
  assert.equal(selfMon[0].status, 'taken');
  assert.equal(selfMon[1].status, 'pending');

  // Tuesday 2026-11-10 for 'self' -> specificDays excludes Tuesday
  const selfTue = buildDosesForDate('2026-11-10', therapies, meds, stored, 'self');
  assert.equal(selfTue.length, 0);

  // 'all' on 2026-11-09 keeps paused therapy's skipped history, hides future pending of paused therapy
  const allMon = buildDosesForDate('2026-11-09', therapies, meds, stored, 'all');
  assert.equal(allMon.length, 3);
  assert.equal(allMon.some((d) => d.medicationId === 'm2' && d.status === 'skipped'), true);

  const momFuture = buildDosesForDate('2026-11-15', therapies, meds, stored, 'mom');
  assert.equal(momFuture.length, 0);
});

test('getDayComplianceStatus returns green/orange/red/blue/none dots accurately and never marks today red', () => {
  const therapy: Therapy = {
    id: 't1',
    name: 'Kuracja',
    color: '#0F766E',
    icon: 'pill',
    profileId: 'self',
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
  };
  const med: Medication = {
    id: 'm1',
    therapyId: 't1',
    profileId: 'self',
    name: 'Lek A',
    type: 'capsule',
    doseAmount: '1',
    times: ['08:00', '20:00'],
    scheduleType: 'daily',
    startDate: '2026-11-10',
    endDate: '2026-11-20',
  };

  const today = '2026-11-15';
  const stored: DoseItem[] = [
    // 2026-11-12: all taken -> completed (green)
    {
      id: 'm1_2026-11-12_0800',
      medicationId: 'm1',
      therapyId: 't1',
      profileId: 'self',
      medicationName: 'Lek A',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-12',
      time: '08:00',
      status: 'taken',
    },
    {
      id: 'm1_2026-11-12_2000',
      medicationId: 'm1',
      therapyId: 't1',
      profileId: 'self',
      medicationName: 'Lek A',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-12',
      time: '20:00',
      status: 'taken',
    },
    // 2026-11-13: 1 taken, 1 pending -> partial (orange)
    {
      id: 'm1_2026-11-13_0800',
      medicationId: 'm1',
      therapyId: 't1',
      profileId: 'self',
      medicationName: 'Lek A',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-13',
      time: '08:00',
      status: 'taken',
    },
  ];

  // Empty outside range -> none
  assert.equal(getDayComplianceStatus('2026-11-05', today, [therapy], [med], stored, 'self').status, 'none');
  // All taken -> completed
  assert.equal(getDayComplianceStatus('2026-11-12', today, [therapy], [med], stored, 'self').status, 'completed');
  // Partial -> partial
  assert.equal(getDayComplianceStatus('2026-11-13', today, [therapy], [med], stored, 'self').status, 'partial');
  // Past with 0 taken -> missed (red)
  assert.equal(getDayComplianceStatus('2026-11-14', today, [therapy], [med], stored, 'self').status, 'missed');
  // Today pending -> upcoming (blue), never red
  assert.equal(getDayComplianceStatus(today, today, [therapy], [med], stored, 'self').status, 'upcoming');
  // Today with 1 skipped -> partial (orange), never red
  const todayWithSkip: DoseItem[] = [
    ...stored,
    {
      id: 'm1_2026-11-15_0800',
      medicationId: 'm1',
      therapyId: 't1',
      profileId: 'self',
      medicationName: 'Lek A',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: today,
      time: '08:00',
      status: 'skipped',
    },
  ];
  assert.equal(getDayComplianceStatus(today, today, [therapy], [med], todayWithSkip, 'self').status, 'partial');
  // Future -> upcoming (blue)
  assert.equal(getDayComplianceStatus('2026-11-18', today, [therapy], [med], stored, 'self').status, 'upcoming');
});

test('getMonthCalendarCells and getWeekCalendarDates align weeks Monday through Sunday', () => {
  const cells = getMonthCalendarCells(2026, 11); // Nov 2026 starts on Sunday (offset 6)
  assert.equal(cells.length % 7, 0);
  assert.equal(cells[0].dateStr, '2026-10-26'); // Monday before Nov 1
  assert.equal(cells[0].inCurrentMonth, false);
  assert.equal(cells[6].dateStr, '2026-11-01');
  assert.equal(cells[6].inCurrentMonth, true);

  const week = getWeekCalendarDates('2026-11-15'); // Sunday
  assert.equal(week.length, 7);
  assert.equal(week[0], '2026-11-09'); // Monday
  assert.equal(week[6], '2026-11-15'); // Sunday
});

test('undoDoseStatusResult refunds cabinet stock when undoing taken, preserves notes, and handles skipped', () => {
  const meds: Medication[] = [
    {
      id: 'm1',
      therapyId: 't1',
      name: 'Amotaks',
      type: 'capsule',
      doseAmount: '2',
      times: ['08:00', '20:00'],
      scheduleType: 'daily',
      startDate: '2026-11-01',
      stockQuantity: 10,
    },
  ];
  const doses: DoseItem[] = [
    {
      id: 'd-taken',
      medicationId: 'm1',
      therapyId: 't1',
      medicationName: 'Amotaks',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '2',
      date: '2026-11-15',
      time: '08:00',
      status: 'taken',
      takenAt: '08:04',
    },
    {
      id: 'd-taken-note',
      medicationId: 'm1',
      therapyId: 't1',
      medicationName: 'Amotaks',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '2',
      date: '2026-11-15',
      time: '20:00',
      status: 'taken',
      takenAt: '20:02',
      note: 'Po kolacji',
    },
    {
      id: 'd-skipped',
      medicationId: 'm1',
      therapyId: 't1',
      medicationName: 'Amotaks',
      therapyName: 'Kuracja',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '2',
      date: '2026-11-14',
      time: '08:00',
      status: 'skipped',
    },
  ];

  // Undo taken without note: removes log and refunds 2 units (10 -> 12)
  const r1 = undoDoseStatusResult(doses, meds, 'd-taken');
  assert.equal(r1.medications[0].stockQuantity, 12);
  assert.equal(r1.doses.some((d) => d.id === 'd-taken'), false);

  // Undo taken with note: resets status to pending, keeps note, refunds 2 units (12 -> 14)
  const r2 = undoDoseStatusResult(r1.doses, r1.medications, 'd-taken-note');
  assert.equal(r2.medications[0].stockQuantity, 14);
  const noted = r2.doses.find((d) => d.id === 'd-taken-note');
  assert.ok(noted);
  assert.equal(noted.status, 'pending');
  assert.equal(noted.takenAt, undefined);
  assert.equal(noted.note, 'Po kolacji');

  // Undo skipped: removes log and does NOT refund stock
  const r3 = undoDoseStatusResult(r2.doses, r2.medications, 'd-skipped');
  assert.equal(r3.medications[0].stockQuantity, 14);
  assert.equal(r3.doses.some((d) => d.id === 'd-skipped'), false);
});

test('calculateDoctorReportSummary filters by profile and calculates 7/14/30-day adherence per medication', () => {
  const therapies: Therapy[] = [
    {
      id: 't-self',
      name: 'Własna',
      color: '#0F766E',
      icon: 'medication',
      profileId: 'self',
      isActive: true,
      createdAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 't-mom',
      name: 'Kardiologia Mamy',
      color: '#E11D48',
      icon: 'favorite',
      profileId: 'mom',
      isActive: true,
      createdAt: '2026-10-01T08:00:00Z',
    },
  ];
  const meds: Medication[] = [
    {
      id: 'm-self',
      therapyId: 't-self',
      profileId: 'self',
      name: 'Witamina D',
      type: 'capsule',
      doseAmount: '1',
      times: ['08:00'],
      scheduleType: 'daily',
      startDate: '2026-10-01',
    },
    {
      id: 'm-mom',
      therapyId: 't-mom',
      profileId: 'mom',
      name: 'Bisocard',
      type: 'capsule',
      doseAmount: '1',
      times: ['08:00'],
      scheduleType: 'daily',
      startDate: '2026-10-01',
    },
  ];
  // 7-day window ending 2026-11-15: 2026-11-09 .. 2026-11-15 (7 days)
  const storedDoses: DoseItem[] = [
    {
      id: 'm-self_2026-11-09_0800',
      medicationId: 'm-self',
      therapyId: 't-self',
      profileId: 'self',
      medicationName: 'Witamina D',
      therapyName: 'Własna',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-09',
      time: '08:00',
      status: 'taken',
      takenAt: '08:05',
    },
    {
      id: 'm-self_2026-11-10_0800',
      medicationId: 'm-self',
      therapyId: 't-self',
      profileId: 'self',
      medicationName: 'Witamina D',
      therapyName: 'Własna',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-10',
      time: '08:00',
      status: 'taken',
      takenAt: '08:05',
    },
    {
      id: 'm-self_2026-11-11_0800',
      medicationId: 'm-self',
      therapyId: 't-self',
      profileId: 'self',
      medicationName: 'Witamina D',
      therapyName: 'Własna',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-11',
      time: '08:00',
      status: 'skipped',
    },
    // Earlier in 14-day window (2026-11-04)
    {
      id: 'm-self_2026-11-04_0800',
      medicationId: 'm-self',
      therapyId: 't-self',
      profileId: 'self',
      medicationName: 'Witamina D',
      therapyName: 'Własna',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-04',
      time: '08:00',
      status: 'taken',
      takenAt: '08:01',
    },
    {
      id: 'm-mom_2026-11-15_0800',
      medicationId: 'm-mom',
      therapyId: 't-mom',
      profileId: 'mom',
      medicationName: 'Bisocard',
      therapyName: 'Kardiologia Mamy',
      therapyColor: '#E11D48',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-15',
      time: '08:00',
      status: 'taken',
      takenAt: '08:00',
    },
  ];

  const self7 = calculateDoctorReportSummary(therapies, meds, storedDoses, 'self', 7, '2026-11-15');
  assert.equal(self7.startDate, '2026-11-09');
  assert.equal(self7.endDate, '2026-11-15');
  assert.equal(self7.items.length, 1);
  assert.equal(self7.totalScheduled, 7);
  assert.equal(self7.totalTaken, 2);
  assert.equal(self7.totalSkipped, 1);
  assert.equal(self7.overallPercentage, 29);
  assert.equal(self7.items[0].adherencePercentage, 29);

  const all14 = calculateDoctorReportSummary(therapies, meds, storedDoses, 'all', 14, '2026-11-15');
  assert.equal(all14.startDate, '2026-11-02');
  assert.equal(all14.items.length, 2);
  assert.equal(all14.totalScheduled, 28);
  assert.equal(all14.totalTaken, 4);

  const mom30 = calculateDoctorReportSummary(therapies, meds, storedDoses, 'mom', 30, '2026-11-15');
  assert.equal(mom30.items.length, 1);
  assert.equal(mom30.totalScheduled, 30);
  assert.equal(mom30.totalTaken, 1);
});

test('serializeBackupPayload and normalizeImportedBackupPayload ensure Web <-> Flutter JSON compatibility', () => {
  const profiles: FamilyProfile[] = [
    { id: 'self', name: 'Mój profil', relation: 'Główny', avatarColor: '#0F766E' },
  ];
  const therapies: Therapy[] = [
    {
      id: 't1',
      name: 'Antybiotyk',
      color: '#0F766E',
      icon: 'medication',
      profileId: 'self',
      isActive: true,
      createdAt: '2026-11-01T08:00:00Z',
    },
  ];
  const medications: Medication[] = [
    {
      id: 'm1',
      therapyId: 't1',
      profileId: 'self',
      name: 'Amotaks',
      type: 'capsule',
      doseAmount: '1',
      times: ['08:00', '20:00'],
      scheduleType: 'specific_days',
      selectedDays: [1, 3, 5],
      startDate: '2026-11-01',
    },
  ];
  const doses: DoseItem[] = [
    {
      id: 'm1_2026-11-15_0800',
      medicationId: 'm1',
      therapyId: 't1',
      profileId: 'self',
      medicationName: 'Amotaks',
      therapyName: 'Antybiotyk',
      therapyColor: '#0F766E',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-15',
      time: '08:00',
      status: 'taken',
      takenAt: '08:06',
      note: 'Po śniadaniu',
    },
  ];

  const payload = serializeBackupPayload({
    profiles,
    therapies,
    medications,
    doses,
    exportedAt: '2026-11-15T12:00:00.000Z',
  });
  assert.equal(payload.app, 'MedPlaner');
  assert.equal(payload.version, 3);
  assert.equal(payload.doseLogs.length, 1);
  assert.equal('doses' in payload, false);

  const normalizedWeb = normalizeImportedBackupPayload(JSON.parse(JSON.stringify(payload)));
  assert.equal(normalizedWeb.profiles[0].id, 'self');
  assert.equal(normalizedWeb.medications[0].scheduleType, 'specific_days');
  assert.equal(normalizedWeb.doseLogs[0].note, 'Po śniadaniu');

  // Simulate Flutter-style payload (colorHex, profileName without profileId, specificDays, actualTakenTime ISO, notes)
  const flutterStyleRaw = {
    app: 'MedPlaner',
    version: 2,
    profiles: [
      { id: 'prof_1', name: 'Mama Maria', colorHex: '#E11D48', isDefault: false },
    ],
    therapies: [
      {
        id: 'fl_t1',
        name: 'Nadciśnienie',
        color: '#E11D48',
        icon: 'favorite',
        profileName: 'Mama Maria',
        isActive: 1,
      },
    ],
    medications: [
      {
        id: 'fl_m1',
        therapyId: 'fl_t1',
        name: 'Prestilol',
        type: 'capsule',
        doseAmount: '1 tabl.',
        times: ['07:30'],
        scheduleType: 'specificDays',
        selectedDays: [1, 2, 3, 4, 5],
        startDate: '2026-11-01',
      },
    ],
    doseLogs: [
      {
        id: 'fl_m1_2026-11-15_0730',
        medicationId: 'fl_m1',
        therapyId: 'fl_t1',
        date: '2026-11-15',
        time: '07:30',
        status: 'taken',
        actualTakenTime: '2026-11-15T07:35:00.000Z',
        notes: 'Zmierzono ciśnienie',
      },
    ],
  };

  const normalizedFlutter = normalizeImportedBackupPayload(flutterStyleRaw);
  assert.equal(normalizedFlutter.profiles[0].avatarColor, '#E11D48');
  assert.equal(normalizedFlutter.therapies[0].profileId, 'prof_1');
  assert.equal(normalizedFlutter.medications[0].profileId, 'prof_1');
  assert.equal(normalizedFlutter.medications[0].scheduleType, 'specific_days');
  assert.equal(normalizedFlutter.medications[0].doseAmount, '1');
  assert.equal(normalizedFlutter.doseLogs[0].takenAt, '07:35');
  assert.equal(normalizedFlutter.doseLogs[0].note, 'Zmierzono ciśnienie');
});

test('applyBackupImport supports both replace and merge modes with profile deduplication', () => {
  const current = {
    profiles: [
      { id: 'self', name: 'Mój profil', relation: 'Główny', avatarColor: '#0F766E' },
    ],
    therapies: [
      {
        id: 't1',
        name: 'Stara',
        color: '#0F766E',
        icon: 'medication',
        profileId: 'self',
        isActive: true,
        createdAt: '2026-11-01T08:00:00Z',
      },
    ],
    medications: [
      {
        id: 'm1',
        therapyId: 't1',
        profileId: 'self',
        name: 'Witamina C',
        type: 'capsule' as const,
        doseAmount: '1',
        times: ['08:00'],
        scheduleType: 'daily' as const,
        startDate: '2026-11-01',
      },
    ],
    doses: [] as DoseItem[],
  };

  const incoming = normalizeImportedBackupPayload({
    app: 'MedPlaner',
    version: 2,
    exportedAt: '2026-11-15T12:00:00Z',
    profiles: [
      { id: 'prof_self_fl', name: 'mój profil', colorHex: '#0F766E' },
      { id: 'prof_dad', name: 'Tata', colorHex: '#2563EB' },
    ],
    therapies: [
      {
        id: 't2',
        name: 'Nowa',
        color: '#2563EB',
        icon: 'favorite',
        profileId: 'prof_self_fl',
        isActive: true,
      },
    ],
    medications: [
      {
        id: 'm2',
        therapyId: 't2',
        profileId: 'prof_self_fl',
        name: 'Magnez',
        type: 'capsule',
        doseAmount: '2',
        times: ['18:00'],
        scheduleType: 'daily',
        startDate: '2026-11-10',
      },
    ],
    doseLogs: [],
  });

  const merged = applyBackupImport(current, incoming, 'merge');
  // 'mój profil' matched 'Mój profil' (self), so only 'Tata' is appended
  assert.equal(merged.profiles.length, 2);
  assert.equal(merged.therapies.length, 2);
  assert.equal(merged.therapies[1].profileId, 'self');
  assert.equal(merged.medications.length, 2);
  assert.equal(merged.medications[1].profileId, 'self');

  const replaced = applyBackupImport(current, incoming, 'replace');
  assert.equal(replaced.profiles.length, 2);
  assert.equal(replaced.profiles[0].id, 'prof_self_fl');
  assert.equal(replaced.therapies.length, 1);
  assert.equal(replaced.therapies[0].id, 't2');
  assert.equal(replaced.medications.length, 1);
});

test('buildMedicationChangeRecord and buildTherapyStatusChangeRecords record audit entries accurately', () => {
  const therapy: Therapy = {
    id: 't1',
    name: 'Nadciśnienie',
    color: '#0F766E',
    icon: 'favorite',
    profileId: 'mom',
    isActive: true,
    createdAt: '2026-11-01T08:00:00Z',
  };
  const prevMed: Medication = {
    id: 'm1',
    therapyId: 't1',
    profileId: 'mom',
    name: 'Prestilol',
    type: 'capsule',
    doseAmount: '1',
    times: ['08:00'],
    scheduleType: 'daily',
    startDate: '2026-11-01',
    stockQuantity: 20,
  };

  // Stock-only change without reason should not create a clinical audit record
  const stockOnly = buildMedicationChangeRecord({
    prevMed,
    nextMed: { ...prevMed, stockQuantity: 50 },
    prevTherapy: therapy,
    nextTherapy: therapy,
  });
  assert.equal(stockOnly, null);

  // Dose & time change with reason
  const doseChange = buildMedicationChangeRecord({
    prevMed,
    nextMed: { ...prevMed, doseAmount: '2', times: ['08:00', '20:00'] },
    prevTherapy: therapy,
    nextTherapy: therapy,
    changeReason: 'Zalecenie kardiologa po kontroli ciśnienia',
    changedAt: '2026-11-12T10:15:00.000Z',
  });
  assert.ok(doseChange);
  assert.equal(doseChange.changeType, 'dose_change');
  assert.equal(doseChange.profileId, 'mom');
  assert.equal(doseChange.previousDose, '1 tabl. (08:00)');
  assert.equal(doseChange.newDose, '2 tabl. (08:00, 20:00)');
  assert.equal(doseChange.changeReason, 'Zalecenie kardiologa po kontroli ciśnienia');

  // Therapy status toggle
  const statusRecords = buildTherapyStatusChangeRecords({
    therapy,
    medications: [prevMed],
    nextIsActive: false,
    changedAt: '2026-11-18T09:00:00.000Z',
  });
  assert.equal(statusRecords.length, 1);
  assert.equal(statusRecords[0].changeType, 'status_change');
  assert.ok(statusRecords[0].newDose.includes('wstrzymana'));
});

test('estimateStockDaysRemaining accounts for daily vs specific_days schedules', () => {
  const dailyMed: Medication = {
    id: 'm1',
    therapyId: 't1',
    name: 'Amotaks',
    type: 'capsule',
    doseAmount: '2',
    times: ['08:00', '20:00'], // 4 tabl./day
    scheduleType: 'daily',
    startDate: '2026-11-01',
    stockQuantity: 27,
  };
  assert.equal(estimateStockDaysRemaining(dailyMed), 6); // floor(27 / 4) = 6

  const specificDaysMed: Medication = {
    ...dailyMed,
    doseAmount: '1',
    times: ['08:00'], // 1 tabl. 3 days/week -> 3/7 per day
    scheduleType: 'specific_days',
    selectedDays: [1, 3, 5],
    stockQuantity: 9,
  };
  assert.equal(estimateStockDaysRemaining(specificDaysMed), 21); // floor(9 / (3/7)) = 21

  assert.equal(estimateStockDaysRemaining({ ...dailyMed, stockQuantity: undefined }), null);
});

test('buildTherapyPdfReportData computes scoped adherence, preserves historical dose snapshots, and filters change timeline', () => {
  const profiles: FamilyProfile[] = [
    { id: 'mom', name: 'Mama Maria', relation: 'Mama', avatarColor: '#E11D48' },
    { id: 'self', name: 'Mój profil', relation: 'Główny', avatarColor: '#0F766E' },
  ];
  const therapies: Therapy[] = [
    {
      id: 't-cardio',
      name: 'Kardiologia',
      color: '#E11D48',
      icon: 'favorite',
      profileId: 'mom',
      isActive: true,
      createdAt: '2026-11-01T08:00:00Z',
    },
    {
      id: 't-vit',
      name: 'Suplementacja',
      color: '#10B981',
      icon: 'pill',
      profileId: 'mom',
      isActive: true,
      createdAt: '2026-11-01T08:00:00Z',
    },
  ];
  const medications: Medication[] = [
    {
      id: 'm-bis',
      therapyId: 't-cardio',
      profileId: 'mom',
      name: 'Bisocard',
      type: 'capsule',
      doseAmount: '2', // Edited on 2026-11-12 from 1 -> 2
      times: ['08:00'],
      scheduleType: 'daily',
      startDate: '2026-11-10', // Started mid-range (Nov 10) inside Nov 08..Nov 13
      stockQuantity: 18,
      packageSize: 30,
    },
    {
      id: 'm-vit',
      therapyId: 't-vit',
      profileId: 'mom',
      name: 'Witamina D',
      type: 'capsule',
      doseAmount: '1',
      times: ['12:00'],
      scheduleType: 'daily',
      startDate: '2026-11-08',
    },
  ];
  const doses: DoseItem[] = [
    {
      id: 'm-bis_2026-11-10_0800',
      medicationId: 'm-bis',
      therapyId: 't-cardio',
      profileId: 'mom',
      medicationName: 'Bisocard',
      therapyName: 'Kardiologia',
      therapyColor: '#E11D48',
      type: 'capsule',
      doseAmount: '1', // Historical snapshot before edit!
      date: '2026-11-10',
      time: '08:00',
      status: 'taken',
      takenAt: '08:04',
      note: 'Ciśnienie 125/80',
    },
    {
      id: 'm-bis_2026-11-11_0800',
      medicationId: 'm-bis',
      therapyId: 't-cardio',
      profileId: 'mom',
      medicationName: 'Bisocard',
      therapyName: 'Kardiologia',
      therapyColor: '#E11D48',
      type: 'capsule',
      doseAmount: '1',
      date: '2026-11-11',
      time: '08:00',
      status: 'skipped',
    },
    {
      id: 'm-bis_2026-11-12_0800',
      medicationId: 'm-bis',
      therapyId: 't-cardio',
      profileId: 'mom',
      medicationName: 'Bisocard',
      therapyName: 'Kardiologia',
      therapyColor: '#E11D48',
      type: 'capsule',
      doseAmount: '2',
      date: '2026-11-12',
      time: '08:00',
      status: 'taken',
      takenAt: '08:02',
    },
  ];
  const changes: MedicationChangeRecord[] = [
    {
      id: 'chg-1',
      medicationId: 'm-bis',
      therapyId: 't-cardio',
      profileId: 'mom',
      medicationName: 'Bisocard',
      changedAt: '2026-11-12T07:30:00.000Z',
      previousDose: '1 tabl.',
      newDose: '2 tabl.',
      changeType: 'dose_change',
      changeReason: 'Zwiększenie dawki przez lekarza',
    },
    {
      id: 'chg-out',
      medicationId: 'm-bis',
      therapyId: 't-cardio',
      profileId: 'mom',
      medicationName: 'Bisocard',
      changedAt: '2026-10-01T07:30:00.000Z',
      previousDose: '0.5 tabl.',
      newDose: '1 tabl.',
      changeType: 'dose_change',
    },
  ];

  // Scope only 't-cardio' for 2026-11-08 .. 2026-11-13
  // Bisocard started on 2026-11-10 -> only 4 applicable days (Nov 10, 11, 12, 13), NOT 6!
  const fullReport = buildTherapyPdfReportData({
    profiles,
    therapies,
    medications,
    doses,
    medicationChanges: changes,
    config: {
      profileId: 'mom',
      includeAllTherapies: false,
      selectedTherapyIds: ['t-cardio'],
      startDate: '2026-11-08',
      endDate: '2026-11-13',
      detailLevel: 'full',
    },
    generatedAt: '2026-11-13T15:00:00.000Z',
  });

  assert.equal(fullReport.patientName, 'Mama Maria');
  assert.equal(fullReport.therapySummaries.length, 1);
  assert.equal(fullReport.totalScheduled, 4);
  assert.equal(fullReport.totalTaken, 2);
  assert.equal(fullReport.totalSkipped, 1);
  assert.equal(fullReport.overallAdherencePercentage, 50);

  // Only change within Nov 08..13 is returned
  assert.equal(fullReport.doseChanges.length, 1);
  assert.equal(fullReport.doseChanges[0].changeReason, 'Zwiększenie dawki przez lekarza');

  // Stock days remaining for 18 tablets at 2 tabl./day = 9 days
  assert.equal(fullReport.stockItems.length, 1);
  assert.equal(fullReport.stockItems[0].estimatedDaysLeft, 9);

  // Detailed log preserves 1 tabl. snapshot on Nov 10 and 2 tabl. on Nov 12
  assert.equal(fullReport.detailedLogs.length, 4);
  assert.equal(fullReport.detailedLogs[0].date, '2026-11-10');
  assert.equal(fullReport.detailedLogs[0].doseSnapshot, '1 tabl.');
  assert.equal(fullReport.detailedLogs[0].note, 'Ciśnienie 125/80');
  assert.equal(fullReport.detailedLogs[2].date, '2026-11-12');
  assert.equal(fullReport.detailedLogs[2].doseSnapshot, '2 tabl.');

  // Summary mode omits detailedLogs
  const summaryReport = buildTherapyPdfReportData({
    profiles,
    therapies,
    medications,
    doses,
    medicationChanges: [],
    config: {
      profileId: 'mom',
      includeAllTherapies: true,
      selectedTherapyIds: [],
      startDate: '2026-11-10',
      endDate: '2026-11-13',
      detailLevel: 'summary',
    },
  });
  assert.equal(summaryReport.therapySummaries.length, 2);
  assert.equal(summaryReport.doseChanges.length, 0);
  assert.equal(summaryReport.detailedLogs.length, 0);

  assert.equal(
    formatTherapyReportFilename('Żółć Mój profil', '2026-11-01', '2026-11-26'),
    'MedPlaner_Raport_Zolc_Moj_profil_2026-11-01_2026-11-26.pdf'
  );

  // Backup round-trip retains medicationChanges
  const backup = serializeBackupPayload({
    profiles,
    therapies,
    medications,
    doses,
    medicationChanges: changes,
  });
  assert.equal(backup.medicationChanges?.length, 2);
  const restored = normalizeImportedBackupPayload(JSON.parse(JSON.stringify(backup)));
  assert.equal(restored.medicationChanges?.length, 2);
  assert.equal(restored.medicationChanges?.[0].changeReason, 'Zwiększenie dawki przez lekarza');
});


