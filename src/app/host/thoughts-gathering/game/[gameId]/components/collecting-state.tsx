'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, MessageSquare, PlayCircle, PauseCircle, XCircle, EyeOff, Eye, Send, Loader2, Users, ChevronDown, ChevronRight } from 'lucide-react';
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
  onHostSubmit: (text: string) => Promise<void>;
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
  onHostSubmit,
}: CollectingStateProps) {
  const [hostSubmissionText, setHostSubmissionText] = useState('');
  const [isHostSubmitting, setIsHostSubmitting] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const { toast } = useToast();
  const moderationEnabled = activity?.config.enableModeration;
  const hiddenCount = submissions?.filter(s => s.hidden).length || 0;

  return (
    <div className="space-y-4 pb-28">
      {/* Live Collection — merged: status + prompt + host submission + participants */}
      <Card className={`border-2 ${game.submissionsOpen ? 'border-green-500/30 bg-gradient-to-br from-green-500/5 to-blue-500/5' : 'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5'}`}>
        <CardContent className="p-5 space-y-4">
          {/* Status row: count + pause/resume */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MessageSquare className={`h-8 w-8 ${game.submissionsOpen ? 'text-green-500' : 'text-orange-500'}`} />
              <div>
                <p className="text-3xl font-bold">{submissions?.length || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {submissions?.length === 1 ? 'submission' : 'submissions'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleToggleSubmissions}
              variant={game.submissionsOpen ? "outline" : "default"}
              size="sm"
              className={game.submissionsOpen ? '' : 'bg-green-500 hover:bg-green-600'}
            >
              {game.submissionsOpen ? (
                <>
                  <PauseCircle className="mr-1.5 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <PlayCircle className="mr-1.5 h-4 w-4" />
                  Resume
                </>
              )}
            </Button>
          </div>

          {/* Prompt */}
          <p className="text-base italic text-muted-foreground border-l-2 border-muted pl-3">
            {activity?.config.prompt}
          </p>

          {/* Host submission — always visible during collecting */}
          <div className="flex gap-2">
            <Textarea
              value={hostSubmissionText}
              onChange={(e) => setHostSubmissionText(e.target.value)}
              placeholder="Add your own thought..."
              className="min-h-[50px] flex-1 text-sm"
              maxLength={1000}
            />
            <Button
              onClick={async () => {
                setIsHostSubmitting(true);
                try {
                  await onHostSubmit(hostSubmissionText);
                  setHostSubmissionText('');
                } catch {
                  toast({ variant: 'destructive', title: 'Error', description: 'Could not submit. Please try again.' });
                } finally {
                  setIsHostSubmitting(false);
                }
              }}
              disabled={isHostSubmitting || !hostSubmissionText.trim()}
              size="icon"
              className="self-end h-9 w-9"
            >
              {isHostSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Participants — collapsible */}
          {players && players.length > 0 && (
            <Collapsible open={participantsOpen} onOpenChange={setParticipantsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Users className="h-3.5 w-3.5" />
                  <span>{players.length} participant{players.length !== 1 ? 's' : ''}</span>
                  {participantsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {players.map(player => (
                    <span
                      key={player.id}
                      className="px-2 py-1 bg-muted rounded-full text-xs font-medium"
                    >
                      {player.name}
                    </span>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
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
            {!moderationEnabled && submissions.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Showing latest 5 of {submissions.length}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Word Frequency */}
      <LiveWordFrequency submissions={submissions} />

      {/* Sticky Action Bar with keyboard hints */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-3xl p-3">
          <div className="flex gap-3">
            <Button
              onClick={handleStopAndProcess}
              size="lg"
              disabled={!submissions?.length}
              className="flex-1 py-5 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Analyze Results
            </Button>
            <Button
              onClick={handleEndSession}
              size="lg"
              variant="outline"
              className="py-5"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Finish
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="px-1 py-0.5 bg-muted rounded font-mono">{'\u2423'}</kbd>
              {game.submissionsOpen ? 'Pause' : 'Resume'}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="px-1 py-0.5 bg-muted rounded font-mono">{'\u21B5'}</kbd>
              Analyze
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
