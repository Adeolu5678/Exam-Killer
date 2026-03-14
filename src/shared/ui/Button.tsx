import * as React from 'react';

// =============================================================================
// Button
// Layer: shared/ui
// =============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: any;
  href?: string; // Common for polymorphism with Link
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-glow-primary hover:shadow-glow-primary',
  secondary:
    'bg-bg-surface text-text-primary border border-border hover:border-border-accent hover:bg-bg-elevated',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface',
  destructive: 'bg-rose-muted text-rose border border-rose/20 hover:bg-rose hover:text-white',
  outline:
    'bg-transparent text-primary border border-primary/40 hover:bg-primary-muted hover:border-primary',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-6 text-base gap-2.5 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
};

const Spinner = ({ className = '' }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export const Button = React.forwardRef<any, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      as: Component = 'button',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <Component
        ref={ref}
        disabled={Component === 'button' ? isDisabled : undefined}
        aria-busy={loading}
        className={[
          'inline-flex items-center justify-center font-body font-medium',
          'transition-all duration-base ease-standard',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
          'disabled:pointer-events-none disabled:opacity-50',
          'select-none whitespace-nowrap',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? <Spinner className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} /> : leftIcon}
        {children && <span className={size === 'icon' ? 'sr-only' : undefined}>{children}</span>}
        {!loading && rightIcon}
      </Component>
    );
  },
);

Button.displayName = 'Button';
