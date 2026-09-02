import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Quest } from '@/types';
import { QuestCard } from './QuestCard';
import { EmptyState } from './EmptyState';
import { useUserStore } from '@/stores/userStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { LevelUpModal } from './LevelUpModal';

interface Props {
  onToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export function QuestList({ onToast }: Props) {
  const quests = useLiveQuery(() => db.quests.where('isCompleted').equals(0).toArray()) || [];
  const addXp = useUserStore((s) => s.addXp);
  const checkStreak = useUserStore((s) => s.checkStreak);
  const checkAchievements = useGamificationStore((s) => s.checkAchievements);
  const calculateBuffedXp = useGamificationStore((s) => s.calculateBuffedXp);
  const [activeFilter, setActiveFilter] = useState<'all' | 'deadline' | 'interval'>('all');
  const [levelUp, setLevelUp] = useState<{ show: boolean; level: number } | null>(null);

  const handleUpdate = useCallback(async (updated: Quest) => {
    await db.quests.put(updated);
  }, []);

  const handleComplete = useCallback(async (quest: Quest) => {
    const now = new Date();
    const completedQuest = { ...quest, isCompleted: true, completedAt: now };
    await db.quests.put(completedQuest);

    // Calculate buffed XP
    const buffedXp = calculateBuffedXp(quest.xpReward, completedQuest);
    const result = await addXp(buffedXp);
    await checkStreak();

    // Check achievements
    const stats = await db.userStats.get(1);
    if (stats) {
      const newAchievements = await checkAchievements(completedQuest, stats);
      if (newAchievements.length > 0) {
        newAchievements.forEach((ach) => {
          onToast(`🏆 Achievement unlocked: ${ach.name}!`, 'success');
        });
      }
    }

    // Show level up modal
    if (result.leveledUp && result.newLevel) {
      setLevelUp({ show: true, level: result.newLevel });
    }

    const xpMsg = buffedXp > quest.xpReward 
      ? `🎉 Quest selesai! +${buffedXp} XP (buffed!)`
      : `🎉 Quest selesai! +${buffedXp} XP`;
    onToast(xpMsg, 'success');
  }, [addXp, checkStreak, checkAchievements, calculateBuffedXp, onToast]);

  const filtered = quests.filter((q) => {
    if (activeFilter === 'all') return true;
    return q.questType === activeFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.deadline || a.nextDueAt || new Date(9999);
    const bDate = b.deadline || b.nextDueAt || new Date(9999);
    return aDate.getTime() - bDate.getTime();
  });

  return (
    <>
      <div className="px-4 py-3">
        {/* Filters */}
        <div className="flex gap-1.5 mb-3">
          {(['all', 'deadline', 'interval'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                activeFilter === f
                  ? 'bg-quest-text-primary text-quest-bg'
                  : 'bg-quest-surface text-quest-text-tertiary hover:text-quest-text-secondary'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'deadline' ? 'Deadline' : 'Rutin'}
            </button>
          ))}
        </div>

        {/* Quest Count */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-quest-text-secondary">
            {sorted.length} Quest Aktif
          </h2>
        </div>

        {/* Quests */}
        {sorted.length === 0 ? (
          <EmptyState onCreate={() => {}} />
        ) : (
          <div className="space-y-3">
            {sorted.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onUpdate={handleUpdate}
                onComplete={handleComplete}
              />
            ))}
          </div>
        )}
      </div>

      {levelUp?.show && (
        <LevelUpModal 
          level={levelUp.level} 
          onClose={() => setLevelUp(null)} 
        />
      )}
    </>
  );
}
