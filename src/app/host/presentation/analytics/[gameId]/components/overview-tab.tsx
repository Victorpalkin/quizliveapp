'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Heart, HelpCircle } from 'lucide-react';
import type { PresentationAnalytics } from '../hooks/use-analytics';

interface OverviewTabProps {
  analytics: PresentationAnalytics;
}

export function OverviewTab({ analytics }: OverviewTabProps) {
  const stats = [
    { label: 'Players', value: analytics.totalPlayers, icon: Users, color: 'text-blue-500' },
    { label: 'Responses', value: analytics.totalResponses, icon: MessageSquare, color: 'text-green-500' },
    { label: 'Reactions', value: analytics.totalReactions, icon: Heart, color: 'text-red-500' },
    { label: 'Questions', value: analytics.totalQuestions, icon: HelpCircle, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-primary">
            {analytics.averageScore.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">points per player</p>
        </CardContent>
      </Card>
    </div>
  );
}
