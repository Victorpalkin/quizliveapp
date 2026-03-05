'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import type { EvaluationItem, Player, PlayerRatings } from '@/lib/types';

interface RatingStateProps {
  approvedItems: EvaluationItem[];
  players: Player[] | null;
  ratings: PlayerRatings[] | null;
  ratingsCount: number;
  playersCount: number;
  isTransitioning: boolean;
  handleEndRating: () => void;
}

export function RatingState({
  approvedItems,
  players,
  ratings,
  ratingsCount,
  playersCount,
  isTransitioning,
  handleEndRating,
}: RatingStateProps) {
  return (
    <>
      <Card className="border border-card-border shadow-sm">
        <CardHeader>
          <CardTitle>Rating in Progress</CardTitle>
          <CardDescription>
            Participants are rating items on your metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Responses</p>
              <p className="text-3xl font-bold">
                {ratingsCount} / {playersCount}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Items to Rate</p>
              <p className="text-3xl font-bold">{approvedItems.length}</p>
            </div>
          </div>

          {/* Progress per participant */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Participant Progress</p>
            {players?.map((player) => {
              const playerRating = ratings?.find(r => r.playerId === player.id);
              const hasSubmitted = !!playerRating;
              return (
                <div key={player.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span>{player.name}</span>
                  {hasSubmitted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
          <div>
            <CardTitle className="text-xl mb-2">End Rating?</CardTitle>
            <CardDescription>
              This will calculate results based on current submissions
            </CardDescription>
          </div>
          <Button
            onClick={handleEndRating}
            disabled={isTransitioning}
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
          >
            {isTransitioning ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <ChevronRight className="h-5 w-5 mr-2" />
            )}
            End Rating & Show Results
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
