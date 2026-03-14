import * as React from 'react';

// =============================================================================
// Badge
// Layer: shared/ui
// =============================================================================

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'violet' | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Shows a small dot indicator to the left of children */
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-surface text-text-secondary border border-border',
  primary: 'bg-primary-muted text-primary border border-primary/20',
  success: 'bg-emerald-muted text-emerald border border-emerald/20',
  warning: 'bg-amber-muted text-amber border border-amber/20',
  error: 'bg-rose-muted text-rose border border-rose/20',
  violet: 'bg-violet-muted text-violet border border-violet/20',
  outline: 'bg-transparent text-text-secondary border border-border',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-muted',
  primary: 'bg-primary',
  success: 'bg-emerald',
  warning: 'bg-amber',
  error: 'bg-rose',
  violet: 'bg-violet',
  outline: 'bg-text-muted',
};

export const Badge = ({
  variant = 'default',
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) => (
  <span
    className={[
      'inline-flex items-center gap-1.5',
      'rounded-full px-2 py-0.5 text-xs font-medium',
      'transition-colors duration-fast ease-standard',
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  >
    {dot && (
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColors[variant]}`}
        aria-hidden="true"
      />
    )}
    {children}
  </span>
);

Badge.displayName = 'Badge';
