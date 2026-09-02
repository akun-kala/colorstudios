import { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { Flame, Trophy, Zap } from 'lucide-react';
import { CHARACTER_CLASSES } from '@/types/gamification';

export function StatsBar() {
  const stats = useUserStore((s) => s.stats);
  const loadStats = useUserStore((s) => s.loadStats);
  const selectedClass = useGamificationStore((s) => s.selectedClass);
  const loadClass = useGamificationStore((s) => s.loadClass);

  useEffect(() => {
    loadStats();
    loadClass();
  }, [loadStats, loadClass]);

  if (!stats) return null;

  const progress = (stats.xp / stats.xpToNextLevel) * 100;
  const classConfig = selectedClass ? CHARACTER_CLASSES[selectedClass] : null;

  return (
    <div className="px-4 py-3 border-b border-quest-border">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          classConfig ? classConfig.bgColor : 'bg-quest-accent/15'
        }`}>
          {classConfig ? classConfig.icon : '🧙‍♂️'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-quest-text-primary">
              Level {stats.level} {classConfig ? classConfig.name : 'Mage'}
            </span>
            <span className="text-[10px] text-quest-text-tertiary tabular-nums">{stats.xp}/{stats.xpToNextLevel} XP</span>
          </div>
          <div className="h-1.5 bg-quest-border rounded-full overflow-hidden">
            <div
              className="h-full bg-quest-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <Flame className="w-4 h-4 text-quest-positive" />
            <span className="text-[10px] font-bold text-quest-positive">{stats.streak}</span>
          </div>
          <div className="flex flex-col items-center">
            <Trophy className="w-4 h-4 text-quest-warning" />
            <span className="text-[10px] font-bold text-quest-warning">{stats.totalQuestsCompleted}</span>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="w-4 h-4 text-quest-accent" />
            <span className="text-[10px] font-bold text-quest-accent">{stats.totalXpEarned}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
