'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { PlayerLeaveButton } from '@/components/app/player-leave-button';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { useAnonymousAuth } from '@/hooks/use-anonymous-auth';
import { usePlayerEvaluation } from './hooks/use-player-evaluation';
import { JoiningScreen } from './components/joining-screen';
import { CollectingScreen } from './components/collecting-screen';
import { RatingScreen } from './components/rating-screen';
import { WaitingScreen } from './components/waiting-screen';
import { ResultsScreen } from './components/results-screen';
import { EndedScreen } from './components/ended-screen';

export default function PlayerEvaluationPage() {
  const { uid, loading: authLoading } = useAnonymousAuth();

  if (authLoading || !uid) return <FullPageLoader />;

  return <EvaluationContent playerId={uid} />;
}

function EvaluationContent({ playerId }: { playerId: string }) {
  const {
    loading,
    itemsLoading,
    isJoining,
    isSubmitting,
    gamePin,
    game,
    activity,
    players,
    approvedItems,
    currentItem,
    metrics,
    playerState,
    playerName,
    playerId: evalPlayerId,
    ratings,
    currentItemIndex,
    submittedItemCount,
    newItemText,
    setNewItemText,
    newItemDescription,
    setNewItemDescription,
    setPlayerName,
    setCurrentItemIndex,
    progress,
    currentRatingsCount,
    totalRatingsNeeded,
    handleJoin,
    handleSubmitItem,
    handleRateMetric,
    handleSubmitRatings,
  } = usePlayerEvaluation(playerId);

  if (loading) {
    return <FullPageLoader />;
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle className="text-2xl mb-4">Session Not Found</CardTitle>
          <CardDescription>
            This session may have ended or the PIN is incorrect.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 relative">
      <div className="absolute top-6 left-6 z-20">
        <PlayerLeaveButton />
      </div>
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            <span className="text-lg font-semibold">{activity?.title || 'Evaluation'}</span>
          </div>
          {evalPlayerId && (
            <Badge variant="secondary">{playerName}</Badge>
          )}
        </div>

        {playerState === 'joining' && (
          <JoiningScreen
            gamePin={gamePin}
            playerName={playerName}
            setPlayerName={setPlayerName}
            isJoining={isJoining}
            handleJoin={handleJoin}
          />
        )}

        {playerState === 'collecting' && activity && (
          <CollectingScreen
            activity={activity}
            playersCount={players?.length || 0}
            submittedItemCount={submittedItemCount}
            newItemText={newItemText}
            setNewItemText={setNewItemText}
            newItemDescription={newItemDescription}
            setNewItemDescription={setNewItemDescription}
            isSubmitting={isSubmitting}
            handleSubmitItem={handleSubmitItem}
          />
        )}

        {playerState === 'rating' && activity && !itemsLoading && currentItem && (
          <RatingScreen
            approvedItems={approvedItems}
            currentItem={currentItem}
            currentItemIndex={currentItemIndex}
            setCurrentItemIndex={setCurrentItemIndex}
            metrics={metrics}
            ratings={ratings}
            progress={progress}
            currentRatingsCount={currentRatingsCount}
            totalRatingsNeeded={totalRatingsNeeded}
            isSubmitting={isSubmitting}
            handleRateMetric={handleRateMetric}
            handleSubmitRatings={handleSubmitRatings}
          />
        )}

        {playerState === 'waiting' && <WaitingScreen />}

        {playerState === 'results' && <ResultsScreen approvedItems={approvedItems} />}

        {playerState === 'ended' && <EndedScreen />}
      </div>
    </div>
  );
}
