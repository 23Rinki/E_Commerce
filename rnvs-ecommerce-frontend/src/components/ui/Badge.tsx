import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'danger' | 'accent';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-mist-2 text-ink-2',
  success: 'bg-success-soft text-success',
  danger:  'bg-danger-soft text-danger',
  accent:  'bg-accent-soft text-accent-hover',
};

export default function Badge({ className, tone = 'neutral', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full leading-normal',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
