import { db } from './index';
import type { Habit, HabitLog, Workout, PersonalRecord, AppSettings } from '../types';
import { formatISODate } from '../utils/date';
import { evaluateBadges } from '../utils/badges';
import { evaluateWorkoutPRs } from '../utils/pr';

export async function seedDemoData(force = false) {
  const existingSettings = await db.settings.toCollection().first();
  if (existingSettings?.hasSeededDemoData && !force) {
    return;
  }

  // Clear existing if forcing seed
  if (force) {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.workouts.clear();
    await db.personalRecords.clear();
    await db.badges.clear();
    await db.settings.clear();
  }

  const now = new Date();
  const habits: Habit[] = [
    {
      id: 'habit_strength',
      name: 'Compound Strength Training',
      description: 'Heavy barbell resistance training (Squat/Bench/Deadlift)',
      category: 'strength',
      frequency: 'custom',
      targetDaysPerWeek: 4,
      color: '#ef4444',
      icon: 'Dumbbell',
      createdAt: new Date(now.getTime() - 90 * 86400000).toISOString()
    },
    {
      id: 'habit_cardio',
      name: 'Zone-2 Aerobic Base',
      description: 'Low-intensity steady state running or cycling 45 mins',
      category: 'cardio',
      frequency: 'custom',
      targetDaysPerWeek: 3,
      color: '#06b6d4',
      icon: 'Activity',
      createdAt: new Date(now.getTime() - 90 * 86400000).toISOString()
    },
    {
      id: 'habit_sleep',
      name: '8 Hours Deep Sleep',
      description: 'In bed by 10:30 PM with sleep tracking optimization',
      category: 'sleep',
      frequency: 'daily',
      targetDaysPerWeek: 7,
      color: '#8b5cf6',
      icon: 'Moon',
      targetValue: 8,
      unit: 'hrs',
      createdAt: new Date(now.getTime() - 90 * 86400000).toISOString()
    },
    {
      id: 'habit_protein',
      name: '180g Protein Intake',
      description: 'Hit clean macros with lean protein and micronutrients',
      category: 'nutrition',
      frequency: 'daily',
      targetDaysPerWeek: 7,
      color: '#10b981',
      icon: 'Salad',
      targetValue: 180,
      unit: 'g',
      createdAt: new Date(now.getTime() - 90 * 86400000).toISOString()
    },
    {
      id: 'habit_mobility',
      name: 'Hip & Thoracic Mobility',
      description: '15 min joint CARs, banded stretching, and core stability',
      category: 'mobility',
      frequency: 'custom',
      targetDaysPerWeek: 5,
      color: '#f59e0b',
      icon: 'Compass',
      createdAt: new Date(now.getTime() - 90 * 86400000).toISOString()
    },
    {
      id: 'habit_meditation',
      name: 'Breathwork & Mindfulness',
      description: '10 min box breathing and mental reset before work',
      category: 'mindset',
      frequency: 'daily',
      targetDaysPerWeek: 7,
      color: '#ec4899',
      icon: 'Sparkles',
      targetValue: 10,
      unit: 'mins',
      createdAt: new Date(now.getTime() - 90 * 86400000).toISOString()
    }
  ];

  await db.habits.bulkAdd(habits);

  // Generate 90 days of habit logs
  const habitLogs: HabitLog[] = [];
  for (let i = 89; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000);
    const dateStr = formatISODate(day);
    const dayOfWeek = day.getDay(); // 0 is Sun, 6 is Sat

    for (const habit of habits) {
      let completed = false;
      let val = undefined;

      // Realistic probability patterns
      if (habit.id === 'habit_strength') {
        completed = [1, 2, 4, 5].includes(dayOfWeek) && Math.random() > 0.15;
      } else if (habit.id === 'habit_cardio') {
        completed = [0, 3, 6].includes(dayOfWeek) && Math.random() > 0.2;
      } else if (habit.id === 'habit_sleep') {
        // High consistency recent 30 days
        const prob = i < 30 ? 0.88 : 0.72;
        completed = Math.random() < prob;
        if (completed) val = 7.5 + Math.round(Math.random() * 15) / 10;
      } else if (habit.id === 'habit_protein') {
        const prob = i < 20 ? 0.92 : 0.8;
        completed = Math.random() < prob;
        if (completed) val = 175 + Math.floor(Math.random() * 25);
      } else if (habit.id === 'habit_mobility') {
        completed = dayOfWeek !== 0 && Math.random() > 0.25;
      } else if (habit.id === 'habit_meditation') {
        completed = Math.random() > 0.28;
      }

      if (completed) {
        habitLogs.push({
          id: `log_${habit.id}_${dateStr}`,
          habitId: habit.id,
          date: dateStr,
          completed: true,
          value: val,
          timestamp: day.getTime()
        });
      }
    }
  }

  await db.habitLogs.bulkAdd(habitLogs);

  // Generate 36 realistic progressive strength workouts over 90 days
  const workouts: Workout[] = [];
  let allPRs: PersonalRecord[] = [];

  const workoutTemplates = [
    {
      title: 'Legs - Squat Hypertrophy & Strength',
      category: 'strength' as const,
      exercises: [
        { name: 'Barbell Back Squat', baseWeight: 100, incPerWeek: 1.0, reps: 5, sets: 4 },
        { name: 'Romanian Deadlift', baseWeight: 80, incPerWeek: 0.8, reps: 8, sets: 3 },
        { name: 'Leg Press', baseWeight: 160, incPerWeek: 1.5, reps: 10, sets: 3 }
      ]
    },
    {
      title: 'Push - Heavy Bench & Overhead Press',
      category: 'strength' as const,
      exercises: [
        { name: 'Barbell Bench Press', baseWeight: 75, incPerWeek: 0.8, reps: 5, sets: 4 },
        { name: 'Overhead Press', baseWeight: 45, incPerWeek: 0.5, reps: 6, sets: 3 },
        { name: 'Incline Dumbbell Press', baseWeight: 28, incPerWeek: 0.3, reps: 10, sets: 3 }
      ]
    },
    {
      title: 'Pull - Deadlift & Heavy Back',
      category: 'strength' as const,
      exercises: [
        { name: 'Conventional Deadlift', baseWeight: 130, incPerWeek: 1.2, reps: 4, sets: 3 },
        { name: 'Barbell Bent Over Row', baseWeight: 65, incPerWeek: 0.6, reps: 8, sets: 4 },
        { name: 'Weighted Pull-Up', baseWeight: 10, incPerWeek: 0.3, reps: 6, sets: 3 }
      ]
    },
    {
      title: 'Aerobic Threshold & Core',
      category: 'cardio' as const,
      exercises: [
        { name: 'Zone 2 Ergometer Row', baseWeight: 0, incPerWeek: 0, reps: 30, sets: 1 }
      ]
    }
  ];

  // Distribute workouts over 12 weeks (~3 per week)
  let workoutCount = 0;
  for (let w = 12; w >= 0; w--) {
    for (let d = 0; d < 3; d++) {
      const daysAgo = w * 7 + (d === 0 ? 5 : d === 1 ? 3 : 1);
      if (daysAgo < 0 || daysAgo > 89) continue;

      const dateObj = new Date(now.getTime() - daysAgo * 86400000);
      const dateStr = formatISODate(dateObj);
      const template = workoutTemplates[workoutCount % workoutTemplates.length];
      workoutCount++;

      const weekProgressionFactor = (12 - w);

      const exercises = template.exercises.map((ex, exIdx) => {
        const addedWeight = Math.round(ex.incPerWeek * weekProgressionFactor);
        const currentWeight = ex.baseWeight + addedWeight;
        
        return {
          id: `w_ex_${workoutCount}_${exIdx}`,
          exerciseName: ex.name,
          category: template.category === 'cardio' ? ('cardio' as const) : ('strength' as const),
          sets: Array.from({ length: ex.sets }, (_, sIdx) => {
            // slight rep/weight variation
            const weightVariance = sIdx === 0 && ex.baseWeight > 0 ? -5 : 0;
            return {
              setNumber: sIdx + 1,
              reps: ex.reps,
              weightKg: Math.max(0, currentWeight + weightVariance),
              rpe: 7.5 + (sIdx * 0.5),
              completed: true
            };
          })
        };
      });

      let totalVolume = 0;
      for (const ex of exercises) {
        for (const s of ex.sets) {
          totalVolume += s.weightKg * s.reps;
        }
      }

      const workout: Workout = {
        id: `workout_${workoutCount}_${dateStr}`,
        date: dateStr,
        title: template.title,
        category: template.category,
        durationMinutes: 50 + Math.floor(Math.random() * 25),
        totalVolumeKg: Math.round(totalVolume),
        rpe: 8,
        notes: `Focus on eccentric control and bar path. Week ${weekProgressionFactor + 1} block.`,
        exercises,
        createdAt: dateObj.toISOString()
      };

      workouts.push(workout);

      // Evaluate PRs in chronological order
      const prScan = evaluateWorkoutPRs(workout, allPRs);
      if (prScan.newPRs.length > 0) {
        allPRs.push(...prScan.newPRs);
      }
    }
  }

  await db.workouts.bulkAdd(workouts);
  if (allPRs.length > 0) {
    await db.personalRecords.bulkAdd(allPRs);
  }

  // Initial Badges evaluation
  const { updatedBadges } = evaluateBadges([], habits, habitLogs, workouts, allPRs);
  await db.badges.bulkAdd(updatedBadges);

  // Settings
  const settings: AppSettings = {
    id: 'default_settings',
    theme: 'dark',
    weightUnit: 'kg',
    hasSeededDemoData: true,
    userName: 'Krish',
    weeklyWorkoutGoal: 4,
    dailyHabitGoal: 5
  };
  await db.settings.put(settings);
}
