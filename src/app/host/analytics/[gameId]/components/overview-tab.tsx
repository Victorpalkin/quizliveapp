'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Clock, TrendingUp, TrendingDown, Users, HelpCircle } from 'lucide-react';
import type { GameAnalytics } from '@/lib/types';

interface OverviewTabProps {
  analytics: GameAnalytics;
}

export function OverviewTab({ analytics }: OverviewTabProps) {
  const { summary, questionStats, scoreDistribution, totalPlayers, totalQuestions, crowdsourceStats } = analytics;

  // Find hardest and easiest question details
  const hardestQ = summary.hardestQuestion !== null
    ? questionStats[summary.hardestQuestion.index]
    : null;
  const easiestQ = summary.easiestQuestion !== null
    ? questionStats[summary.easiestQuestion.index]
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label="Players"
          value={totalPlayers}
        />
        <StatCard
          icon={<HelpCircle className="h-5 w-5 text-purple-500" />}
          label="Questions"
          value={totalQuestions}
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-green-500" />}
          label="Avg Accuracy"
          value={`${summary.avgAccuracy.toFixed(1)}%`}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-yellow-500" />}
          label="Avg Score"
          value={Math.round(summary.avgScore).toLocaleString()}
        />
      </div>

      {/* Hardest/Easiest Questions */}
      <div className="grid md:grid-cols-2 gap-4">
        {hardestQ && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Hardest Question
              </CardTitle>
              <CardDescription>
                Q{summary.hardestQuestion!.index + 1}: {hardestQ.questionText.slice(0, 60)}
                {hardestQ.questionText.length > 60 ? '...' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={summary.hardestQuestion!.correctRate} className="flex-1" />
                <span className="text-sm font-medium w-16 text-right">
                  {summary.hardestQuestion!.correctRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {easiestQ && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Easiest Question
              </CardTitle>
              <CardDescription>
                Q{summary.easiestQuestion!.index + 1}: {easiestQ.questionText.slice(0, 60)}
                {easiestQ.questionText.length > 60 ? '...' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={summary.easiestQuestion!.correctRate} className="flex-1" />
                <span className="text-sm font-medium w-16 text-right">
                  {summary.easiestQuestion!.correctRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>How players&apos; final scores are distributed</CardDescription>
        </CardHeader>
        <CardContent>
          <ScoreHistogram bins={scoreDistribution} totalPlayers={totalPlayers} />
        </CardContent>
      </Card>

      {/* Timeout Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Average Timeout Rate
          </CardTitle>
          <CardDescription>
            Percentage of players who timed out on average per question
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={summary.avgTimeoutRate} className="flex-1" />
            <span className="text-sm font-medium w-16 text-right">
              {summary.avgTimeoutRate.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Crowdsource Stats */}
      {crowdsourceStats && (
        <Card>
          <CardHeader>
            <CardTitle>Crowdsourced Questions</CardTitle>
            <CardDescription>
              {crowdsourceStats.submissionsUsed} of {crowdsourceStats.totalSubmissions} submissions used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Top Contributors</h4>
              {crowdsourceStats.topContributors.slice(0, 5).map((contributor, idx) => (
                <div key={contributor.playerName} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{idx + 1}.</span>
                    {contributor.playerName}
                  </span>
                  <span className="text-muted-foreground">
                    {contributor.usedCount} used / {contributor.submissionCount} submitted
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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

function ScoreHistogram({ bins, totalPlayers }: { bins: GameAnalytics['scoreDistribution']; totalPlayers: number }) {
  if (bins.length === 0) {
    return <p className="text-muted-foreground text-sm">No score data available</p>;
  }

  const maxCount = Math.max(...bins.map(b => b.count));

  return (
    <div className="space-y-2">
      {bins.map((bin, idx) => {
        const percentage = (bin.count / totalPlayers) * 100;
        const barWidth = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;

        return (
          <div key={idx} className="flex items-center gap-3 text-sm">
            <span className="w-24 text-right text-muted-foreground">
              {bin.minScore.toLocaleString()} - {bin.maxScore.toLocaleString()}
            </span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="w-16 text-muted-foreground">
              {bin.count} ({percentage.toFixed(0)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
