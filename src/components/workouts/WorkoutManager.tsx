import React, { useState } from 'react';
import type { Workout, PersonalRecord, AchievementBadge, Habit, HabitLog } from '../../types';
import { db } from '../../db';
import { WorkoutModal } from './WorkoutModal';
import { evaluateWorkoutPRs } from '../../utils/pr';
import { evaluateBadges } from '../../utils/badges';
import { formatHumanDate } from '../../utils/date';
import confetti from 'canvas-confetti';
import {
  Dumbbell,
  Plus,
  Calendar,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Activity
} from 'lucide-react';

interface WorkoutManagerProps {
  workouts: Workout[];
  personalRecords: PersonalRecord[];
  badges: AchievementBadge[];
  habits: Habit[];
  habitLogs: HabitLog[];
}

export const WorkoutManager: React.FC<WorkoutManagerProps> = ({
  workouts,
  personalRecords,
  badges: _badges,
  habits,
  habitLogs
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredWorkouts = workouts.filter(
    w => categoryFilter === 'all' || w.category === categoryFilter
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveWorkout = async (workout: Workout) => {
    // 1. Save or update workout
    await db.workouts.put(workout);

    // 2. Evaluate PRs
    const allExistingPRs = await db.personalRecords.toArray();
    const { newPRs } = evaluateWorkoutPRs(workout, allExistingPRs);

    if (newPRs.length > 0) {
      await db.personalRecords.bulkAdd(newPRs);
      // PR celebration
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    // 3. Evaluate Badges
    const allWorkouts = await db.workouts.toArray();
    const allPRs = await db.personalRecords.toArray();
    const allBadges = await db.badges.toArray();

    const { updatedBadges, newlyUnlocked } = evaluateBadges(
      allBadges,
      habits,
      habitLogs,
      allWorkouts,
      allPRs
    );

    if (updatedBadges.length > 0) {
      await db.badges.bulkPut(updatedBadges);
    }

    if (newlyUnlocked.length > 0) {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 }
      });
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (window.confirm('Are you sure you want to delete this workout log?')) {
      await db.transaction('rw', [db.workouts, db.personalRecords], async () => {
        await db.workouts.delete(workoutId);
        await db.personalRecords.where('workoutId').equals(workoutId).delete();
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Workout Performance Hub
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Log exercises, track volume load, and break through personal strength plateaus
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'strength', 'cardio', 'mobility', 'hiit'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  categoryFilter === cat
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingWorkout(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Log Workout
          </button>
        </div>
      </div>

      {/* Workouts List */}
      <div className="space-y-3">
        {filteredWorkouts.map(workout => {
          const isExpanded = expandedWorkoutId === workout.id;
          const workoutPRs = personalRecords.filter(pr => pr.workoutId === workout.id);

          return (
            <div
              key={workout.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-cyan-400">
                        {workout.category}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatHumanDate(workout.date)}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {workout.durationMinutes}m
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-1">
                      {workout.title}
                    </h3>

                    {workoutPRs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {workoutPRs.map(pr => (
                          <span
                            key={pr.id}
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400"
                          >
                            <Award className="w-3 h-3" />
                            {pr.exerciseName}: {pr.value}kg PR
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-white">
                      {(workout.totalVolumeKg || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">Session Volume</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title={isExpanded ? 'Hide sets' : 'View sets'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingWorkout(workout);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit workout"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkout(workout.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete workout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Exercises Breakdown */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 animate-fade-in">
                  {workout.notes && (
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 italic">
                      "{workout.notes}"
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workout.exercises.map((ex, exIdx) => (
                      <div
                        key={exIdx}
                        className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3"
                      >
                        <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                          <span>{ex.exerciseName}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">
                            {ex.sets.filter(s => s.completed).length} sets
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {ex.sets.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className={`text-[11px] font-mono px-2 py-1 rounded-md border ${
                                s.isPR
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold'
                                  : s.completed
                                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                                  : 'bg-slate-950 text-slate-600 border-slate-900 line-through'
                              }`}
                            >
                              {s.weightKg}kg × {s.reps} {s.rpe ? `@${s.rpe}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredWorkouts.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white">No workouts recorded</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Log your training session to begin tracking volume, PR breakthroughs, and linear trends.
            </p>
          </div>
        )}
      </div>

      {/* Workout Modal */}
      <WorkoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWorkout}
        editingWorkout={editingWorkout}
      />
    </div>
  );
};
