'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, HelpCircle, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import type { PollAnalytics } from '@/lib/types';

interface OverviewTabProps {
  analytics: PollAnalytics;
}

export function OverviewTab({ analytics }: OverviewTabProps) {
  const { summary, questionStats, totalParticipants, totalQuestions } = analytics;

  // Find most and least responded questions
  const sortedByResponse = [...questionStats].sort((a, b) => b.responseRate - a.responseRate);
  const mostResponded = sortedByResponse.length > 0 ? sortedByResponse[0] : null;
  const leastResponded = sortedByResponse.length > 1 ? sortedByResponse[sortedByResponse.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-teal-500" />}
          label="Participants"
          value={totalParticipants}
        />
        <StatCard
          icon={<HelpCircle className="h-5 w-5 text-purple-500" />}
          label="Questions"
          value={totalQuestions}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
          label="Avg Response Rate"
          value={`${summary.avgResponseRate.toFixed(1)}%`}
        />
      </div>

      {/* Most/Least Responded Questions */}
      <div className="grid md:grid-cols-2 gap-4">
        {mostResponded && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Most Responded Question
              </CardTitle>
              <CardDescription>
                Q{mostResponded.questionIndex + 1}: {mostResponded.questionText.slice(0, 60)}
                {mostResponded.questionText.length > 60 ? '...' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={mostResponded.responseRate} className="flex-1" />
                <span className="text-sm font-medium w-16 text-right">
                  {mostResponded.responseRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {leastResponded && leastResponded.questionIndex !== mostResponded?.questionIndex && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Least Responded Question
              </CardTitle>
              <CardDescription>
                Q{leastResponded.questionIndex + 1}: {leastResponded.questionText.slice(0, 60)}
                {leastResponded.questionText.length > 60 ? '...' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={leastResponded.responseRate} className="flex-1" />
                <span className="text-sm font-medium w-16 text-right">
                  {leastResponded.responseRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Response Rate per Question */}
      <Card>
        <CardHeader>
          <CardTitle>Response Rate by Question</CardTitle>
          <CardDescription>How many participants answered each question</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questionStats.map((q, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[60%]">
                    Q{q.questionIndex + 1}: {q.questionText}
                  </span>
                  <span className="font-medium">
                    {q.totalResponded}/{totalParticipants} ({q.responseRate.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={q.responseRate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
