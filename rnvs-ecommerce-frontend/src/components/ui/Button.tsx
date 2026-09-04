import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:     'bg-ink text-white hover:bg-ink-soft shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-50',
  secondary:   'bg-paper text-ink border border-mist hover:border-ink hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-50',
  ghost:       'bg-transparent text-ink-2 hover:bg-mist-2 hover:text-ink disabled:opacity-50',
  destructive: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 text-xs px-4 gap-1.5',
  md: 'h-11 text-sm px-6 gap-2',
  lg: 'h-12 text-base px-7 gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 whitespace-nowrap',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export default Button;
