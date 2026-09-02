import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface Props {
  level: number;
  onClose: () => void;
}

export function LevelUpModal({ level, onClose }: Props) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; color: string }>>([]);

  useEffect(() => {
    const p = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'][Math.floor(Math.random() * 5)],
    }));
    setParticles(p);

    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full animate-bounce"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${1 + Math.random()}s`,
          }}
        />
      ))}

      <div className="relative bg-quest-surface border border-quest-border rounded-2xl p-8 text-center max-w-sm mx-4 animate-bounce-in">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-md hover:bg-white/5">
          <X className="w-4 h-4 text-quest-text-tertiary" />
        </button>

        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-quest-text-primary mb-1">LEVEL UP!</h2>
        <p className="text-sm text-quest-text-secondary mb-4">Kamu naik ke</p>

        <div className="text-5xl font-black text-quest-accent mb-2">{level}</div>
        <div className="flex items-center justify-center gap-1 text-xs text-quest-text-tertiary">
          <Sparkles className="w-3 h-3 text-quest-warning" />
          <span>Power meningkat!</span>
          <Sparkles className="w-3 h-3 text-quest-warning" />
        </div>

        <div className="mt-5 flex gap-2 justify-center">
          {['⚔️', '🛡️', '✨', '🏆'].map((emoji, i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-xl bg-quest-bg border border-quest-border flex items-center justify-center text-lg"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
