'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PresentationAnalytics } from '../hooks/use-analytics';

interface SlidesTabProps {
  analytics: PresentationAnalytics;
}

export function SlidesTab({ analytics }: SlidesTabProps) {
  const { elementStats } = analytics;

  if (elementStats.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No interactive element data available.</p>
    );
  }

  return (
    <div className="space-y-4">
      {elementStats.map((stat, i) => (
        <Card key={stat.elementId || i}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="capitalize">{stat.elementType}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {stat.totalResponses} responses
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {stat.correctPercentage !== undefined && (
                <div>
                  <p className="text-muted-foreground">Correct</p>
                  <p className="text-lg font-bold text-green-600">{stat.correctPercentage.toFixed(0)}%</p>
                </div>
              )}
              {stat.averageRating !== undefined && (
                <div>
                  <p className="text-muted-foreground">Avg Rating</p>
                  <p className="text-lg font-bold">{stat.averageRating.toFixed(1)}</p>
                </div>
              )}
              {stat.averageTimeRemaining !== undefined && (
                <div>
                  <p className="text-muted-foreground">Avg Time Left</p>
                  <p className="text-lg font-bold">{stat.averageTimeRemaining.toFixed(1)}s</p>
                </div>
              )}
            </div>

            {stat.distribution && stat.distribution.length > 0 && (
              <div className="mt-4 space-y-2">
                {stat.distribution.map((count, j) => {
                  const max = Math.max(...stat.distribution!, 1);
                  return (
                    <div key={j} className="flex items-center gap-2">
                      <span className="text-xs w-20 text-right text-muted-foreground">Option {j + 1}</span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs w-8 font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
