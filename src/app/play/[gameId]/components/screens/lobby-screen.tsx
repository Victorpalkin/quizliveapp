'use client';

import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Users, Lock, Lightbulb, MessageSquarePlus } from 'lucide-react';
import { QuestionSubmissionForm } from '../question-submission-form';
import type { CrowdsourceSettings, CrowdsourceState, QuestionSubmission } from '@/lib/types';

interface LobbyScreenProps {
  playerName: string;
  gamePin: string;
  gameId: string;
  playerId: string;
  crowdsourceSettings?: CrowdsourceSettings;
  crowdsourceState?: CrowdsourceState;
  playerSubmissions: QuestionSubmission[];
  onSubmissionComplete?: () => void;
}

export function LobbyScreen({
  playerName,
  gamePin,
  gameId,
  playerId,
  crowdsourceSettings,
  crowdsourceState,
  playerSubmissions,
  onSubmissionComplete,
}: LobbyScreenProps) {
  const isCrowdsourceEnabled = crowdsourceSettings?.enabled;
  const isSubmissionsLocked = crowdsourceState?.submissionsLocked;
  const maxSubmissions = crowdsourceSettings?.maxSubmissionsPerPlayer || 3;
  const currentSubmissionCount = playerSubmissions.length;
  const topicPrompt = crowdsourceSettings?.topicPrompt;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 md:p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Crowdsource Explanation & Submission - shown first when enabled */}
        {isCrowdsourceEnabled && (
          <>
            {/* Explanation Card */}
            <Card className="shadow-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-primary to-accent p-3">
                    <MessageSquarePlus className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold">Help Create the Quiz!</h2>
                </div>

                <div className="space-y-3 text-muted-foreground">
                  <p className="text-base md:text-lg">
                    While we wait for everyone to join, you can submit your own questions for the quiz!
                  </p>
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm md:text-base">
                      The best questions will be selected by AI and added to the game. Your question might be played by everyone!
                    </p>
                  </div>
                </div>

                {/* Topic Display */}
                {topicPrompt && (
                  <div className="bg-background/80 rounded-xl p-4 border border-card-border">
                    <p className="text-sm text-muted-foreground mb-1">Questions should be about:</p>
                    <p className="text-lg md:text-xl font-medium text-foreground">
                      {topicPrompt}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Submission Form or Locked State */}
            {isSubmissionsLocked ? (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <div className="p-6 text-center">
                  <Lock className="w-10 h-10 mx-auto text-amber-600 mb-3" />
                  <p className="text-lg font-medium text-amber-800 dark:text-amber-200">
                    Question submissions are closed
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    The host is reviewing the submitted questions...
                  </p>
                </div>
              </Card>
            ) : (
              <QuestionSubmissionForm
                gameId={gameId}
                playerId={playerId}
                playerName={playerName}
                maxSubmissions={maxSubmissions}
                currentSubmissionCount={currentSubmissionCount}
                topicPrompt={topicPrompt}
                onSubmissionComplete={onSubmissionComplete}
              />
            )}
          </>
        )}

        {/* Welcome Card */}
        <Card className="shadow-xl border border-card-border">
          <div className="p-8 md:p-12 space-y-6 text-center">
            {/* Icon Badge */}
            <div className="flex justify-center">
              <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-4 md:p-6">
                <Users className="w-12 h-12 md:w-16 md:h-16 text-white" />
              </div>
            </div>

            {/* Welcome Message */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-semibold">You're in, {playerName}!</h1>
              <p className="text-muted-foreground text-lg md:text-xl">Get ready to play...</p>
            </div>

            {/* Game PIN Display */}
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 md:p-6 border border-card-border">
              <p className="text-sm text-muted-foreground mb-2">Game PIN</p>
              <p className="text-3xl md:text-4xl font-mono font-semibold tracking-widest bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {gamePin}
              </p>
            </div>
          </div>
        </Card>

        {/* Loading indicator */}
        <div className="flex justify-center">
          <LoadingSpinner message="Waiting for the host to start the game..." />
        </div>
      </div>
    </div>
  );
}
