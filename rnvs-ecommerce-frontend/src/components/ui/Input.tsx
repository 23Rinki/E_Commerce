import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3.5 py-2.5 text-sm text-ink bg-paper border border-mist rounded-xl',
        'placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft',
        'disabled:opacity-60 disabled:bg-mist-2 transition-colors',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export default Input;
