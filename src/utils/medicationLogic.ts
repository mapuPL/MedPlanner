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
  startDate: string; // YYYY-MM-DD
  endDate?: string;
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
  startDate: string;
  endDate?: string;
  // Domowa Apteczka (funkcje znane z Dawko)
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
}

export const MEDICATION_TYPE_LABELS: Record<MedicationType, { label: string; unit: string; icon: string }> = {
  capsule: { label: 'Kapsułka / Tabletka', unit: 'tabl.', icon: 'Pill' },
  drops: { label: 'Krople', unit: 'kropli', icon: 'Droplet' },
  ml: { label: 'ml (płyn / syrop)', unit: 'ml', icon: 'FlaskConical' },
  inhaler: { label: 'Wziew', unit: 'wziew', icon: 'Wind' },
  application: { label: 'Aplikacja (maść / aerozol)', unit: 'aplik.', icon: 'Sparkles' },
  other: { label: 'Inne', unit: 'dawka', icon: 'Stethoscope' },
};

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
 * Parse numeric quantity consumed per single dose (e.g. "2" -> 2, "10 ml" -> 10)
 */
export function parseNumericDose(amount: string): number {
  const match = (amount || '1').match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 1;
  const num = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : 1;
}

export type CabinetAlertStatus = 'ok' | 'low_stock' | 'expiring_soon' | 'expired';

export function evaluateCabinetStatus(
  medication: Medication,
  referenceDateStr: string = new Date().toISOString().substring(0, 10)
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
 * Verify if medication is scheduled on a given date (YYYY-MM-DD)
 */
export function isMedicationActiveOnDate(medication: Medication, dateStr: string): boolean {
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
    return true; // Already checked start and end bounds
  }

  if (medication.scheduleType === 'specific_days' && medication.selectedDays) {
    // JavaScript getDay(): 0=Sun, 1=Mon, ..., 6=Sat.
    // Convert to ISO weekday: 1=Mon, ..., 7=Sun
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
 * Determine if a therapy is 100% completed on a given date
 */
export function isTherapyCompletedForDate(doses: DoseItem[], therapyId: string): boolean {
  const therapyDoses = doses.filter(d => d.therapyId === therapyId);
  if (therapyDoses.length === 0) return true;
  return therapyDoses.every(d => d.status === 'taken');
}

