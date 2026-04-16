'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { BarChart3, Home } from 'lucide-react';

export function EndedScreen() {
  const router = useRouter();

  return (
    <Card className="shadow-lg">
      <CardContent className="p-8 text-center">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <CardTitle className="text-2xl mb-2">Session Ended</CardTitle>
        <CardDescription className="mb-6">
          Thank you for participating!
        </CardDescription>
        <Button onClick={() => router.push('/join')} size="lg" className="w-full">
          <Home className="mr-2 h-5 w-5" /> Join Another Game
        </Button>
      </CardContent>
    </Card>
  );
}
