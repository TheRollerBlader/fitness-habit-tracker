import React, { useState } from 'react';
import type { Habit, HabitLog } from '../../types';
import { db } from '../../db';
import { HabitModal } from './HabitModal';
import { calculateHabitStreaks, getTodayDateString } from '../../utils/date';
import { Plus, Flame, Check, Edit2, Trash2, Calendar, Target } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HabitManagerProps {
  habits: Habit[];
  habitLogs: HabitLog[];
}

export const HabitManager: React.FC<HabitManagerProps> = ({ habits, habitLogs }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const todayStr = getTodayDateString();

  // Map of completed habits for today
  const todayCompletedHabitIds = new Set(
    habitLogs.filter(l => l.date === todayStr && l.completed).map(l => l.habitId)
  );

  const filteredHabits = habits.filter(
    h => !h.archived && (categoryFilter === 'all' || h.category === categoryFilter)
  );

  const handleToggleToday = async (habitId: string) => {
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

      // Confetti burst on completion!
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  const handleSaveHabit = async (habit: Habit) => {
    await db.habits.put(habit);
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (window.confirm('Are you sure you want to delete this habit and all its logged history?')) {
      await db.transaction('rw', [db.habits, db.habitLogs], async () => {
        await db.habits.delete(habitId);
        await db.habitLogs.where('habitId').equals(habitId).delete();
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Habit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Habit Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Build discipline through daily check-ins, custom frequencies, and streak momentum
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'strength', 'cardio', 'sleep', 'nutrition', 'mobility'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  categoryFilter === cat
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingHabit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Habit
          </button>
        </div>
      </div>

      {/* Habit Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHabits.map(habit => {
          const isCompletedToday = todayCompletedHabitIds.has(habit.id);
          const completedDates = new Set(
            habitLogs.filter(l => l.habitId === habit.id && l.completed).map(l => l.date)
          );
          const { currentStreak, longestStreak } = calculateHabitStreaks(completedDates);

          return (
            <div
              key={habit.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden"
            >
              {/* Category indicator line */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: habit.color || '#10b981' }}
              />

              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${habit.color}15`,
                          color: habit.color || '#10b981'
                        }}
                      >
                        {habit.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {habit.frequency === 'daily'
                          ? 'Daily'
                          : habit.frequency === 'weekdays'
                          ? 'Weekdays'
                          : `${habit.targetDaysPerWeek}x/wk`}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-2 leading-snug">
                      {habit.name}
                    </h3>
                    {habit.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {habit.description}
                      </p>
                    )}
                  </div>

                  {/* Today check-in button */}
                  <button
                    onClick={() => handleToggleToday(habit.id)}
                    className={`p-3 rounded-2xl border transition-all duration-200 shrink-0 ${
                      isCompletedToday
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white hover:border-slate-600'
                    }`}
                    title={isCompletedToday ? 'Completed today! Click to undo' : 'Mark complete for today'}
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                {habit.targetValue && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <Target className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {habit.targetValue} {habit.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Streaks & Footer Actions */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <Flame
                      className={`w-4 h-4 ${
                        currentStreak > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-600'
                      }`}
                    />
                    <span className="font-mono font-bold text-white">{currentStreak}</span>
                    <span className="text-[10px] text-slate-400">streak</span>
                  </div>

                  <span className="text-slate-700">|</span>

                  <div className="text-[10px] text-slate-400">
                    Best: <span className="font-mono text-slate-300 font-semibold">{longestStreak}d</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingHabit(habit);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Edit habit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Delete habit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredHabits.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-base font-bold text-white">No habits found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create your first habit or adjust filters to start building streaks and momentum.
          </p>
        </div>
      )}

      {/* Habit Modal */}
      <HabitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveHabit}
        editingHabit={editingHabit}
      />
    </div>
  );
};
