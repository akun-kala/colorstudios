import { Quest } from '@/types';
import { differenceInHours, differenceInDays, isPast, isToday, isTomorrow } from 'date-fns';

export interface SmartAlert {
  type: 'boss-battle' | 'urgent' | 'due-soon' | 'routine' | 'morning-brief';
  title: string;
  message: string;
  questId: string;
  priority: number; // 1-10
}

export function generateSmartAlerts(quests: Quest[]): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = new Date();

  for (const quest of quests) {
    if (quest.isCompleted) continue;

    if (quest.questType === 'deadline' && quest.deadline) {
      const hoursLeft = differenceInHours(quest.deadline, now);
      const daysLeft = differenceInDays(quest.deadline, now);

      if (hoursLeft <= 24 && hoursLeft > 0) {
        alerts.push({
          type: 'boss-battle',
          title: '🔥 Boss Battle!',
          message: `${quest.title} due ${hoursLeft} jam lagi. Gas sekarang!`,
          questId: quest.id,
          priority: 10,
        });
      } else if (daysLeft <= 1 && daysLeft > 0) {
        alerts.push({
          type: 'urgent',
          title: '⚠️ Deadline Besok',
          message: `${quest.title} butuh perhatian. Sisa ${hoursLeft} jam.`,
          questId: quest.id,
          priority: 8,
        });
      } else if (daysLeft <= 3 && daysLeft > 1) {
        alerts.push({
          type: 'due-soon',
          title: '⏰ H-3 Alert',
          message: `${quest.title} due dalam ${daysLeft} hari. Mulai planning?`,
          questId: quest.id,
          priority: 5,
        });
      }
    }

    if (quest.questType === 'interval' && quest.nextDueAt) {
      const hoursLeft = differenceInHours(quest.nextDueAt, now);
      if (hoursLeft <= 24 && hoursLeft > 0) {
        alerts.push({
          type: 'routine',
          title: '🌿 Routine Nudge',
          message: `${quest.title} due malam ini. 10 menit doang!`,
          questId: quest.id,
          priority: 6,
        });
      }
    }
  }

  return alerts.sort((a, b) => b.priority - a.priority);
}

export function getTimeLabel(date: Date): string {
  if (isPast(date) && !isToday(date)) return 'Overdue';
  if (isToday(date)) return 'Hari ini';
  if (isTomorrow(date)) return 'Besok';
  const days = differenceInDays(date, new Date());
  return `${days} hari lagi`;
}
