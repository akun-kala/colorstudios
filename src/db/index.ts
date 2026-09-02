import Dexie, { Table } from 'dexie';
import { Quest, UserStats } from '@/types';
import { UserPattern, AIInsight } from '@/types/ai';
import { Achievement, CharacterClass } from '@/types/gamification';

class QuestDB extends Dexie {
  quests!: Table<Quest>;
  userStats!: Table<UserStats>;
  patterns!: Table<UserPattern>;
  insights!: Table<AIInsight>;
  achievements!: Table<Achievement>;

  constructor() {
    super('QuestAI');
    this.version(3).stores({
      quests: '++id, title, rarity, questType, isCompleted, deadline, nextDueAt, createdAt',
      userStats: '++id',
      patterns: '++id, userId',
      insights: '++id, type, questId, dismissed, createdAt',
      achievements: '++id',
    });
  }
}

export const db = new QuestDB();

export async function initUserStats(): Promise<UserStats> {
  let stats = await db.userStats.get(1);
  if (!stats) {
    stats = {
      id: '1',
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      streak: 0,
      longestStreak: 0,
      totalQuestsCompleted: 0,
      totalXpEarned: 0,
      lastActiveDate: new Date().toISOString().split('T')[0],
    };
    await db.userStats.add(stats);
  }
  return stats;
}

export async function initAchievements(): Promise<Achievement[]> {
  const { DEFAULT_ACHIEVEMENTS } = await import('@/types/gamification');
  const count = await db.achievements.count();
  if (count === 0) {
    await db.achievements.bulkAdd(DEFAULT_ACHIEVEMENTS.map(a => ({ ...a })));
  }
  return db.achievements.toArray();
}
