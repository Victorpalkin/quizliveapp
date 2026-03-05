'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function ProcessingState() {
  return (
    <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
      <CardContent className="p-12 text-center">
        <Loader2 className="h-16 w-16 mx-auto mb-6 text-blue-500 animate-spin" />
        <h2 className="text-2xl font-bold mb-2">Processing Submissions</h2>
        <p className="text-muted-foreground">
          AI is extracting and grouping topics...
        </p>
      </CardContent>
    </Card>
  );
}
