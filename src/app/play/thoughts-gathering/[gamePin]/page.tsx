'use client';

import { ThemeToggle } from '@/components/app/theme-toggle';
import { PlayerLeaveButton } from '@/components/app/player-leave-button';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { useThoughtsPlayer } from './hooks/use-thoughts-player';
import { JoiningState } from './components/joining-state';
import { SubmittingState } from './components/submitting-state';
import { WaitingState } from './components/waiting-state';
import { ViewingState } from './components/viewing-state';
import { PlayerEndedState } from './components/player-ended-state';

export default function ThoughtsGatheringPlayerPage() {
  const {
    state,
    nickname,
    setNickname,
    isJoining,
    handleJoinGame,
    submissionText,
    setSubmissionText,
    isSubmitting,
    submissionCount,
    handleSubmitInterest,
    game,
    activity,
    player,
    playerSubmissions,
    allSubmissions,
    topicCloud,
    router,
  } = useThoughtsPlayer();

  const renderContent = () => {
    switch (state) {
      case 'joining':
        return (
          <JoiningState
            nickname={nickname}
            setNickname={setNickname}
            isJoining={isJoining}
            onJoin={handleJoinGame}
          />
        );
      case 'submitting':
        return (
          <SubmittingState
            activity={activity}
            submissionText={submissionText}
            setSubmissionText={setSubmissionText}
            isSubmitting={isSubmitting}
            submissionCount={submissionCount}
            onSubmit={handleSubmitInterest}
            playerSubmissions={playerSubmissions}
          />
        );
      case 'waiting':
        return (
          <WaitingState
            game={game}
            playerSubmissions={playerSubmissions}
          />
        );
      case 'viewing':
        return (
          <ViewingState
            topicCloud={topicCloud}
            allSubmissions={allSubmissions}
          />
        );
      case 'ended':
      case 'cancelled':
        return (
          <PlayerEndedState
            playerName={player?.name}
            onReturnHome={() => router.push('/join')}
            variant={state}
          />
        );
      default:
        return <FullPageLoader />;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative">
      <div className="absolute top-6 left-6 z-20">
        <PlayerLeaveButton />
      </div>
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      <main className="w-full h-screen max-w-5xl mx-auto flex flex-col items-center justify-center p-4">
        {renderContent()}
      </main>
    </div>
  );
}
