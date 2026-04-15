'use client';

import { Badge } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { GameHeader, KeyboardShortcutsHint } from '@/components/app/game-header';
import { HostActionHint } from '@/components/app/host-action-hint';
import { useThoughtsGatheringGame } from './hooks/use-thoughts-gathering-game';
import { CollectingState } from './components/collecting-state';
import { ProcessingState } from './components/processing-state';
import { DisplayState } from './components/display-state';
import { EndedState } from './components/ended-state';

export default function ThoughtsGatheringGamePage() {
  const {
    loading,
    game,
    gameId,
    activity,
    players,
    submissions,
    topicCloud,
    handleCancelGame,
    handleToggleSubmissions,
    handleStopAndProcess,
    handleCollectMore,
    handleEndSession,
    handleReturnToDashboard,
    handleExportResults,
    handleReprocess,
    handleUpdateTopics,
    handleToggleSubmissionVisibility,
    handleHostSubmit,
    isProcessing,
    router,
  } = useThoughtsGatheringGame();

  if (loading) {
    return <FullPageLoader />;
  }

  const handleCreateEvaluation = (source: string) => {
    router.push(`/host/evaluation/create-from-thoughts?activityId=${game?.activityId}&gameId=${gameId}&source=${source}`);
  };

  const renderContent = () => {
    switch (game?.state) {
      case 'collecting':
        return (
          <CollectingState
            game={game}
            activity={activity}
            players={players as { id: string; name: string }[] | null}
            submissions={submissions}
            handleToggleSubmissions={handleToggleSubmissions}
            handleStopAndProcess={handleStopAndProcess}
            handleEndSession={handleEndSession}
            handleToggleSubmissionVisibility={handleToggleSubmissionVisibility}
            onHostSubmit={handleHostSubmit}
          />
        );

      case 'processing':
        return <ProcessingState />;

      case 'display':
        return (
          <DisplayState
            gameId={gameId}
            activityId={game.activityId}
            activity={activity}
            players={players as { id: string; name: string }[] | null}
            submissions={submissions}
            topicCloud={topicCloud}
            handleCollectMore={handleCollectMore}
            handleEndSession={handleEndSession}
            handleExportResults={handleExportResults}
            handleReprocess={handleReprocess}
            handleUpdateTopics={handleUpdateTopics}
            isProcessing={isProcessing}
            onCreateEvaluation={handleCreateEvaluation}
          />
        );

      case 'ended':
        return (
          <EndedState
            activity={activity}
            players={players as { id: string; name: string }[] | null}
            submissions={submissions}
            topicCloud={topicCloud}
            handleReturnToDashboard={handleReturnToDashboard}
            handleExportResults={handleExportResults}
            onCreateEvaluation={handleCreateEvaluation}
          />
        );

      default:
        return <FullPageLoader />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8 max-w-3xl">
        {game?.state !== 'ended' && (
          <GameHeader
            gamePin={game?.gamePin || ''}
            playerCount={players?.length || 0}
            activityType="thoughts-gathering"
            title={activity?.title}
            onCancel={handleCancelGame}
            isLive={game?.state !== 'collecting'}
            showKeyboardHint={true}
          />
        )}

        {game?.state !== 'ended' && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {game?.state === 'collecting' && (game.submissionsOpen ? 'Collecting Responses' : 'Submissions Paused')}
              {game?.state === 'processing' && 'Analyzing...'}
              {game?.state === 'display' && 'Viewing Results'}
            </Badge>
            <HostActionHint
              gameState={game?.state || 'collecting'}
              activityType="thoughts-gathering"
              totalPlayers={players?.length || 0}
              submissionsCount={submissions?.length || 0}
              allowMultipleRounds={activity?.config.allowMultipleRounds}
            />
          </div>
        )}

        {renderContent()}

        {game?.state !== 'ended' && game?.state !== 'processing' && (
          <KeyboardShortcutsHint
            shortcuts={
              game?.state === 'collecting'
                ? [
                    { key: 'Space', action: game.submissionsOpen ? 'Pause' : 'Resume' },
                    { key: 'Enter', action: 'Analyze' },
                  ]
                : game?.state === 'display'
                ? [
                    ...(activity?.config.allowMultipleRounds ? [{ key: 'Space', action: 'Collect More' }] : []),
                    { key: 'Enter', action: 'End Session' },
                  ]
                : []
            }
            className="justify-center mt-6"
          />
        )}
      </main>
    </div>
  );
}
