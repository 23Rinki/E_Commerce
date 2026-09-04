import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export default function FormField({ label, error, required, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-semibold text-ink-2">
          {label}
          {required && <span className="text-accent ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
