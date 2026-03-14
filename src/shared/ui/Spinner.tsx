import * as React from 'react';

// =============================================================================
// Spinner
// Layer: shared/ui
// =============================================================================

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

export const Spinner = ({ size = 'md', className = '', label = 'Loading...' }: SpinnerProps) => (
  <span role="status" aria-label={label} className={`inline-flex ${className}`}>
    <span
      aria-hidden="true"
      className={[
        'rounded-full',
        'border-solid border-bg-surface border-t-primary',
        'animate-spin',
        sizeMap[size],
      ].join(' ')}
    />
    <span className="sr-only">{label}</span>
  </span>
);

Spinner.displayName = 'Spinner';

// ---------------------------------------------------------------------------
// Full-page loading overlay
// ---------------------------------------------------------------------------

export const PageLoader = ({ label = 'Loading...' }: { label?: string }) => (
  <div
    className="bg-bg-base/80 fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 backdrop-blur-sm"
    role="status"
    aria-label={label}
  >
    <div className="relative">
      {/* Outer glow ring */}
      <span className="bg-primary/10 absolute inset-0 animate-pulse rounded-full blur-lg" />
      <Spinner size="lg" className="relative" />
    </div>
    <p className="animate-pulse text-sm text-text-muted">{label}</p>
  </div>
);
