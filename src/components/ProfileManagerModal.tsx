import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import {
  FamilyProfile,
  Therapy,
  Medication,
  isDuplicateProfileName,
} from '../utils/medicationLogic';

export const PROFILE_COLOR_PALETTE = [
  '#0F766E',
  '#8B5CF6',
  '#3B82F6',
  '#EC4899',
  '#F59E0B',
  '#EF4444',
];

export const PROFILE_RELATION_OPTIONS = [
  'Główny',
  'Rodzina',
  'Dziecko',
  'Senior',
  'Bliski',
];

interface ProfileManagerModalProps {
  isOpen: boolean;
  profiles: FamilyProfile[];
  therapies: Therapy[];
  medications: Medication[];
  initialEditProfileId?: string | null;
  initialDeleteProfileId?: string | null;
  onClose: () => void;
  onCreateProfile: (data: Omit<FamilyProfile, 'id'>) => FamilyProfile;
  onUpdateProfile: (profile: FamilyProfile) => void;
  onDeleteProfile: (
    profileId: string,
    options: { mode: 'transfer' | 'cascade'; targetProfileId?: string }
  ) => void;
}

export const ProfileManagerModal: React.FC<ProfileManagerModalProps> = ({
  isOpen,
  profiles,
  therapies,
  medications,
  initialEditProfileId = null,
  initialDeleteProfileId = null,
  onClose,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
}) => {
  // Add form state
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('Rodzina');
  const [newColor, setNewColor] = useState(PROFILE_COLOR_PALETTE[0]);
  const [addError, setAddError] = useState('');

  // Edit form state
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRelation, setEditRelation] = useState('Rodzina');
  const [editColor, setEditColor] = useState(PROFILE_COLOR_PALETTE[0]);
  const [editError, setEditError] = useState('');

  // Safe delete confirmation state
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<'transfer' | 'cascade'>('transfer');
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [managerNotice, setManagerNotice] = useState<string>('');

  const countProfileResources = (profileId: string) => {
    const profileTherapies = therapies.filter((t) => (t.profileId || 'self') === profileId);
    const therapyIds = new Set(profileTherapies.map((t) => t.id));
    const profileMeds = medications.filter(
      (m) => (m.profileId || 'self') === profileId || therapyIds.has(m.therapyId)
    );
    return {
      therapyCount: profileTherapies.length,
      medCount: profileMeds.length,
    };
  };

  useEffect(() => {
    if (!isOpen) return;
    setNewName('');
    setNewRelation('Rodzina');
    setNewColor(PROFILE_COLOR_PALETTE[profiles.length % PROFILE_COLOR_PALETTE.length]);
    setAddError('');
    setEditError('');
    setManagerNotice('');

    if (initialEditProfileId) {
      const target = profiles.find((p) => p.id === initialEditProfileId);
      if (target) {
        setEditingProfileId(target.id);
        setEditName(target.name);
        setEditRelation(target.relation || 'Bliski');
        setEditColor(target.avatarColor || PROFILE_COLOR_PALETTE[0]);
      } else {
        setEditingProfileId(null);
      }
    } else {
      setEditingProfileId(null);
    }

    if (initialDeleteProfileId) {
      const target = profiles.find((p) => p.id === initialDeleteProfileId);
      if (target) {
        setDeletingProfileId(target.id);
        const remaining = profiles.filter((p) => p.id !== target.id);
        setTransferTargetId(remaining.find((p) => p.id === 'self')?.id || remaining[0]?.id || '');
        setDeleteMode('transfer');
      } else {
        setDeletingProfileId(null);
      }
    } else {
      setDeletingProfileId(null);
    }
  }, [isOpen, initialEditProfileId, initialDeleteProfileId, profiles]);

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setAddError('Wpisz imię lub nazwę profilu.');
      return;
    }
    if (isDuplicateProfileName(trimmed, profiles)) {
      setAddError(`Profil o nazwie "${trimmed}" już istnieje.`);
      return;
    }
    const created = onCreateProfile({
      name: trimmed,
      relation: newRelation.trim() || 'Bliski',
      avatarColor: newColor,
    });
    setNewName('');
    setNewRelation('Rodzina');
    setNewColor(PROFILE_COLOR_PALETTE[(profiles.length + 1) % PROFILE_COLOR_PALETTE.length]);
    setAddError('');
    setManagerNotice(`Dodano profil: ${created.name}`);
  };

  const startEdit = (profile: FamilyProfile) => {
    setDeletingProfileId(null);
    setEditingProfileId(profile.id);
    setEditName(profile.name);
    setEditRelation(profile.relation || 'Bliski');
    setEditColor(profile.avatarColor || PROFILE_COLOR_PALETTE[0]);
    setEditError('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Nazwa profilu nie może być pusta.');
      return;
    }
    if (isDuplicateProfileName(trimmed, profiles, editingProfileId)) {
      setEditError(`Profil o nazwie "${trimmed}" już istnieje.`);
      return;
    }
    onUpdateProfile({
      id: editingProfileId,
      name: trimmed,
      relation: editRelation.trim() || 'Bliski',
      avatarColor: editColor,
    });
    setEditingProfileId(null);
    setEditError('');
    setManagerNotice(`Zaktualizowano profil: ${trimmed}`);
  };

  const startDelete = (profile: FamilyProfile) => {
    setEditingProfileId(null);
    if (profiles.length <= 1) {
      setManagerNotice('Musi pozostać co najmniej jeden profil w systemie.');
      return;
    }
    const remaining = profiles.filter((p) => p.id !== profile.id);
    setTransferTargetId(remaining.find((p) => p.id === 'self')?.id || remaining[0]?.id || '');
    setDeleteMode('transfer');
    setDeletingProfileId(profile.id);
  };

  const deletingProfile = deletingProfileId
    ? profiles.find((p) => p.id === deletingProfileId) || null
    : null;
  const deletingCounts = deletingProfile
    ? countProfileResources(deletingProfile.id)
    : { therapyCount: 0, medCount: 0 };
  const remainingForDelete = deletingProfile
    ? profiles.filter((p) => p.id !== deletingProfile.id)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-manager-title"
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 id="profile-manager-title" className="font-extrabold text-slate-900 text-base">
                Użytkownicy i Profile
              </h2>
              <p className="text-[11px] text-slate-500">
                Dodawaj, edytuj i bezpiecznie zarządzaj profilami domowników
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij zarządzanie profilami"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {managerNotice && (
            <div className="px-3.5 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between gap-2">
              <span>{managerNotice}</span>
              <button
                type="button"
                onClick={() => setManagerNotice('')}
                className="text-teal-700 hover:text-teal-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Safe Delete Confirmation Panel */}
          {deletingProfile && (
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Usunąć profil „{deletingProfile.name}”?
                  </h3>
                  {deletingCounts.therapyCount === 0 && deletingCounts.medCount === 0 ? (
                    <p className="text-xs text-slate-600 mt-1">
                      Ten profil nie ma przypisanych terapii ani leków. Operacja usunie sam profil.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-700 mt-1 tabular-nums">
                      Ten profil ma przypisane terapie ({deletingCounts.therapyCount}) oraz leki (
                      {deletingCounts.medCount}). Zdecyduj, co zrobić z jego danymi:
                    </p>
                  )}
                </div>
              </div>

              {(deletingCounts.therapyCount > 0 || deletingCounts.medCount > 0) && (
                <div className="space-y-2.5 pl-1">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="profile-delete-mode"
                      checked={deleteMode === 'transfer'}
                      onChange={() => setDeleteMode('transfer')}
                      className="mt-0.5 accent-teal-700"
                    />
                    <div className="flex-1 space-y-2">
                      <span className="text-xs font-bold text-slate-900 block">
                        Przenieś terapie i leki na inny profil
                      </span>
                      {deleteMode === 'transfer' && (
                        <select
                          value={transferTargetId}
                          onChange={(e) => setTransferTargetId(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 font-semibold"
                        >
                          {remainingForDelete.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.relation})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-200 cursor-pointer">
                    <input
                      type="radio"
                      name="profile-delete-mode"
                      checked={deleteMode === 'cascade'}
                      onChange={() => setDeleteMode('cascade')}
                      className="mt-0.5 accent-rose-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-rose-700 block">
                        Usuń profil wraz z powiązanymi terapiami i lekami
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Trwale usunie przypisane terapie, leki i powiązane wpisy dawek.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingProfileId(null)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const hasData =
                      deletingCounts.therapyCount > 0 || deletingCounts.medCount > 0;
                    onDeleteProfile(deletingProfile.id, {
                      mode: hasData ? deleteMode : 'cascade',
                      targetProfileId:
                        hasData && deleteMode === 'transfer' ? transferTargetId : undefined,
                    });
                    setDeletingProfileId(null);
                    setManagerNotice(`Usunięto profil: ${deletingProfile.name}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  {deleteMode === 'cascade' &&
                  (deletingCounts.therapyCount > 0 || deletingCounts.medCount > 0)
                    ? 'Usuń wszystko'
                    : 'Potwierdź usunięcie'}
                </button>
              </div>
            </div>
          )}

          {/* Add New Profile Form */}
          <form
            onSubmit={handleAddSubmit}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
          >
            <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-teal-700" />
              <span>Dodaj nową osobę</span>
            </div>

            {addError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="pm-new-name" className="block text-[11px] font-bold text-slate-600 mb-1">
                  Imię lub nazwa *
                </label>
                <input
                  id="pm-new-name"
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (addError) setAddError('');
                  }}
                  placeholder="np. Babcia, Marek, Zosia"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label htmlFor="pm-new-rel" className="block text-[11px] font-bold text-slate-600 mb-1">
                  Relacja
                </label>
                <select
                  id="pm-new-rel"
                  value={newRelation}
                  onChange={(e) => setNewRelation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                >
                  {PROFILE_RELATION_OPTIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600">Kolor:</span>
                <div className="flex items-center gap-1.5">
                  {PROFILE_COLOR_PALETTE.map((hex) => {
                    const active = newColor === hex;
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setNewColor(hex)}
                        aria-label={`Wybierz kolor ${hex}`}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                          active ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : ''
                        }`}
                        style={{ backgroundColor: hex }}
                      >
                        {active && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj</span>
              </button>
            </div>
          </form>

          {/* Profiles List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-700">
                Zapisane profile ({profiles.length})
              </h3>
              {profiles.length <= 1 && (
                <span className="text-[11px] text-slate-400">
                  Ostatniego profilu nie można usunąć
                </span>
              )}
            </div>

            <div className="space-y-2">
              {profiles.map((p) => {
                const counts = countProfileResources(p.id);
                const isEditing = editingProfileId === p.id;
                const canDelete = profiles.length > 1;

                if (isEditing) {
                  return (
                    <form
                      key={p.id}
                      onSubmit={handleSaveEdit}
                      className="p-3.5 rounded-2xl border-2 border-teal-500 bg-teal-50/40 space-y-2.5"
                    >
                      {editError && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                          {editError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            if (editError) setEditError('');
                          }}
                          placeholder="Imię / nazwa"
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
                        />
                        <select
                          value={editRelation}
                          onChange={(e) => setEditRelation(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
                        >
                          {PROFILE_RELATION_OPTIONS.includes(editRelation) ? null : (
                            <option value={editRelation}>{editRelation}</option>
                          )}
                          {PROFILE_RELATION_OPTIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {PROFILE_COLOR_PALETTE.map((hex) => {
                            const active = editColor === hex;
                            return (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => setEditColor(hex)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  active ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                                }`}
                                style={{ backgroundColor: hex }}
                              >
                                {active && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProfileId(null);
                              setEditError('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-bold"
                          >
                            Anuluj
                          </button>
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
                          >
                            Zapisz
                          </button>
                        </div>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                        style={{ backgroundColor: p.avatarColor }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {p.relation} · Terapie: {counts.therapyCount} · Leki: {counts.medCount}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        title="Edytuj profil"
                        aria-label={`Edytuj profil ${p.name}`}
                        className="p-2 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startDelete(p)}
                        disabled={!canDelete}
                        title={
                          canDelete
                            ? 'Usuń profil'
                            : 'Nie można usunąć ostatniego profilu w systemie'
                        }
                        aria-label={`Usuń profil ${p.name}`}
                        className={`p-2 rounded-lg transition-colors ${
                          canDelete
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuickAddProfileModalProps {
  isOpen: boolean;
  profiles: FamilyProfile[];
  onClose: () => void;
  onCreateProfile: (data: Omit<FamilyProfile, 'id'>) => FamilyProfile;
  onCreated: (created: FamilyProfile) => void;
}

export const QuickAddProfileModal: React.FC<QuickAddProfileModalProps> = ({
  isOpen,
  profiles,
  onClose,
  onCreateProfile,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Rodzina');
  const [color, setColor] = useState(PROFILE_COLOR_PALETTE[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setRelation('Rodzina');
      setColor(PROFILE_COLOR_PALETTE[profiles.length % PROFILE_COLOR_PALETTE.length]);
      setError('');
    }
  }, [isOpen, profiles.length]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Wpisz imię lub nazwę profilu.');
      return;
    }
    if (isDuplicateProfileName(trimmed, profiles)) {
      setError(`Profil o nazwie "${trimmed}" już istnieje.`);
      return;
    }
    const created = onCreateProfile({
      name: trimmed,
      relation: relation.trim() || 'Bliski',
      avatarColor: color,
    });
    onCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-profile-title"
      >
        <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-700" />
            <h3 id="quick-profile-title" className="text-sm font-extrabold text-slate-900">
              Nowy profil osoby
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="qp-name" className="block text-xs font-bold text-slate-700 mb-1">
              Imię lub nazwa *
            </label>
            <input
              id="qp-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="np. Tata, Babcia, Tomek"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label htmlFor="qp-relation" className="block text-xs font-bold text-slate-700 mb-1">
              Relacja
            </label>
            <select
              id="qp-relation"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            >
              {PROFILE_RELATION_OPTIONS.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">Kolor:</span>
            <div className="flex items-center gap-2">
              {PROFILE_COLOR_PALETTE.map((hex) => {
                const active = color === hex;
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      active ? 'ring-2 ring-offset-1 ring-slate-900' : ''
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
            >
              Dodaj i wybierz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ConfirmDialogModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Potwierdź',
  destructive = true,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              destructive ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-700'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold ${
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-700 hover:bg-teal-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
