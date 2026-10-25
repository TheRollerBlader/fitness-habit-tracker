import React, { useState } from 'react';
import type { AchievementBadge } from '../../types';
import confetti from 'canvas-confetti';
import {
  Flame,
  Zap,
  Sparkles,
  Crown,
  ShieldAlert,
  Dumbbell,
  Award,
  Trophy,
  Layers,
  Mountain,
  Gem,
  TrendingUp,
  Medal,
  Lock,
  CheckCircle2
} from 'lucide-react';

interface BadgeGridProps {
  badges: AchievementBadge[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Zap,
  Flame,
  Sparkles,
  Crown,
  ShieldAlert,
  Dumbbell,
  Award,
  Trophy,
  Layers,
  Mountain,
  Gem,
  TrendingUp,
  Medal
};

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredBadges = badges.filter(
    b => filterCategory === 'all' || b.category === filterCategory
  );

  const unlockedCount = badges.filter(b => b.unlockedAt != null).length;

  const triggerCelebrate = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const getTierStyles = (tier: AchievementBadge['tier'], unlocked: boolean) => {
    if (!unlocked) {
      return {
        cardBorder: 'border-slate-800 bg-slate-950/40 text-slate-500',
        badgeBg: 'bg-slate-900 text-slate-600 border-slate-800',
        textGradient: 'text-slate-400'
      };
    }

    switch (tier) {
      case 'platinum':
        return {
          cardBorder: 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/30 to-slate-900',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/10',
          textGradient: 'from-cyan-200 to-cyan-400'
        };
      case 'gold':
        return {
          cardBorder: 'border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-900',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10',
          textGradient: 'from-amber-200 to-amber-400'
        };
      case 'silver':
        return {
          cardBorder: 'border-slate-400/30 bg-gradient-to-b from-slate-800/40 to-slate-900',
          badgeBg: 'bg-slate-300/20 text-slate-200 border-slate-400/40',
          textGradient: 'from-slate-200 to-slate-400'
        };
      case 'bronze':
      default:
        return {
          cardBorder: 'border-orange-600/30 bg-gradient-to-b from-orange-950/20 to-slate-900',
          badgeBg: 'bg-orange-600/20 text-orange-300 border-orange-600/40',
          textGradient: 'from-orange-200 to-orange-400'
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Achievement Badges & Milestones
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Unlock trophies as you conquer streaks, volume plateaus, and PR breakthroughs
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['all', 'streak', 'milestone', 'workout_volume', 'consistency'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-md capitalize transition-colors ${
                  filterCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold">
            {unlockedCount} / {badges.length} Unlocked
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBadges.map(badge => {
          const unlocked = badge.unlockedAt != null;
          const styles = getTierStyles(badge.tier, unlocked);
          const IconComp = ICON_MAP[badge.icon] || Award;

          return (
            <div
              key={badge.id}
              onClick={() => {
                if (unlocked) triggerCelebrate();
              }}
              className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 relative ${
                styles.cardBorder
              } ${unlocked ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-70'}`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl border ${styles.badgeBg}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                    {badge.tier}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {badge.title}
                    {unlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                {unlocked ? (
                  <div className="text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                    <span>Unlocked</span>
                    <span className="text-slate-400">
                      {new Date(badge.unlockedAt!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>
                        {badge.currentValue} / {badge.targetValue} ({badge.progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
