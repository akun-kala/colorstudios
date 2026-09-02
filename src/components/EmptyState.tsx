import { Scroll } from 'lucide-react';

interface Props {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-quest-accent/10 flex items-center justify-center mb-4">
        <Scroll className="w-8 h-8 text-quest-accent" />
      </div>
      <h3 className="text-sm font-semibold text-quest-text-primary mb-1">Belum ada quest</h3>
      <p className="text-xs text-quest-text-tertiary mb-4 max-w-[200px]">
        Yuk mulai petualanganmu! Buat quest pertama dan raih XP.
      </p>
      <button
        onClick={onCreate}
        className="px-4 py-2 rounded-lg bg-quest-text-primary text-quest-bg text-xs font-semibold hover:bg-quest-text-secondary transition-colors"
      >
        + Buat Quest Pertama
      </button>
    </div>
  );
}
