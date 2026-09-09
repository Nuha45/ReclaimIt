import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-accent text-surface font-semibold hover:bg-accent-hover shadow-lg shadow-accent/20',
    secondary: 'bg-surface-overlay text-text-primary border border-border hover:bg-surface-raised',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
    outline: 'border border-accent/50 text-accent hover:bg-accent/10',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
