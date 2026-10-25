export type HabitCategory = 'strength' | 'cardio' | 'sleep' | 'nutrition' | 'mobility' | 'mindset';

export type HabitFrequency = 'daily' | 'weekly' | 'weekdays' | 'custom';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  targetDaysPerWeek: number;
  color: string;
  icon: string;
  targetValue?: number;
  unit?: string;
  createdAt: string;
  archived?: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number;
  notes?: string;
  timestamp: number;
}

export interface ExerciseSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  completed: boolean;
  isPR?: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseName: string;
  category: 'strength' | 'cardio' | 'mobility' | 'other';
  sets: ExerciseSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: 'strength' | 'cardio' | 'mobility' | 'hiit' | 'recovery';
  durationMinutes: number;
  totalVolumeKg: number;
  rpe?: number;
  notes?: string;
  exercises: WorkoutExercise[];
  createdAt: string;
}

export type RecordType = '1RM_ESTIMATE' | 'MAX_WEIGHT' | 'MAX_VOLUME' | 'MAX_REPS';

export interface PersonalRecord {
  id: string;
  exerciseName: string;
  recordType: RecordType;
  value: number; // e.g. estimated 1RM in kg or volume in kg
  weightKg: number;
  reps: number;
  date: string; // YYYY-MM-DD
  workoutId: string;
}

export type BadgeCategory = 'streak' | 'workout_volume' | 'consistency' | 'milestone';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AchievementBadge {
  id: string;
  code: string;
  title: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: string;
  unlockedAt?: string;
  progress: number; // 0 to 100
  currentValue: number;
  targetValue: number;
}

export interface RegressionForecastPoint {
  date: string;
  dayIndex: number;
  actual?: number;
  predicted: number;
  ciLower: number;
  ciUpper: number;
  isForecast: boolean;
}

export interface RegressionMetrics {
  slope: number;
  intercept: number;
  rSquared: number;
  standardError: number;
  sampleSize: number;
  trendDirection: 'improving' | 'declining' | 'flat';
  formulaString: string;
}

export interface AppSettings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  weightUnit: 'kg' | 'lbs';
  hasSeededDemoData: boolean;
  userName: string;
  weeklyWorkoutGoal: number;
  dailyHabitGoal: number;
}
