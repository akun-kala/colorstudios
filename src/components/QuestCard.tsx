import { useState } from 'react';
import { Quest, RARITY_CONFIG } from '@/types';
import { StageTracker } from './StageTracker';
import { ChevronDown, Clock, Repeat } from 'lucide-react';
import { getTimeLabel } from '@/utils/alerts';
import { useGamificationStore } from '@/stores/gamificationStore';

interface Props {
  quest: Quest;
  onUpdate: (quest: Quest) => void;
  onComplete: (quest: Quest) => void;
}

export function QuestCard({ quest, onUpdate, onComplete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = RARITY_CONFIG[quest.rarity];
  const selectedClass = useGamificationStore((s) => s.selectedClass);
  const completedStages = quest.stages.filter((s) => s.completed).length;
  const totalStages = quest.stages.length;
  const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;
  const isBossBattle = quest.questType === 'deadline' && quest.deadline && 
    new Date(quest.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 && !quest.isCompleted;

  // Calculate buffed XP
  const calculateBuffed = () => {
    if (!selectedClass) return quest.xpReward;
    const store = useGamificationStore.getState();
    return store.calculateBuffedXp(quest.xpReward, quest);
  };
  const buffedXp = calculateBuffed();
  const hasBuff = buffedXp > quest.xpReward;

  const handleStageToggle = (stageId: string) => {
    const newStages = quest.stages.map((s) =>
      s.id === stageId ? { ...s, completed: !s.completed } : s
    );
    const allDone = newStages.every((s) => s.completed);
    onUpdate({ ...quest, stages: newStages, isCompleted: allDone });
    if (allDone) {
      onComplete({ ...quest, stages: newStages, isCompleted: true });
    }
  };

  const dueLabel = quest.questType === 'deadline' && quest.deadline
    ? getTimeLabel(new Date(quest.deadline))
    : quest.questType === 'interval' && quest.nextDueAt
    ? getTimeLabel(new Date(quest.nextDueAt))
    : '';

  // Rarity glow effect
  const glowClass = quest.rarity === 'legendary' ? 'shadow-lg shadow-quest-danger/20' :
    quest.rarity === 'epic' ? 'shadow-md shadow-quest-warning/15' :
    quest.rarity === 'rare' ? 'shadow-sm shadow-quest-accent/10' : '';

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} ${glowClass} overflow-hidden animate-slide-up transition-shadow hover:shadow-lg`}>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span className="text-lg mt-0.5">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-semibold text-quest-text-primary truncate">{quest.title}</h3>
                {isBossBattle && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-quest-danger/20 text-quest-danger font-bold animate-pulse">
                    🔥 BOSS
                  </span>
                )}
                {hasBuff && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-quest-positive/20 text-quest-positive font-bold">
                    +{buffedXp - quest.xpReward} BUFF
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-semibold ${config.color}`}>{config.label}</span>
                <span className="text-[10px] text-quest-text-tertiary flex items-center gap-0.5">
                  {quest.questType === 'deadline' ? (
                    <><Clock className="w-3 h-3" /> {dueLabel}</>
                  ) : (
                    <><Repeat className="w-3 h-3" /> {quest.intervalDays}h cycle</>
                  )}
                </span>
                <span className="text-[10px] text-quest-positive font-semibold">
                  +{buffedXp} XP
                  {hasBuff && <span className="text-quest-text-quaternary line-through ml-1">{quest.xpReward}</span>}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md hover:bg-white/5 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 text-quest-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="mt-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-quest-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isBossBattle ? 'bg-quest-danger' : 'bg-quest-positive'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-quest-text-tertiary tabular-nums w-8 text-right">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3.5 pb-3.5 border-t border-quest-border/50">
          {quest.description && (
            <p className="text-xs text-quest-text-secondary mt-2.5 leading-relaxed">{quest.description}</p>
          )}
          <StageTracker stages={quest.stages} onToggle={handleStageToggle} />
        </div>
      )}
    </div>
  );
}
