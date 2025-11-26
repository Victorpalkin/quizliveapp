'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Player } from '@/lib/types';

interface FreeResponseResult {
  playerName: string;
  textAnswer: string;
  isCorrect: boolean;
  points: number;
  wasTimeout: boolean;
}

interface FreeResponseResultsViewProps {
  responses: FreeResponseResult[];
  correctAnswer: string;
  alternativeAnswers?: string[];
}

export function FreeResponseResultsView({
  responses,
  correctAnswer,
  alternativeAnswers
}: FreeResponseResultsViewProps) {
  // Sort responses: correct first, then by points
  const sortedResponses = [...responses].sort((a, b) => {
    if (a.isCorrect && !b.isCorrect) return -1;
    if (!a.isCorrect && b.isCorrect) return 1;
    return b.points - a.points;
  });

  const correctCount = responses.filter(r => r.isCorrect).length;
  const timeoutCount = responses.filter(r => r.wasTimeout).length;
  const incorrectCount = responses.filter(r => !r.isCorrect && !r.wasTimeout).length;

  return (
    <Card className="w-full max-w-2xl flex-1">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Free Response Results</span>
          <div className="flex gap-2 text-sm">
            <Badge variant="default" className="bg-green-500">
              {correctCount} Correct
            </Badge>
            <Badge variant="destructive">
              {incorrectCount} Incorrect
            </Badge>
            {timeoutCount > 0 && (
              <Badge variant="secondary">
                {timeoutCount} Timeout
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Correct Answer Display */}
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Correct Answer:</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {correctAnswer}
          </p>
          {alternativeAnswers && alternativeAnswers.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Also accepted: {alternativeAnswers.join(', ')}
            </p>
          )}
        </div>

        {/* Player Responses */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {sortedResponses.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No responses yet
            </p>
          ) : (
            sortedResponses.map((response, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  response.isCorrect
                    ? 'bg-green-500/10 border border-green-500/30'
                    : response.wasTimeout
                    ? 'bg-muted/50 border border-muted'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {response.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : response.wasTimeout ? (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">{response.playerName}</p>
                    <p className={`text-sm ${
                      response.wasTimeout
                        ? 'text-muted-foreground italic'
                        : response.isCorrect
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {response.wasTimeout ? 'No answer (timeout)' : `"${response.textAnswer}"`}
                    </p>
                  </div>
                </div>
                <Badge variant={response.isCorrect ? 'default' : 'secondary'}>
                  {response.points} pts
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
