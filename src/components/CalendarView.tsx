import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Undo2,
  ChevronUp,
  ChevronDown,
  StickyNote,
} from 'lucide-react';
import {
  DoseItem,
  Therapy,
  Medication,
  FamilyProfile,
  DayComplianceDotStatus,
  isTherapyCompletedForDate,
  formatDoseDisplay,
  addDaysToDateStr,
  buildDosesForDate,
  getDayComplianceStatus,
  getMonthCalendarCells,
  getWeekCalendarDates,
  resolveProfileId,
} from '../utils/medicationLogic';

interface CalendarViewProps {
  currentDate: string; // YYYY-MM-DD (Today)
  selectedDate: string; // YYYY-MM-DD
  therapies: Therapy[];
  medications: Medication[];
  storedDoses: DoseItem[];
  profiles: FamilyProfile[];
  activeProfileId: string;
  onSelectDate: (date: string) => void;
  onTakeDose: (dose: DoseItem) => void;
  onSkipDose: (dose: DoseItem) => void;
  onUndoDose: (doseId: string) => void;
  onEditDoseNote?: (dose: DoseItem) => void;
}

const WEEKDAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

const DOT_COLOR_CLASSES: Record<DayComplianceDotStatus, { normal: string; selected: string }> = {
  none: { normal: 'bg-transparent', selected: 'bg-transparent' },
  completed: { normal: 'bg-emerald-500', selected: 'bg-emerald-300' },
  partial: { normal: 'bg-amber-500', selected: 'bg-amber-300' },
  missed: { normal: 'bg-rose-500', selected: 'bg-rose-300' },
  upcoming: { normal: 'bg-sky-500', selected: 'bg-sky-300' },
};

function parseYearMonth(dateStr: string): { year: number; month: number } {
  return {
    year: parseInt(dateStr.slice(0, 4), 10),
    month: parseInt(dateStr.slice(5, 7), 10),
  };
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  selectedDate,
  therapies,
  medications,
  storedDoses,
  profiles,
  activeProfileId,
  onSelectDate,
  onTakeDose,
  onSkipDose,
  onUndoDose,
  onEditDoseNote,
}) => {
  // Default expanded Monthly Grid view (Q1)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [displayedMonth, setDisplayedMonth] = useState<{ year: number; month: number }>(() =>
    parseYearMonth(selectedDate)
  );

  useEffect(() => {
    const parsed = parseYearMonth(selectedDate);
    setDisplayedMonth((prev) =>
      prev.year === parsed.year && prev.month === parsed.month ? prev : parsed
    );
  }, [selectedDate]);

  const selectedDoses = useMemo(
    () => buildDosesForDate(selectedDate, therapies, medications, storedDoses, activeProfileId),
    [selectedDate, therapies, medications, storedDoses, activeProfileId]
  );

  const monthCells = useMemo(
    () => getMonthCalendarCells(displayedMonth.year, displayedMonth.month),
    [displayedMonth.year, displayedMonth.month]
  );

  const weekDates = useMemo(() => getWeekCalendarDates(selectedDate), [selectedDate]);

  const navigatePrev = () => {
    if (viewMode === 'month') {
      setDisplayedMonth((prev) =>
        prev.month === 1 ? { year: prev.year - 1, month: 12 } : { year: prev.year, month: prev.month - 1 }
      );
    } else {
      onSelectDate(addDaysToDateStr(selectedDate, -7));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setDisplayedMonth((prev) =>
        prev.month === 12 ? { year: prev.year + 1, month: 1 } : { year: prev.year, month: prev.month + 1 }
      );
    } else {
      onSelectDate(addDaysToDateStr(selectedDate, 7));
    }
  };

  const jumpToToday = () => {
    const todayYm = parseYearMonth(currentDate);
    setDisplayedMonth(todayYm);
    onSelectDate(currentDate);
  };

  const monthTitle = useMemo(() => {
    const d = new Date(Date.UTC(displayedMonth.year, displayedMonth.month - 1, 1, 12, 0, 0));
    const raw = d.toLocaleDateString('pl-PL', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [displayedMonth.year, displayedMonth.month]);

  const formattedSelectedDate = new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // Group selected date doses by therapy preserving order
  const therapyMap = useMemo(() => new Map(therapies.map((t) => [t.id, t])), [therapies]);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const groupedTherapyIds = useMemo(() => {
    const ids: string[] = [];
    selectedDoses.forEach((d) => {
      if (!ids.includes(d.therapyId)) ids.push(d.therapyId);
    });
    return ids;
  }, [selectedDoses]);

  const isTodayDisplayed =
    selectedDate === currentDate &&
    displayedMonth.year === parseYearMonth(currentDate).year &&
    displayedMonth.month === parseYearMonth(currentDate).month;

  return (
    <div className="space-y-4">
      {/* Monthly / Weekly Calendar Card */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-3">
        {/* Header Navigation */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={navigatePrev}
              aria-label={viewMode === 'month' ? 'Poprzedni miesiąc' : 'Poprzedni tydzień'}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-extrabold text-slate-900 text-sm px-1 tabular-nums">{monthTitle}</h3>
            <button
              type="button"
              onClick={navigateNext}
              aria-label={viewMode === 'month' ? 'Następny miesiąc' : 'Następny tydzień'}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {!isTodayDisplayed && (
              <button
                type="button"
                onClick={jumpToToday}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold transition-colors"
              >
                Dziś
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === 'month' ? 'week' : 'month'))}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
              title={viewMode === 'month' ? 'Zwiń do widoku tygodnia' : 'Rozwiń widok miesiąca'}
            >
              <span>{viewMode === 'month' ? 'Tydzień' : 'Miesiąc'}</span>
              {viewMode === 'month' ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Weekday headers Pn - Nd */}
        <div className="grid grid-cols-7 gap-1 pt-1 border-t border-slate-100 text-center">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-[10px] font-bold uppercase text-slate-400 py-0.5">
              {label}
            </div>
          ))}
        </div>

        {/* Calendar Grid: Month or Week */}
        {viewMode === 'month' ? (
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => {
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === currentDate;
              const { status } = getDayComplianceStatus(
                cell.dateStr,
                currentDate,
                therapies,
                medications,
                storedDoses,
                activeProfileId
              );
              const dotClass = isSelected
                ? DOT_COLOR_CLASSES[status].selected
                : DOT_COLOR_CLASSES[status].normal;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`min-h-[42px] flex flex-col items-center justify-center rounded-xl transition-all tabular-nums ${
                    isSelected
                      ? 'bg-teal-700 text-white font-extrabold shadow-2xs'
                      : isToday
                      ? 'ring-1 ring-teal-600 bg-teal-50/40 text-teal-900 font-bold hover:bg-teal-50'
                      : cell.inCurrentMonth
                      ? 'text-slate-800 hover:bg-slate-100 font-semibold'
                      : 'text-slate-300 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <span className="text-xs leading-none">{cell.day}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      !cell.inCurrentMonth && !isSelected && status !== 'none' ? 'opacity-40' : ''
                    } ${dotClass}`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((dateStr) => {
              const dayNum = parseInt(dateStr.slice(8, 10), 10);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === currentDate;
              const { status } = getDayComplianceStatus(
                dateStr,
                currentDate,
                therapies,
                medications,
                storedDoses,
                activeProfileId
              );
              const dotClass = isSelected
                ? DOT_COLOR_CLASSES[status].selected
                : DOT_COLOR_CLASSES[status].normal;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onSelectDate(dateStr)}
                  className={`min-h-[46px] flex flex-col items-center justify-center rounded-xl transition-all tabular-nums ${
                    isSelected
                      ? 'bg-teal-700 text-white font-extrabold shadow-2xs'
                      : isToday
                      ? 'ring-1 ring-teal-600 bg-teal-50/40 text-teal-900 font-bold hover:bg-teal-50'
                      : 'text-slate-800 hover:bg-slate-100 font-semibold'
                  }`}
                >
                  <span className="text-sm leading-none">{dayNum}</span>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${dotClass}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Accessible Dot Color Legend */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Przyjęte
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Częściowo
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Braki
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Plan
          </span>
        </div>
      </div>

      {/* Selected Day Header & Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 gap-2">
          <div>
            <h4 className="font-bold text-slate-900 text-sm capitalize">{formattedSelectedDate}</h4>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {selectedDoses.filter((d) => d.status === 'taken').length} z {selectedDoses.length} dawek zażytych
            </p>
          </div>
        </div>

        {groupedTherapyIds.map((therapyId) => {
          const therapy = therapyMap.get(therapyId);
          const therapyDoses = selectedDoses.filter((d) => d.therapyId === therapyId);
          if (therapyDoses.length === 0) return null;

          const isCompleted = isTherapyCompletedForDate(selectedDoses, therapyId);
          const therapyColor = therapy?.color || therapyDoses[0].therapyColor || '#0F766E';
          const therapyName = therapy?.name || therapyDoses[0].therapyName || 'Terapia';
          const profId = resolveProfileId(therapy?.profileId, undefined, therapy);
          const profileName = profileMap.get(profId)?.name;

          return (
            <div
              key={therapyId}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: therapyColor }}
                  />
                  <div className="min-w-0">
                    <h5 className="font-bold text-slate-900 text-sm leading-tight truncate">
                      {therapyName}
                    </h5>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {activeProfileId === 'all' && profileName ? `${profileName}` : ''}
                      {activeProfileId === 'all' && profileName && therapy?.description ? ' · ' : ''}
                      {therapy?.description || ''}
                    </p>
                  </div>
                </div>

                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    100%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    {therapyDoses.filter((d) => d.status === 'taken').length}/{therapyDoses.length}
                  </span>
                )}
              </div>

              {/* Doses breakdown */}
              <div className="divide-y divide-slate-100 bg-slate-50/70 rounded-xl p-2.5">
                {therapyDoses.map((d) => {
                  const isTaken = d.status === 'taken';
                  const isSkipped = d.status === 'skipped';
                  const isSnoozed = d.status === 'snoozed';
                  const displayTime = isSnoozed && d.snoozedUntil ? d.snoozedUntil : d.time;

                  return (
                    <div key={d.id} className="py-2.5 first:pt-0.5 last:pb-0.5 space-y-2">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className={`font-bold flex items-center gap-1 px-2 py-0.5 rounded-md border tabular-nums shrink-0 ${
                              isTaken
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : isSnoozed
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <Clock className="w-3 h-3 opacity-70" />
                            {displayTime}
                          </span>
                          <div className="min-w-0">
                            <div
                              className={`font-bold truncate ${
                                isTaken || isSkipped ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {d.medicationName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              <strong className="text-teal-800">
                                {formatDoseDisplay(d.doseAmount, d.type)}
                              </strong>
                              {d.instructions ? ` · ${d.instructions}` : ''}
                            </div>
                            {d.note && (
                              <div className="mt-1 text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-md px-2 py-0.5">
                                {d.note}
                              </div>
                            )}
                          </div>
                        </div>

                        {onEditDoseNote && (
                          <button
                            type="button"
                            onClick={() => onEditDoseNote(d)}
                            title={d.note ? 'Edytuj notatkę' : 'Dodaj notatkę'}
                            aria-label="Notatka do dawki"
                            className={`p-1 rounded-md shrink-0 transition-colors ${
                              d.note
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-teal-700 hover:bg-white'
                            }`}
                          >
                            <StickyNote className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dose Actions Row: Pending/Snoozed vs Taken/Skipped */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {!isTaken && !isSkipped ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <button
                              type="button"
                              onClick={() => onTakeDose(d)}
                              className="flex-1 min-h-[34px] px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Wziąłem</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSkipDose(d)}
                              className="min-h-[34px] px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              Pomiń
                            </button>
                          </div>
                        ) : (
                          <>
                            {isTaken ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] tabular-nums">
                                <Check className="w-3.5 h-3.5" />
                                Wzięte {d.takenAt ? `o ${d.takenAt}` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-semibold text-[11px]">
                                Pominięte
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => onUndoDose(d.id)}
                              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 text-teal-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>Cofnij</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {selectedDoses.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-7 text-center">
            <CalendarIcon className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 text-sm font-bold">Brak zaplanowanych leków w tym dniu</p>
            <p className="text-slate-400 text-xs mt-1">
              Wybierz inny dzień lub zmień aktywny profil użytkownika.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
