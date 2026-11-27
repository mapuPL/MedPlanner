export type MedicationType =
  | 'capsule' // Kapsułka / Tabletka
  | 'drops'   // Krople
  | 'ml'      // ml
  | 'inhaler' // Wziew
  | 'application' // Aplikacja
  | 'other';  // Inne

export type ScheduleType = 'daily' | 'specific_days' | 'date_range';

export type DoseStatus = 'pending' | 'taken' | 'snoozed' | 'skipped';

export interface FamilyProfile {
  id: string;
  name: string;
  relation: string;
  avatarColor: string;
}

export interface Therapy {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  profileId?: string; // Domyślnie 'self'
  startDate?: string; // YYYY-MM-DD (opcjonalnie, informacyjnie)
  endDate?: string; // YYYY-MM-DD (opcjonalnie, informacyjnie)
  isActive: boolean;
  createdAt: string;
}

export interface Medication {
  id: string;
  therapyId: string;
  name: string;
  type: MedicationType;
  doseAmount: string; // e.g. "1", "5", "10"
  instructions?: string; // e.g. "Po posiłku"
  times: string[]; // e.g. ["07:30", "15:15", "21:00"]
  scheduleType: ScheduleType;
  selectedDays?: number[]; // 1=Mon, 7=Sun
  startDate?: string;
  endDate?: string;
  // Domowa Apteczka
  stockQuantity?: number; // Ile tabletek/ml/dawek zostało w opakowaniu
  packageSize?: number; // Rozmiar pełnego opakowania (np. 30)
  lowStockThreshold?: number; // Próg ostrzeżenia o kończącym się zapasie (np. 5)
  expiryDate?: string; // Termin ważności YYYY-MM-DD
  profileId?: string;
}

export interface DoseItem {
  id: string;
  medicationId: string;
  therapyId: string;
  medicationName: string;
  therapyName: string;
  therapyColor: string;
  profileId?: string;
  type: MedicationType;
  doseAmount: string;
  instructions?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: DoseStatus;
  takenAt?: string; // HH:mm or ISO
  snoozedUntil?: string; // HH:mm
  snoozeCount?: number;
  note?: string;
}

export const MEDICATION_TYPE_LABELS: Record<MedicationType, { label: string; unit: string; icon: string }> = {
  capsule: { label: 'Kapsułka / Tabletka', unit: 'tabl.', icon: 'Pill' },
  drops: { label: 'Krople', unit: 'kropli', icon: 'Droplet' },
  ml: { label: 'ml (płyn / syrop)', unit: 'ml', icon: 'FlaskConical' },
  inhaler: { label: 'Wziew', unit: 'wziew', icon: 'Wind' },
  application: { label: 'Aplikacja (maść / aerozol)', unit: 'aplik.', icon: 'Sparkles' },
  other: { label: 'Inne', unit: 'dawka', icon: 'Stethoscope' },
};

export const UNIFIED_DOSAGE_TYPES: Array<{
  type: MedicationType;
  label: string;
  shortUnit: string;
}> = (['capsule', 'drops', 'ml', 'inhaler', 'application', 'other'] as MedicationType[]).map((type) => ({
  type,
  label: MEDICATION_TYPE_LABELS[type].label,
  shortUnit: MEDICATION_TYPE_LABELS[type].unit,
}));

/**
 * Normalize profile name for case-insensitive, whitespace-trimmed comparisons
 */
export function normalizeProfileName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Check if a profile name duplicates an existing profile (ignoring case and leading/trailing spaces)
 */
export function isDuplicateProfileName(
  candidateName: string,
  profiles: FamilyProfile[],
  excludeProfileId?: string
): boolean {
  const normalized = normalizeProfileName(candidateName);
  if (!normalized) return false;
  return profiles.some(
    (p) => p.id !== excludeProfileId && normalizeProfileName(p.name) === normalized
  );
}

/**
 * Validate optional startDate / endDate range (YYYY-MM-DD)
 */
export function validateDateRange(startDate?: string, endDate?: string): string | null {
  const start = startDate?.trim();
  const end = endDate?.trim();
  if (start && end && end < start) {
    return 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.';
  }
  return null;
}

/**
 * Determine if a stored dose should be visible when its therapy may be paused/archived.
 * Active therapies show all doses; paused therapies hide pending/snoozed doses while preserving taken/skipped history.
 */
export function isDoseVisibleForTherapy(dose: DoseItem, therapy?: Therapy): boolean {
  if (!therapy) return true;
  if (therapy.isActive) return true;
  return dose.status === 'taken' || dose.status === 'skipped';
}

/**
 * Format dose display text, e.g. "2 tabl." or "15 ml"
 * Avoids duplicating unit if amount already includes text units.
 */
export function formatDoseDisplay(amount: string, type: MedicationType): string {
  const trimmed = (amount || '1').trim();
  if (/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed)) {
    return trimmed;
  }
  const meta = MEDICATION_TYPE_LABELS[type] || MEDICATION_TYPE_LABELS.other;
  return `${trimmed} ${meta.unit}`;
}

/**
 * Extract pure numeric/decimal dose quantity from legacy or user input strings (e.g. "2,5 ml" -> "2,5")
 */
export function extractPureDoseAmount(amount: string): string {
  const trimmed = (amount || '').trim();
  if (!trimmed) return '1';
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)/);
  return match ? match[1] : trimmed;
}

/**
 * Parse numeric quantity consumed per single dose (e.g. "2" -> 2, "10 ml" -> 10)
 */
export function parseNumericDose(amount: string): number {
  const match = (amount || '1').match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 1;
  const num = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : 1;
}

/**
 * Format local calendar date as YYYY-MM-DD without UTC timezone shift
 */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Add (or subtract) calendar days to a YYYY-MM-DD string safely via UTC noon
 */
export function addDaysToDateStr(dateStr: string, offsetDays: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().substring(0, 10);
}

export type CabinetAlertStatus = 'ok' | 'low_stock' | 'expiring_soon' | 'expired';

export function evaluateCabinetStatus(
  medication: Medication,
  referenceDateStr: string = formatLocalDate()
): {
  status: CabinetAlertStatus;
  daysUntilExpiry: number | null;
  isLowStock: boolean;
} {
  let daysUntilExpiry: number | null = null;
  if (medication.expiryDate) {
    const refMs = new Date(`${referenceDateStr}T00:00:00Z`).getTime();
    const expMs = new Date(`${medication.expiryDate}T00:00:00Z`).getTime();
    daysUntilExpiry = Math.ceil((expMs - refMs) / 86400000);
  }

  const threshold = medication.lowStockThreshold ?? 5;
  const isLowStock =
    typeof medication.stockQuantity === 'number' && medication.stockQuantity <= threshold;

  if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
    return { status: 'expired', daysUntilExpiry, isLowStock };
  }
  if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
    return { status: 'expiring_soon', daysUntilExpiry, isLowStock };
  }
  if (isLowStock) {
    return { status: 'low_stock', daysUntilExpiry, isLowStock };
  }
  return { status: 'ok', daysUntilExpiry, isLowStock };
}

/**
 * Calculate snooze time given a base time HH:mm and additional minutes
 */
export function calculateSnoozeTime(timeStr: string, addMinutes: number): string {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  const totalMinutes = (hours * 60 + minutes + addMinutes) % (24 * 60);
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;

  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

/**
 * Verify if medication is scheduled on a given date (YYYY-MM-DD).
 * Respects parent therapy isActive flag (therapy dates remain informational only).
 */
export function isMedicationActiveOnDate(
  medication: Medication,
  dateStr: string,
  therapy?: Therapy
): boolean {
  if (therapy && !therapy.isActive) {
    return false;
  }
  if (medication.startDate && dateStr < medication.startDate) {
    return false;
  }
  if (medication.endDate && dateStr > medication.endDate) {
    return false;
  }

  if (medication.scheduleType === 'daily') {
    return true;
  }

  if (medication.scheduleType === 'date_range') {
    return true;
  }

  if (medication.scheduleType === 'specific_days' && medication.selectedDays) {
    const d = new Date(dateStr + 'T12:00:00Z');
    const day = d.getUTCDay();
    const isoDay = day === 0 ? 7 : day;
    return medication.selectedDays.includes(isoDay);
  }

  return true;
}

/**
 * Sort doses chronologically by time (HH:mm)
 */
export function sortDosesChronologically(doses: DoseItem[]): DoseItem[] {
  return [...doses].sort((a, b) => {
    const timeA = a.status === 'snoozed' && a.snoozedUntil ? a.snoozedUntil : a.time;
    const timeB = b.status === 'snoozed' && b.snoozedUntil ? b.snoozedUntil : b.time;
    return timeA.localeCompare(timeB);
  });
}

/**
 * Calculate compliance percentage for a list of doses
 */
export function calculateCompliance(doses: DoseItem[]): { total: number; taken: number; percentage: number } {
  if (!doses || doses.length === 0) {
    return { total: 0, taken: 0, percentage: 100 };
  }
  const taken = doses.filter(d => d.status === 'taken').length;
  const percentage = Math.round((taken / doses.length) * 100);
  return { total: doses.length, taken, percentage };
}

/**
 * Refresh today's and future pending/snoozed doses when a saved medication is edited,
 * while strictly preserving all taken/skipped doses and historical days.
 */
export function refreshDosesAfterMedicationUpdate(
  doses: DoseItem[],
  updatedMed: Medication,
  therapy?: Therapy,
  todayStr: string = formatLocalDate()
): DoseItem[] {
  const retained = doses.filter((d) => {
    if (d.medicationId !== updatedMed.id) return true;
    if (d.date < todayStr) return true;
    return d.status === 'taken' || d.status === 'skipped';
  });

  if (!isMedicationActiveOnDate(updatedMed, todayStr, therapy)) {
    return retained;
  }

  const existingIds = new Set(retained.map((d) => d.id));
  const regenerated: DoseItem[] = [];

  for (const time of updatedMed.times) {
    const id = `${updatedMed.id}_${todayStr}_${time.replace(':', '')}`;
    if (existingIds.has(id)) continue;
    regenerated.push({
      id,
      medicationId: updatedMed.id,
      therapyId: updatedMed.therapyId,
      profileId: updatedMed.profileId || therapy?.profileId || 'self',
      medicationName: updatedMed.name,
      therapyName: therapy?.name || 'Terapia',
      therapyColor: therapy?.color || '#0F766E',
      type: updatedMed.type,
      doseAmount: updatedMed.doseAmount,
      instructions: updatedMed.instructions,
      date: todayStr,
      time,
      status: 'pending',
    });
  }

  return [...retained, ...regenerated];
}

/**
 * Determine if a therapy is 100% completed on a given date
 */
export function isTherapyCompletedForDate(doses: DoseItem[], therapyId: string): boolean {
  const therapyDoses = doses.filter(d => d.therapyId === therapyId);
  if (therapyDoses.length === 0) return true;
  return therapyDoses.every(d => d.status === 'taken');
}

export type DayComplianceDotStatus = 'none' | 'completed' | 'partial' | 'missed' | 'upcoming';

/**
 * Resolve effective profile ID for a medication or dose
 */
export function resolveProfileId(
  itemProfileId?: string,
  medication?: Medication,
  therapy?: Therapy
): string {
  return itemProfileId || medication?.profileId || therapy?.profileId || 'self';
}

/**
 * Build chronological list of doses for any arbitrary date (past, today, future),
 * combining stored logs (taken/skipped/snoozed/notes) with active medication schedules.
 * Used identically by both "Dziś" and "Kalendarz" views.
 */
export function buildDosesForDate(
  dateStr: string,
  therapies: Therapy[],
  medications: Medication[],
  storedDoses: DoseItem[],
  activeProfileId: string = 'all'
): DoseItem[] {
  const therapyMap = new Map(therapies.map((t) => [t.id, t]));
  const medMap = new Map(medications.map((m) => [m.id, m]));

  const visibleStoredForDate = storedDoses.filter((d) => {
    if (d.date !== dateStr) return false;
    const therapy = therapyMap.get(d.therapyId);
    return isDoseVisibleForTherapy(d, therapy);
  });

  const storedIds = new Set(visibleStoredForDate.map((d) => d.id));
  const combined: DoseItem[] = [...visibleStoredForDate];

  for (const med of medications) {
    const therapy = therapyMap.get(med.therapyId);
    if (!isMedicationActiveOnDate(med, dateStr, therapy)) continue;
    const profId = resolveProfileId(med.profileId, med, therapy);

    for (const time of med.times) {
      const expectedId = `${med.id}_${dateStr}_${time.replace(':', '')}`;
      if (storedIds.has(expectedId)) continue;

      combined.push({
        id: expectedId,
        medicationId: med.id,
        therapyId: med.therapyId,
        profileId: profId,
        medicationName: med.name,
        therapyName: therapy?.name || 'Terapia',
        therapyColor: therapy?.color || '#0F766E',
        type: med.type,
        doseAmount: med.doseAmount,
        instructions: med.instructions,
        date: dateStr,
        time,
        status: 'pending',
      });
    }
  }

  const filteredByProfile =
    activeProfileId === 'all'
      ? combined
      : combined.filter((d) => {
          const med = medMap.get(d.medicationId);
          const therapy = therapyMap.get(d.therapyId);
          return resolveProfileId(d.profileId, med, therapy) === activeProfileId;
        });

  return sortDosesChronologically(filteredByProfile);
}

/**
 * Compute monthly calendar compliance dot color status for a single date & active profile.
 * - 'none': no scheduled or logged doses
 * - 'completed' (green): all doses taken
 * - 'partial' (orange): some doses taken (< total), or today with >=1 skipped
 * - 'missed' (red): past date with scheduled doses and 0 taken
 * - 'upcoming' (blue): future date with scheduled doses, or today with pending doses only
 */
export function getDayComplianceStatus(
  dateStr: string,
  todayStr: string,
  therapies: Therapy[],
  medications: Medication[],
  storedDoses: DoseItem[],
  activeProfileId: string = 'all'
): {
  status: DayComplianceDotStatus;
  total: number;
  taken: number;
  skipped: number;
} {
  const dayDoses = buildDosesForDate(dateStr, therapies, medications, storedDoses, activeProfileId);
  const total = dayDoses.length;
  if (total === 0) {
    return { status: 'none', total: 0, taken: 0, skipped: 0 };
  }

  const taken = dayDoses.filter((d) => d.status === 'taken').length;
  const skipped = dayDoses.filter((d) => d.status === 'skipped').length;

  let status: DayComplianceDotStatus;
  if (taken === total) {
    status = 'completed';
  } else if (taken > 0) {
    status = 'partial';
  } else if (dateStr < todayStr) {
    status = 'missed';
  } else if (dateStr === todayStr) {
    status = skipped > 0 ? 'partial' : 'upcoming';
  } else {
    status = 'upcoming';
  }

  return { status, total, taken, skipped };
}

export interface CalendarGridCell {
  dateStr: string;
  day: number;
  inCurrentMonth: boolean;
}

/**
 * Build Monday-first monthly calendar grid cells (7 columns Pn-Nd)
 */
export function getMonthCalendarCells(year: number, month1Based: number): CalendarGridCell[] {
  const firstDay = new Date(Date.UTC(year, month1Based - 1, 1, 12, 0, 0));
  const lastDay = new Date(Date.UTC(year, month1Based, 0, 12, 0, 0));
  const daysInMonth = lastDay.getUTCDate();

  // ISO weekday: Mon=1 .. Sun=7
  const firstWeekday = firstDay.getUTCDay() === 0 ? 7 : firstDay.getUTCDay();
  const leadingCount = firstWeekday - 1;

  const firstIso = `${year}-${String(month1Based).padStart(2, '0')}-01`;
  const cells: CalendarGridCell[] = [];

  for (let i = -leadingCount; i < daysInMonth; i++) {
    const dateStr = addDaysToDateStr(firstIso, i);
    const dayNum = parseInt(dateStr.slice(8, 10), 10);
    cells.push({
      dateStr,
      day: dayNum,
      inCurrentMonth: i >= 0 && i < daysInMonth,
    });
  }

  while (cells.length % 7 !== 0) {
    const lastStr = cells[cells.length - 1].dateStr;
    const nextStr = addDaysToDateStr(lastStr, 1);
    cells.push({
      dateStr: nextStr,
      day: parseInt(nextStr.slice(8, 10), 10),
      inCurrentMonth: false,
    });
  }

  return cells;
}

/**
 * Build Monday-Sunday 7-day week array containing anchorDateStr
 */
export function getWeekCalendarDates(anchorDateStr: string): string[] {
  const d = new Date(`${anchorDateStr}T12:00:00Z`);
  const isoWeekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  const mondayOffset = -(isoWeekday - 1);
  const week: string[] = [];
  for (let i = 0; i < 7; i++) {
    week.push(addDaysToDateStr(anchorDateStr, mondayOffset + i));
  }
  return week;
}

/**
 * Revert a taken/skipped/snoozed dose back to pending and refund cabinet stock if previously taken.
 */
export function undoDoseStatusResult(
  doses: DoseItem[],
  medications: Medication[],
  doseId: string
): { doses: DoseItem[]; medications: Medication[] } {
  const target = doses.find((d) => d.id === doseId);
  if (!target) {
    return { doses, medications };
  }

  const wasTaken = target.status === 'taken';
  const hasNote = Boolean(target.note && target.note.trim().length > 0);

  const nextDoses = hasNote
    ? doses.map((d) =>
        d.id === doseId
          ? { ...d, status: 'pending' as DoseStatus, takenAt: undefined, snoozedUntil: undefined }
          : d
      )
    : doses.filter((d) => d.id !== doseId);

  const nextMedications = wasTaken
    ? medications.map((m) => {
        if (m.id !== target.medicationId || typeof m.stockQuantity !== 'number') return m;
        const amount = parseNumericDose(m.doseAmount);
        return {
          ...m,
          stockQuantity: Number((m.stockQuantity + amount).toFixed(2)),
        };
      })
    : medications;

  return { doses: nextDoses, medications: nextMedications };
}

export type DoctorReportPeriodDays = 7 | 14 | 30;

export interface DoctorReportMedicationItem {
  medication: Medication;
  therapy?: Therapy;
  profileId: string;
  scheduledCount: number;
  takenCount: number;
  skippedCount: number;
  adherencePercentage: number | null;
}

export interface DoctorReportSummary {
  days: DoctorReportPeriodDays;
  profileId: string;
  startDate: string;
  endDate: string;
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  overallPercentage: number;
  items: DoctorReportMedicationItem[];
}

/**
 * Calculate overall and per-medication adherence for the Doctor Report
 * over the trailing N days (including todayStr) for a given profile or 'all'.
 */
export function calculateDoctorReportSummary(
  therapies: Therapy[],
  medications: Medication[],
  storedDoses: DoseItem[],
  profileId: string = 'all',
  days: DoctorReportPeriodDays = 7,
  todayStr: string = formatLocalDate()
): DoctorReportSummary {
  const therapyMap = new Map(therapies.map((t) => [t.id, t]));
  const startDate = addDaysToDateStr(todayStr, -(days - 1));

  const scopedMeds = medications.filter((med) => {
    if (profileId === 'all') return true;
    const therapy = therapyMap.get(med.therapyId);
    return resolveProfileId(med.profileId, med, therapy) === profileId;
  });

  const statsMap = new Map<string, { scheduled: number; taken: number; skipped: number }>();
  for (const med of scopedMeds) {
    statsMap.set(med.id, { scheduled: 0, taken: 0, skipped: 0 });
  }

  for (let offset = 0; offset < days; offset++) {
    const dateStr = addDaysToDateStr(startDate, offset);
    const dayDoses = buildDosesForDate(dateStr, therapies, scopedMeds, storedDoses, profileId);
    for (const d of dayDoses) {
      const bucket = statsMap.get(d.medicationId);
      if (!bucket) continue;
      bucket.scheduled += 1;
      if (d.status === 'taken') bucket.taken += 1;
      else if (d.status === 'skipped') bucket.skipped += 1;
    }
  }

  let totalScheduled = 0;
  let totalTaken = 0;
  let totalSkipped = 0;

  const items: DoctorReportMedicationItem[] = scopedMeds.map((med) => {
    const therapy = therapyMap.get(med.therapyId);
    const resolvedProfId = resolveProfileId(med.profileId, med, therapy);
    const bucket = statsMap.get(med.id) ?? { scheduled: 0, taken: 0, skipped: 0 };
    totalScheduled += bucket.scheduled;
    totalTaken += bucket.taken;
    totalSkipped += bucket.skipped;

    return {
      medication: med,
      therapy,
      profileId: resolvedProfId,
      scheduledCount: bucket.scheduled,
      takenCount: bucket.taken,
      skippedCount: bucket.skipped,
      adherencePercentage:
        bucket.scheduled > 0 ? Math.round((bucket.taken / bucket.scheduled) * 100) : null,
    };
  });

  const overallPercentage =
    totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;

  return {
    days,
    profileId,
    startDate,
    endDate: todayStr,
    totalScheduled,
    totalTaken,
    totalSkipped,
    overallPercentage,
    items,
  };
}

export type MedicationChangeType =
  | 'dose_change'
  | 'schedule_change'
  | 'status_change'
  | 'general_edit';

export interface MedicationChangeRecord {
  id: string;
  medicationId: string;
  therapyId: string;
  profileId: string;
  medicationName: string;
  changedAt: string;
  previousDose: string;
  newDose: string;
  previousTimes?: string[];
  newTimes?: string[];
  changeType: MedicationChangeType;
  changeReason?: string;
}

export type TherapyPdfDetailLevel = 'summary' | 'full';

export interface TherapyPdfReportConfig {
  profileId: string;
  includeAllTherapies: boolean;
  selectedTherapyIds: string[];
  startDate: string;
  endDate: string;
  detailLevel: TherapyPdfDetailLevel;
}

export interface TherapyPdfMedicationRow {
  medicationId: string;
  name: string;
  currentDoseDisplay: string;
  timesDisplay: string;
  instructions?: string;
  scheduledCount: number;
  takenCount: number;
  skippedCount: number;
  adherencePercentage: number | null;
}

export interface TherapyPdfTherapySummary {
  therapyId: string;
  therapyName: string;
  isActive: boolean;
  therapyColor: string;
  medications: TherapyPdfMedicationRow[];
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  adherencePercentage: number | null;
}

export interface TherapyPdfStockRow {
  medicationId: string;
  medicationName: string;
  therapyName: string;
  stockQuantity: number | null;
  packageSize: number | null;
  unit: string;
  estimatedDaysLeft: number | null;
  expiryDate?: string;
  cabinetStatus: CabinetAlertStatus;
}

export interface TherapyPdfDetailedLogRow {
  doseId: string;
  date: string;
  scheduledTime: string;
  actualTakenTime?: string;
  medicationName: string;
  therapyName: string;
  doseSnapshot: string;
  status: DoseStatus;
  statusLabel: string;
  note?: string;
}

export interface TherapyPdfReportData {
  generatedAt: string;
  profileId: string;
  patientName: string;
  patientRelation: string;
  startDate: string;
  endDate: string;
  detailLevel: TherapyPdfDetailLevel;
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  overallAdherencePercentage: number | null;
  therapySummaries: TherapyPdfTherapySummary[];
  doseChanges: MedicationChangeRecord[];
  stockItems: TherapyPdfStockRow[];
  detailedLogs: TherapyPdfDetailedLogRow[];
}

export function estimateStockDaysRemaining(med: Medication): number | null {
  if (typeof med.stockQuantity !== 'number' || !Number.isFinite(med.stockQuantity)) {
    return null;
  }
  if (med.stockQuantity <= 0) return 0;

  const dosePerTaking = parseNumericDose(med.doseAmount);
  const timesPerDay = Math.max(1, med.times.length);
  const frequencyFactor =
    med.scheduleType === 'specific_days'
      ? Math.max(1, Math.min(7, med.selectedDays?.length ?? 7)) / 7
      : 1;
  const avgDailyConsumption = dosePerTaking * timesPerDay * frequencyFactor;
  if (avgDailyConsumption <= 0) return null;

  return Math.floor(med.stockQuantity / avgDailyConsumption);
}

function formatScheduleSnapshot(med: Medication): string {
  const doseText = formatDoseDisplay(med.doseAmount, med.type);
  const timesText = med.times.length > 0 ? med.times.join(', ') : 'brak godzin';
  if (med.scheduleType === 'specific_days' && med.selectedDays && med.selectedDays.length > 0) {
    const dayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
    const daysText = [...med.selectedDays]
      .sort((a, b) => a - b)
      .map((d) => dayLabels[d - 1] ?? String(d))
      .join(',');
    return `${doseText} (${timesText} · ${daysText})`;
  }
  return `${doseText} (${timesText})`;
}

export function buildMedicationChangeRecord(params: {
  prevMed: Medication;
  nextMed: Medication;
  prevTherapy?: Therapy;
  nextTherapy?: Therapy;
  changeReason?: string;
  changedAt?: string;
}): MedicationChangeRecord | null {
  const { prevMed, nextMed, prevTherapy, nextTherapy, changeReason, changedAt } = params;
  const cleanedReason = changeReason?.trim() ? changeReason.trim() : undefined;

  const doseChanged =
    extractPureDoseAmount(prevMed.doseAmount) !== extractPureDoseAmount(nextMed.doseAmount) ||
    prevMed.type !== nextMed.type;

  const prevTimes = [...prevMed.times].sort();
  const nextTimes = [...nextMed.times].sort();
  const timesChanged = prevTimes.join(',') !== nextTimes.join(',');

  const prevDays = [...(prevMed.selectedDays ?? [])].sort((a, b) => a - b).join(',');
  const nextDays = [...(nextMed.selectedDays ?? [])].sort((a, b) => a - b).join(',');
  const scheduleChanged =
    prevMed.scheduleType !== nextMed.scheduleType ||
    prevDays !== nextDays ||
    prevMed.startDate !== nextMed.startDate ||
    (prevMed.endDate ?? '') !== (nextMed.endDate ?? '');

  const therapyChanged = prevMed.therapyId !== nextMed.therapyId;
  const instructionsChanged = (prevMed.instructions ?? '') !== (nextMed.instructions ?? '');

  if (
    !doseChanged &&
    !timesChanged &&
    !scheduleChanged &&
    !therapyChanged &&
    !instructionsChanged &&
    !cleanedReason
  ) {
    return null;
  }

  let changeType: MedicationChangeType = 'general_edit';
  if (doseChanged) changeType = 'dose_change';
  else if (timesChanged || scheduleChanged) changeType = 'schedule_change';

  let previousDose = formatScheduleSnapshot(prevMed);
  let newDose = formatScheduleSnapshot(nextMed);

  if (doseChanged && !timesChanged && !scheduleChanged) {
    previousDose = formatDoseDisplay(prevMed.doseAmount, prevMed.type);
    newDose = formatDoseDisplay(nextMed.doseAmount, nextMed.type);
  } else if (!doseChanged && !timesChanged && !scheduleChanged && therapyChanged) {
    previousDose = `${formatDoseDisplay(prevMed.doseAmount, prevMed.type)} · ${prevTherapy?.name || 'Terapia'}`;
    newDose = `${formatDoseDisplay(nextMed.doseAmount, nextMed.type)} · ${nextTherapy?.name || 'Terapia'}`;
  }

  const ts = changedAt ?? new Date().toISOString();
  const resolvedProfileId = resolveProfileId(nextMed.profileId, nextMed, nextTherapy);

  return {
    id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    medicationId: nextMed.id,
    therapyId: nextMed.therapyId,
    profileId: resolvedProfileId,
    medicationName: nextMed.name,
    changedAt: ts,
    previousDose,
    newDose,
    previousTimes: [...prevMed.times],
    newTimes: [...nextMed.times],
    changeType,
    changeReason: cleanedReason,
  };
}

export function buildTherapyStatusChangeRecords(params: {
  therapy: Therapy;
  medications: Medication[];
  nextIsActive: boolean;
  changeReason?: string;
  changedAt?: string;
}): MedicationChangeRecord[] {
  const { therapy, medications, nextIsActive, changeReason, changedAt } = params;
  const ts = changedAt ?? new Date().toISOString();
  const prevState = therapy.isActive ? 'Terapia aktywna' : 'Terapia wstrzymana';
  const nextState = nextIsActive ? 'Terapia aktywna' : 'Terapia wstrzymana';
  const reason =
    changeReason?.trim() ||
    (nextIsActive ? 'Wznowienie terapii' : 'Wstrzymanie terapii');
  const therapyMeds = medications.filter((m) => m.therapyId === therapy.id);
  const profileId = therapy.profileId || 'self';

  if (therapyMeds.length === 0) {
    return [
      {
        id: `chg-th-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        medicationId: '',
        therapyId: therapy.id,
        profileId,
        medicationName: therapy.name,
        changedAt: ts,
        previousDose: prevState,
        newDose: nextState,
        changeType: 'status_change',
        changeReason: reason,
      },
    ];
  }

  return therapyMeds.map((med, idx) => ({
    id: `chg-th-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    medicationId: med.id,
    therapyId: therapy.id,
    profileId: resolveProfileId(med.profileId, med, therapy),
    medicationName: med.name,
    changedAt: ts,
    previousDose: `${formatDoseDisplay(med.doseAmount, med.type)} (${prevState})`,
    newDose: `${formatDoseDisplay(med.doseAmount, med.type)} (${nextState})`,
    changeType: 'status_change',
    changeReason: reason,
  }));
}

export function formatTherapyReportFilename(
  patientName: string,
  startDate: string,
  endDate: string
): string {
  const asciiName = patientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safePatient = asciiName || 'Pacjent';
  return `MedPlaner_Raport_${safePatient}_${startDate}_${endDate}.pdf`;
}

function enumerateDateRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || startDate > endDate) return [];
  const dates: string[] = [];
  let cursor = startDate;
  let guard = 0;
  while (cursor <= endDate && guard < 400) {
    dates.push(cursor);
    cursor = addDaysToDateStr(cursor, 1);
    guard += 1;
  }
  return dates;
}

function doseStatusLabelPl(status: DoseStatus): string {
  switch (status) {
    case 'taken':
      return 'Przyjęta';
    case 'skipped':
      return 'Pominięta';
    case 'snoozed':
      return 'Odłożona';
    default:
      return 'Oczekująca';
  }
}

export function buildTherapyPdfReportData(params: {
  profiles: FamilyProfile[];
  therapies: Therapy[];
  medications: Medication[];
  doses: DoseItem[];
  medicationChanges: MedicationChangeRecord[];
  config: TherapyPdfReportConfig;
  generatedAt?: string;
}): TherapyPdfReportData {
  const {
    profiles,
    therapies,
    medications,
    doses,
    medicationChanges,
    config,
    generatedAt,
  } = params;

  const isAllProfiles = config.profileId === 'all';
  const profileObj = isAllProfiles
    ? undefined
    : profiles.find((p) => p.id === config.profileId) ?? profiles[0];
  const resolvedProfileId = isAllProfiles ? 'all' : profileObj?.id ?? config.profileId;

  const profileTherapies = therapies.filter((t) =>
    isAllProfiles ? true : (t.profileId || 'self') === resolvedProfileId
  );

  const selectedTherapySet = new Set(
    config.includeAllTherapies
      ? profileTherapies.map((t) => t.id)
      : config.selectedTherapyIds.filter((id) => profileTherapies.some((t) => t.id === id))
  );

  const scopedTherapies = profileTherapies.filter((t) => selectedTherapySet.has(t.id));
  const scopedMedications = medications.filter((m) => selectedTherapySet.has(m.therapyId));
  const scopedMedIds = new Set(scopedMedications.map((m) => m.id));
  const therapyMap = new Map(scopedTherapies.map((t) => [t.id, t]));

  const rangeStart = config.startDate <= config.endDate ? config.startDate : config.endDate;
  const rangeEnd = config.startDate <= config.endDate ? config.endDate : config.startDate;
  const dateDays = enumerateDateRange(rangeStart, rangeEnd);

  const visibleStoredDoses = doses.filter((d) => {
    if (!selectedTherapySet.has(d.therapyId) && !scopedMedIds.has(d.medicationId)) {
      return false;
    }
    const therapy = therapyMap.get(d.therapyId);
    return isDoseVisibleForTherapy(d, therapy);
  });

  const medBuckets = new Map<string, { scheduled: number; taken: number; skipped: number }>();
  for (const med of scopedMedications) {
    medBuckets.set(med.id, { scheduled: 0, taken: 0, skipped: 0 });
  }

  const detailedLogs: TherapyPdfDetailedLogRow[] = [];

  for (const dateStr of dateDays) {
    const dayDoses = buildDosesForDate(
      dateStr,
      scopedTherapies,
      scopedMedications,
      visibleStoredDoses,
      resolvedProfileId
    );
    for (const d of dayDoses) {
      if (!selectedTherapySet.has(d.therapyId) && !scopedMedIds.has(d.medicationId)) continue;
      const bucket = medBuckets.get(d.medicationId);
      if (bucket) {
        bucket.scheduled += 1;
        if (d.status === 'taken') bucket.taken += 1;
        else if (d.status === 'skipped') bucket.skipped += 1;
      }

      detailedLogs.push({
        doseId: d.id,
        date: d.date,
        scheduledTime: d.time,
        actualTakenTime: d.takenAt,
        medicationName: d.medicationName,
        therapyName: d.therapyName,
        doseSnapshot: formatDoseDisplay(d.doseAmount, d.type),
        status: d.status,
        statusLabel: doseStatusLabelPl(d.status),
        note: d.note,
      });
    }
  }

  let totalScheduled = 0;
  let totalTaken = 0;
  let totalSkipped = 0;

  const therapySummaries: TherapyPdfTherapySummary[] = scopedTherapies.map((th) => {
    const medsInTherapy = scopedMedications.filter((m) => m.therapyId === th.id);
    let thScheduled = 0;
    let thTaken = 0;
    let thSkipped = 0;

    const medRows: TherapyPdfMedicationRow[] = medsInTherapy.map((m) => {
      const bucket = medBuckets.get(m.id) ?? { scheduled: 0, taken: 0, skipped: 0 };
      thScheduled += bucket.scheduled;
      thTaken += bucket.taken;
      thSkipped += bucket.skipped;
      return {
        medicationId: m.id,
        name: m.name,
        currentDoseDisplay: formatDoseDisplay(m.doseAmount, m.type),
        timesDisplay: m.times.join(', '),
        instructions: m.instructions,
        scheduledCount: bucket.scheduled,
        takenCount: bucket.taken,
        skippedCount: bucket.skipped,
        adherencePercentage:
          bucket.scheduled > 0 ? Math.round((bucket.taken / bucket.scheduled) * 100) : null,
      };
    });

    totalScheduled += thScheduled;
    totalTaken += thTaken;
    totalSkipped += thSkipped;

    return {
      therapyId: th.id,
      therapyName: th.name,
      isActive: th.isActive,
      therapyColor: th.color,
      medications: medRows,
      totalScheduled: thScheduled,
      totalTaken: thTaken,
      totalSkipped: thSkipped,
      adherencePercentage:
        thScheduled > 0 ? Math.round((thTaken / thScheduled) * 100) : null,
    };
  });

  const doseChanges = medicationChanges
    .filter((chg) => {
      const chgDay = chg.changedAt.slice(0, 10);
      if (chgDay < rangeStart || chgDay > rangeEnd) return false;
      return selectedTherapySet.has(chg.therapyId) || (chg.medicationId && scopedMedIds.has(chg.medicationId));
    })
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt));

  const stockItems: TherapyPdfStockRow[] = scopedMedications.map((med) => {
    const th = therapyMap.get(med.therapyId);
    const evalStatus = evaluateCabinetStatus(med);
    return {
      medicationId: med.id,
      medicationName: med.name,
      therapyName: th?.name ?? 'Terapia',
      stockQuantity: typeof med.stockQuantity === 'number' ? med.stockQuantity : null,
      packageSize: typeof med.packageSize === 'number' ? med.packageSize : null,
      unit: MEDICATION_TYPE_LABELS[med.type]?.unit || 'szt.',
      estimatedDaysLeft: estimateStockDaysRemaining(med),
      expiryDate: med.expiryDate,
      cabinetStatus: evalStatus.status,
    };
  });

  detailedLogs.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });

  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    profileId: resolvedProfileId,
    patientName: isAllProfiles ? 'Wszystkie profile' : profileObj?.name || 'Mój profil',
    patientRelation: isAllProfiles ? 'Rodzina' : profileObj?.relation || 'Główny',
    startDate: rangeStart,
    endDate: rangeEnd,
    detailLevel: config.detailLevel,
    totalScheduled,
    totalTaken,
    totalSkipped,
    overallAdherencePercentage:
      totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : null,
    therapySummaries,
    doseChanges,
    stockItems,
    detailedLogs: config.detailLevel === 'full' ? detailedLogs : [],
  };
}

export interface MedPlanerBackupPayload {
  app: 'MedPlaner';
  version: number;
  exportedAt: string;
  profiles: FamilyProfile[];
  therapies: Therapy[];
  medications: Medication[];
  doseLogs: DoseItem[];
  medicationChanges?: MedicationChangeRecord[];
  doses?: DoseItem[];
}

const VALID_MEDICATION_TYPES: MedicationType[] = [
  'capsule',
  'drops',
  'ml',
  'inhaler',
  'application',
  'other',
];

function normalizeMedicationType(raw: unknown): MedicationType {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return VALID_MEDICATION_TYPES.includes(s as MedicationType)
    ? (s as MedicationType)
    : 'capsule';
}

function normalizeScheduleType(raw: unknown): ScheduleType {
  if (raw === 'specificDays' || raw === 'specific_days') return 'specific_days';
  if (raw === 'dateRange' || raw === 'date_range') return 'date_range';
  return 'daily';
}

function normalizeDoseStatus(raw: unknown): DoseStatus {
  if (raw === 'taken' || raw === 'snoozed' || raw === 'skipped') return raw;
  return 'pending';
}

function extractTimeHm(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const isoMatch = trimmed.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  }
  return undefined;
}

/**
 * Serialize full application state into cross-platform MedPlaner JSON backup format
 * compatible between Web and Flutter (profiles, therapies, medications, doseLogs).
 */
export function serializeBackupPayload(params: {
  profiles: FamilyProfile[];
  therapies: Therapy[];
  medications: Medication[];
  doses: DoseItem[];
  medicationChanges?: MedicationChangeRecord[];
  exportedAt?: string;
}): MedPlanerBackupPayload {
  return {
    app: 'MedPlaner',
    version: 3,
    exportedAt: params.exportedAt ?? new Date().toISOString(),
    profiles: params.profiles,
    therapies: params.therapies,
    medications: params.medications,
    doseLogs: params.doses,
    ...(params.medicationChanges && params.medicationChanges.length > 0
      ? { medicationChanges: params.medicationChanges }
      : {}),
  };
}

/**
 * Parse and normalize JSON backup payload exported either from Web or Flutter.
 * Accepts both canonical `doseLogs` and legacy `doses`, Dart camelCase/snake_case fields,
 * and maps `profileName` <-> `profileId`.
 */
export function normalizeImportedBackupPayload(
  raw: unknown,
  fallbackProfiles: FamilyProfile[] = []
): MedPlanerBackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Nieprawidłowa struktura pliku kopii zapasowej.');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.therapies) || !Array.isArray(obj.medications)) {
    throw new Error('Nieprawidłowa struktura pliku kopii zapasowej (brak listy terapii lub leków).');
  }

  const rawProfiles = Array.isArray(obj.profiles) ? obj.profiles : [];
  const normalizedProfiles: FamilyProfile[] =
    rawProfiles.length > 0
      ? rawProfiles
          .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
          .map((p, idx) => ({
            id: typeof p.id === 'string' && p.id.trim() ? p.id.trim() : `prof-${idx + 1}`,
            name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Mój profil',
            relation:
              typeof p.relation === 'string' && p.relation.trim()
                ? p.relation.trim()
                : p.isDefault === true || p.is_default === 1
                ? 'Główny'
                : 'Rodzina',
            avatarColor:
              (typeof p.avatarColor === 'string' && p.avatarColor) ||
              (typeof p.colorHex === 'string' && p.colorHex) ||
              (typeof p.color_hex === 'string' && p.color_hex) ||
              '#0F766E',
          }))
      : [...fallbackProfiles];

  const profileById = new Map<string, FamilyProfile>();
  const profileByLowerName = new Map<string, FamilyProfile>();
  for (const p of normalizedProfiles) {
    profileById.set(p.id, p);
    profileByLowerName.set(normalizeProfileName(p.name), p);
  }

  const resolveIncomingProfileId = (rawProfileId: unknown, rawProfileName: unknown): string => {
    if (typeof rawProfileId === 'string' && profileById.has(rawProfileId)) {
      return rawProfileId;
    }
    if (typeof rawProfileName === 'string' && rawProfileName.trim()) {
      const matched = profileByLowerName.get(normalizeProfileName(rawProfileName));
      if (matched) return matched.id;
      const createdId = `prof-${normalizedProfiles.length + 1}`;
      const created: FamilyProfile = {
        id: createdId,
        name: rawProfileName.trim(),
        relation: 'Rodzina',
        avatarColor: '#0F766E',
      };
      normalizedProfiles.push(created);
      profileById.set(created.id, created);
      profileByLowerName.set(normalizeProfileName(created.name), created);
      return createdId;
    }
    if (typeof rawProfileId === 'string' && rawProfileId.trim()) {
      return rawProfileId.trim();
    }
    return normalizedProfiles[0]?.id || 'self';
  };

  const normalizedTherapies: Therapy[] = obj.therapies
    .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
    .map((t, idx) => {
      const isActiveRaw = t.isActive ?? t.is_active;
      const isActive =
        typeof isActiveRaw === 'boolean'
          ? isActiveRaw
          : typeof isActiveRaw === 'number'
          ? isActiveRaw !== 0
          : true;

      return {
        id: typeof t.id === 'string' && t.id.trim() ? t.id.trim() : `th-${idx + 1}`,
        name: typeof t.name === 'string' && t.name.trim() ? t.name.trim() : 'Terapia',
        description:
          typeof t.description === 'string' && t.description.trim()
            ? t.description.trim()
            : undefined,
        color:
          (typeof t.color === 'string' && t.color) ||
          (typeof t.colorHex === 'string' && t.colorHex) ||
          (typeof t.color_hex === 'string' && t.color_hex) ||
          '#0F766E',
        icon:
          (typeof t.icon === 'string' && t.icon) ||
          (typeof t.iconName === 'string' && t.iconName) ||
          (typeof t.icon_name === 'string' && t.icon_name) ||
          'medical_services',
        profileId: resolveIncomingProfileId(
          t.profileId ?? t.profile_id,
          t.profileName ?? t.profile_name
        ),
        startDate:
          typeof (t.startDate ?? t.start_date) === 'string' &&
          String(t.startDate ?? t.start_date).trim()
            ? String(t.startDate ?? t.start_date).trim().slice(0, 10)
            : undefined,
        endDate:
          typeof (t.endDate ?? t.end_date) === 'string' &&
          String(t.endDate ?? t.end_date).trim()
            ? String(t.endDate ?? t.end_date).trim().slice(0, 10)
            : undefined,
        isActive,
        createdAt:
          typeof (t.createdAt ?? t.created_at) === 'string' &&
          String(t.createdAt ?? t.created_at).trim()
            ? String(t.createdAt ?? t.created_at)
            : new Date().toISOString(),
      };
    });

  const therapyMap = new Map(normalizedTherapies.map((t) => [t.id, t]));

  const normalizedMeds: Medication[] = obj.medications
    .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
    .map((m, idx) => {
      const therapyId =
        typeof (m.therapyId ?? m.therapy_id) === 'string'
          ? String(m.therapyId ?? m.therapy_id)
          : normalizedTherapies[0]?.id || 'th-1';
      const parentTherapy = therapyMap.get(therapyId);

      let parsedTimes: string[] = [];
      const rawTimes = m.times ?? m.times_json;
      if (Array.isArray(rawTimes)) {
        parsedTimes = rawTimes.map((x) => String(x));
      } else if (typeof rawTimes === 'string') {
        try {
          const decoded = JSON.parse(rawTimes);
          if (Array.isArray(decoded)) parsedTimes = decoded.map((x) => String(x));
        } catch {}
      }
      if (parsedTimes.length === 0) parsedTimes = ['08:00'];

      let parsedDays: number[] | undefined;
      const rawDays = m.selectedDays ?? m.selected_days ?? m.selected_days_json;
      if (Array.isArray(rawDays)) {
        parsedDays = rawDays.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      } else if (typeof rawDays === 'string') {
        try {
          const decoded = JSON.parse(rawDays);
          if (Array.isArray(decoded)) {
            parsedDays = decoded.map((n) => Number(n)).filter((n) => Number.isFinite(n));
          }
        } catch {}
      }

      const rawStock = m.stockQuantity ?? m.stock_quantity;
      const rawPkg = m.packageSize ?? m.package_size;
      const rawThreshold = m.lowStockThreshold ?? m.low_stock_threshold;
      const rawExpiry = m.expiryDate ?? m.expiry_date;
      const rawStart = m.startDate ?? m.start_date;
      const rawEnd = m.endDate ?? m.end_date;

      return {
        id: typeof m.id === 'string' && m.id.trim() ? m.id.trim() : `med-${idx + 1}`,
        therapyId,
        profileId:
          typeof (m.profileId ?? m.profile_id) === 'string'
            ? resolveIncomingProfileId(m.profileId ?? m.profile_id, m.profileName ?? m.profile_name)
            : parentTherapy?.profileId || 'self',
        name: typeof m.name === 'string' && m.name.trim() ? m.name.trim() : 'Lek',
        type: normalizeMedicationType(m.type),
        doseAmount: extractPureDoseAmount(String(m.doseAmount ?? m.dose_amount ?? '1')),
        instructions:
          typeof m.instructions === 'string' && m.instructions.trim()
            ? m.instructions.trim()
            : undefined,
        times: parsedTimes,
        scheduleType: normalizeScheduleType(m.scheduleType ?? m.schedule_type),
        selectedDays: parsedDays,
        startDate:
          typeof rawStart === 'string' && rawStart.trim()
            ? rawStart.trim().slice(0, 10)
            : formatLocalDate(),
        endDate:
          typeof rawEnd === 'string' && rawEnd.trim() ? rawEnd.trim().slice(0, 10) : undefined,
        stockQuantity:
          typeof rawStock === 'number' && Number.isFinite(rawStock) ? rawStock : undefined,
        packageSize: typeof rawPkg === 'number' && Number.isFinite(rawPkg) ? rawPkg : undefined,
        lowStockThreshold:
          typeof rawThreshold === 'number' && Number.isFinite(rawThreshold) ? rawThreshold : 5,
        expiryDate:
          typeof rawExpiry === 'string' && rawExpiry.trim()
            ? rawExpiry.trim().slice(0, 10)
            : undefined,
      };
    });

  const medMap = new Map(normalizedMeds.map((m) => [m.id, m]));
  const rawLogs = Array.isArray(obj.doseLogs)
    ? obj.doseLogs
    : Array.isArray(obj.doses)
    ? obj.doses
    : [];

  const normalizedLogs: DoseItem[] = rawLogs
    .filter((d): d is Record<string, unknown> => Boolean(d && typeof d === 'object'))
    .map((d, idx) => {
      const medicationId = String(d.medicationId ?? d.medication_id ?? '');
      const med = medMap.get(medicationId);
      const therapyId = String(d.therapyId ?? d.therapy_id ?? med?.therapyId ?? '');
      const therapy = therapyMap.get(therapyId);
      const dateStr = String(d.date ?? d.scheduledDate ?? d.scheduled_date ?? formatLocalDate()).slice(
        0,
        10
      );
      const timeStr = String(d.time ?? d.scheduledTime ?? d.scheduled_time ?? '08:00');
      const id =
        typeof d.id === 'string' && d.id.trim()
          ? d.id.trim()
          : `${medicationId || 'med'}_${dateStr}_${timeStr.replace(':', '')}_${idx}`;

      const noteRaw = d.note ?? d.notes;

      return {
        id,
        medicationId,
        therapyId,
        profileId:
          typeof (d.profileId ?? d.profile_id) === 'string'
            ? String(d.profileId ?? d.profile_id)
            : med?.profileId ?? therapy?.profileId ?? 'self',
        medicationName:
          (typeof (d.medicationName ?? d.medication_name) === 'string' &&
            String(d.medicationName ?? d.medication_name)) ||
          med?.name ||
          'Lek',
        therapyName:
          (typeof (d.therapyName ?? d.therapy_name) === 'string' &&
            String(d.therapyName ?? d.therapy_name)) ||
          therapy?.name ||
          'Terapia',
        therapyColor:
          (typeof (d.therapyColor ?? d.therapy_color_hex) === 'string' &&
            String(d.therapyColor ?? d.therapy_color_hex)) ||
          therapy?.color ||
          '#0F766E',
        type: d.type
          ? normalizeMedicationType(d.type)
          : d.medication_type
          ? normalizeMedicationType(d.medication_type)
          : med?.type ?? 'capsule',
        doseAmount: String(d.doseAmount ?? d.dose_amount ?? med?.doseAmount ?? '1'),
        instructions:
          typeof d.instructions === 'string' && d.instructions.trim()
            ? d.instructions.trim()
            : med?.instructions,
        date: dateStr,
        time: timeStr,
        status: normalizeDoseStatus(d.status),
        takenAt: extractTimeHm(d.takenAt ?? d.actualTakenTime ?? d.actual_taken_time),
        snoozedUntil:
          typeof (d.snoozedUntil ?? d.snoozed_until) === 'string'
            ? String(d.snoozedUntil ?? d.snoozed_until)
            : undefined,
        snoozeCount:
          typeof (d.snoozeCount ?? d.snooze_count) === 'number'
            ? Number(d.snoozeCount ?? d.snooze_count)
            : undefined,
        note: typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim() : undefined,
      };
    });

  const rawChanges = Array.isArray(obj.medicationChanges)
    ? obj.medicationChanges
    : Array.isArray(obj.medication_changes)
    ? obj.medication_changes
    : [];

  const normalizedChanges: MedicationChangeRecord[] = rawChanges
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map((c, idx) => {
      const medicationId = String(c.medicationId ?? c.medication_id ?? '');
      const med = medMap.get(medicationId);
      const therapyId = String(c.therapyId ?? c.therapy_id ?? med?.therapyId ?? '');
      const therapy = therapyMap.get(therapyId);
      const rawType = String(c.changeType ?? c.change_type ?? 'dose_change');
      const changeType: MedicationChangeType =
        rawType === 'schedule_change' || rawType === 'status_change' || rawType === 'general_edit'
          ? rawType
          : 'dose_change';

      return {
        id: typeof c.id === 'string' && c.id.trim() ? c.id.trim() : `chg-${idx + 1}`,
        medicationId,
        therapyId,
        profileId: resolveIncomingProfileId(
          c.profileId ?? c.profile_id ?? med?.profileId ?? therapy?.profileId,
          c.profileName ?? c.profile_name
        ),
        medicationName:
          (typeof (c.medicationName ?? c.medication_name) === 'string' &&
            String(c.medicationName ?? c.medication_name)) ||
          med?.name ||
          therapy?.name ||
          'Lek',
        changedAt:
          typeof (c.changedAt ?? c.changed_at) === 'string' &&
          String(c.changedAt ?? c.changed_at).trim()
            ? String(c.changedAt ?? c.changed_at)
            : new Date().toISOString(),
        previousDose: String(c.previousDose ?? c.previous_dose ?? ''),
        newDose: String(c.newDose ?? c.new_dose ?? ''),
        previousTimes: Array.isArray(c.previousTimes)
          ? c.previousTimes.map(String)
          : undefined,
        newTimes: Array.isArray(c.newTimes) ? c.newTimes.map(String) : undefined,
        changeType,
        changeReason:
          typeof (c.changeReason ?? c.change_reason) === 'string' &&
          String(c.changeReason ?? c.change_reason).trim()
            ? String(c.changeReason ?? c.change_reason).trim()
            : undefined,
      };
    });

  return {
    app: 'MedPlaner',
    version: typeof obj.version === 'number' ? obj.version : 3,
    exportedAt:
      typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    profiles: normalizedProfiles,
    therapies: normalizedTherapies,
    medications: normalizedMeds,
    doseLogs: normalizedLogs,
    medicationChanges: normalizedChanges,
  };
}

export interface BackupAppState {
  profiles: FamilyProfile[];
  therapies: Therapy[];
  medications: Medication[];
  doses: DoseItem[];
  medicationChanges?: MedicationChangeRecord[];
}

/**
 * Apply an imported JSON backup in either 'replace' or 'merge' mode.
 * In 'merge' mode, profiles are deduplicated by id or case-insensitive name,
 * and incoming therapies/medications/doseLogs/medicationChanges are upserted by id.
 */
export function applyBackupImport(
  current: BackupAppState,
  incoming: MedPlanerBackupPayload,
  mode: 'replace' | 'merge',
  fallbackProfiles: FamilyProfile[] = []
): BackupAppState {
  const incomingDoses = incoming.doseLogs ?? incoming.doses ?? [];
  const incomingChanges = incoming.medicationChanges ?? [];

  if (mode === 'replace') {
    const nextProfiles =
      incoming.profiles.length > 0
        ? incoming.profiles
        : current.profiles.length > 0
        ? current.profiles
        : fallbackProfiles;
    return {
      profiles: nextProfiles,
      therapies: incoming.therapies,
      medications: incoming.medications,
      doses: incomingDoses,
      medicationChanges: incomingChanges,
    };
  }

  // Merge mode: remap profiles with matching case-insensitive names to existing IDs
  const mergedProfiles = [...current.profiles];
  const profileIdRemap = new Map<string, string>();

  for (const incProf of incoming.profiles) {
    const byIdIdx = mergedProfiles.findIndex((p) => p.id === incProf.id);
    if (byIdIdx >= 0) {
      mergedProfiles[byIdIdx] = incProf;
      profileIdRemap.set(incProf.id, incProf.id);
      continue;
    }
    const byName = mergedProfiles.find(
      (p) => normalizeProfileName(p.name) === normalizeProfileName(incProf.name)
    );
    if (byName) {
      profileIdRemap.set(incProf.id, byName.id);
    } else {
      mergedProfiles.push(incProf);
      profileIdRemap.set(incProf.id, incProf.id);
    }
  }

  const remapProfileId = (id?: string): string | undefined => {
    if (!id) return id;
    return profileIdRemap.get(id) ?? id;
  };

  const mergeById = <T extends { id: string }>(base: T[], updates: T[]): T[] => {
    const result = [...base];
    const indexMap = new Map(result.map((item, i) => [item.id, i]));
    for (const item of updates) {
      const existingIdx = indexMap.get(item.id);
      if (existingIdx !== undefined) {
        result[existingIdx] = item;
      } else {
        indexMap.set(item.id, result.length);
        result.push(item);
      }
    }
    return result;
  };

  const remappedTherapies = incoming.therapies.map((t) => ({
    ...t,
    profileId: remapProfileId(t.profileId),
  }));
  const remappedMeds = incoming.medications.map((m) => ({
    ...m,
    profileId: remapProfileId(m.profileId),
  }));
  const remappedDoses = incomingDoses.map((d) => ({
    ...d,
    profileId: remapProfileId(d.profileId),
  }));
  const remappedChanges = incomingChanges.map((c) => ({
    ...c,
    profileId: remapProfileId(c.profileId) ?? c.profileId,
  }));

  return {
    profiles: mergedProfiles,
    therapies: mergeById(current.therapies, remappedTherapies),
    medications: mergeById(current.medications, remappedMeds),
    doses: mergeById(current.doses, remappedDoses),
    medicationChanges: mergeById(current.medicationChanges ?? [], remappedChanges),
  };
}


