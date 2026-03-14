// =============================================================================
// shared/ui — Public Barrel Export
// Layer: shared
// Rule: Consumers import ONLY from this file. Never reach into internal files.
//   ✅  import { Button, Card } from '@/shared/ui'
//   ❌  import { Button } from '@/shared/ui/Button'
// =============================================================================

export { Button } from './Button';
export type {} from './Button';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

export { Badge } from './Badge';

export { Input, Textarea } from './Input';

export { Skeleton, CardSkeleton, RowSkeleton, StatSkeleton } from './Skeleton';

export { Spinner, PageLoader } from './Spinner';

export { Avatar, AvatarGroup } from './Avatar';
