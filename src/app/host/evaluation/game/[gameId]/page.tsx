'use client';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { GameHeader, KeyboardShortcutsHint } from '@/components/app/game-header';
import { HostActionHint, ReadinessChecklist } from '@/components/app/host-action-hint';
import { useEvaluationGame } from './hooks/use-evaluation-game';
import { CollectingState } from './components/collecting-state';
import { RatingState } from './components/rating-state';
import { AnalyzingState } from './components/analyzing-state';
import { ResultsState } from './components/results-state';
import { EndedState } from './components/ended-state';

export default function EvaluationGamePage() {
  const {
    loading,
    itemsLoading,
    resultsLoading,
    isTransitioning,
    isAddingItem,
    game,
    activity,
    players,
    ratings,
    approvedItems,
    pendingItems,
    ratingsCount,
    playersCount,
    evaluationResults,
    newItemText,
    setNewItemText,
    newItemDescription,
    setNewItemDescription,
    handleAddItem,
    handleDeleteItem,
    handleApproveItem,
    handleStartRating,
    handleEndRating,
    handleEndSession,
    handleCancelGame,
    handleReopenKeepData,
    handleReopenClearData,
    router,
  } = useEvaluationGame();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!game || !activity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="text-center p-8">
          <CardTitle className="text-2xl mb-4">Session Not Found</CardTitle>
          <CardDescription className="mb-6">
            This session may have ended or been deleted.
          </CardDescription>
          <Button onClick={() => router.push('/host')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <GameHeader
            gamePin={game.gamePin}
            playerCount={playersCount}
            activityType="evaluation"
            title={activity.title}
            onCancel={handleCancelGame}
            isLive={game.state !== 'collecting'}
            showKeyboardHint={true}
          />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {game.state === 'collecting' && 'Collecting Items'}
              {game.state === 'rating' && 'Rating in Progress'}
              {game.state === 'analyzing' && 'Analyzing Results'}
              {game.state === 'results' && 'Results Ready'}
              {game.state === 'ended' && 'Session Ended'}
            </Badge>
            <HostActionHint
              gameState={game.state}
              activityType="evaluation"
              totalPlayers={playersCount}
              itemsCount={approvedItems.length}
              ratingsCount={ratingsCount}
            />
          </div>

          {game.state === 'collecting' && (
            <ReadinessChecklist
              items={[
                { label: 'Items added', isReady: approvedItems.length > 0, detail: `${approvedItems.length}` },
                { label: 'Participants joined', isReady: playersCount > 0, detail: `${playersCount}` },
              ]}
            />
          )}

          {game.state === 'collecting' && (
            <CollectingState
              approvedItems={approvedItems}
              pendingItems={pendingItems}
              playersCount={playersCount}
              itemsLoading={itemsLoading}
              isTransitioning={isTransitioning}
              isAddingItem={isAddingItem}
              newItemText={newItemText}
              setNewItemText={setNewItemText}
              newItemDescription={newItemDescription}
              setNewItemDescription={setNewItemDescription}
              activity={activity}
              handleAddItem={handleAddItem}
              handleDeleteItem={handleDeleteItem}
              handleApproveItem={handleApproveItem}
              handleStartRating={handleStartRating}
            />
          )}

          {game.state === 'rating' && (
            <RatingState
              approvedItems={approvedItems}
              players={players}
              ratings={ratings}
              ratingsCount={ratingsCount}
              playersCount={playersCount}
              isTransitioning={isTransitioning}
              handleEndRating={handleEndRating}
            />
          )}

          {game.state === 'analyzing' && <AnalyzingState />}

          {game.state === 'results' && (
            <ResultsState
              evaluationResults={evaluationResults}
              ratingsCount={ratingsCount}
              approvedItems={approvedItems}
              metrics={activity.config.metrics}
              resultsLoading={resultsLoading}
              handleEndSession={handleEndSession}
            />
          )}

          {game.state === 'ended' && (
            <EndedState
              gamePin={game.gamePin}
              evaluationResults={evaluationResults}
              ratingsCount={ratingsCount}
              approvedItems={approvedItems}
              metrics={activity.config.metrics}
              resultsLoading={resultsLoading}
              isTransitioning={isTransitioning}
              handleReopenKeepData={handleReopenKeepData}
              handleReopenClearData={handleReopenClearData}
              onBackToDashboard={() => router.push('/host')}
            />
          )}

          {game.state !== 'ended' && game.state !== 'analyzing' && (
            <KeyboardShortcutsHint
              shortcuts={
                game.state === 'collecting'
                  ? [{ key: 'Enter', action: 'Start Rating' }]
                  : game.state === 'rating'
                  ? [{ key: 'Enter', action: 'Show Results' }]
                  : game.state === 'results'
                  ? [{ key: 'Enter', action: 'End Session' }]
                  : []
              }
              className="justify-center"
            />
          )}
        </div>
      </main>
    </div>
  );
}
