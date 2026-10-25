import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import type { HabitLog, Workout } from '../../types';
import { calculateLinearRegressionForecast, type DataPoint } from '../../utils/regression';
import { formatHumanDate, formatISODate } from '../../utils/date';
import { calculateEstimated1RM } from '../../utils/pr';
import { BrainCircuit, ArrowUpRight, ArrowDownRight, Minus, Sparkles, Sigma } from 'lucide-react';

interface TrendForecasterProps {
  habitLogs: HabitLog[];
  workouts: Workout[];
}

export const TrendForecaster: React.FC<TrendForecasterProps> = ({ habitLogs, workouts }) => {
  const [targetMetric, setTargetMetric] = useState<'habits' | 'volume' | 'squat' | 'bench'>('volume');
  const [forecastHorizon, setForecastHorizon] = useState<number>(14);

  // Prepare time series data points based on selection
  const rawDataPoints = useMemo<DataPoint[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetMetric === 'habits') {
      // Trailing 60 days of daily habit completion percentage
      const points: DataPoint[] = [];
      const dayMap = new Map<string, number>();

      for (const log of habitLogs) {
        if (log.completed) {
          dayMap.set(log.date, (dayMap.get(log.date) || 0) + 1);
        }
      }

      for (let i = 45; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dStr = formatISODate(d);
        const count = dayMap.get(dStr) || 0;
        // Percentage relative to daily target of 5 habits
        const pct = Math.min(100, Math.round((count / 5) * 100));
        points.push({ date: dStr, value: pct });
      }
      return points;
    }

    if (targetMetric === 'volume') {
      // Trailing 12 weeks of workout volume grouped by week
      const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return sorted.map(w => ({
        date: w.date,
        value: w.totalVolumeKg
      }));
    }

    if (targetMetric === 'squat' || targetMetric === 'bench') {
      const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const points: DataPoint[] = [];

      for (const w of sorted) {
        const match = w.exercises.find(e => e.exerciseName.toLowerCase().includes(targetMetric));
        if (match) {
          let max1RM = 0;
          for (const s of match.sets) {
            if (s.completed && s.weightKg > 0 && s.reps > 0) {
              const est = calculateEstimated1RM(s.weightKg, s.reps);
              if (est > max1RM) max1RM = est;
            }
          }
          if (max1RM > 0) {
            points.push({ date: w.date, value: max1RM });
          }
        }
      }
      return points;
    }

    return [];
  }, [habitLogs, workouts, targetMetric]);

  // Run OLS Regression model with confidence interval band
  const regressionResult = useMemo(() => {
    return calculateLinearRegressionForecast(rawDataPoints, forecastHorizon, true);
  }, [rawDataPoints, forecastHorizon]);

  const { metrics, points } = regressionResult;

  // Forecast end target value
  const finalForecastPoint = points[points.length - 1];
  const deltaFromLastActual = rawDataPoints.length > 0 && finalForecastPoint
    ? finalForecastPoint.predicted - rawDataPoints[rawDataPoints.length - 1].value
    : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Linear Regression Trend Forecaster
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ordinary Least Squares (OLS) trajectory with 95% Student's t Prediction Intervals
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={targetMetric}
            onChange={(e) => setTargetMetric(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="volume">Workout Volume (kg)</option>
            <option value="squat">Squat Estimated 1RM</option>
            <option value="bench">Bench Press Estimated 1RM</option>
            <option value="habits">Daily Habit Score (%)</option>
          </select>

          <select
            value={forecastHorizon}
            onChange={(e) => setForecastHorizon(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value={7}>+7 Days Horizon</option>
            <option value={14}>+14 Days Horizon</option>
            <option value={30}>+30 Days Horizon</option>
          </select>
        </div>
      </div>

      {/* Mathematical Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Sigma className="w-3.5 h-3.5 text-indigo-400" />
            OLS Model Equation
          </div>
          <div className="text-sm font-mono font-bold text-slate-200 mt-1 truncate">
            {metrics.formulaString}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">Fit Goodness (R²)</div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {(metrics.rSquared * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">Std Error (se)</div>
          <div className="text-2xl font-bold font-mono text-slate-200 mt-1">
            ±{metrics.standardError}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            {metrics.trendDirection === 'improving' ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : metrics.trendDirection === 'declining' ? (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            )}
            Projected Target
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {finalForecastPoint?.predicted || 0}{' '}
            <span className="text-xs text-slate-400 font-normal">
              ({deltaFromLastActual >= 0 ? '+' : ''}
              {Math.round(deltaFromLastActual * 10) / 10})
            </span>
          </div>
        </div>
      </div>

      {/* Regression & Prediction Band Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(d) => formatHumanDate(d).split(',')[0]}
            />
            <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px'
              }}
              labelFormatter={(d) => `${formatHumanDate(d as string)}`}
              formatter={(val: any, name: any) => {
                if (name === 'ciUpper') return [`${val}`, '95% Upper Bound'];
                if (name === 'ciLower') return [`${val}`, '95% Lower Bound'];
                if (name === 'actual') return [`${val}`, 'Actual Recorded'];
                if (name === 'predicted') return [`${val}`, 'OLS Regression Fit'];
                return [val, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            {/* 95% Confidence Interval Area */}
            <Area
              type="monotone"
              dataKey="ciUpper"
              stroke="none"
              fill="url(#ciGradient)"
              name="95% Confidence Band"
            />
            <Area
              type="monotone"
              dataKey="ciLower"
              stroke="none"
              fill="#0f172a"
              legendType="none"
            />

            {/* Historical Actuals */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#10b981' }}
              name="Historical Actual"
            />

            {/* OLS Regression & Projected Future */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              name="OLS Trend Projection"
            />

            {/* Split between historical and forecast */}
            {rawDataPoints.length > 0 && (
              <ReferenceLine
                x={rawDataPoints[rawDataPoints.length - 1].date}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{ value: 'Forecast Start', fill: '#94a3b8', fontSize: 10, position: 'top' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interpretation callout */}
      <div className="mt-4 p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-200 leading-relaxed">
          <strong>Statistical Insight:</strong> The empirical slope ($\beta_1 = {metrics.slope}$) shows an{' '}
          {metrics.trendDirection} velocity with $R^2 = {(metrics.rSquared * 100).toFixed(1)}\%$. Projected value at
          +{forecastHorizon} days is <strong>{finalForecastPoint?.predicted}</strong> within the 95% confidence interval
          [{finalForecastPoint?.ciLower}, {finalForecastPoint?.ciUpper}].
        </p>
      </div>
    </div>
  );
};
