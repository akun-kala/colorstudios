export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  condition: string; // human readable condition
  unlockedAt?: Date;
  progress: number;
  target: number;
}

export type CharacterClass = 'warrior' | 'mage' | 'rogue' | 'bard' | 'ranger';

export interface ClassConfig {
  id: CharacterClass;
  name: string;
  icon: string;
  description: string;
  buff: {
    name: string;
    description: string;
    xpMultiplier: number;
    streakBonus: number;
    focusBonus: number; // minutes added to focus duration
  };
  color: string;
  bgColor: string;
  borderColor: string;
}

export const CHARACTER_CLASSES: Record<CharacterClass, ClassConfig> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    icon: '⚔️',
    description: 'Tidak pernah menyerah. Bonus XP untuk quest berat dan overdue.',
    buff: {
      name: 'Last Stand',
      description: '+20% XP untuk Epic/Legendary quest. +5 XP bonus kalo quest selesai < 24 jam dari deadline.',
      xpMultiplier: 1.2,
      streakBonus: 1,
      focusBonus: 0,
    },
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    icon: '🧙‍♂️',
    description: 'Pemikir strategis. Bonus XP untuk quest analitis dan planning.',
    buff: {
      name: 'Deep Focus',
      description: '+15% XP untuk quest dengan >3 stages. Focus duration +10 menit.',
      xpMultiplier: 1.15,
      streakBonus: 0,
      focusBonus: 10,
    },
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-400/10',
    borderColor: 'border-indigo-400/30',
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    icon: '🗡️',
    description: 'Cepat dan efisien. Bonus XP untuk speedrun dan streak.',
    buff: {
      name: 'Swift Strike',
      description: '+25% XP kalo quest selesai 2x lebih cepat dari estimasi. Streak bonus +2 XP/hari.',
      xpMultiplier: 1.0,
      streakBonus: 2,
      focusBonus: 0,
    },
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
  },
  bard: {
    id: 'bard',
    name: 'Bard',
    icon: '🎵',
    description: 'Konsisten dan motivator. Bonus XP untuk rutinitas dan streak panjang.',
    buff: {
      name: 'Harmony',
      description: '+20% XP untuk interval/routine quests. Streak tidak reset kalo skip 1 hari (1x seminggu).',
      xpMultiplier: 1.2,
      streakBonus: 1,
      focusBonus: 0,
    },
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹',
    description: 'Seimbang dan adaptif. Bonus all-rounder untuk semua tipe quest.',
    buff: {
      name: 'Versatile',
      description: '+10% XP untuk semua quest. +5 XP bonus untuk quest pertama hari ini.',
      xpMultiplier: 1.1,
      streakBonus: 0,
      focusBonus: 5,
    },
    color: 'text-teal-400',
    bgColor: 'bg-teal-400/10',
    borderColor: 'border-teal-400/30',
  },
};

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Selesaikan quest pertamamu',
    icon: '🩸',
    rarity: 'bronze',
    condition: 'complete_1_quest',
    progress: 0,
    target: 1,
  },
  {
    id: 'speedrunner',
    name: 'Speedrunner',
    description: 'Selesaikan quest 2x lebih cepat dari estimasi',
    icon: '⚡',
    rarity: 'silver',
    condition: 'speedrun_1_quest',
    progress: 0,
    target: 1,
  },
  {
    id: 'perfect-streak',
    name: 'Perfect Streak',
    description: '7 hari berturut-turut tanpa skip',
    icon: '🔥',
    rarity: 'gold',
    condition: 'streak_7_days',
    progress: 0,
    target: 7,
  },
  {
    id: 'boss-slayer',
    name: 'Boss Slayer',
    description: 'Selesaikan 5 Epic+ quest tepat waktu',
    icon: '🐉',
    rarity: 'platinum',
    condition: 'complete_5_epic_on_time',
    progress: 0,
    target: 5,
  },
  {
    id: 'green-thumb',
    name: 'Green Thumb',
    description: 'Selesaikan 10 routine quest (tanaman, dll)',
    icon: '🌿',
    rarity: 'bronze',
    condition: 'complete_10_routine',
    progress: 0,
    target: 10,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Selesaikan 5 quest di jam 9 PM - 2 AM',
    icon: '🦉',
    rarity: 'silver',
    condition: 'complete_5_night_quests',
    progress: 0,
    target: 5,
  },
  {
    id: 'overachiever',
    name: 'Overachiever',
    description: 'Capai Level 10',
    icon: '👑',
    rarity: 'gold',
    condition: 'reach_level_10',
    progress: 0,
    target: 10,
  },
  {
    id: 'legendary-hunter',
    name: 'Legendary Hunter',
    description: 'Selesaikan 3 Legendary quest',
    icon: '⭐',
    rarity: 'platinum',
    condition: 'complete_3_legendary',
    progress: 0,
    target: 3,
  },
];

export const RARITY_COLORS = {
  bronze: { text: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/30' },
  silver: { text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
  gold: { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  platinum: { text: 'text-cyan-300', bg: 'bg-cyan-300/10', border: 'border-cyan-300/30' },
};
