'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PresentationAnalytics } from '../hooks/use-analytics';

interface EngagementTabProps {
  analytics: PresentationAnalytics;
}

export function EngagementTab({ analytics }: EngagementTabProps) {
  const { playerEngagement } = analytics;

  if (playerEngagement.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No engagement data available.</p>
    );
  }

  // Sort by responses submitted (most active first)
  const sorted = [...playerEngagement].sort((a, b) => b.responsesSubmitted - a.responsesSubmitted);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Player Engagement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Player</th>
                <th className="text-right py-2 px-2">Responses</th>
                <th className="text-right py-2 px-2">Avg Time</th>
                <th className="text-right py-2 px-2">Max Streak</th>
                <th className="text-right py-2 px-2">Reactions</th>
                <th className="text-right py-2 pl-2">Questions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player) => (
                <tr key={player.playerId} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{player.playerName}</td>
                  <td className="text-right py-2 px-2">{player.responsesSubmitted}</td>
                  <td className="text-right py-2 px-2">{player.averageResponseTime.toFixed(1)}s</td>
                  <td className="text-right py-2 px-2">{player.maxStreak}</td>
                  <td className="text-right py-2 px-2">{player.reactionsCount}</td>
                  <td className="text-right py-2 pl-2">{player.questionsAsked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
