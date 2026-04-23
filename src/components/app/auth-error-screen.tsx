'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface AuthErrorScreenProps {
  onRetry: () => void;
}

export function AuthErrorScreen({ onRetry }: AuthErrorScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-6">
            Unable to connect to the game server. Please check your internet connection and try again.
          </p>
          <Button onClick={onRetry} size="lg" className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
