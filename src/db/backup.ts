import { db } from './index';
import type { Habit, HabitLog, Workout, PersonalRecord, AchievementBadge, AppSettings } from '../types';

export interface BackupPayload {
  version: number;
  exportedAt: string;
  appName: string;
  data: {
    habits: Habit[];
    habitLogs: HabitLog[];
    workouts: Workout[];
    personalRecords: PersonalRecord[];
    badges: AchievementBadge[];
    settings: AppSettings[];
  };
}

export async function exportDatabaseToJSON(): Promise<string> {
  const [habits, habitLogs, workouts, personalRecords, badges, settings] = await Promise.all([
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.workouts.toArray(),
    db.personalRecords.toArray(),
    db.badges.toArray(),
    db.settings.toArray()
  ]);

  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'ApexPulse Fitness Tracker',
    data: {
      habits,
      habitLogs,
      workouts,
      personalRecords,
      badges,
      settings
    }
  };

  return JSON.stringify(payload, null, 2);
}

export function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function importDatabaseFromJSON(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed: BackupPayload = JSON.parse(jsonString);

    if (!parsed || !parsed.data) {
      throw new Error('Invalid backup file format: missing data payload.');
    }

    const { habits, habitLogs, workouts, personalRecords, badges, settings } = parsed.data;

    await db.transaction('rw', [db.habits, db.habitLogs, db.workouts, db.personalRecords, db.badges, db.settings], async () => {
      await db.habits.clear();
      await db.habitLogs.clear();
      await db.workouts.clear();
      await db.personalRecords.clear();
      await db.badges.clear();
      await db.settings.clear();

      if (Array.isArray(habits) && habits.length) await db.habits.bulkAdd(habits);
      if (Array.isArray(habitLogs) && habitLogs.length) await db.habitLogs.bulkAdd(habitLogs);
      if (Array.isArray(workouts) && workouts.length) await db.workouts.bulkAdd(workouts);
      if (Array.isArray(personalRecords) && personalRecords.length) await db.personalRecords.bulkAdd(personalRecords);
      if (Array.isArray(badges) && badges.length) await db.badges.bulkAdd(badges);
      if (Array.isArray(settings) && settings.length) await db.settings.bulkAdd(settings);
    });

    return { success: true, message: 'Database successfully imported!' };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: `Import failed: ${err.message || 'Unknown error'}` };
  }
}

export async function resetDatabase(): Promise<void> {
  await db.transaction('rw', [db.habits, db.habitLogs, db.workouts, db.personalRecords, db.badges, db.settings], async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.workouts.clear();
    await db.personalRecords.clear();
    await db.badges.clear();
    await db.settings.clear();
  });
}
