import { useAuthStore } from '@/stores/authStore';
import { LogIn, Swords, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function LoginModal({ onClose }: Props) {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleLogin = async () => {
    try {
      await login();
      onClose();
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-quest-surface border border-quest-border rounded-2xl p-6 max-w-xs mx-4 text-center animate-bounce-in">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-md hover:bg-white/5">
          <X className="w-4 h-4 text-quest-text-tertiary" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-quest-accent/15 flex items-center justify-center mx-auto mb-4">
          <Swords className="w-7 h-7 text-quest-accent" />
        </div>

        <h2 className="text-base font-bold text-quest-text-primary mb-1">Sync ke Cloud</h2>
        <p className="text-xs text-quest-text-secondary mb-5 leading-relaxed">
          Login untuk backup data dan akses dari device lain. Data lokal tetap aman.
        </p>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-quest-text-primary text-quest-bg text-sm font-bold hover:bg-quest-text-secondary transition-colors disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          {isLoading ? 'Loading...' : 'Login dengan Google'}
        </button>

        <p className="text-[10px] text-quest-text-quaternary mt-3">
          Data tetap tersimpan lokal meski tidak login
        </p>
      </div>
    </div>
  );
}
