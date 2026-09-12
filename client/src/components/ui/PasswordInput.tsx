import { forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div
          className={cn(
            'relative rounded-xl transition-[box-shadow] duration-300 ease-out',
            visible && 'shadow-[inset_0_0_0_1px_rgba(255,179,71,0.35)]'
          )}
        >
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            autoComplete={props.autoComplete}
            className={cn(
              'reclaim-password-field w-full px-4 py-2.5 pr-[4.75rem] bg-surface-overlay border border-border rounded-xl text-text-primary placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50',
              'transition-all duration-300 ease-out',
              visible && 'border-accent/40',
              error && 'border-red-500/50 focus:ring-red-500/30',
              className
            )}
            {...props}
          />
          <button
            type="button"
            aria-pressed={visible}
            aria-label={visible ? 'Hide password' : 'Find password'}
            onClick={() => setVisible((v) => !v)}
            className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2 min-h-[2.75rem] min-w-[2.75rem] px-2',
              'flex items-center justify-center rounded-lg cursor-pointer',
              'text-xs font-semibold tracking-wide transition-colors duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-overlay',
              visible
                ? 'text-text-secondary hover:text-text-primary'
                : 'text-accent hover:text-accent/90'
            )}
          >
            <span className="relative inline-block h-4 min-w-[2.25rem] text-center">
              <span
                className={cn(
                  'absolute inset-0 transition-all duration-200 ease-out',
                  visible ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                )}
                aria-hidden={visible}
              >
                Find
              </span>
              <span
                className={cn(
                  'absolute inset-0 transition-all duration-200 ease-out',
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                )}
                aria-hidden={!visible}
              >
                Hide
              </span>
            </span>
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
