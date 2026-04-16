'use client';

import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export function NotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center">
      <XCircle className="w-16 h-16 text-destructive mb-4" />
      <h1 className="text-4xl font-bold mb-4">Game Not Found</h1>
      <p className="text-muted-foreground mb-8">This game may have been canceled or never existed.</p>
      <Button asChild>
        <a href="/host">Return to Dashboard</a>
      </Button>
    </div>
  );
}
