import { create } from 'zustand';
import { AIInsight, UserPattern, TACTICS } from '@/types/ai';
import { Quest } from '@/types';
import { db } from '@/db';
import { differenceInHours, differenceInDays, isSameDay, format, addDays } from 'date-fns';

interface AIState {
  insights: AIInsight[];
  patterns: UserPattern | null;
  loadPatterns: () => Promise<void>;
  generateInsights: (quests: Quest[]) => Promise<void>;
  dismissInsight: (id: string) => Promise<void>;
  getRecommendedTactic: (quest: Quest) => string;
}

export const useAIStore = create<AIState>((set, get) => ({
  insights: [],
  patterns: null,

  loadPatterns: async () => {
    let pattern = await db.table('patterns').get(1);
    if (!pattern) {
      pattern = {
        id: '1',
        userId: '1',
        productiveHours: [9, 10, 11, 20, 21, 22], // default: malam hari
        avgCompletionTime: {},
        commonProcrastinationHours: [14, 15], // siang males
        bestFocusDuration: 45,
        preferredBreakLength: 10,
        streakHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.table('patterns').add(pattern);
    }
    set({ patterns: pattern });
  },

  generateInsights: async (quests: Quest[]) => {
    const patterns = get().patterns;
    if (!patterns) return;

    const insights: AIInsight[] = [];
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    // 1. Morning Brief (only once per day)
    const hasMorningBrief = await db.table('insights')
      .where('type').equals('morning-brief')
      .and(i => isSameDay(new Date(i.createdAt), now))
      .count() > 0;

    if (!hasMorningBrief) {
      const activeQuests = quests.filter(q => !q.isCompleted);
      const bossBattles = activeQuests.filter(q => 
        q.deadline && differenceInHours(q.deadline, now) <= 24
      );

      const bestHour = patterns.productiveHours[0] || 21;

      insights.push({
        id: `morning-${today}`,
        type: 'morning-brief',
        title: '🌅 Morning Brief',
        message: `Pagi! Ada ${activeQuests.length} quest hari ini. ${bossBattles.length > 0 ? `${bossBattles.length} Boss Battle menunggu!` : 'Semua under control.'} Jam produktif lo biasanya jam ${bestHour}:00.`,
        confidence: 85,
        actionItems: bossBattles.length > 0 
          ? [`Mulai ${bossBattles[0].title} jam ${bestHour}:00`]
          : ['Review quest list'],
        createdAt: now,
        dismissed: false,
      });
    }

    // 2. Boss Battle Alerts
    for (const quest of quests) {
      if (quest.isCompleted || !quest.deadline) continue;
      const hoursLeft = differenceInHours(quest.deadline, now);

      if (hoursLeft <= 24 && hoursLeft > 0) {
        const hasAlert = await db.table('insights')
          .where('questId').equals(quest.id)
          .and(i => i.type === 'boss-battle')
          .count() > 0;

        if (!hasAlert) {
          const avgTime = patterns.avgCompletionTime[quest.title] || 180; // default 3h
          const tactic = get().getRecommendedTactic(quest);

          insights.push({
            id: `boss-${quest.id}`,
            type: 'boss-battle',
            title: '🔥 Boss Battle!',
            message: `${quest.title} due dalam ${hoursLeft} jam. Butuh ~${Math.round(avgTime / 60)} jam. Histori lo: lo paling ngebut jam ${patterns.productiveHours.join(', ')}.`,
            confidence: 90,
            actionItems: [`Pakai taktik: ${tactic}`, `Mulai jam ${patterns.productiveHours[0]}:00`],
            questId: quest.id,
            createdAt: now,
            dismissed: false,
          });
        }
      }
    }

    // 3. Routine Nudges for interval quests
    for (const quest of quests) {
      if (quest.isCompleted || quest.questType !== 'interval' || !quest.nextDueAt) continue;
      const hoursLeft = differenceInHours(quest.nextDueAt, now);

      if (hoursLeft <= 12 && hoursLeft > 0) {
        const hasNudge = await db.table('insights')
          .where('questId').equals(quest.id)
          .and(i => i.type === 'routine-nudge')
          .count() > 0;

        if (!hasNudge) {
          insights.push({
            id: `routine-${quest.id}`,
            type: 'routine-nudge',
            title: '🌿 Routine Nudge',
            message: `${quest.title} due dalam ${hoursLeft} jam. 10 menit doang. Streak lo bakal jadi 🔥 ${(await db.table('userStats').get(1))?.streak || 0 + 1}!`,
            confidence: 95,
            actionItems: ['Gas sekarang', 'Tunda 1 jam'],
            questId: quest.id,
            createdAt: now,
            dismissed: false,
          });
        }
      }
    }

    // 4. Productivity Tip (random, once per day)
    const hasTip = await db.table('insights')
      .where('type').equals('productivity-tip')
      .and(i => isSameDay(new Date(i.createdAt), now))
      .count() > 0;

    if (!hasTip && quests.length > 3) {
      const tips = [
        `Lo udah ${quests.filter(q => q.isCompleted).length}/${quests.length} quest minggu ini. ${quests.filter(q => q.isCompleted).length > quests.length / 2 ? 'Ngebut banget! 🔥' : 'Santai aja, kita gas pelan-pelan.'}`,
        `Tips: Kalo stuck, coba ganti tempat duduk 5 menit. ADHD brain suka stimulus baru.`,
        `Lo paling produktif jam ${patterns.productiveHours.join(', ')}. Jangan buang energi di jam ${patterns.commonProcrastinationHours.join(', ')}.`,
      ];

      insights.push({
        id: `tip-${today}`,
        type: 'productivity-tip',
        title: '💡 Tips dari Nyx',
        message: tips[Math.floor(Math.random() * tips.length)],
        confidence: 70,
        createdAt: now,
        dismissed: false,
      });
    }

    // Save insights
    for (const insight of insights) {
      await db.table('insights').put(insight);
    }

    const allInsights = await db.table('insights')
      .where('dismissed').equals(0)
      .reverse()
      .toArray();

    set({ insights: allInsights });
  },

  dismissInsight: async (id: string) => {
    await db.table('insights').update(id, { dismissed: true });
    const insights = get().insights.filter(i => i.id !== id);
    set({ insights });
  },

  getRecommendedTactic: (quest: Quest) => {
    const patterns = get().patterns;
    if (!patterns) return 'Boss Split';

    // Simple rule-based tactic selection
    if (quest.stages.length >= 4) return 'Boss Split';
    if (quest.title.toLowerCase().includes('present') || quest.title.toLowerCase().includes('design')) return 'Reverse Method';
    if (quest.title.toLowerCase().includes('code') || quest.title.toLowerCase().includes('belajar')) return 'Pomodoro+';
    if (quest.rarity === 'legendary' || quest.rarity === 'epic') return 'Boss Split';
    return 'Quick Win';
  },
}));
