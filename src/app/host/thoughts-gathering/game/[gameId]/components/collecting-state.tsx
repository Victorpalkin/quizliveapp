'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StopCircle, MessageSquare, PlayCircle, PauseCircle, XCircle, EyeOff, Eye } from 'lucide-react';
import { LiveWordFrequency } from './live-word-frequency';
import type { Game, ThoughtsGatheringActivity, ThoughtSubmission } from '@/lib/types';

interface CollectingStateProps {
  game: Game;
  activity: ThoughtsGatheringActivity | null;
  players: { id: string; name: string }[] | null;
  submissions: ThoughtSubmission[] | null;
  handleToggleSubmissions: () => void;
  handleStopAndProcess: () => void;
  handleEndSession: () => void;
  handleToggleSubmissionVisibility?: (submissionId: string, hidden: boolean) => void;
}

export function CollectingState({
  game,
  activity,
  players,
  submissions,
  handleToggleSubmissions,
  handleStopAndProcess,
  handleEndSession,
  handleToggleSubmissionVisibility,
}: CollectingStateProps) {
  const moderationEnabled = activity?.config.enableModeration;
  const hiddenCount = submissions?.filter(s => s.hidden).length || 0;
  const visibleSubmissions = moderationEnabled
    ? submissions
    : submissions?.slice(-5).reverse();
  return (
    <div className="space-y-6">
      {/* Submission Status */}
      <Card className={`border-2 ${game.submissionsOpen ? 'border-green-500/30 bg-gradient-to-br from-green-500/5 to-blue-500/5' : 'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MessageSquare className={`h-10 w-10 ${game.submissionsOpen ? 'text-green-500' : 'text-orange-500'}`} />
              <div>
                <p className="text-4xl font-bold">{submissions?.length || 0}</p>
                <p className="text-muted-foreground">Submissions</p>
              </div>
            </div>
            <Button
              onClick={handleToggleSubmissions}
              variant={game.submissionsOpen ? "outline" : "default"}
              size="lg"
              className={game.submissionsOpen ? '' : 'bg-green-500 hover:bg-green-600'}
            >
              {game.submissionsOpen ? (
                <>
                  <PauseCircle className="mr-2 h-5 w-5" />
                  Pause Submissions
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Resume Submissions
                </>
              )}
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {game.submissionsOpen
              ? 'Participants can submit their interests now'
              : 'Submissions are paused - participants are waiting'}
          </p>
        </CardContent>
      </Card>

      {/* Prompt */}
      <Card className="border border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg italic">&quot;{activity?.config.prompt}&quot;</p>
        </CardContent>
      </Card>

      {/* Submissions */}
      {submissions && submissions.length > 0 && (
        <Card className="border border-card-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {moderationEnabled ? 'All Submissions' : 'Recent Submissions'}
              </CardTitle>
              {moderationEnabled && hiddenCount > 0 && (
                <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  {hiddenCount} hidden
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`space-y-2 overflow-y-auto ${moderationEnabled ? 'max-h-72' : 'max-h-48'}`}>
              {(moderationEnabled ? submissions : submissions.slice(-5).reverse()).map(sub => (
                <div
                  key={sub.id}
                  className={`flex items-start gap-3 p-2 rounded-lg ${sub.hidden ? 'bg-muted/40 opacity-60' : 'bg-muted'}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">
                      {activity?.config.anonymousMode ? 'Participant' : sub.playerName}:
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">{sub.rawText}</span>
                  </div>
                  {moderationEnabled && handleToggleSubmissionVisibility && (
                    <button
                      onClick={() => handleToggleSubmissionVisibility(sub.id, !sub.hidden)}
                      className="flex-shrink-0 p-1 rounded hover:bg-background/50 transition-colors"
                      title={sub.hidden ? 'Show submission' : 'Hide submission'}
                    >
                      {sub.hidden ? (
                        <EyeOff className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Word Frequency */}
      <LiveWordFrequency submissions={submissions} />

      {/* Participants */}
      {players && players.length > 0 && (
        <Card className="border border-card-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Participants</CardTitle>
              <span className="text-sm text-muted-foreground">{players.length} joined</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {players.map(player => (
                <span
                  key={player.id}
                  className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium"
                >
                  {player.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleStopAndProcess}
          size="lg"
          disabled={!submissions?.length}
          className="flex-1 py-6 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
        >
          <StopCircle className="mr-2 h-6 w-6" />
          Analyze Results
        </Button>
        <Button
          onClick={handleEndSession}
          size="lg"
          variant="outline"
          className="py-6 text-lg"
        >
          <XCircle className="mr-2 h-5 w-5" />
          Finish
        </Button>
      </div>
    </div>
  );
}
