import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot
} from 'recharts';
import type { Workout, PersonalRecord } from '../../types';
import { calculateEstimated1RM } from '../../utils/pr';
import { formatHumanDate } from '../../utils/date';
import { Award, TrendingUp, Sparkles, Dumbbell } from 'lucide-react';

interface PRProgressionChartProps {
  workouts: Workout[];
  personalRecords: PersonalRecord[];
}

export const PRProgressionChart: React.FC<PRProgressionChartProps> = ({
  workouts,
  personalRecords
}) => {
  // Extract all distinct exercise names from workouts and PRs
  const availableExercises = useMemo(() => {
    const set = new Set<string>();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (ex.exerciseName) set.add(ex.exerciseName);
      }
    }
    for (const pr of personalRecords) {
      if (pr.exerciseName) set.add(pr.exerciseName);
    }
    return Array.from(set).sort();
  }, [workouts, personalRecords]);

  const [selectedExercise, setSelectedExercise] = useState<string>(
    availableExercises.includes('Barbell Back Squat')
      ? 'Barbell Back Squat'
      : availableExercises[0] || 'Barbell Bench Press'
  );

  const [metricMode, setMetricMode] = useState<'1RM' | 'MAX_WEIGHT' | 'VOLUME'>('1RM');

  // Compute time series progression for selected exercise
  const { chartData, prDots, allTimeBest, firstRecorded, totalGainPct } = useMemo(() => {
    if (!selectedExercise) {
      return { chartData: [], prDots: [], allTimeBest: 0, firstRecorded: 0, totalGainPct: 0 };
    }

    // Filter workouts containing this exercise, sorted chronologically
    const exerciseSessions: {
      date: string;
      workoutId: string;
      est1RM: number;
      maxWeight: number;
      volume: number;
      repsAtMax: number;
    }[] = [];

    const sortedWorkouts = [...workouts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const w of sortedWorkouts) {
      const match = w.exercises.find(
        e => e.exerciseName.trim().toLowerCase() === selectedExercise.trim().toLowerCase()
      );
      if (!match) continue;

      let maxW = 0;
      let max1RM = 0;
      let vol = 0;
      let repsAtMax = 0;

      for (const s of match.sets) {
        if (!s.completed) continue;
        const wKg = s.weightKg || 0;
        const r = s.reps || 0;
        vol += wKg * r;

        if (wKg > maxW) {
          maxW = wKg;
          repsAtMax = r;
        }

        const est = calculateEstimated1RM(wKg, r);
        if (est > max1RM) {
          max1RM = est;
        }
      }

      if (maxW > 0 || max1RM > 0) {
        exerciseSessions.push({
          date: w.date,
          workoutId: w.id,
          est1RM: Math.round(max1RM * 10) / 10,
          maxWeight: Math.round(maxW * 10) / 10,
          volume: Math.round(vol * 10) / 10,
          repsAtMax
        });
      }
    }

    // Identify cumulative PR breakthroughs
    let currentBest = 0;
    const dots: { date: string; value: number; label: string }[] = [];

    const mapped = exerciseSessions.map(session => {
      let value = session.est1RM;
      if (metricMode === 'MAX_WEIGHT') value = session.maxWeight;
      if (metricMode === 'VOLUME') value = session.volume;

      const isNewPR = value > currentBest;
      if (isNewPR) {
        currentBest = value;
        dots.push({
          date: session.date,
          value,
          label: `PR: ${value}kg`
        });
      }

      return {
        date: session.date,
        value,
        est1RM: session.est1RM,
        maxWeight: session.maxWeight,
        volume: session.volume,
        isPR: isNewPR
      };
    });

    const first = mapped.length > 0 ? mapped[0].value : 0;
    const best = currentBest;
    const gainPct = first > 0 ? Math.round(((best - first) / first) * 100) : 0;

    return {
      chartData: mapped,
      prDots: dots,
      allTimeBest: best,
      firstRecorded: first,
      totalGainPct: gainPct
    };
  }, [workouts, selectedExercise, metricMode]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Personal Record (PR) Progression
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track strength milestones, 1RM estimations (Epley), and volume load over time
          </p>
        </div>

        {/* Exercise & Mode Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {availableExercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>

          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setMetricMode('1RM')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                metricMode === '1RM'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Est. 1RM
            </button>
            <button
              onClick={() => setMetricMode('MAX_WEIGHT')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                metricMode === 'MAX_WEIGHT'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Max Weight
            </button>
            <button
              onClick={() => setMetricMode('VOLUME')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                metricMode === 'VOLUME'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Session Volume
            </button>
          </div>
        </div>
      </div>

      {/* Metric Stat Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            All-Time Record
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {allTimeBest} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
            Initial Baseline
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
            {firstRecorded} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Net Strength Gain
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            +{totalGainPct}%
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">Logged Sessions</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {chartData.length}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(d) => formatHumanDate(d).split(',')[0]}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v) => `${v}kg`}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px'
                }}
                labelFormatter={(d) => formatHumanDate(d as string)}
                formatter={(val: any) => [`${val} kg`, metricMode === '1RM' ? 'Est. 1RM' : metricMode === 'MAX_WEIGHT' ? 'Max Weight' : 'Volume']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981' }}
                activeDot={{ r: 6, fill: '#34d399', stroke: '#064e3b', strokeWidth: 2 }}
              />
              {prDots.map((pr, idx) => (
                <ReferenceDot
                  key={idx}
                  x={pr.date}
                  y={pr.value}
                  r={5}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No session data recorded for this exercise yet.
          </div>
        )}
      </div>

      {/* PR Milestones Footnote */}
      <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-400">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white inline-block" />
        <span>Gold dots denote record-breaking Personal Record (PR) breakthrough sessions.</span>
      </div>
    </div>
  );
};
