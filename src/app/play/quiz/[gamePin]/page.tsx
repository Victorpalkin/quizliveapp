'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, DocumentReference, Query } from 'firebase/firestore';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { nanoid } from 'nanoid';
import type { Quiz, Player, Game, GameLeaderboard, QuestionSubmission } from '@/lib/types';

// Hooks
import { useSessionManager } from './hooks/use-session-manager';
import { usePlayerStateMachine } from './hooks/use-player-state-machine';
import { useQuestionTimer } from './hooks/use-question-timer';
import { useAnswerSubmission } from './hooks/use-answer-submission';
import { useReconnection } from './hooks/use-reconnection';
import { useJoinGame } from './hooks/use-join-game';
import { useAnswerState } from './hooks/use-answer-state';

// Components
import { ThemeToggle } from '@/components/app/theme-toggle';

// Screens
import { JoiningScreen } from './components/screens/joining-screen';
import { LobbyScreen } from './components/screens/lobby-screen';
import { PreparingScreen } from './components/screens/preparing-screen';
import { QuestionScreen } from './components/screens/question-screen';
import { WaitingScreen } from './components/screens/waiting-screen';
import { ResultScreen } from './components/screens/result-screen';
import { EndedScreen } from './components/screens/ended-screen';
import { CancelledScreen } from './components/screens/cancelled-screen';
import { ReconnectingScreen } from './components/screens/reconnecting-screen';
import { SessionInvalidScreen } from './components/screens/session-invalid-screen';

export default function QuizPlayerPage() {
  const params = useParams();
  const gamePin = params.gamePin as string;
  const firestore = useFirestore();
  const router = useRouter();

  // Session management
  const sessionManager = useSessionManager(gamePin);
  const storedSession = sessionManager.getSession();

  // Core player state
  const [gameDocId, setGameDocId] = useState<string | null>(storedSession?.gameDocId || null);
  const [playerId] = useState(storedSession?.playerId || nanoid());
  const [player, setPlayer] = useState<Player | null>(null);

  // Firebase data
  const gameRef = useMemoFirebase(
    () => gameDocId ? doc(firestore, 'games', gameDocId) as DocumentReference<Game> : null,
    [firestore, gameDocId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Subscribe to leaderboard aggregate for rank info
  // Rank is now computed in computeQuestionResults and stored in the aggregate
  const leaderboardRef = useMemoFirebase(
    () => gameDocId ? doc(firestore, 'games', gameDocId, 'aggregates', 'leaderboard') as DocumentReference<GameLeaderboard> : null,
    [firestore, gameDocId]
  );
  const { data: leaderboard } = useDoc(leaderboardRef);

  // Get player's rank from the leaderboard aggregate
  const rankInfo = useMemo(() => {
    if (!leaderboard?.playerRanks || !playerId) return null;
    return leaderboard.playerRanks[playerId] || null;
  }, [leaderboard, playerId]);

  // Get player's streak from the leaderboard aggregate
  const currentStreak = useMemo(() => {
    if (!leaderboard?.playerStreaks || !playerId) return 0;
    return leaderboard.playerStreaks[playerId] || 0;
  }, [leaderboard, playerId]);

  // Track previous rank for movement indicator
  const previousRankRef = useRef<number | null>(null);
  const [previousRank, setPreviousRank] = useState<number | null>(null);

  // Update previous rank when current rank changes
  useEffect(() => {
    if (rankInfo?.rank && previousRankRef.current !== null && previousRankRef.current !== rankInfo.rank) {
      setPreviousRank(previousRankRef.current);
    }
    if (rankInfo?.rank) {
      previousRankRef.current = rankInfo.rank;
    }
  }, [rankInfo?.rank]);

  // Subscribe to player's question submissions (for crowdsourced questions)
  const submissionsQuery = useMemoFirebase(
    () => gameDocId ? query(
      collection(firestore, 'games', gameDocId, 'submissions'),
      where('playerId', '==', playerId)
    ) as Query<QuestionSubmission> : null,
    [firestore, gameDocId, playerId]
  );
  const { data: playerSubmissions } = useCollection<QuestionSubmission>(submissionsQuery);

  // Quiz metadata for lobby only (crowdsource settings)
  // Note: We no longer fetch the full quiz - questions are in game.questions (sanitized, no correct answers)
  // This prevents players from seeing correct answers in browser dev tools
  const quizRef = useMemoFirebase(
    () => (game && game.quizId) ? doc(firestore, 'quizzes', game.quizId) : null,
    [firestore, game]
  );
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);
  const quiz = quizData as Quiz | null;

  // Use questions from game.questions (sanitized, no correct answers)
  // This is populated by the host when starting the game
  const effectiveQuestions = game?.questions || [];
  const question = effectiveQuestions[game?.currentQuestionIndex || 0];
  const timeLimit = question?.timeLimit || 20;

  // State machine
  const { state, setState, isLastQuestion } = usePlayerStateMachine(
    gamePin,
    sessionManager.hasValidSession(),
    game,
    effectiveQuestions.length,
    gameLoading
  );

  // Timer
  const { time, resetTimer } = useQuestionTimer(
    state,
    timeLimit,
    game?.questionStartTime,
    game?.currentQuestionIndex || 0
  );

  // Join game hook
  const joinGame = useJoinGame({
    gamePin,
    playerId,
    setState,
    setGameDocId,
    setPlayer,
    sessionManager,
  });

  // Answer state management - provides refs and state for answer handling
  const answerState = useAnswerState({
    state,
    setState,
    game,
    player,
    question,
    time,
    resetTimer,
  });

  // Answer submission - uses refs from answerState
  // Note: Rank is now read from leaderboard aggregate, not from submitAnswer response
  const answerSubmission = useAnswerSubmission(
    gameDocId,
    playerId,
    game?.currentQuestionIndex || 0,
    player,
    answerState.setLastAnswer,
    setPlayer,
    answerState.answerSubmittedRef
  );

  // Reconnection handling
  useReconnection({
    state,
    setState,
    game,
    gameLoading,
    gameDocId,
    playerId,
    nickname: joinGame.nickname || storedSession?.nickname || '',
    setPlayer,
    sessionManager,
  });

  // Wake lock
  const shouldKeepAwake = ['lobby', 'preparing', 'question', 'waiting', 'result'].includes(state);
  useWakeLock(shouldKeepAwake);

  // Note: Timeout submission removed - streak is now computed in computeQuestionResults
  // which handles players with no answer correctly (streak resets to 0)

  // Answer handlers
  const handleSingleChoiceAnswer = (answerIndex: number) => {
    if (answerState.answerSelected || !question || question.type !== 'single-choice') return;
    answerState.setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitSingleChoice(answerIndex, question, time, timeLimit);
  };

  const handleMultipleChoiceAnswer = (answerIndices: number[]) => {
    if (answerState.answerSelected || !question || question.type !== 'multiple-choice') return;
    answerState.setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitMultipleChoice(answerIndices, question, time, timeLimit);
  };

  const handleSliderAnswer = (sliderValue: number) => {
    if (answerState.answerSelected || !question || question.type !== 'slider') return;
    answerState.setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitSlider(sliderValue, question, time);
  };

  const handlePollSingleAnswer = (answerIndex: number) => {
    if (answerState.answerSelected || !question || question.type !== 'poll-single') return;
    answerState.setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitPollSingle(answerIndex, question, time, timeLimit);
  };

  const handlePollMultipleAnswer = (answerIndices: number[]) => {
    if (answerState.answerSelected || !question || question.type !== 'poll-multiple') return;
    answerState.setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitPollMultiple(answerIndices, question, time, timeLimit);
  };

  const handleFreeResponseAnswer = (textAnswer: string) => {
    if (answerState.answerSelected || !question || question.type !== 'free-response') return;
    answerState.setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitFreeResponse(textAnswer, question, time, timeLimit);
  };

  // Render appropriate screen based on state
  const renderContent = () => {
    switch (state) {
      case 'reconnecting':
        return <ReconnectingScreen />;

      case 'session-invalid':
        return (
          <SessionInvalidScreen
            onRejoin={() => {
              sessionManager.clearSession();
              setState('joining');
              joinGame.setNickname('');
            }}
          />
        );

      case 'joining':
        return (
          <JoiningScreen
            nickname={joinGame.nickname}
            setNickname={joinGame.setNickname}
            onJoinGame={joinGame.handleJoinGame}
            isLoading={joinGame.isJoining}
          />
        );

      case 'lobby':
        return (
          <LobbyScreen
            playerName={player?.name || ''}
            gamePin={game?.gamePin || ''}
            gameId={gameDocId || ''}
            playerId={playerId}
            crowdsourceSettings={quiz?.crowdsource}
            crowdsourceState={game?.crowdsourceState}
            playerSubmissions={playerSubmissions || []}
          />
        );

      case 'preparing':
        return <PreparingScreen />;

      case 'question':
        return (
          <QuestionScreen
            question={question!}
            game={game!}
            totalQuestions={effectiveQuestions.length}
            time={time}
            timeLimit={timeLimit}
            answerSelected={answerState.answerSelected}
            onSubmitSingleChoice={handleSingleChoiceAnswer}
            onSubmitMultipleChoice={handleMultipleChoiceAnswer}
            onSubmitSlider={handleSliderAnswer}
            onSubmitFreeResponse={handleFreeResponseAnswer}
            onSubmitPollSingle={handlePollSingleAnswer}
            onSubmitPollMultiple={handlePollMultipleAnswer}
            quizLoading={quizLoading}
          />
        );

      case 'waiting':
        return <WaitingScreen isLastQuestion={isLastQuestion} />;

      case 'result':
        // Slides and polls are informational/survey only - don't show result screen
        if (question?.type === 'slide' || question?.type === 'poll-single' || question?.type === 'poll-multiple') {
          return <WaitingScreen isLastQuestion={isLastQuestion} />;
        }
        return (
          <ResultScreen
            lastAnswer={answerState.lastAnswer}
            playerScore={player?.score || 0}
            isLastQuestion={isLastQuestion}
            currentStreak={currentStreak}
            playerRank={rankInfo?.rank}
            previousRank={previousRank ?? undefined}
            totalPlayers={rankInfo?.totalPlayers}
          />
        );

      case 'ended':
        sessionManager.clearSession();
        return (
          <EndedScreen
            playerScore={player?.score || 0}
            playerRank={rankInfo?.rank}
            totalPlayers={rankInfo?.totalPlayers}
            onPlayAgain={() => {
              sessionManager.clearSession();
              router.push('/');
            }}
          />
        );

      case 'cancelled':
        sessionManager.clearSession();
        return (
          <CancelledScreen
            onReturnHome={() => {
              sessionManager.clearSession();
              router.push('/');
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <main className="w-full h-screen max-w-5xl mx-auto flex flex-col items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
}
