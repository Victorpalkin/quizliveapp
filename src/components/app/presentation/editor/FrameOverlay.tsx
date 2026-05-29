'use client';

import { cn } from '@/lib/utils';

/** Frame border + name badge. Purely visual; click-to-focus is handled by the wrapper. */
export function FrameOverlay({ name, active }: { name: string; active?: boolean }) {
  return (
    <>
      <div
        className={cn(
          'absolute -top-6 left-0 max-w-full truncate rounded px-1.5 py-0.5 text-xs',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {name}
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-sm border',
          active ? 'border-primary' : 'border-border'
        )}
      />
    </>
  );
}
