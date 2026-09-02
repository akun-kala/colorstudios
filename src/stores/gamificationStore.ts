import { create } from 'zustand';
import { db, initAchievements } from '@/db';
import { Achievement, CharacterClass, CHARACTER_CLASSES, DEFAULT_ACHIEVEMENTS } from '@/types/gamification';
import { Quest, UserStats } from '@/types';
import { differenceInHours, format } from 'date-fns';

interface GamificationState {
  achievements: Achievement[];
  selectedClass: CharacterClass | null;
  loadAchievements: () => Promise<void>;
  loadClass: () => Promise<void>;
  setClass: (cls: CharacterClass) => Promise<void>;
  checkAchievements: (quest: Quest, stats: UserStats) => Promise<Achievement[]>;
  calculateBuffedXp: (baseXp: number, quest: Quest) => number;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  achievements: [],
  selectedClass: null,

  loadAchievements: async () => {
    const achievements = await initAchievements();
    set({ achievements });
  },

  loadClass: async () => {
    const saved = localStorage.getItem('quest-ai-class');
    if (saved && saved in CHARACTER_CLASSES) {
      set({ selectedClass: saved as CharacterClass });
    }
  },

  setClass: async (cls: CharacterClass) => {
    localStorage.setItem('quest-ai-class', cls);
    set({ selectedClass: cls });
  },

  checkAchievements: async (quest: Quest, stats: UserStats) => {
    const all = await db.achievements.toArray();
    const newlyUnlocked: Achievement[] = [];

    for (const ach of all) {
      if (ach.unlockedAt) continue;

      let shouldUnlock = false;

      switch (ach.condition) {
        case 'complete_1_quest':
          shouldUnlock = stats.totalQuestsCompleted >= 1;
          break;
        case 'speedrun_1_quest':
          if (quest.completedAt && quest.deadline) {
            const timeUsed = differenceInHours(quest.completedAt, quest.createdAt);
            const timeGiven = differenceInHours(quest.deadline, quest.createdAt);
            shouldUnlock = timeUsed < timeGiven / 2;
          }
          break;
        case 'streak_7_days':
          shouldUnlock = stats.streak >= 7;
          break;
        case 'complete_5_epic_on_time':
          if (quest.rarity === 'epic' || quest.rarity === 'legendary') {
            const epicCompleted = await db.quests
              .where({ isCompleted: 1, rarity: quest.rarity })
              .count();
            shouldUnlock = epicCompleted >= 5;
          }
          break;
        case 'complete_10_routine':
          if (quest.questType === 'interval') {
            const routineDone = await db.quests
              .where({ isCompleted: 1, questType: 'interval' })
              .count();
            shouldUnlock = routineDone >= 10;
          }
          break;
        case 'complete_5_night_quests':
          if (quest.completedAt) {
            const hour = quest.completedAt.getHours();
            if (hour >= 21 || hour <= 2) {
              const nightQuests = (await db.quests.toArray()).filter(
                q => q.isCompleted && q.completedAt && (q.completedAt.getHours() >= 21 || q.completedAt.getHours() <= 2)
              );
              shouldUnlock = nightQuests.length >= 5;
            }
          }
          break;
        case 'reach_level_10':
          shouldUnlock = stats.level >= 10;
          break;
        case 'complete_3_legendary':
          if (quest.rarity === 'legendary') {
            const legendaryDone = await db.quests
              .where({ isCompleted: 1, rarity: 'legendary' })
              .count();
            shouldUnlock = legendaryDone >= 3;
          }
          break;
      }

      if (shouldUnlock) {
        const updated = { ...ach, unlockedAt: new Date(), progress: ach.target };
        await db.achievements.put(updated);
        newlyUnlocked.push(updated);
      } else {
        // Update progress
        let newProgress = ach.progress;
        if (ach.condition === 'complete_1_quest') newProgress = stats.totalQuestsCompleted;
        if (ach.condition === 'streak_7_days') newProgress = stats.streak;
        if (ach.condition === 'reach_level_10') newProgress = stats.level;

        if (newProgress !== ach.progress) {
          await db.achievements.update(ach.id, { progress: Math.min(newProgress, ach.target) });
        }
      }
    }

    const updatedAll = await db.achievements.toArray();
    set({ achievements: updatedAll });
    return newlyUnlocked;
  },

  calculateBuffedXp: (baseXp: number, quest: Quest) => {
    const cls = get().selectedClass;
    if (!cls) return baseXp;

    const config = CHARACTER_CLASSES[cls];
    let finalXp = Math.round(baseXp * config.buff.xpMultiplier);

    // Class-specific bonuses
    if (cls === 'warrior' && (quest.rarity === 'epic' || quest.rarity === 'legendary')) {
      finalXp += 5;
    }
    if (cls === 'mage' && quest.stages.length > 3) {
      finalXp = Math.round(baseXp * 1.15);
    }
    if (cls === 'rogue' && quest.completedAt && quest.deadline) {
      const timeUsed = differenceInHours(quest.completedAt, quest.createdAt);
      const timeGiven = differenceInHours(quest.deadline, quest.createdAt);
      if (timeUsed < timeGiven / 2) {
        finalXp = Math.round(baseXp * 1.25);
      }
    }
    if (cls === 'bard' && quest.questType === 'interval') {
      finalXp = Math.round(baseXp * 1.2);
    }

    return finalXp;
  },
}));
