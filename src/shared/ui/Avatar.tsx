import * as React from 'react';

// =============================================================================
// Avatar
// Layer: shared/ui
// =============================================================================

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string; // Fallback: rendered as initials
  uid?: string; // Fallback: DiceBear identicon seed
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

/** Deterministically pick a background color from a string seed */
function seedColor(seed: string): string {
  const colors = [
    'from-blue-500 to-violet-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-teal-500 to-cyan-600',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Extract up to 2 initials from a full name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export const Avatar = ({ src, alt, name, uid, size = 'md', className = '' }: AvatarProps) => {
  const [imgError, setImgError] = React.useState(false);

  const seed = uid ?? name ?? 'user';
  const initials = name ? getInitials(name) : '?';
  const gradient = seedColor(seed);

  const showImage = src && !imgError;

  return (
    <span
      className={[
        'relative inline-flex shrink-0 items-center justify-center',
        'select-none overflow-hidden rounded-full',
        'ring-2 ring-border',
        sizeClasses[size],
        className,
      ].join(' ')}
      aria-label={alt ?? name ?? 'User avatar'}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? name ?? 'User avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} font-semibold text-white`}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
    </span>
  );
};

Avatar.displayName = 'Avatar';

// ---------------------------------------------------------------------------
// AvatarGroup — stacked overlapping avatars
// ---------------------------------------------------------------------------

interface AvatarGroupProps {
  users: Array<{ src?: string | null; name?: string; uid?: string }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export const AvatarGroup = ({ users, max = 4, size = 'sm', className = '' }: AvatarGroupProps) => {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className={`flex items-center ${className}`} aria-label={`${users.length} members`}>
      {visible.map((user, i) => (
        <span
          key={user.uid ?? user.name ?? i}
          className="-ml-2 rounded-full ring-2 ring-bg-base first:ml-0"
        >
          <Avatar {...user} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={[
            '-ml-2 rounded-full ring-2 ring-bg-base',
            'inline-flex items-center justify-center',
            'bg-bg-surface text-xs font-medium text-text-secondary',
            sizeClasses[size],
          ].join(' ')}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
};
