import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export default function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition-all cursor-pointer',
          error && 'border-red-500/50',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" className="bg-surface-overlay">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface-overlay">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
