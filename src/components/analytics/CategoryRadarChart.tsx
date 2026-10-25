import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts';
import type { Habit, HabitLog, Workout } from '../../types';
import { ShieldCheck, Dumbbell, Activity, Moon, Salad, Compass } from 'lucide-react';

interface CategoryRadarChartProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  workouts: Workout[];
}

export const CategoryRadarChart: React.FC<CategoryRadarChartProps> = ({
  habits,
  habitLogs,
  workouts
}) => {
  const radarData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 86400000);

    const recentLogs = habitLogs.filter(
      l => l.completed && new Date(l.date) >= thirtyDaysAgo
    );
    const prevLogs = habitLogs.filter(
      l => l.completed && new Date(l.date) >= sixtyDaysAgo && new Date(l.date) < thirtyDaysAgo
    );

    const recentWorkouts = workouts.filter(
      w => new Date(w.date) >= thirtyDaysAgo
    );
    const prevWorkouts = workouts.filter(
      w => new Date(w.date) >= sixtyDaysAgo && new Date(w.date) < thirtyDaysAgo
    );

    const categories = [
      { key: 'strength', label: 'Strength', icon: Dumbbell, targetDays: 16 },
      { key: 'cardio', label: 'Cardio', icon: Activity, targetDays: 12 },
      { key: 'sleep', label: 'Sleep', icon: Moon, targetDays: 25 },
      { key: 'nutrition', label: 'Nutrition', icon: Salad, targetDays: 25 },
      { key: 'mobility', label: 'Mobility', icon: Compass, targetDays: 18 }
    ];

    return categories.map(cat => {
      // Habit completions for this category
      const catHabitIds = new Set(habits.filter(h => h.category === cat.key).map(h => h.id));
      
      const currentCompletions = recentLogs.filter(l => catHabitIds.has(l.habitId)).length;
      const prevCompletions = prevLogs.filter(l => catHabitIds.has(l.habitId)).length;

      // Bonus from workouts if category matches
      const currentWorkoutBonus = recentWorkouts.filter(w => w.category === cat.key).length * 2;
      const prevWorkoutBonus = prevWorkouts.filter(w => w.category === cat.key).length * 2;

      const currentRaw = (currentCompletions + currentWorkoutBonus) / cat.targetDays;
      const prevRaw = (prevCompletions + prevWorkoutBonus) / cat.targetDays;

      const currentScore = Math.min(100, Math.round(currentRaw * 100));
      const prevScore = Math.min(100, Math.round(prevRaw * 100));

      return {
        category: cat.label,
        current: currentScore || 35,
        previous: prevScore || 25,
        target: 85,
        fullMark: 100
      };
    });
  }, [habits, habitLogs, workouts]);

  const overallBalance = useMemo(() => {
    const avg = radarData.reduce((acc, curr) => acc + curr.current, 0) / radarData.length;
    return Math.round(avg);
  }, [radarData]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Pillar Balance Radar
            </h3>
          </div>
          <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            Index: {overallBalance}%
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Holistic fitness score across Strength, Cardio, Sleep, Nutrition, and Mobility
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#334155" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 10 }}
              stroke="#1e293b"
            />
            <Radar
              name="Current (Last 30d)"
              dataKey="current"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Radar
              name="Previous 30d"
              dataKey="previous"
              stroke="#64748b"
              fill="#64748b"
              fillOpacity={0.2}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value: any) => [`${value}%`, 'Score']}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Mini category status list */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-slate-800">
        {radarData.map(item => (
          <div key={item.category} className="bg-slate-950/60 p-2 rounded-lg text-center">
            <div className="text-[10px] text-slate-400 font-medium truncate">{item.category}</div>
            <div className="text-sm font-bold font-mono text-cyan-400 mt-0.5">{item.current}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};
