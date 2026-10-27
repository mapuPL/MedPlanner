import React from 'react';
import { Bell, Check, Clock, X } from 'lucide-react';
import { DoseItem, formatDoseDisplay } from '../utils/medicationLogic';

interface NotificationBannerProps {
  dose: DoseItem | null;
  isVisible: boolean;
  onTake: (doseId: string) => void;
  onSnooze: (doseId: string, minutes: number) => void;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  dose,
  isVisible,
  onTake,
  onSnooze,
  onDismiss,
}) => {
  if (!isVisible || !dose) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 w-full max-w-sm px-4 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 ring-1 ring-white/10">
        {/* System Header */}
        <div className="flex items-center justify-between text-2xs text-slate-300 mb-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-4 rounded-full bg-teal-500 text-slate-900 flex items-center justify-center font-bold text-3xs">
              M
            </span>
            <span className="font-semibold text-white">MedPlaner</span>
            <span>•</span>
            <span>DOKŁADNY ALARM • teraz</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Zamknij powiadomienie"
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notification Body */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-teal-600/30 border border-teal-500/40 text-teal-400 shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-white truncate">
              Czas na lek: {dose.medicationName}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Dawka: <span className="text-teal-300 font-semibold">{formatDoseDisplay(dose.doseAmount, dose.type)}</span> • {dose.therapyName}
            </p>
            {dose.instructions && (
              <p className="text-2xs text-slate-400 mt-0.5 italic">
                Zalecenie: {dose.instructions}
              </p>
            )}
          </div>
        </div>

        {/* Android Interactive Action Buttons */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTake(dose.id)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            Wziąłem
          </button>
          <button
            type="button"
            onClick={() => onSnooze(dose.id, 15)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Odłóż (15 min)
          </button>
        </div>
      </div>
    </div>
  );
};
