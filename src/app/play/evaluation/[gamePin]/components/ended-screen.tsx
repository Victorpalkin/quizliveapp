'use client';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export function EndedScreen() {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-8 text-center">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <CardTitle className="text-2xl mb-2">Session Ended</CardTitle>
        <CardDescription>
          Thank you for participating!
        </CardDescription>
      </CardContent>
    </Card>
  );
}
