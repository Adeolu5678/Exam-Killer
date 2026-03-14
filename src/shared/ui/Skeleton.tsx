import * as React from 'react';

// =============================================================================
// Skeleton & Shimmer
// Layer: shared/ui
// =============================================================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape variant */
  variant?: 'rect' | 'circle' | 'text';
  /** Width override (CSS value) */
  width?: string | number;
  /** Height override (CSS value) */
  height?: string | number;
}

export const Skeleton = ({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) => {
  const shapeClass =
    variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded h-4' : 'rounded-lg';

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={[
        'shimmer', // defined in utility classes in globals.css
        shapeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height:
          height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...style,
      }}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';

// ---------------------------------------------------------------------------
// Pre-built skeleton compositions for common surfaces
// ---------------------------------------------------------------------------

/** Skeleton for a workspace/content card */
export const CardSkeleton = () => (
  <div className="space-y-4 rounded-xl border border-border bg-bg-elevated p-6" aria-busy="true">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
      <Skeleton variant="circle" width={32} height={32} />
    </div>
    <div className="space-y-2 pt-2">
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="55%" />
    </div>
    <div className="flex gap-2 pt-2">
      <Skeleton width={60} height={24} className="rounded-full" />
      <Skeleton width={80} height={24} className="rounded-full" />
    </div>
  </div>
);

/** Skeleton for a table / list row */
export const RowSkeleton = () => (
  <div className="flex items-center gap-4 px-4 py-3" aria-busy="true">
    <Skeleton variant="circle" width={36} height={36} />
    <div className="flex-1 space-y-1.5">
      <Skeleton variant="text" width="50%" />
      <Skeleton variant="text" width="30%" height={12} />
    </div>
    <Skeleton width={64} height={28} className="rounded-full" />
  </div>
);

/** Skeleton for a stats number widget */
export const StatSkeleton = () => (
  <div className="space-y-3 rounded-xl border border-border bg-bg-elevated p-5" aria-busy="true">
    <Skeleton variant="text" width="40%" height={12} />
    <Skeleton variant="text" width="60%" height={32} />
    <Skeleton variant="text" width="30%" height={12} />
  </div>
);
