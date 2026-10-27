import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Clock, Check } from 'lucide-react';
import { DoseItem, Therapy, isTherapyCompletedForDate, formatDoseDisplay } from '../utils/medicationLogic';

interface CalendarViewProps {
  currentDate: string; // YYYY-MM-DD
  allDoses: DoseItem[];
  therapies: Therapy[];
  onSelectDate: (date: string) => void;
  onTakeDose: (doseId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  allDoses,
  therapies,
  onSelectDate,
  onTakeDose,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(currentDate);

  const selectedDoses = allDoses.filter((d) => d.date === selectedDate);

  // Helper to change day
  const changeDay = (offset: number) => {
    const d = new Date(selectedDate + 'T12:00:00Z');
    d.setDate(d.getDate() + offset);
    const newStr = d.toISOString().substring(0, 10);
    setSelectedDate(newStr);
    onSelectDate(newStr);
  };

  // Generate 7-day strip around selected date
  const generateWeekDays = () => {
    const center = new Date(selectedDate + 'T12:00:00Z');
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().substring(0, 10);
      const dayName = d.toLocaleDateString('pl-PL', { weekday: 'short' });
      const dayNum = d.getDate();
      const dosesForDay = allDoses.filter((item) => item.date === iso);
      const allDone = dosesForDay.length > 0 && dosesForDay.every((item) => item.status === 'taken');
      const hasDoses = dosesForDay.length > 0;
      days.push({ iso, dayName, dayNum, allDone, hasDoses });
    }
    return days;
  };

  const weekDays = generateWeekDays();

  // Group selected date doses by therapy
  const dosesByTherapy: Record<string, DoseItem[]> = {};
  selectedDoses.forEach((d) => {
    if (!dosesByTherapy[d.therapyId]) {
      dosesByTherapy[d.therapyId] = [];
    }
    dosesByTherapy[d.therapyId].push(d);
  });

  const formattedDateString = new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Date Header & Day Switcher */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => changeDay(-1)}
            aria-label="Poprzedni dzień"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <span className="text-xs uppercase tracking-wider font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full inline-block mb-0.5">
              Kalendarz Terapii
            </span>
            <h3 className="font-bold text-slate-800 text-sm capitalize">
              {formattedDateString}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => changeDay(1)}
            aria-label="Następny dzień"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 7-day horizontal picker strip */}
        <div className="grid grid-cols-7 gap-1 pt-1 border-t border-slate-100">
          {weekDays.map((w) => {
            const isSelected = w.iso === selectedDate;
            const isToday = w.iso === currentDate;
            return (
              <button
                key={w.iso}
                type="button"
                onClick={() => {
                  setSelectedDate(w.iso);
                  onSelectDate(w.iso);
                }}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all relative ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs font-bold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className={`text-2xs capitalize ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                  {w.dayName}
                </span>
                <span className="text-sm font-bold my-0.5">{w.dayNum}</span>

                {/* Status dot */}
                {w.hasDoses && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected
                        ? w.allDone
                          ? 'bg-emerald-300'
                          : 'bg-amber-300'
                        : w.allDone
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                )}
                {isToday && !isSelected && (
                  <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-teal-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Therapy Compliance Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-bold text-slate-800 text-sm">Status Terapii w wybranym dniu</h4>
          <span className="text-xs text-slate-500 font-medium">
            {selectedDoses.filter((d) => d.status === 'taken').length} z {selectedDoses.length} dawek zażytych
          </span>
        </div>

        {therapies.map((therapy) => {
          const therapyDoses = dosesByTherapy[therapy.id] || [];
          if (therapyDoses.length === 0) return null;

          const isCompleted = isTherapyCompletedForDate(allDoses.filter((d) => d.date === selectedDate), therapy.id);

          return (
            <div
              key={therapy.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: therapy.color }} />
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{therapy.name}</h5>
                    {therapy.description && (
                      <p className="text-2xs text-slate-500 line-clamp-1">{therapy.description}</p>
                    )}
                  </div>
                </div>

                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% zrealizowana
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> W trakcie / Oczekuje
                  </span>
                )}
              </div>

              {/* Doses breakdown for this therapy */}
              <div className="divide-y divide-slate-100 bg-slate-50/70 rounded-xl p-2.5">
                {therapyDoses.map((d) => {
                  const isTaken = d.status === 'taken';
                  return (
                    <div key={d.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {d.time}
                        </span>
                        <div>
                          <span className={`font-semibold ${isTaken ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {d.medicationName}
                          </span>
                          <span className="text-slate-500 ml-1.5">({formatDoseDisplay(d.doseAmount, d.type)})</span>
                        </div>
                      </div>

                      {isTaken ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-2xs bg-emerald-50 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" /> Wzięte {d.takenAt ? `o ${d.takenAt}` : ''}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onTakeDose(d.id)}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-2xs font-bold transition-colors shadow-2xs"
                        >
                          Wziąłem
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {selectedDoses.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 text-sm font-semibold">Brak zaplanowanych leków w tym dniu</p>
            <p className="text-slate-400 text-xs mt-1">Wybierz inny dzień lub zaplanuj nową terapię.</p>
          </div>
        )}
      </div>
    </div>
  );
};
