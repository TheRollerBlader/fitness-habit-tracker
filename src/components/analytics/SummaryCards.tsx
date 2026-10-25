import React, { useMemo } from 'react';
import type { Habit, HabitLog, Workout, PersonalRecord, AppSettings } from '../../types';
import { CheckCircle, Dumbbell, TrendingUp, Clock, Award } from 'lucide-react';

interface SummaryCardsProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  workouts: Workout[];
  personalRecords: PersonalRecord[];
  settings?: AppSettings;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  habits,
  habitLogs,
  workouts,
  personalRecords,
  settings
}) => {
  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 86400000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

    // 1. Weekly Habit Completion
    const currentWeekLogs = habitLogs.filter(
      l => l.completed && new Date(l.date) >= sevenDaysAgo
    );
    const prevWeekLogs = habitLogs.filter(
      l => l.completed && new Date(l.date) >= fourteenDaysAgo && new Date(l.date) < sevenDaysAgo
    );

    const habitTargetPerWeek = habits.length * 7;
    const currentHabitRate = habitTargetPerWeek > 0
      ? Math.min(100, Math.round((currentWeekLogs.length / habitTargetPerWeek) * 100))
      : 0;
    const prevHabitRate = habitTargetPerWeek > 0
      ? Math.min(100, Math.round((prevWeekLogs.length / habitTargetPerWeek) * 100))
      : 0;
    const habitRateDelta = currentHabitRate - prevHabitRate;

    // 2. Workouts This Week vs Goal
    const currentWeekWorkouts = workouts.filter(
      w => new Date(w.date) >= sevenDaysAgo
    );
    const workoutGoal = settings?.weeklyWorkoutGoal || 4;

    // 3. Weekly & Monthly Volume
    const currentWeekVolume = currentWeekWorkouts.reduce(
      (sum, w) => sum + (w.totalVolumeKg || 0),
      0
    );
    const prevWeekWorkouts = workouts.filter(
      w => new Date(w.date) >= fourteenDaysAgo && new Date(w.date) < sevenDaysAgo
    );
    const prevWeekVolume = prevWeekWorkouts.reduce(
      (sum, w) => sum + (w.totalVolumeKg || 0),
      0
    );
    const volumeDeltaPct = prevWeekVolume > 0
      ? Math.round(((currentWeekVolume - prevWeekVolume) / prevWeekVolume) * 100)
      : 0;

    const monthlyVolume = workouts
      .filter(w => new Date(w.date) >= thirtyDaysAgo)
      .reduce((sum, w) => sum + (w.totalVolumeKg || 0), 0);

    // 4. Monthly Cardio Minutes
    const monthlyCardioMins = workouts
      .filter(w => new Date(w.date) >= thirtyDaysAgo && (w.category === 'cardio' || w.category === 'hiit'))
      .reduce((sum, w) => sum + (w.durationMinutes || 0), 0);

    // 5. Monthly PRs
    const monthlyPRs = personalRecords.filter(
      pr => new Date(pr.date) >= thirtyDaysAgo
    ).length;

    return {
      currentHabitRate,
      habitRateDelta,
      currentWeekWorkoutsCount: currentWeekWorkouts.length,
      workoutGoal,
      currentWeekVolume: Math.round(currentWeekVolume),
      volumeDeltaPct,
      monthlyVolume: Math.round(monthlyVolume),
      monthlyCardioMins,
      monthlyPRs
    };
  }, [habits, habitLogs, workouts, personalRecords, settings]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Habit Completion Rate */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Weekly Habit Rate
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-extrabold font-mono text-white">
            {summary.currentHabitRate}%
          </span>
          <span
            className={`text-xs font-semibold ${
              summary.habitRateDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summary.habitRateDelta >= 0 ? '+' : ''}
            {summary.habitRateDelta}% vs lw
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${summary.currentHabitRate}%` }}
          />
        </div>
      </div>

      {/* 2. Workout Sessions Goal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workouts Logged
          </span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Dumbbell className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-extrabold font-mono text-white">
            {summary.currentWeekWorkoutsCount}
          </span>
          <span className="text-xs font-medium text-slate-400">
            / {summary.workoutGoal} target sessions
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-cyan-500 h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(
                100,
                (summary.currentWeekWorkoutsCount / summary.workoutGoal) * 100
              )}%`
            }}
          />
        </div>
      </div>

      {/* 3. Weekly Volume & Monthly Tonnage */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Weekly Volume
          </span>
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-extrabold font-mono text-white">
            {(summary.currentWeekVolume / 1000).toFixed(1)}k
          </span>
          <span className="text-xs text-slate-400 font-medium">kg moved</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
          <span>Monthly: {(summary.monthlyVolume / 1000).toFixed(1)}t</span>
          <span
            className={
              summary.volumeDeltaPct >= 0 ? 'text-violet-400' : 'text-slate-500'
            }
          >
            {summary.volumeDeltaPct >= 0 ? '+' : ''}
            {summary.volumeDeltaPct}%
          </span>
        </div>
      </div>

      {/* 4. PRs & Endurance */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            30-Day PRs & Cardio
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-extrabold font-mono text-amber-400">
            {summary.monthlyPRs}
          </span>
          <span className="text-xs text-slate-400 font-medium">PR breakthroughs</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{summary.monthlyCardioMins} cardio aerobic mins</span>
        </div>
      </div>
    </div>
  );
};
