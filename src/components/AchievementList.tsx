import { useEffect } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { Achievement, RARITY_COLORS } from '@/types/gamification';
import { Lock, Trophy } from 'lucide-react';

export function AchievementList() {
  const achievements = useGamificationStore((s) => s.achievements);
  const loadAchievements = useGamificationStore((s) => s.loadAchievements);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const unlocked = achievements.filter((a) => a.unlockedAt);
  const locked = achievements.filter((a) => !a.unlockedAt);

  return (
    <div className="px-4 py-3">
      {/* Summary */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-quest-text-primary">🏆 Achievements</h2>
          <p className="text-[11px] text-quest-text-tertiary">
            {unlocked.length}/{achievements.length} unlocked
          </p>
        </div>
        <div className="flex gap-1">
          {['bronze', 'silver', 'gold', 'platinum'].map((r) => {
            const count = unlocked.filter((a) => a.rarity === r).length;
            const colors = RARITY_COLORS[r as keyof typeof RARITY_COLORS];
            return (
              <span
                key={r}
                className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-semibold`}
              >
                {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="space-y-2 mb-4">
          {unlocked.map((ach) => (
            <AchievementCard key={ach.id} achievement={ach} unlocked />
          ))}
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-quest-text-tertiary uppercase tracking-wider mb-2">
            Locked
          </h3>
          <div className="space-y-2">
            {locked.map((ach) => (
              <AchievementCard key={ach.id} achievement={ach} unlocked={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AchievementCard({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  const colors = RARITY_COLORS[achievement.rarity];
  const progressPct = Math.round((achievement.progress / achievement.target) * 100);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        unlocked
          ? `${colors.border} ${colors.bg}`
          : 'border-quest-border bg-quest-surface opacity-60'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
          unlocked ? 'bg-white/10' : 'bg-quest-bg'
        }`}
      >
        {unlocked ? achievement.icon : <Lock className="w-4 h-4 text-quest-text-quaternary" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-quest-text-primary">{achievement.name}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-bold uppercase`}>
            {achievement.rarity}
          </span>
        </div>
        <p className="text-[11px] text-quest-text-secondary mt-0.5">{achievement.description}</p>
        {!unlocked && (
          <div className="mt-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-quest-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-quest-accent rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[9px] text-quest-text-tertiary tabular-nums">
                {achievement.progress}/{achievement.target}
              </span>
            </div>
          </div>
        )}
      </div>
      {unlocked && <Trophy className={`w-4 h-4 ${colors.text} flex-shrink-0`} />}
    </div>
  );
}
