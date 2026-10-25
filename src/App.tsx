import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { seedDemoData } from './db/seed';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { TodayOverview } from './components/dashboard/TodayOverview';
import { SummaryCards } from './components/analytics/SummaryCards';
import { HabitHeatmap } from './components/analytics/HabitHeatmap';
import { CategoryRadarChart } from './components/analytics/CategoryRadarChart';
import { PRProgressionChart } from './components/analytics/PRProgressionChart';
import { TrendForecaster } from './components/analytics/TrendForecaster';
import { HabitManager } from './components/habits/HabitManager';
import { HabitModal } from './components/habits/HabitModal';
import { WorkoutManager } from './components/workouts/WorkoutManager';
import { WorkoutModal } from './components/workouts/WorkoutModal';
import { BadgeGrid } from './components/badges/BadgeGrid';
import { DataBackupModal } from './components/settings/DataBackupModal';
import type { Habit, Workout } from './types';
import { evaluateWorkoutPRs } from './utils/pr';
import { evaluateBadges } from './utils/badges';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Reactive Dexie queries
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), []);
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);
  const personalRecords = useLiveQuery(() => db.personalRecords.toArray(), []);
  const badges = useLiveQuery(() => db.badges.toArray(), []);
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);

  // Seed demo data on very first run
  useEffect(() => {
    async function init() {
      const count = await db.habits.count();
      if (count === 0) {
        await seedDemoData();
      }
      setIsInitialized(true);
    }
    init();
  }, []);

  const handleSaveHabit = async (habit: Habit) => {
    await db.habits.put(habit);
  };

  const handleSaveWorkout = async (workout: Workout) => {
    await db.workouts.put(workout);

    // Evaluate PRs
    const allExistingPRs = await db.personalRecords.toArray();
    const { newPRs } = evaluateWorkoutPRs(workout, allExistingPRs);
    if (newPRs.length > 0) {
      await db.personalRecords.bulkAdd(newPRs);
    }

    // Evaluate Badges
    const allWorkouts = await db.workouts.toArray();
    const allPRs = await db.personalRecords.toArray();
    const allBadges = await db.badges.toArray();
    const currentHabits = habits || [];
    const currentLogs = habitLogs || [];

    const { updatedBadges } = evaluateBadges(
      allBadges,
      currentHabits,
      currentLogs,
      allWorkouts,
      allPRs
    );
    if (updatedBadges.length > 0) {
      await db.badges.bulkPut(updatedBadges);
    }
  };

  if (!isInitialized || !habits || !habitLogs || !workouts || !personalRecords || !badges) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider uppercase text-emerald-400">
          Initializing Local-first IndexedDB...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-12">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBackup={() => setIsBackupModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Today Overview Banner */}
            <TodayOverview
              habits={habits}
              habitLogs={habitLogs}
              workouts={workouts}
              settings={settings}
              onOpenHabitModal={() => setIsHabitModalOpen(true)}
              onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
            />

            {/* Trailing Summary Metrics */}
            <SummaryCards
              habits={habits}
              habitLogs={habitLogs}
              workouts={workouts}
              personalRecords={personalRecords}
              settings={settings}
            />

            {/* Radar & PR Progression Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategoryRadarChart
                habits={habits}
                habitLogs={habitLogs}
                workouts={workouts}
              />
              <PRProgressionChart
                workouts={workouts}
                personalRecords={personalRecords}
              />
            </div>

            {/* Linear Regression Forecaster */}
            <TrendForecaster
              habitLogs={habitLogs}
              workouts={workouts}
            />

            {/* GitHub-style Heatmap */}
            <HabitHeatmap
              habits={habits}
              habitLogs={habitLogs}
            />
          </div>
        )}

        {/* HABITS TAB */}
        {activeTab === 'habits' && (
          <div className="space-y-6 animate-fade-in">
            <HabitManager
              habits={habits}
              habitLogs={habitLogs}
            />

            <HabitHeatmap
              habits={habits}
              habitLogs={habitLogs}
            />
          </div>
        )}

        {/* WORKOUTS TAB */}
        {activeTab === 'workouts' && (
          <div className="space-y-6 animate-fade-in">
            <WorkoutManager
              workouts={workouts}
              personalRecords={personalRecords}
              badges={badges}
              habits={habits}
              habitLogs={habitLogs}
            />

            <PRProgressionChart
              workouts={workouts}
              personalRecords={personalRecords}
            />
          </div>
        )}

        {/* ANALYTICS & FORECASTING TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Analytics & Empirical Forecasting
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Mathematical modeling, linear projections with 95% confidence bands, and radar balance
              </p>
            </div>

            <SummaryCards
              habits={habits}
              habitLogs={habitLogs}
              workouts={workouts}
              personalRecords={personalRecords}
              settings={settings}
            />

            <TrendForecaster
              habitLogs={habitLogs}
              workouts={workouts}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PRProgressionChart
                workouts={workouts}
                personalRecords={personalRecords}
              />
              <CategoryRadarChart
                habits={habits}
                habitLogs={habitLogs}
                workouts={workouts}
              />
            </div>

            <HabitHeatmap
              habits={habits}
              habitLogs={habitLogs}
            />
          </div>
        )}

        {/* MILESTONES TAB */}
        {activeTab === 'badges' && (
          <div className="space-y-6 animate-fade-in">
            <BadgeGrid badges={badges} />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Modals */}
      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSave={handleSaveHabit}
      />

      <WorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        onSave={handleSaveWorkout}
      />

      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
};
