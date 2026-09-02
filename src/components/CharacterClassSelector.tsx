import { useState } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { CHARACTER_CLASSES, CharacterClass } from '@/types/gamification';
import { Check, Sparkles } from 'lucide-react';

interface Props {
  onSelect: () => void;
}

export function CharacterClassSelector({ onSelect }: Props) {
  const selectedClass = useGamificationStore((s) => s.selectedClass);
  const setClass = useGamificationStore((s) => s.setClass);
  const [hovered, setHovered] = useState<CharacterClass | null>(null);

  const handleSelect = async (cls: CharacterClass) => {
    await setClass(cls);
    onSelect();
  };

  return (
    <div className="px-4 py-6">
      <div className="text-center mb-6">
        <div className="text-3xl mb-2">🎭</div>
        <h2 className="text-lg font-bold text-quest-text-primary">Pilih Kelasmu</h2>
        <p className="text-xs text-quest-text-tertiary mt-1">
          Tiap class punya buff unik. Pilih yang sesuai gaya mainmu!
        </p>
      </div>

      <div className="space-y-3">
        {(Object.keys(CHARACTER_CLASSES) as CharacterClass[]).map((cls) => {
          const config = CHARACTER_CLASSES[cls];
          const isSelected = selectedClass === cls;
          const isHovered = hovered === cls;

          return (
            <button
              key={cls}
              onClick={() => handleSelect(cls)}
              onMouseEnter={() => setHovered(cls)}
              onMouseLeave={() => setHovered(null)}
              className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                isSelected
                  ? `${config.borderColor} ${config.bgColor} ring-1 ring-offset-1 ring-offset-quest-bg`
                  : 'border-quest-border bg-quest-surface hover:border-quest-text-tertiary'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <Check className={`w-4 h-4 ${config.color}`} />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="text-2xl">{config.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${config.color}`}>{config.name}</span>
                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-quest-text-secondary font-semibold">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-quest-text-secondary mt-1">{config.description}</p>

                  <div className={`mt-2.5 p-2.5 rounded-lg bg-quest-bg/50 border border-quest-border/50 ${isHovered || isSelected ? 'opacity-100' : 'opacity-70'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className={`w-3 h-3 ${config.color}`} />
                      <span className={`text-[10px] font-bold ${config.color}`}>{config.buff.name}</span>
                    </div>
                    <p className="text-[10px] text-quest-text-tertiary leading-relaxed">{config.buff.description}</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
