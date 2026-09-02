import { Sword, Plus } from 'lucide-react';

interface Props {
  onCreateClick: () => void;
}

export function Header({ onCreateClick }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-quest-bg/80 backdrop-blur-md border-b border-quest-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-quest-accent/20 flex items-center justify-center">
          <Sword className="w-4 h-4 text-quest-accent" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-quest-text-primary leading-tight">Quest AI</h1>
          <p className="text-[10px] text-quest-text-tertiary leading-tight">Turn deadlines into epic quests</p>
        </div>
      </div>
      <button
        onClick={onCreateClick}
        className="w-8 h-8 rounded-lg bg-quest-text-primary text-quest-bg flex items-center justify-center hover:bg-quest-text-secondary transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </header>
  );
}
