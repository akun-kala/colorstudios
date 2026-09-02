import { CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface Props {
  message: string;
  type: 'success' | 'info' | 'warning';
}

const icons = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'text-quest-positive',
  info: 'text-quest-accent',
  warning: 'text-quest-warning',
};

export function Toast({ message, type }: Props) {
  const Icon = icons[type];
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-quest-surface border border-quest-border shadow-lg">
        <Icon className={`w-4 h-4 ${colors[type]}`} />
        <span className="text-xs font-medium text-quest-text-primary">{message}</span>
      </div>
    </div>
  );
}
