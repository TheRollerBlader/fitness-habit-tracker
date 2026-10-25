import React, { useMemo, useState } from 'react';
import type { Habit, HabitLog } from '../../types';
import { calculateHabitStreaks, formatHumanDate, formatISODate } from '../../utils/date';
import * as d3 from 'd3';
import { Flame, Trophy, CheckCircle2, Calendar } from 'lucide-react';

interface HabitHeatmapProps {
  habits: Habit[];
  habitLogs: HabitLog[];
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ habits, habitLogs }) => {
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    completed: number;
    total: number;
    details: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    date: '',
    completed: 0,
    total: 0,
    details: ''
  });

  // Calculate 52 weeks (364 days) grid ending today
  const { weeksData, stats } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter logs based on selection
    const relevantLogs = selectedHabitId === 'all'
      ? habitLogs.filter(l => l.completed)
      : habitLogs.filter(l => l.habitId === selectedHabitId && l.completed);

    // Map: date -> count of completed habits
    const dateCountMap = new Map<string, number>();
    const completedDatesSet = new Set<string>();

    for (const log of relevantLogs) {
      completedDatesSet.add(log.date);
      dateCountMap.set(log.date, (dateCountMap.get(log.date) || 0) + 1);
    }

    const { currentStreak, longestStreak, totalCompletions } = calculateHabitStreaks(completedDatesSet);

    // Calculate grid for 52 weeks (364 days)
    // Align to the ending Saturday/Sunday of the current week
    const dayOfWeek = today.getDay(); // 0 is Sun
    const totalDays = 52 * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (totalDays - 1 - (6 - dayOfWeek)));

    const weeks: {
      weekIndex: number;
      days: {
        dateStr: string;
        date: Date;
        dayOfWeek: number;
        completedCount: number;
        maxCount: number;
        intensity: number; // 0 to 1
      }[];
    }[] = [];

    let currentWeek: typeof weeks[0]['days'] = [];
    const runner = new Date(startDate);
    const maxHabitsCount = selectedHabitId === 'all' ? Math.max(1, habits.length) : 1;

    for (let i = 0; i < totalDays; i++) {
      const dStr = formatISODate(runner);
      const isFuture = runner > today;
      const count = isFuture ? 0 : (dateCountMap.get(dStr) || 0);
      const intensity = count === 0 ? 0 : Math.min(1, count / (selectedHabitId === 'all' ? Math.min(4, maxHabitsCount) : 1));

      currentWeek.push({
        dateStr: dStr,
        date: new Date(runner),
        dayOfWeek: runner.getDay(),
        completedCount: count,
        maxCount: maxHabitsCount,
        intensity
      });

      if (currentWeek.length === 7) {
        weeks.push({
          weekIndex: weeks.length,
          days: currentWeek
        });
        currentWeek = [];
      }

      runner.setDate(runner.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push({
        weekIndex: weeks.length,
        days: currentWeek
      });
    }

    // Rate calculation over past 365 days
    const activeHabitsCount = selectedHabitId === 'all' ? habits.length : 1;
    const possibleOpportunities = 365 * activeHabitsCount;
    const completionRate = possibleOpportunities > 0
      ? Math.round((totalCompletions / (selectedHabitId === 'all' ? (365 * 3) : 365)) * 100)
      : 0;

    return {
      weeksData: weeks,
      stats: {
        currentStreak,
        longestStreak,
        totalCompletions,
        completionRate: Math.min(100, completionRate)
      }
    };
  }, [habits, habitLogs, selectedHabitId]);

  // D3 Color interpolator
  const colorScale = useMemo(() => {
    return d3.scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateRgbBasis(['#1e293b', '#065f46', '#059669', '#10b981', '#34d399']));
  }, []);

  const cellSize = 13;
  const cellGap = 3;
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { text: string; x: number }[] = [];
    let lastMonth = -1;

    weeksData.forEach((w, wIdx) => {
      const firstDay = w.days[0];
      if (firstDay) {
        const month = firstDay.date.getMonth();
        if (month !== lastMonth && w.days[0].date.getDate() <= 7) {
          labels.push({
            text: firstDay.date.toLocaleString('en-US', { month: 'short' }),
            x: wIdx * (cellSize + cellGap)
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeksData]);

  const activeHabit = habits.find(h => h.id === selectedHabitId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Habit Consistency Heatmap
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            52-week activity distribution and streak rhythm
          </p>
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="habit-select" className="text-xs font-medium text-slate-400">
            View:
          </label>
          <select
            id="habit-select"
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">⚡ All Habits (Aggregate Activity)</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Streak / Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats.currentStreak} <span className="text-xs font-normal text-slate-400">days</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Current Streak</div>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats.longestStreak} <span className="text-xs font-normal text-slate-400">days</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Best Longest Streak</div>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats.totalCompletions}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Total Check-ins</div>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats.completionRate}%
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Consistency Score</div>
          </div>
        </div>
      </div>

      {/* SVG Heatmap Container */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[850px] inline-block">
          {/* Month labels */}
          <div className="flex pl-8 mb-1 relative h-4 text-[10px] text-slate-400 font-mono">
            {monthLabels.map((m, idx) => (
              <span
                key={idx}
                className="absolute transform -translate-x-1"
                style={{ left: `${m.x + 36}px` }}
              >
                {m.text}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Day of week labels */}
            <div className="flex flex-col justify-between pr-2 text-[9px] text-slate-500 font-mono pt-1 h-[112px]">
              {dayLabels.map((label, idx) => (
                <span key={idx} className={idx % 2 === 1 ? 'opacity-100' : 'opacity-0'}>
                  {label}
                </span>
              ))}
            </div>

            {/* D3 Cells Grid */}
            <svg
              width={weeksData.length * (cellSize + cellGap)}
              height={7 * (cellSize + cellGap)}
              className="overflow-visible"
            >
              {weeksData.map((week) => (
                <g
                  key={week.weekIndex}
                  transform={`translate(${week.weekIndex * (cellSize + cellGap)}, 0)`}
                >
                  {week.days.map((day) => {
                    const isToday = day.dateStr === formatISODate(new Date());
                    const fill =
                      day.intensity === 0
                        ? '#1e293b' // dark slate
                        : activeHabit?.color && selectedHabitId !== 'all'
                        ? activeHabit.color
                        : colorScale(day.intensity);

                    return (
                      <rect
                        key={day.dateStr}
                        x={0}
                        y={day.dayOfWeek * (cellSize + cellGap)}
                        width={cellSize}
                        height={cellSize}
                        rx={2.5}
                        fill={fill}
                        opacity={day.intensity === 0 ? 0.6 : 1}
                        stroke={isToday ? '#38bdf8' : 'none'}
                        strokeWidth={isToday ? 1.5 : 0}
                        className="heatmap-cell cursor-pointer transition-all duration-150"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            visible: true,
                            x: rect.left + window.scrollX + cellSize / 2,
                            y: rect.top + window.scrollY - 10,
                            date: day.dateStr,
                            completed: day.completedCount,
                            total: day.maxCount,
                            details:
                              selectedHabitId === 'all'
                                ? `${day.completedCount} habits completed`
                                : day.completedCount > 0
                                ? 'Completed ✓'
                                : 'Not logged'
                          });
                        }}
                        onMouseLeave={() => {
                          setTooltip(prev => ({ ...prev, visible: false }));
                        }}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-4 mt-2 border-t border-slate-800/80">
            <span className="font-mono text-xs text-slate-500">
              Showing trailing 364 days
            </span>
            <div className="flex items-center gap-2">
              <span>Less</span>
              <div className="flex gap-1 items-center">
                <span className="w-3 h-3 rounded-sm bg-slate-800" />
                <span className="w-3 h-3 rounded-sm bg-emerald-950" />
                <span className="w-3 h-3 rounded-sm bg-emerald-700" />
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="w-3 h-3 rounded-sm bg-emerald-400" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-1.5 bg-slate-950 text-white border border-slate-700 rounded-lg shadow-2xl text-xs whitespace-nowrap"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div className="font-semibold text-emerald-400">{formatHumanDate(tooltip.date)}</div>
          <div className="text-slate-300 text-[11px] mt-0.5">{tooltip.details}</div>
        </div>
      )}
    </div>
  );
};
