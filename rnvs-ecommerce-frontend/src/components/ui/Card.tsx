import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-8',
};

export default function Card({ className, hoverable, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-paper border border-mist rounded-2xl',
        hoverable && 'transition-shadow hover:shadow-lg',
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
