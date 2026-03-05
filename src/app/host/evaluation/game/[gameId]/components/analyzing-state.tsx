'use client';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function AnalyzingState() {
  return (
    <Card className="border border-card-border shadow-sm">
      <CardContent className="p-12 text-center">
        <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
        <CardTitle className="text-2xl mb-2">Analyzing Results</CardTitle>
        <CardDescription>
          Computing aggregate rankings and consensus...
        </CardDescription>
      </CardContent>
    </Card>
  );
}
