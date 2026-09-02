import { create } from 'zustand';
import { UserStats } from '@/types';
import { db, initUserStats } from '@/db';
import { getXpToNextLevel } from '@/types';
import { useGamificationStore } from './gamificationStore';

interface UserState {
  stats: UserStats | null;
  loadStats: () => Promise<void>;
  addXp: (amount: number) => Promise<{ leveledUp: boolean; newLevel?: number }>;
  checkStreak: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  stats: null,

  loadStats: async () => {
    const stats = await initUserStats();
    set({ stats });
  },

  addXp: async (amount: number) => {
    const stats = get().stats;
    if (!stats) return { leveledUp: false };

    let newXp = stats.xp + amount;
    let newLevel = stats.level;
    let newTotal = stats.totalXpEarned + amount;
    let leveledUp = false;

    while (newXp >= getXpToNextLevel(newLevel)) {
      newXp -= getXpToNextLevel(newLevel);
      newLevel++;
      leveledUp = true;
    }

    const updated: UserStats = {
      ...stats,
      xp: newXp,
      level: newLevel,
      xpToNextLevel: getXpToNextLevel(newLevel),
      totalXpEarned: newTotal,
    };

    await db.userStats.put(updated);
    set({ stats: updated });
    return { leveledUp, newLevel: leveledUp ? newLevel : undefined };
  },

  checkStreak: async () => {
    const stats = get().stats;
    if (!stats) return;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = stats.streak;
    if (stats.lastActiveDate === yesterday) {
      newStreak += 1;
    } else if (stats.lastActiveDate !== today) {
      newStreak = 1;
    }

    const updated: UserStats = {
      ...stats,
      streak: newStreak,
      longestStreak: Math.max(newStreak, stats.longestStreak),
      lastActiveDate: today,
    };

    await db.userStats.put(updated);
    set({ stats: updated });
  },
}));
