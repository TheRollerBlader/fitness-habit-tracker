import type { AchievementBadge, Habit, HabitLog, Workout, PersonalRecord } from '../types';
import { calculateHabitStreaks } from './date';

export const INITIAL_BADGES: Omit<AchievementBadge, 'progress' | 'currentValue'>[] = [
  // Streaks
  {
    id: 'badge_spark',
    code: 'IGNITION_SPARK',
    title: 'Ignition Spark',
    description: 'Complete your first habit check-in.',
    category: 'streak',
    tier: 'bronze',
    icon: 'Zap',
    targetValue: 1
  },
  {
    id: 'badge_streak_7',
    code: 'WARRIOR_7',
    title: '7-Day Momentum',
    description: 'Maintain a 7-day completion streak on any habit.',
    category: 'streak',
    tier: 'bronze',
    icon: 'Flame',
    targetValue: 7
  },
  {
    id: 'badge_streak_21',
    code: 'HABIT_FORMER_21',
    title: 'Habit Former',
    description: 'Achieve a 21-day continuous streak.',
    category: 'streak',
    tier: 'silver',
    icon: 'Sparkles',
    targetValue: 21
  },
  {
    id: 'badge_streak_60',
    code: 'UNSTOPPABLE_60',
    title: 'Iron Discipline',
    description: 'Crush a 60-day unbroken habit streak.',
    category: 'streak',
    tier: 'gold',
    icon: 'Crown',
    targetValue: 60
  },
  {
    id: 'badge_streak_100',
    code: 'CENTURION_100',
    title: 'Centurion',
    description: 'Reach a legendary 100-day streak.',
    category: 'streak',
    tier: 'platinum',
    icon: 'ShieldAlert',
    targetValue: 100
  },

  // Workouts & Volume
  {
    id: 'badge_workout_1',
    code: 'IRON_INITIATE',
    title: 'Iron Initiate',
    description: 'Log your very first workout session.',
    category: 'milestone',
    tier: 'bronze',
    icon: 'Dumbbell',
    targetValue: 1
  },
  {
    id: 'badge_workout_25',
    code: 'GYM_REGULAR',
    title: 'Consistency King',
    description: 'Complete 25 logged workout sessions.',
    category: 'milestone',
    tier: 'silver',
    icon: 'Award',
    targetValue: 25
  },
  {
    id: 'badge_workout_100',
    code: 'CENTURY_LIFTER',
    title: 'Century Lifter',
    description: 'Complete 100 logged workout sessions.',
    category: 'milestone',
    tier: 'platinum',
    icon: 'Trophy',
    targetValue: 100
  },
  {
    id: 'badge_vol_10k',
    code: 'TON_CLUB_10K',
    title: '10-Ton Club',
    description: 'Accumulate 10,000 kg total volume moved.',
    category: 'workout_volume',
    tier: 'silver',
    icon: 'Layers',
    targetValue: 10000
  },
  {
    id: 'badge_vol_100k',
    code: 'ATLAS_TITAN_100K',
    title: 'Atlas Titan',
    description: 'Surpass 100,000 kg total cumulative workout volume.',
    category: 'workout_volume',
    tier: 'gold',
    icon: 'Mountain',
    targetValue: 100000
  },
  {
    id: 'badge_vol_1m',
    code: 'MEGATON_LEGEND',
    title: 'Megaton Legend',
    description: 'Move 1,000,000 kg total cumulative weight.',
    category: 'workout_volume',
    tier: 'platinum',
    icon: 'Gem',
    targetValue: 1000000
  },

  // Records & Balance
  {
    id: 'badge_pr_5',
    code: 'PR_CRUSHER',
    title: 'PR Crusher',
    description: 'Set 5 personal records across your lifting journey.',
    category: 'consistency',
    tier: 'bronze',
    icon: 'TrendingUp',
    targetValue: 5
  },
  {
    id: 'badge_pr_20',
    code: 'PEAK_PERFORMER',
    title: 'Peak Performer',
    description: 'Set 20 personal records.',
    category: 'consistency',
    tier: 'gold',
    icon: 'Medal',
    targetValue: 20
  }
];

export function evaluateBadges(
  existingBadges: AchievementBadge[],
  habits: Habit[],
  habitLogs: HabitLog[],
  workouts: Workout[],
  prs: PersonalRecord[]
): { updatedBadges: AchievementBadge[]; newlyUnlocked: AchievementBadge[] } {
  const badgeMap = new Map<string, AchievementBadge>();
  for (const b of existingBadges) {
    badgeMap.set(b.code, { ...b });
  }

  // Pre-calculations:
  // 1. Total habit completions
  const totalHabitCompletions = habitLogs.filter(l => l.completed).length;

  // 2. Max streak across any habit
  let maxStreakAcrossHabits = 0;
  for (const habit of habits) {
    const completedDates = new Set(
      habitLogs.filter(l => l.habitId === habit.id && l.completed).map(l => l.date)
    );
    const { longestStreak } = calculateHabitStreaks(completedDates);
    if (longestStreak > maxStreakAcrossHabits) {
      maxStreakAcrossHabits = longestStreak;
    }
  }

  // 3. Workouts stats
  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolumeKg || 0), 0);

  // 4. PRs count
  const totalPRs = prs.length;

  const newlyUnlocked: AchievementBadge[] = [];
  const updatedBadges: AchievementBadge[] = [];

  for (const template of INITIAL_BADGES) {
    const existing = badgeMap.get(template.code);
    let currentVal = 0;

    switch (template.code) {
      case 'IGNITION_SPARK':
        currentVal = totalHabitCompletions;
        break;
      case 'WARRIOR_7':
      case 'HABIT_FORMER_21':
      case 'UNSTOPPABLE_60':
      case 'CENTURION_100':
        currentVal = maxStreakAcrossHabits;
        break;
      case 'IRON_INITIATE':
      case 'GYM_REGULAR':
      case 'CENTURY_LIFTER':
        currentVal = totalWorkouts;
        break;
      case 'TON_CLUB_10K':
      case 'ATLAS_TITAN_100K':
      case 'MEGATON_LEGEND':
        currentVal = Math.round(totalVolume);
        break;
      case 'PR_CRUSHER':
      case 'PEAK_PERFORMER':
        currentVal = totalPRs;
        break;
      default:
        currentVal = 0;
    }

    const progress = Math.min(100, Math.round((currentVal / template.targetValue) * 100));
    const wasUnlocked = existing?.unlockedAt != null;
    const isNowUnlocked = currentVal >= template.targetValue;
    const unlockedAt = isNowUnlocked ? (existing?.unlockedAt || new Date().toISOString()) : undefined;

    const badge: AchievementBadge = {
      id: existing?.id || template.id,
      code: template.code,
      title: template.title,
      description: template.description,
      category: template.category,
      tier: template.tier,
      icon: template.icon,
      targetValue: template.targetValue,
      currentValue: currentVal,
      progress,
      unlockedAt
    };

    if (!wasUnlocked && isNowUnlocked) {
      newlyUnlocked.push(badge);
    }
    updatedBadges.push(badge);
  }

  return { updatedBadges, newlyUnlocked };
}
