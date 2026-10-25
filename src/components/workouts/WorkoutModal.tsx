import React, { useState } from 'react';
import type { Workout, WorkoutExercise, ExerciseSet } from '../../types';
import { getTodayDateString } from '../../utils/date';
import { X, Plus, Trash2, Check, Dumbbell } from 'lucide-react';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workout: Workout) => Promise<void>;
  editingWorkout?: Workout | null;
}

const COMMON_EXERCISES = [
  'Barbell Back Squat',
  'Barbell Bench Press',
  'Conventional Deadlift',
  'Overhead Press',
  'Romanian Deadlift',
  'Barbell Bent Over Row',
  'Weighted Pull-Up',
  'Incline Dumbbell Press',
  'Leg Press',
  'Bulgarian Split Squat',
  'Lateral Raise',
  'Tricep Pushdown',
  'Bicep Barbell Curl'
];

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingWorkout
}) => {
  const [date, setDate] = useState(editingWorkout?.date || getTodayDateString());
  const [title, setTitle] = useState(editingWorkout?.title || '');
  const [category, setCategory] = useState<Workout['category']>(editingWorkout?.category || 'strength');
  const [durationMinutes, setDurationMinutes] = useState(editingWorkout?.durationMinutes || 60);
  const [rpe, setRpe] = useState(editingWorkout?.rpe || 8);
  const [notes, setNotes] = useState(editingWorkout?.notes || '');
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    editingWorkout?.exercises || [
      {
        id: `we_${Date.now()}_0`,
        exerciseName: 'Barbell Back Squat',
        category: 'strength',
        sets: [
          { setNumber: 1, reps: 5, weightKg: 100, rpe: 8, completed: true },
          { setNumber: 2, reps: 5, weightKg: 100, rpe: 8, completed: true },
          { setNumber: 3, reps: 5, weightKg: 100, rpe: 8.5, completed: true }
        ]
      }
    ]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Live total volume calculation
  const liveVolume = exercises.reduce((sum, ex) => {
    return sum + ex.sets.reduce((sSum, s) => sSum + (s.completed ? (s.weightKg || 0) * (s.reps || 0) : 0), 0);
  }, 0);

  const handleAddExercise = () => {
    setExercises(prev => [
      ...prev,
      {
        id: `we_${Date.now()}_${prev.length}`,
        exerciseName: COMMON_EXERCISES[prev.length % COMMON_EXERCISES.length],
        category: 'strength',
        sets: [
          { setNumber: 1, reps: 8, weightKg: 50, rpe: 7.5, completed: true },
          { setNumber: 2, reps: 8, weightKg: 50, rpe: 8, completed: true },
          { setNumber: 3, reps: 8, weightKg: 50, rpe: 8.5, completed: true }
        ]
      }
    ]);
  };

  const handleRemoveExercise = (exIdx: number) => {
    setExercises(prev => prev.filter((_, idx) => idx !== exIdx));
  };

  const handleUpdateExerciseName = (exIdx: number, val: string) => {
    setExercises(prev => {
      const copy = [...prev];
      copy[exIdx].exerciseName = val;
      return copy;
    });
  };

  const handleAddSet = (exIdx: number) => {
    setExercises(prev => {
      const copy = [...prev];
      const targetEx = copy[exIdx];
      const lastSet = targetEx.sets[targetEx.sets.length - 1];
      const newSet: ExerciseSet = {
        setNumber: targetEx.sets.length + 1,
        reps: lastSet ? lastSet.reps : 8,
        weightKg: lastSet ? lastSet.weightKg : 50,
        rpe: lastSet ? lastSet.rpe : 8,
        completed: true
      };
      targetEx.sets = [...targetEx.sets, newSet];
      return copy;
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises(prev => {
      const copy = [...prev];
      copy[exIdx].sets = copy[exIdx].sets
        .filter((_, sIdx) => sIdx !== setIdx)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return copy;
    });
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, field: keyof ExerciseSet, val: any) => {
    setExercises(prev => {
      const copy = [...prev];
      const s = { ...copy[exIdx].sets[setIdx], [field]: val };
      copy[exIdx].sets[setIdx] = s;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const workout: Workout = {
      id: editingWorkout?.id || `workout_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date,
      title: title.trim() || `${category.toUpperCase()} Session`,
      category,
      durationMinutes: Number(durationMinutes) || 45,
      totalVolumeKg: Math.round(liveVolume * 10) / 10,
      rpe: Number(rpe) || 8,
      notes: notes.trim() || undefined,
      exercises,
      createdAt: editingWorkout?.createdAt || new Date().toISOString()
    };

    await onSave(workout);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">
              {editingWorkout ? 'Edit Workout Session' : 'Log New Workout'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Workout Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Heavy Lower Body / Squat Focus"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="mobility">Mobility</option>
                <option value="hiit">HIIT</option>
                <option value="recovery">Recovery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Duration (mins)
              </label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Effort (RPE 1-10)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Exercise Builder */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Exercises & Sets
              </label>
              <span className="text-xs font-mono font-semibold text-cyan-400">
                Session Volume: {Math.round(liveVolume)} kg
              </span>
            </div>

            <div className="space-y-4">
              {exercises.map((ex, exIdx) => (
                <div
                  key={ex.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      list="exercise-list"
                      value={ex.exerciseName}
                      onChange={(e) => handleUpdateExerciseName(exIdx, e.target.value)}
                      placeholder="Exercise Name"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <datalist id="exercise-list">
                      {COMMON_EXERCISES.map(eName => (
                        <option key={eName} value={eName} />
                      ))}
                    </datalist>

                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(exIdx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Remove exercise"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sets Table */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-mono font-semibold uppercase text-slate-500 px-2">
                      <span className="col-span-2">Set</span>
                      <span className="col-span-3">Weight (kg)</span>
                      <span className="col-span-3">Reps</span>
                      <span className="col-span-2">RPE</span>
                      <span className="col-span-2 text-right">Done</span>
                    </div>

                    {ex.sets.map((s, sIdx) => (
                      <div
                        key={sIdx}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2 rounded-lg text-xs"
                      >
                        <span className="col-span-2 font-mono font-bold text-slate-400">
                          #{s.setNumber}
                        </span>

                        <div className="col-span-3">
                          <input
                            type="number"
                            step="any"
                            value={s.weightKg}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, sIdx, 'weightKg', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            value={s.reps}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, sIdx, 'reps', parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.5"
                            value={s.rpe || ''}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, sIdx, 'rpe', parseFloat(e.target.value) || undefined)
                            }
                            placeholder="-"
                            className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-center font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateSet(exIdx, sIdx, 'completed', !s.completed)}
                            className={`p-1 rounded ${
                              s.completed
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, sIdx)}
                            className="text-slate-600 hover:text-rose-400 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleAddSet(exIdx)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Set
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddExercise}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/40 text-xs font-semibold text-slate-300 hover:text-cyan-400 flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Another Exercise
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Session Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Felt great on back squats, locked in bar speed. Next week bump to 102.5kg."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {editingWorkout ? 'Save Workout' : 'Log Workout Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
