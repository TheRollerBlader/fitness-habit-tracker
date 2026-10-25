import Dexie, { type Table } from 'dexie';
import type { Habit, HabitLog, Workout, PersonalRecord, AchievementBadge, AppSettings } from '../types';

export class FitnessTrackerDatabase extends Dexie {
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  workouts!: Table<Workout, string>;
  personalRecords!: Table<PersonalRecord, string>;
  badges!: Table<AchievementBadge, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('ApexPulseFitnessDB');
    this.version(1).stores({
      habits: 'id, name, category, frequency, archived, createdAt',
      habitLogs: 'id, habitId, date, [habitId+date], completed, timestamp',
      workouts: 'id, date, category, totalVolumeKg, createdAt',
      personalRecords: 'id, exerciseName, recordType, date, workoutId, [exerciseName+recordType]',
      badges: 'id, code, category, tier, unlockedAt',
      settings: 'id'
    });
  }
}

export const db = new FitnessTrackerDatabase();
