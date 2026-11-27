import React, { useState, useEffect } from 'react';
import { X, Check, Palette, Users, UserPlus, PauseCircle, PlayCircle, Calendar, AlertCircle } from 'lucide-react';
import { Therapy, FamilyProfile, validateDateRange } from '../utils/medicationLogic';
import { QuickAddProfileModal } from './ProfileManagerModal';

interface AddTherapyModalProps {
  isOpen: boolean;
  profiles?: FamilyProfile[];
  defaultProfileId?: string;
  therapyToEdit?: Therapy | null;
  onClose: () => void;
  onSave: (therapy: Omit<Therapy, 'id' | 'createdAt'>) => void;
  onUpdate?: (therapy: Therapy) => void;
  onCreateProfile?: (data: Omit<FamilyProfile, 'id'>) => FamilyProfile;
}

const COLOR_OPTIONS = [
  { hex: '#10b981', label: 'Szmaragdowy' },
  { hex: '#3b82f6', label: 'Błękitny' },
  { hex: '#8b5cf6', label: 'Fioletowy' },
  { hex: '#f59e0b', label: 'Bursztynowy' },
  { hex: '#ec4899', label: 'Różowy' },
  { hex: '#ef4444', label: 'Koralowy' },
];

export const AddTherapyModal: React.FC<AddTherapyModalProps> = ({
  isOpen,
  profiles = [],
  defaultProfileId = 'self',
  therapyToEdit = null,
  onClose,
  onSave,
  onUpdate,
  onCreateProfile,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10b981');
  const [profileId, setProfileId] = useState(defaultProfileId === 'all' ? 'self' : defaultProfileId);
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [isQuickProfileOpen, setIsQuickProfileOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (therapyToEdit) {
      setName(therapyToEdit.name);
      setDescription(therapyToEdit.description || '');
      setColor(therapyToEdit.color || '#10b981');
      setProfileId(therapyToEdit.profileId || 'self');
      setIsActive(therapyToEdit.isActive);
      setStartDate(therapyToEdit.startDate || '');
      setEndDate(therapyToEdit.endDate || '');
    } else {
      setName('');
      setDescription('');
      setColor('#10b981');
      const fallbackProf =
        defaultProfileId && defaultProfileId !== 'all'
          ? defaultProfileId
          : profiles[0]?.id || 'self';
      setProfileId(fallbackProf);
      setIsActive(true);
      setStartDate('');
      setEndDate('');
    }
    setError('');
  }, [isOpen, therapyToEdit, defaultProfileId, profiles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Proszę podać nazwę terapii.');
      return;
    }

    const dateErr = validateDateRange(startDate, endDate);
    if (dateErr) {
      setError(dateErr);
      return;
    }

    if (therapyToEdit && onUpdate) {
      onUpdate({
        ...therapyToEdit,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        profileId: profileId || profiles[0]?.id || 'self',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isActive,
      });
    } else {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon: 'medical_services',
        profileId: profileId || profiles[0]?.id || 'self',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isActive,
      });
    }

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
        <div
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 my-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="therapy-modal-title"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <h2 id="therapy-modal-title" className="font-bold text-slate-800 text-lg">
                {therapyToEdit ? 'Edytuj Terapię Medyczną' : 'Nowa Terapia Medyczna'}
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

          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
            {error && (
              <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
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

            {profiles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="therapy-profile"
                    className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"
                  >
                    <Users className="w-4 h-4 text-slate-500" /> Profil osoby
                  </label>
                  {onCreateProfile && (
                    <button
                      type="button"
                      onClick={() => setIsQuickProfileOpen(true)}
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Nowy profil</span>
                    </button>
                  )}
                </div>
                <select
                  id="therapy-profile"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.relation})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status terapii: Aktywna vs Wstrzymana */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="block text-xs font-bold text-slate-700">Status terapii</span>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-white text-teal-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Aktywna</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    !isActive
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Wstrzymana</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {isActive
                  ? 'Terapia generuje bieżące dawki na ekranie „Dziś” i wysyła przypomnienia.'
                  : 'Terapia wstrzymana nie generuje dawek na dziś ani alarmów, ale zachowuje historię przyjętych leków.'}
              </p>
            </div>

            {/* Opcjonalny zakres dat terapii (informacyjnie) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Okres kuracji (opcjonalnie, informacyjnie)</span>
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="th-start-date" className="text-[11px] font-semibold text-slate-600">
                      Od daty
                    </label>
                    {startDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate('');
                          if (error) setError('');
                        }}
                        className="text-[10px] font-bold text-teal-700 hover:underline"
                      >
                        Wyczyść
                      </button>
                    )}
                  </div>
                  <input
                    id="th-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="th-end-date" className="text-[11px] font-semibold text-slate-600">
                      Do daty
                    </label>
                    {endDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setEndDate('');
                          if (error) setError('');
                        }}
                        className="text-[10px] font-bold text-teal-700 hover:underline"
                      >
                        Wyczyść
                      </button>
                    )}
                  </div>
                  <input
                    id="th-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
                  />
                </div>
              </div>
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

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
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

      {onCreateProfile && (
        <QuickAddProfileModal
          isOpen={isQuickProfileOpen}
          profiles={profiles}
          onClose={() => setIsQuickProfileOpen(false)}
          onCreateProfile={onCreateProfile}
          onCreated={(created) => setProfileId(created.id)}
        />
      )}
    </>
  );
};
