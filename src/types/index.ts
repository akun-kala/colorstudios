export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type QuestType = 'deadline' | 'interval';

export interface Stage {
  id: string;
  title: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  rarity: Rarity;
  questType: QuestType;
  xpReward: number;
  stages: Stage[];
  deadline?: Date;
  intervalDays?: number; // for interval-based tasks
  lastCompletedAt?: Date;
  nextDueAt?: Date; // computed for interval tasks
  createdAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
}

export interface UserStats {
  id: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streak: number;
  longestStreak: number;
  totalQuestsCompleted: number;
  totalXpEarned: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export const RARITY_CONFIG: Record<Rarity, { label: string; color: string; borderColor: string; bgColor: string; icon: string }> = {
  common: { label: 'Common', color: 'text-quest-positive', borderColor: 'border-quest-positive/30', bgColor: 'bg-quest-positive/5', icon: '🌱' },
  rare: { label: 'Rare', color: 'text-quest-accent', borderColor: 'border-quest-accent/30', bgColor: 'bg-quest-accent/5', icon: '💎' },
  epic: { label: 'Epic', color: 'text-quest-warning', borderColor: 'border-quest-warning/30', bgColor: 'bg-quest-warning/5', icon: '⚔️' },
  legendary: { label: 'Legendary', color: 'text-quest-danger', borderColor: 'border-quest-danger/30', bgColor: 'bg-quest-danger/5', icon: '👑' },
};

export const XP_TABLE = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
  3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450
];

export function getXpToNextLevel(level: number): number {
  return XP_TABLE[Math.min(level, XP_TABLE.length - 1)] || 10000;
}

export function getRarityFromDifficulty(difficulty: number): Rarity {
  if (difficulty <= 2) return 'common';
  if (difficulty <= 4) return 'rare';
  if (difficulty <= 7) return 'epic';
  return 'legendary';
}

export function calculateXpReward(difficulty: number, daysUntilDeadline: number): number {
  let base = difficulty * 10;
  if (daysUntilDeadline <= 1) base += 15; // Boss Battle bonus
  if (daysUntilDeadline <= 3) base += 5;
  return base;
}


export * from './ai';

export * from './gamification';
