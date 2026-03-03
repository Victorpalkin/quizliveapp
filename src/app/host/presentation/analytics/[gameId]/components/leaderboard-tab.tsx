'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import type { PresentationAnalytics } from '../hooks/use-analytics';

interface LeaderboardTabProps {
  analytics: PresentationAnalytics;
}

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

export function LeaderboardTab({ analytics }: LeaderboardTabProps) {
  const { playerEngagement } = analytics;

  // Sort by score
  const sorted = [...playerEngagement].sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No leaderboard data available.</p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Final Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sorted.map((player, i) => (
              <motion.div
                key={player.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-muted/30"
                style={{
                  backgroundColor: i < 3 ? `${PODIUM_COLORS[i]}10` : undefined,
                  boxShadow: i < 3 ? `0 0 16px ${PODIUM_COLORS[i]}10` : undefined,
                }}
              >
                {/* Position */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: i < 3 ? PODIUM_COLORS[i] : 'hsl(var(--muted))',
                    color: i < 3 ? '#000' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {i < 3 ? MEDAL_EMOJI[i] : i + 1}
                </div>

                <span className="flex-1 font-medium">{player.playerName}</span>
                <span className="font-mono font-bold">
                  <AnimatedScore value={player.score} />
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
