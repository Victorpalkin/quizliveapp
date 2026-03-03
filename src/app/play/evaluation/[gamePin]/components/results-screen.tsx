'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvaluationItem } from '@/lib/types';

interface ResultsScreenProps {
  approvedItems: EvaluationItem[];
}

export function ResultsScreen({ approvedItems }: ResultsScreenProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">Results</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground mb-4">
          Check the main screen for detailed results!
        </p>
        <div className="space-y-2">
          {approvedItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="text-xl font-bold text-primary">#{index + 1}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
