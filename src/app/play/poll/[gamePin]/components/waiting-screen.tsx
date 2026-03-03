'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export function WaitingScreen() {
  return (
    <Card className="w-full max-w-md text-center shadow-2xl">
      <CardContent className="p-8">
        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold mb-2">Response Submitted!</h2>
        <p className="text-muted-foreground">
          Waiting for others to respond...
        </p>
      </CardContent>
    </Card>
  );
}
