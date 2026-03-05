'use client';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

export function WaitingScreen() {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-8 text-center">
        <Check className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <CardTitle className="text-2xl mb-2">Ratings Submitted!</CardTitle>
        <CardDescription>
          Waiting for host to reveal results...
        </CardDescription>
      </CardContent>
    </Card>
  );
}
