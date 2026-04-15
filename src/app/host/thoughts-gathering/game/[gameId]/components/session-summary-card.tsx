'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface SessionSummaryCardProps {
  summary: string | undefined;
}

export function SessionSummaryCard({ summary }: SessionSummaryCardProps) {
  if (!summary) return null;

  return (
    <Card className="border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-2">Session Summary</h3>
            <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {summary}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
