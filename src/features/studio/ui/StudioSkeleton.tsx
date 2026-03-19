import React from 'react';

import { Card, Skeleton } from '@/shared/ui';

import styles from './StudioCard.module.css';

export const StudioSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className={styles.card}>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <div className="min-height-[200px] flex items-center justify-center">
              <Skeleton className="h-32 w-4/5 rounded-lg" />
            </div>
            <Skeleton className="mt-6 h-10 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
};
