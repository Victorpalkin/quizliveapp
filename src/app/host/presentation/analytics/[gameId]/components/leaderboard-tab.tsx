'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Trophy, Target, CheckCircle, Award } from 'lucide-react';
import type { PresentationAnalytics, PlayerEngagementStats } from '@/lib/types';

interface LeaderboardTabProps {
  analytics: PresentationAnalytics;
}

type SortKey = 'engagement' | 'responses' | 'responseRate' | 'score' | 'correct';
type SortOrder = 'asc' | 'desc';

export function LeaderboardTab({ analytics }: LeaderboardTabProps) {
  const { playerEngagement, interactiveSlides, summary } = analytics;

  const [sortKey, setSortKey] = useState<SortKey>('engagement');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Check if presentation has scored slides (quiz)
  const hasScores = playerEngagement.some(p => (p.totalScore ?? 0) > 0);

  // Sort players
  const sortedPlayers = useMemo(() => {
    const sorted = [...playerEngagement].sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortKey) {
        case 'engagement':
          aVal = a.engagementScore;
          bVal = b.engagementScore;
          break;
        case 'responses':
          aVal = a.responsesSubmitted;
          bVal = b.responsesSubmitted;
          break;
        case 'responseRate':
          aVal = a.responseRate;
          bVal = b.responseRate;
          break;
        case 'score':
          aVal = a.totalScore ?? 0;
          bVal = b.totalScore ?? 0;
          break;
        case 'correct':
          aVal = a.correctAnswers ?? 0;
          bVal = b.correctAnswers ?? 0;
          break;
        default:
          aVal = a.engagementScore;
          bVal = b.engagementScore;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return sorted;
  }, [playerEngagement, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const SortButton = ({ sortKeyValue, label }: { sortKeyValue: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 px-2 ${sortKey === sortKeyValue ? 'text-primary' : ''}`}
      onClick={() => handleSort(sortKeyValue)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 ml-1" />
    </Button>
  );

  // Top 3 for podium
  const topThree = sortedPlayers.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Podium for top 3 */}
      {sortedPlayers.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-4 py-4">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-gray-600">2</span>
                </div>
                <p className="font-medium text-sm truncate max-w-20 text-center">{topThree[1]?.playerName}</p>
                <Badge variant="secondary" className="mt-1">
                  {topThree[1]?.engagementScore.toFixed(0)}%
                </Badge>
                <div className="w-16 h-20 bg-gray-200 mt-2 rounded-t" />
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <Award className="h-8 w-8 text-yellow-500 mb-1" />
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-2 border-2 border-yellow-400">
                  <span className="text-3xl font-bold text-yellow-600">1</span>
                </div>
                <p className="font-bold text-sm truncate max-w-24 text-center">{topThree[0]?.playerName}</p>
                <Badge className="mt-1 bg-yellow-500">
                  {topThree[0]?.engagementScore.toFixed(0)}%
                </Badge>
                <div className="w-20 h-28 bg-yellow-100 mt-2 rounded-t border-2 border-yellow-400 border-b-0" />
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-orange-600">3</span>
                </div>
                <p className="font-medium text-sm truncate max-w-20 text-center">{topThree[2]?.playerName}</p>
                <Badge variant="secondary" className="mt-1 bg-orange-100">
                  {topThree[2]?.engagementScore.toFixed(0)}%
                </Badge>
                <div className="w-16 h-14 bg-orange-100 mt-2 rounded-t" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Leaderboard</CardTitle>
          <CardDescription>
            All {playerEngagement.length} players ranked by engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 items-center py-2 border-b text-sm font-medium">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-3">Player</div>
            <div className="col-span-2 text-center">
              <SortButton sortKeyValue="engagement" label="Engagement" />
            </div>
            <div className="col-span-2 text-center">
              <SortButton sortKeyValue="responses" label="Responses" />
            </div>
            <div className="col-span-2 text-center">
              <SortButton sortKeyValue="responseRate" label="Rate" />
            </div>
            {hasScores && (
              <div className="col-span-2 text-center">
                <SortButton sortKeyValue="score" label="Score" />
              </div>
            )}
          </div>

          {/* Player Rows */}
          <div className="divide-y">
            {sortedPlayers.map((player, idx) => (
              <PlayerRow
                key={player.playerId}
                player={player}
                rank={idx + 1}
                interactiveSlides={interactiveSlides}
                hasScores={hasScores}
              />
            ))}
          </div>

          {sortedPlayers.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No players participated in this presentation
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlayerRow({
  player,
  rank,
  interactiveSlides,
  hasScores,
}: {
  player: PlayerEngagementStats;
  rank: number;
  interactiveSlides: number;
  hasScores: boolean;
}) {
  // Determine rank styling
  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-700 font-bold';
      case 2:
        return 'bg-gray-100 text-gray-700 font-bold';
      case 3:
        return 'bg-orange-100 text-orange-700 font-bold';
      default:
        return 'text-muted-foreground';
    }
  };

  // Engagement color
  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-lime-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-3 text-sm hover:bg-muted/50 transition-colors">
      {/* Rank */}
      <div className="col-span-1 text-center">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${getRankStyle()}`}>
          {rank}
        </span>
      </div>

      {/* Player Name */}
      <div className="col-span-3 font-medium truncate" title={player.playerName}>
        {player.playerName}
      </div>

      {/* Engagement Score */}
      <div className="col-span-2 flex items-center justify-center gap-2">
        <Progress
          value={player.engagementScore}
          className="w-12 h-2"
        />
        <span className="text-xs w-10 text-right">
          {player.engagementScore.toFixed(0)}%
        </span>
      </div>

      {/* Responses */}
      <div className="col-span-2 text-center">
        <span className="font-medium">{player.responsesSubmitted}</span>
        <span className="text-muted-foreground">/{interactiveSlides}</span>
      </div>

      {/* Response Rate */}
      <div className="col-span-2 text-center">
        {player.responseRate.toFixed(0)}%
      </div>

      {/* Score (if applicable) */}
      {hasScores && (
        <div className="col-span-2 text-center font-medium">
          {(player.totalScore ?? 0).toLocaleString()}
          {(player.correctAnswers ?? 0) > 0 && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {player.correctAnswers}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
