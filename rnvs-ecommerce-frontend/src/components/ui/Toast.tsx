'use client';

import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const toneStyles = {
  success: { icon: CheckCircle2, classes: 'bg-success-soft text-success border-success/20' },
  danger:  { icon: XCircle,      classes: 'bg-danger-soft text-danger border-danger/20' },
  neutral: { icon: Info,         classes: 'bg-paper text-ink border-mist' },
};

export default function Toast() {
  const { toasts, dismissToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => {
        const { icon: Icon, classes } = toneStyles[t.tone];
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium',
              classes,
            )}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
