import React from 'react';
import { X, Clock, Timer, CheckCircle, BellRing } from 'lucide-react';
import { DoseItem } from '../utils/medicationLogic';

interface SnoozeModalProps {
  isOpen: boolean;
  dose: DoseItem | null;
  onClose: () => void;
  onSnooze: (doseId: string, minutes: number) => void;
  onTakeNow: (doseId: string) => void;
}

export const SnoozeModal: React.FC<SnoozeModalProps> = ({
  isOpen,
  dose,
  onClose,
  onSnooze,
  onTakeNow,
}) => {
  if (!isOpen || !dose) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snooze-modal-title"
      >
        {/* Handle for mobile */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 sm:hidden" />

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-600">
                <BellRing className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-2xs uppercase tracking-wider font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  Odroczenie Dawki
                </span>
                <h3 id="snooze-modal-title" className="text-lg font-bold text-slate-900 mt-0.5">
                  {dose.medicationName}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij okno odroczenia"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Zaplanowana godzina:</span>{' '}
              <span className="font-bold text-teal-700">{dose.time}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Dawka:</span>{' '}
              <span>{dose.doseAmount}</span>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            Wybierz czas odroczenia powiadomienia:
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                onSnooze(dose.id, 5);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  5m
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm group-hover:text-amber-800">
                    Za 5 minut
                  </div>
                  <div className="text-2xs text-slate-500">Szybka chwila na przygotowanie szklanki wody</div>
                </div>
              </div>
              <Timer className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
            </button>

            <button
              type="button"
              onClick={() => {
                onSnooze(dose.id, 15);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-amber-300 bg-amber-50/40 hover:bg-amber-50 transition-all group text-left relative overflow-hidden"
            >
              <div className="absolute top-1 right-2 text-3xs uppercase font-extrabold px-1.5 py-0.5 rounded-sm bg-amber-200 text-amber-900">
                Polecane
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  15m
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm group-hover:text-amber-900">
                    Za 15 minut
                  </div>
                  <div className="text-2xs text-slate-600">Optymalny czas na dokończenie posiłku</div>
                </div>
              </div>
              <Clock className="w-4 h-4 text-amber-600" />
            </button>

            <button
              type="button"
              onClick={() => {
                onSnooze(dose.id, 30);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  30m
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm group-hover:text-amber-800">
                    Za 30 minut
                  </div>
                  <div className="text-2xs text-slate-500">Gdy jesteś w podróży lub na spotkaniu</div>
                </div>
              </div>
              <Clock className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onTakeNow(dose.id);
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Jednak wziąłem teraz
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
