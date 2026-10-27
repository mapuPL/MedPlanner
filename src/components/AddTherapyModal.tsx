import React, { useState } from 'react';
import { X, Check, Palette } from 'lucide-react';
import { Therapy } from '../utils/medicationLogic';

interface AddTherapyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (therapy: Omit<Therapy, 'id' | 'createdAt'>) => void;
}

const COLOR_OPTIONS = [
  { hex: '#10b981', label: 'Szmaragdowy' },
  { hex: '#3b82f6', label: 'Błękitny' },
  { hex: '#8b5cf6', label: 'Fioletowy' },
  { hex: '#f59e0b', label: 'Bursztynowy' },
  { hex: '#ec4899', label: 'Różowy' },
  { hex: '#ef4444', label: 'Koralowy' },
];

export const AddTherapyModal: React.FC<AddTherapyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10b981');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Proszę podać nazwę terapii');
      return;
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      icon: 'medical_services',
      startDate: todayStr,
      isActive: true,
    });

    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="therapy-modal-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h2 id="therapy-modal-title" className="font-bold text-slate-800 text-lg">
              Nowa Terapia Medyczna
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Zamknij formularz terapii"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="therapy-name" className="block text-sm font-semibold text-slate-700 mb-1">
              Nazwa Terapii *
            </label>
            <input
              id="therapy-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="np. Terapia antybiotykowa, Krople do oczu i nosa"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>

          <div>
            <label htmlFor="therapy-desc" className="block text-sm font-semibold text-slate-700 mb-1">
              Opis / Wskazówki lekarza
            </label>
            <textarea
              id="therapy-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Przyjmować ściśle przez 7 dni po posiłkach, nie przerywać kuracji"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-slate-500" /> Kolor wyróżniający
            </label>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    aria-label={`Wybierz kolor ${c.label}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 relative focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <Check className="w-5 h-5 text-white drop-shadow-xs" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              Zapisz Terapię
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
