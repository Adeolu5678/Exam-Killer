import * as React from 'react';

// =============================================================================
// Card
// Layer: shared/ui
// =============================================================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Elevates border-color and shadow on hover */
  interactive?: boolean;
  /** Adds a soft glow effect matching the primary color */
  glow?: boolean;
  /** Inner padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { interactive = false, glow = false, padding = 'md', className = '', children, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={[
        'rounded-xl border border-border bg-bg-elevated',
        'transition-all duration-base ease-standard',
        interactive &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-border-accent hover:shadow-md',
        glow && 'shadow-glow-primary',
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  ),
);

Card.displayName = 'Card';

// ---------------------------------------------------------------------------
// Card sub-components for semantic composition
// ---------------------------------------------------------------------------

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`flex flex-col gap-1 ${className}`} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-semibold leading-tight tracking-tight text-text-primary ${className}`}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', ...props }, ref) => (
  <p ref={ref} className={`text-sm leading-relaxed text-text-secondary ${className}`} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`pt-4 ${className}`} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`mt-4 flex items-center border-t border-border pt-4 ${className}`}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';
