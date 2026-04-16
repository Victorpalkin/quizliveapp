'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { QuestionCounter } from '@/components/app/question-counter';
import { GameHeader, KeyboardShortcutsHint } from '@/components/app/game-header';
import { HostActionHint } from '@/components/app/host-action-hint';
import { clearHostSession } from '@/lib/host-session';
import { useUser } from '@/firebase';
import { getEffectiveQuestions } from '@/lib/utils/game-utils';
import { useHostSession } from '../../../hooks/use-host-session';

// Hooks
import { useGameState } from './hooks/use-game-state';
import { useQuestionTimer } from './hooks/use-question-timer';
import { useGameControls } from './hooks/use-game-controls';

// State components
import { NotFoundState } from './components/states/not-found-state';
import { EndedState } from './components/states/ended-state';
import { PreparingState } from './components/states/preparing-state';
import { QuestionState } from './components/states/question-state';
import { LeaderboardState } from './components/states/leaderboard-state';

export default function HostGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const { user } = useUser();

  // Game state (uses aggregate document for leaderboard data)
  const {
    game, gameRef, quiz,
    topPlayers, totalPlayers, totalAnswered, answerCounts,
    gameLoading, quizLoading
  } = useGameState(gameId);

  // Get effective questions (includes crowdsourced questions when integrated)
  const effectiveQuestions = getEffectiveQuestions(game, quiz);

  // Host session tracking
  useHostSession({
    gameId,
    game,
    contentId: game?.quizId || '',
    contentTitle: quiz?.title || '',
    userId: user?.uid,
    activityType: 'quiz',
    returnPath: `/host/quiz/game/${gameId}`,
  });

  const question = effectiveQuestions[game?.currentQuestionIndex || 0];
  const timeLimit = question?.timeLimit || 20;

  // Game controls
  const { finishQuestion, handleNext, startQuestion, isLastQuestion, isComputingResults, computeError } = useGameControls(
    gameId,
    gameRef,
    game,
    quiz
  );

  // Timer (uses totalAnswered from aggregate)
  const { time } = useQuestionTimer(game, totalPlayers, timeLimit, finishQuestion, totalAnswered);

  // Cancel game handler for GameHeader
  const handleCancelGame = useCallback(() => {
    if (!gameRef) return;
    clearHostSession();
    deleteDoc(gameRef)
      .then(() => router.push('/host'))
      .catch(error => console.error('Error deleting game:', error));
  }, [gameRef, router]);

  // Build answer distribution from pre-computed answerCounts
  const questionIndex = game?.currentQuestionIndex || 0;
  const quizQuestion = quiz?.questions?.[questionIndex];
  const answerDistribution = question && 'answers' in question
    ? question.answers.map((ans, index) => {
        let isCorrect = false;
        if (quizQuestion) {
          if (quizQuestion.type === 'single-choice') {
            isCorrect = quizQuestion.correctAnswerIndex === index;
          } else if (quizQuestion.type === 'multiple-choice') {
            isCorrect = quizQuestion.correctAnswerIndices.includes(index);
          }
        }
        return {
          name: ans.text,
          total: answerCounts[index] || 0,
          isCorrect,
        };
      })
    : [];

  // Auto-transition from preparing to question
  useEffect(() => {
    if (game?.state === 'preparing') {
      startQuestion();
    }
  }, [game?.state, startQuestion]);

  // Track if cancel dialog is open to prevent keyboard shortcuts
  const cancelDialogRef = useRef(false);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      cancelDialogRef.current
    ) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (game?.state === 'question' && !isComputingResults) {
        finishQuestion();
      } else if (game?.state === 'leaderboard' && !isComputingResults) {
        handleNext();
      }
    }
  }, [game?.state, isComputingResults, finishQuestion, handleNext]);

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Loading state
  if (gameLoading || quizLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
        <Skeleton className="w-full h-screen" />
      </div>
    );
  }

  if (!game && !gameLoading) {
    return <NotFoundState />;
  }

  if (game?.state === 'ended') {
    return (
      <EndedState
        gameId={gameId}
        gameRef={gameRef}
        topPlayers={topPlayers}
        totalPlayers={totalPlayers}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-8">
      {/* Header */}
      <GameHeader
        gamePin={game?.gamePin || ''}
        playerCount={totalPlayers}
        activityType="quiz"
        title={quiz?.title}
        onCancel={handleCancelGame}
        isLive={true}
        showKeyboardHint={true}
      />

      {/* State Badge and Host Action Hint */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {game?.state === 'preparing' && 'Get Ready...'}
          {game?.state === 'question' && `Question ${(game?.currentQuestionIndex || 0) + 1} of ${effectiveQuestions.length}`}
          {game?.state === 'leaderboard' && 'Showing Results'}
        </Badge>
        <HostActionHint
          gameState={game?.state || 'preparing'}
          activityType="quiz"
          answeredCount={totalAnswered}
          totalPlayers={totalPlayers}
          isLastQuestion={isLastQuestion}
        />
      </div>

      {/* State-specific content */}
      {game?.state === 'preparing' && <PreparingState />}

      {game?.state === 'question' && question && (
        <QuestionState
          question={question}
          time={time}
          timeLimit={timeLimit}
          isComputingResults={isComputingResults}
          answerCounts={answerCounts}
          totalAnswered={totalAnswered}
        />
      )}

      {game?.state === 'leaderboard' && (
        <LeaderboardState
          topPlayers={topPlayers}
          totalPlayers={totalPlayers}
          totalAnswered={totalAnswered}
          question={question}
          quizQuestion={quizQuestion}
          answerDistribution={answerDistribution}
          isComputingResults={isComputingResults}
          computeError={computeError}
          onRetry={finishQuestion}
        />
      )}

      {/* Footer */}
      <footer className="mt-8 flex flex-col gap-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Users className="h-5 w-5"/>
            <span>{totalAnswered} / {totalPlayers} Answered</span>
          </div>
          <div>
            <QuestionCounter
              current={(game?.currentQuestionIndex || 0) + 1}
              total={effectiveQuestions.length}
              className="text-lg mr-4"
            />
            {game?.state === 'question' && (
              <Button onClick={finishQuestion} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <CheckCircle className="mr-2 h-4 w-4" />
                Finish Question
              </Button>
            )}
            {game?.state === 'leaderboard' && (
              <Button onClick={handleNext} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isLastQuestion ? 'End Game' : 'Next Question'}
              </Button>
            )}
          </div>
        </div>
        <KeyboardShortcutsHint
          shortcuts={[
            { key: 'Space', action: game?.state === 'question' ? 'Finish' : 'Next' },
          ]}
          className="justify-center"
        />
      </footer>
    </div>
  );
}
