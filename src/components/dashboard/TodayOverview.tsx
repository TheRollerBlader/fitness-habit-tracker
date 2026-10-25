import React from 'react';
import type { Habit, HabitLog, Workout, AppSettings } from '../../types';
import { db } from '../../db';
import { getTodayDateString, formatHumanDate, calculateHabitStreaks } from '../../utils/date';
import confetti from 'canvas-confetti';
import { Check, Flame, Dumbbell, Plus, Calendar } from 'lucide-react';

interface TodayOverviewProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  workouts: Workout[];
  settings?: AppSettings;
  onOpenWorkoutModal: () => void;
  onOpenHabitModal: () => void;
}

export const TodayOverview: React.FC<TodayOverviewProps> = ({
  habits,
  habitLogs,
  workouts,
  settings: _settings,
  onOpenWorkoutModal,
  onOpenHabitModal
}) => {
  const todayStr = getTodayDateString();

  const activeHabits = habits.filter(h => !h.archived);
  const todayLogs = habitLogs.filter(l => l.date === todayStr && l.completed);
  const todayCompletedHabitIds = new Set(todayLogs.map(l => l.habitId));

  const completedCount = activeHabits.filter(h => todayCompletedHabitIds.has(h.id)).length;
  const totalCount = activeHabits.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const todayWorkout = workouts.find(w => w.date === todayStr);

  const handleToggleHabit = async (habitId: string) => {
    const isCompleted = todayCompletedHabitIds.has(habitId);
    const existingLog = habitLogs.find(l => l.habitId === habitId && l.date === todayStr);

    if (isCompleted && existingLog) {
      await db.habitLogs.delete(existingLog.id);
    } else {
      const newLog: HabitLog = {
        id: `log_${habitId}_${todayStr}`,
        habitId,
        date: todayStr,
        completed: true,
        timestamp: Date.now()
      };
      await db.habitLogs.put(newLog);

      if (completedCount + 1 === totalCount) {
        // All completed celebration!
        confetti({
          particleCount: 100,
          spread: 90,
          origin: { y: 0.6 }
        });
      } else {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 }
        });
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Banner Top */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-400 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              {formatHumanDate(todayStr)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
              Execute Today's Routine
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {completionPct === 100
                ? '🔥 Outstanding! All daily habits conquered today.'
                : `${completedCount} of ${totalCount} habits completed. Maintain your momentum!`}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenWorkoutModal}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Dumbbell className="w-4 h-4" />
              {todayWorkout ? 'View Workout' : 'Log Workout'}
            </button>
            <button
              onClick={onOpenHabitModal}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Habit
            </button>
          </div>
        </div>

        {/* Progress Bar & Quick Checklist */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>Daily Completion: {completionPct}%</span>
            <span className="font-mono text-emerald-400">
              {completedCount} / {totalCount} Completed
            </span>
          </div>

          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>

          {/* Habit Check-In Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {activeHabits.map(habit => {
              const isDone = todayCompletedHabitIds.has(habit.id);
              const completedDates = new Set(
                habitLogs.filter(l => l.habitId === habit.id && l.completed).map(l => l.date)
              );
              const { currentStreak } = calculateHabitStreaks(completedDates);

              return (
                <div
                  key={habit.id}
                  onClick={() => handleToggleHabit(habit.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 shadow-md shadow-emerald-500/5'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isDone
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'border border-slate-700 bg-slate-900 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>

                    <div className="truncate">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isDone ? 'line-through text-slate-400' : 'text-white'
                        }`}
                      >
                        {habit.name}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="capitalize">{habit.category}</span>
                        {habit.targetValue && (
                          <span>
                            • {habit.targetValue} {habit.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        currentStreak > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-600'
                      }`}
                    />
                    <span className="font-bold text-slate-300">{currentStreak}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
