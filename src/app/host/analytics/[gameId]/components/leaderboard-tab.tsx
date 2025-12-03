'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Medal, Search } from 'lucide-react';
import type { GameAnalytics, LeaderboardWithStats } from '@/lib/types';

interface LeaderboardTabProps {
  analytics: GameAnalytics;
}

export function LeaderboardTab({ analytics }: LeaderboardTabProps) {
  const { fullLeaderboard, totalQuestions } = analytics;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeaderboard = searchQuery
    ? fullLeaderboard.filter(player =>
        player.playerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : fullLeaderboard;

  return (
    <div className="space-y-6">
      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
        {fullLeaderboard.length >= 2 && (
          <PodiumCard player={fullLeaderboard[1]} position={2} />
        )}
        {fullLeaderboard.length >= 1 && (
          <PodiumCard player={fullLeaderboard[0]} position={1} />
        )}
        {fullLeaderboard.length >= 3 && (
          <PodiumCard player={fullLeaderboard[2]} position={3} />
        )}
      </div>

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Full Leaderboard</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Correct</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Accuracy</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Timeouts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaderboard.map((player) => (
                  <TableRow key={player.playerId}>
                    <TableCell>
                      <RankBadge rank={player.rank} />
                    </TableCell>
                    <TableCell className="font-medium">{player.playerName}</TableCell>
                    <TableCell className="text-right font-bold">
                      {player.finalScore.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {player.correctAnswers}/{totalQuestions}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {player.accuracy.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {player.timeouts > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {player.timeouts}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeaderboard.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No players found matching &quot;{searchQuery}&quot;
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PodiumCard({ player, position }: { player: LeaderboardWithStats; position: 1 | 2 | 3 }) {
  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const colors = {
    1: 'bg-yellow-500/10 border-yellow-500',
    2: 'bg-gray-400/10 border-gray-400',
    3: 'bg-orange-600/10 border-orange-600',
  };
  const icons = {
    1: <Trophy className="h-8 w-8 text-yellow-500" />,
    2: <Medal className="h-7 w-7 text-gray-400" />,
    3: <Medal className="h-6 w-6 text-orange-600" />,
  };

  return (
    <Card
      className={`${colors[position]} border-2 ${position === 1 ? 'order-2' : position === 2 ? 'order-1 self-end' : 'order-3 self-end'}`}
    >
      <CardContent className={`pt-4 flex flex-col items-center ${heights[position]}`}>
        {icons[position]}
        <p className="font-bold mt-2 text-center truncate w-full">{player.playerName}</p>
        <p className="text-lg font-bold">{player.finalScore.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600">
        <Trophy className="h-3 w-3 mr-1" />
        1
      </Badge>
    );
  }
  if (rank === 2) {
    return (
      <Badge variant="secondary" className="bg-gray-300 text-gray-800">
        2
      </Badge>
    );
  }
  if (rank === 3) {
    return (
      <Badge variant="secondary" className="bg-orange-200 text-orange-800">
        3
      </Badge>
    );
  }
  return <span className="text-muted-foreground pl-2">{rank}</span>;
}
