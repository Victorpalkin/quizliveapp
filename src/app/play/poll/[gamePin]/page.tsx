'use client';

import { useWakeLock } from '@/hooks/use-wake-lock';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { PlayerLeaveButton } from '@/components/app/player-leave-button';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Vote } from 'lucide-react';
import { useAnonymousAuth } from '@/hooks/use-anonymous-auth';
import { usePlayerPoll } from './hooks/use-player-poll';
import { JoiningScreen } from './components/joining-screen';
import { LobbyScreen } from './components/lobby-screen';
import { AnsweringScreen } from './components/answering-screen';
import { WaitingScreen } from './components/waiting-screen';
import { EndedScreen } from './components/ended-screen';

export default function PollPlayerPage() {
  const { uid, loading: authLoading } = useAnonymousAuth();

  if (authLoading || !uid) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <FullPageLoader />
    </div>
  );

  return <PollPlayerContent playerId={uid} />;
}

function PollPlayerContent({ playerId }: { playerId: string }) {
  const {
    state,
    player,
    nickname,
    setNickname,
    isJoining,
    isSubmitting,
    game,
    poll,
    selectedIndex,
    setSelectedIndex,
    selectedIndices,
    textAnswer,
    setTextAnswer,
    handleJoinGame,
    handleSubmitAnswer,
    toggleMultipleChoice,
    isAnswerValid,
    router,
  } = usePlayerPoll(playerId);

  // Keep awake
  const shouldKeepAwake = ['answering', 'waiting', 'results'].includes(state);
  useWakeLock(shouldKeepAwake);

  const renderContent = () => {
    switch (state) {
      case 'joining':
        return (
          <JoiningScreen
            nickname={nickname}
            setNickname={setNickname}
            isJoining={isJoining}
            allowAnonymous={poll?.config.allowAnonymous ?? false}
            handleJoinGame={handleJoinGame}
          />
        );

      case 'lobby':
        return <LobbyScreen playerName={player?.name || 'Anonymous'} />;

      case 'answering':
        if (!poll || !game) return <FullPageLoader />;
        return (
          <AnsweringScreen
            poll={poll}
            game={game}
            selectedIndex={selectedIndex}
            setSelectedIndex={setSelectedIndex}
            selectedIndices={selectedIndices}
            toggleMultipleChoice={toggleMultipleChoice}
            textAnswer={textAnswer}
            setTextAnswer={setTextAnswer}
            isSubmitting={isSubmitting}
            isAnswerValid={isAnswerValid}
            handleSubmitAnswer={handleSubmitAnswer}
          />
        );

      case 'waiting':
        return <WaitingScreen />;

      case 'results':
        return (
          <Card className="w-full max-w-md text-center shadow-2xl">
            <CardContent className="p-8">
              <Vote className="h-16 w-16 mx-auto mb-4 text-teal-500" />
              <h2 className="text-2xl font-bold mb-2">Results Are In!</h2>
              <p className="text-muted-foreground mb-6">
                Waiting for the host to continue...
              </p>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-3 h-3 bg-teal-500 rounded-full animate-ping absolute" />
                  <div className="w-3 h-3 bg-teal-500 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'reconnecting':
        return <FullPageLoader message="Reconnecting to game..." />;

      case 'ended':
        return (
          <EndedScreen
            playerName={player?.name || 'Anonymous'}
            onReturnHome={() => router.push('/join')}
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
