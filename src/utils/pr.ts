import type { Workout, PersonalRecord, ExerciseSet } from '../types';

/**
 * Calculates Estimated One Rep Max (1RM) using Epley Formula:
 * 1RM = Weight * (1 + Reps / 30)
 * For 1 rep, it returns the exact weight lifted.
 */
export function calculateEstimated1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  // Epley formula
  const epley = weightKg * (1 + reps / 30);
  return Math.round(epley * 10) / 10;
}

/**
 * Calculates Brzycki formula 1RM for comparison:
 * 1RM = Weight / (1.0278 - 0.0278 * Reps)
 */
export function calculateBrzycki1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps >= 36) return weightKg; // Brzycki denominator becomes <= 0 for >36 reps
  const brzycki = weightKg / (1.0278 - 0.0278 * reps);
  return Math.round(brzycki * 10) / 10;
}

export function calculateSetVolume(set: ExerciseSet): number {
  if (!set.completed) return 0;
  return set.reps * set.weightKg;
}

export function calculateWorkoutTotalVolume(workout: Workout): number {
  let total = 0;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (set.completed) {
        total += (set.weightKg || 0) * (set.reps || 0);
      }
    }
  }
  return Math.round(total * 10) / 10;
}

export interface PRScanResult {
  newPRs: PersonalRecord[];
  allCurrentPRs: PersonalRecord[];
}

/**
 * Scans a workout's exercises and sets against all existing PRs.
 * Returns newly achieved PRs and updated full PR set.
 */
export function evaluateWorkoutPRs(
  workout: Workout,
  existingPRs: PersonalRecord[]
): PRScanResult {
  const newPRs: PersonalRecord[] = [];
  const prMap = new Map<string, PersonalRecord>();

  // Map existing PRs by key: `exerciseName:::recordType`
  for (const pr of existingPRs) {
    const key = `${pr.exerciseName.trim().toLowerCase()}:::${pr.recordType}`;
    prMap.set(key, pr);
  }

  for (const exercise of workout.exercises) {
    const exName = exercise.exerciseName.trim();
    if (!exName) continue;

    let maxSetWeight = 0;
    let maxEstimated1RM = 0;
    let maxWeightSet: ExerciseSet | null = null;
    let max1RMSet: ExerciseSet | null = null;
    let totalExerciseVolume = 0;

    for (const set of exercise.sets) {
      if (!set.completed) continue;
      const weight = set.weightKg || 0;
      const reps = set.reps || 0;
      if (weight <= 0 || reps <= 0) continue;

      totalExerciseVolume += weight * reps;

      if (weight > maxSetWeight) {
        maxSetWeight = weight;
        maxWeightSet = set;
      }

      const est1RM = calculateEstimated1RM(weight, reps);
      if (est1RM > maxEstimated1RM) {
        maxEstimated1RM = est1RM;
        max1RMSet = set;
      }
    }

    const exKeyBase = exName.toLowerCase();

    // 1. Evaluate Estimated 1RM PR
    if (maxEstimated1RM > 0 && max1RMSet) {
      const key1RM = `${exKeyBase}:::1RM_ESTIMATE`;
      const current1RMPR = prMap.get(key1RM);
      if (!current1RMPR || maxEstimated1RM > current1RMPR.value) {
        const pr: PersonalRecord = {
          id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          exerciseName: exName,
          recordType: '1RM_ESTIMATE',
          value: maxEstimated1RM,
          weightKg: max1RMSet.weightKg,
          reps: max1RMSet.reps,
          date: workout.date,
          workoutId: workout.id
        };
        newPRs.push(pr);
        prMap.set(key1RM, pr);
        max1RMSet.isPR = true;
      }
    }

    // 2. Evaluate Max Weight PR
    if (maxSetWeight > 0 && maxWeightSet) {
      const keyWeight = `${exKeyBase}:::MAX_WEIGHT`;
      const currentWeightPR = prMap.get(keyWeight);
      if (!currentWeightPR || maxSetWeight > currentWeightPR.value) {
        const pr: PersonalRecord = {
          id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          exerciseName: exName,
          recordType: 'MAX_WEIGHT',
          value: maxSetWeight,
          weightKg: maxSetWeight,
          reps: maxWeightSet.reps,
          date: workout.date,
          workoutId: workout.id
        };
        newPRs.push(pr);
        prMap.set(keyWeight, pr);
        maxWeightSet.isPR = true;
      }
    }

    // 3. Evaluate Max Exercise Volume PR
    if (totalExerciseVolume > 0) {
      const keyVolume = `${exKeyBase}:::MAX_VOLUME`;
      const currentVolPR = prMap.get(keyVolume);
      if (!currentVolPR || totalExerciseVolume > currentVolPR.value) {
        const pr: PersonalRecord = {
          id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          exerciseName: exName,
          recordType: 'MAX_VOLUME',
          value: Math.round(totalExerciseVolume * 10) / 10,
          weightKg: maxSetWeight,
          reps: 0,
          date: workout.date,
          workoutId: workout.id
        };
        newPRs.push(pr);
        prMap.set(keyVolume, pr);
      }
    }
  }

  return {
    newPRs,
    allCurrentPRs: Array.from(prMap.values())
  };
}
