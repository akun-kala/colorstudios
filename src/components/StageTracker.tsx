import { Stage } from '@/types';
import { Check } from 'lucide-react';

interface Props {
  stages: Stage[];
  onToggle: (stageId: string) => void;
}

export function StageTracker({ stages, onToggle }: Props) {
  return (
    <div className="mt-3 space-y-1.5">
      {stages.map((stage) => (
        <label
          key={stage.id}
          className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
            stage.completed ? 'opacity-50' : 'hover:bg-white/5'
          }`}
        >
          <div
            onClick={() => onToggle(stage.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              stage.completed
                ? 'bg-quest-positive border-quest-positive'
                : 'border-quest-border hover:border-quest-positive'
            }`}
          >
            {stage.completed && <Check className="w-3 h-3 text-quest-bg" />}
          </div>
          <span className={`text-xs ${stage.completed ? 'line-through text-quest-text-quaternary' : 'text-quest-text-primary'}`}>
            {stage.title}
          </span>
        </label>
      ))}
    </div>
  );
}
