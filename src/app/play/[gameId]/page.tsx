'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { nanoid } from 'nanoid';
import type { Quiz, Player, Game, SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion } from '@/lib/types';
import { handleFirestoreError } from '@/lib/utils/error-utils';

// Hooks
import { useSessionManager } from './hooks/use-session-manager';
import { usePlayerStateMachine, type PlayerState } from './hooks/use-player-state-machine';
import { useQuestionTimer } from './hooks/use-question-timer';
import { useAnswerSubmission } from './hooks/use-answer-submission';

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

type AnswerResult = {
  selected: number;
  correct: number[];
  points: number;
  wasTimeout: boolean;
  isPartiallyCorrect?: boolean;
};

export default function PlayerGamePage() {
  const params = useParams();
  const gamePin = params.gameId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  // Session management
  const sessionManager = useSessionManager(gamePin);
  const storedSession = sessionManager.getSession();

  // Player state
  const [nickname, setNickname] = useState(storedSession?.nickname || '');
  const [gameDocId, setGameDocId] = useState<string | null>(storedSession?.gameDocId || null);
  const [playerId] = useState(storedSession?.playerId || nanoid());
  const [player, setPlayer] = useState<Player | null>(null);

  // Answer state
  const [lastAnswer, setLastAnswer] = useState<AnswerResult | null>(null);
  const [answerSelected, setAnswerSelected] = useState<boolean>(false);
  const [timedOut, setTimedOut] = useState(false);
  const answerSubmittedRef = useRef<boolean>(false);
  const lastQuestionIndexShownRef = useRef<number>(-1);

  // Firebase data
  const gameRef = useMemoFirebase(() => gameDocId ? doc(firestore, 'games', gameDocId) as DocumentReference<Game> : null, [firestore, gameDocId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const quizRef = useMemoFirebase(() => game ? doc(firestore, 'quizzes', game.quizId) : null, [firestore, game]);
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);
  const quiz = quizData as Quiz | null;

  const question = quiz?.questions[game?.currentQuestionIndex || 0];
  const timeLimit = question?.timeLimit || 20;

  // State machine
  const { state, setState, isLastQuestion } = usePlayerStateMachine(
    gamePin,
    sessionManager.hasValidSession(),
    game,
    quiz,
    gameLoading,
    timedOut
  );

  // Timer
  const { time, resetTimer } = useQuestionTimer(
    state,
    timeLimit,
    game?.questionStartTime,
    game?.currentQuestionIndex || 0
  );

  // Answer submission
  const answerSubmission = useAnswerSubmission(
    gameDocId,
    playerId,
    game?.currentQuestionIndex || 0,
    player,
    setLastAnswer,
    setPlayer,
    answerSubmittedRef
  );

  // Wake lock
  const shouldKeepAwake = ['lobby', 'preparing', 'question', 'waiting', 'result'].includes(state);
  useWakeLock(shouldKeepAwake);

  // Handle reconnection
  useEffect(() => {
    if (state === 'reconnecting') {
      const attemptReconnect = async () => {
        try {
          if (!gameRef) {
            console.log('[Reconnect] No game reference, clearing session');
            sessionManager.clearSession();
            setState('session-invalid');
            return;
          }

          if (gameLoading) return;

          if (!game) {
            console.log('[Reconnect] Game not found, clearing session');
            sessionManager.clearSession();
            setState('session-invalid');
            toast({
              variant: 'destructive',
              title: 'Session Expired',
              description: 'The game has ended or was cancelled.'
            });
            return;
          }

          if (game.state === 'ended') {
            console.log('[Reconnect] Game has ended');
            sessionManager.clearSession();
            setState('ended');
            return;
          }

          // Verify player document exists
          const playerRef = doc(firestore, 'games', gameDocId!, 'players', playerId) as DocumentReference<Player>;
          const playerDoc = await getDocs(query(collection(firestore, 'games', gameDocId!, 'players'), where('__name__', '==', playerId)));

          if (playerDoc.empty) {
            // Recreate player document
            console.log('[Reconnect] Player document missing, attempting to recreate');
            const newPlayer = { id: playerId, name: nickname, score: 0, answers: [] };
            await setDoc(playerRef, newPlayer);
            setPlayer(newPlayer);
            toast({
              title: 'Reconnected!',
              description: 'Successfully rejoined the game.'
            });
          } else {
            const playerData = playerDoc.docs[0].data() as Player;
            setPlayer(playerData);
            toast({
              title: 'Reconnected!',
              description: 'Successfully resumed your session.'
            });
          }

          // Transition to appropriate state
          if (game.state === 'lobby') {
            setState('lobby');
          } else if (game.state === 'preparing') {
            setState('preparing');
          } else if (game.state === 'question') {
            setState('question');
          } else if (game.state === 'leaderboard') {
            setState('result');
          }
        } catch (error) {
          console.error('[Reconnect] Error during reconnection:', error);
          sessionManager.clearSession();
          setState('session-invalid');
          toast({
            variant: 'destructive',
            title: 'Reconnection Failed',
            description: 'Could not restore your session. Please rejoin the game.'
          });
        }
      };

      attemptReconnect();
    }
  }, [state, game, gameLoading, gameRef, sessionManager, playerId, nickname, firestore, gameDocId, toast, setState]);

  // Reset answer state when preparing for new question
  useEffect(() => {
    if (state === 'preparing') {
      console.log('[Player State] Resetting for new question');
      setAnswerSelected(false);
      setTimedOut(false);
      setLastAnswer(null);
      answerSubmittedRef.current = false;
      resetTimer();
      // No Firestore reset needed - answers persist in array
    }
  }, [state, game?.currentQuestionIndex, resetTimer]);

  // Track which question index the player actually sees in question state
  useEffect(() => {
    if (state === 'question' && game?.currentQuestionIndex !== undefined) {
      lastQuestionIndexShownRef.current = game.currentQuestionIndex;
      console.log('[Player State] Now showing question index:', game.currentQuestionIndex);
    }
  }, [state, game?.currentQuestionIndex]);

  // Handle timeout when time reaches 0
  useEffect(() => {
    if (state === 'question' && time === 0 && !answerSelected && !timedOut && !answerSubmittedRef.current && question) {
      setTimedOut(true);
      setAnswerSelected(true);

      // For slides, just transition to waiting without setting answer result
      if (question.type === 'slide') {
        setState('waiting');
        return;
      }

      // Set local state immediately for question types that need answers
      setLastAnswer({
        selected: -1,
        correct: question.type === 'single-choice' ? [question.correctAnswerIndex] : (question.type === 'multiple-choice' ? question.correctAnswerIndices : [1]),
        points: 0,
        wasTimeout: true
      });

      setState('waiting');
      answerSubmission.submitTimeout(question);
    }
  }, [time, state, answerSelected, timedOut, question, answerSubmission, setState]);

  // Handle forced result screen when host finishes question early (before player answered)
  useEffect(() => {
    if (state === 'result' && !answerSelected && !answerSubmittedRef.current && question && game) {
      // Skip for slides
      if (question.type === 'slide') return;

      // Only apply forced result if player actually saw this question in 'question' state
      // This prevents false positives when transitioning through states quickly (e.g., after slides)
      if (lastQuestionIndexShownRef.current !== game.currentQuestionIndex) {
        console.log('[Player State] Skipping forced result - player never saw question', game.currentQuestionIndex);
        return;
      }

      // Check if already answered this question in answers array
      const hasAnswered = player?.answers?.some(a => a.questionIndex === game.currentQuestionIndex);
      if (hasAnswered) return;

      console.log('[Player State] Forced to result without answering - showing "No answer"');

      // Mark as answered to prevent re-triggering
      setAnswerSelected(true);
      setTimedOut(true);

      // Set "No answer" result
      setLastAnswer({
        selected: -1,
        correct: question.type === 'single-choice' ? [question.correctAnswerIndex] : (question.type === 'multiple-choice' ? question.correctAnswerIndices : []),
        points: 0,
        wasTimeout: true
      });

      // Submit timeout to record non-answer
      answerSubmission.submitTimeout(question);
    }
  }, [state, answerSelected, question, answerSubmission, game, player?.answers]);

  // Join game handler
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      toast({ variant: 'destructive', title: 'Nickname is required' });
      return;
    }

    if (trimmedNickname.length < 2) {
      toast({ variant: 'destructive', title: 'Nickname too short', description: 'Nickname must be at least 2 characters long.' });
      return;
    }

    if (trimmedNickname.length > 20) {
      toast({ variant: 'destructive', title: 'Nickname too long', description: 'Nickname must be 20 characters or less.' });
      return;
    }

    try {
      const pin = gamePin.toUpperCase();
      const gamesRef = collection(firestore, 'games');
      const q = query(gamesRef, where('gamePin', '==', pin), where('state', '==', 'lobby'));

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Game not found', description: "Couldn't find a game with that PIN." });
        return;
      }

      const gameDoc = querySnapshot.docs[0];
      setGameDocId(gameDoc.id);

      const playerRef = doc(firestore, 'games', gameDoc.id, 'players', playerId);
      const newPlayer = { id: playerId, name: trimmedNickname, score: 0, answers: [] };

      setDoc(playerRef, newPlayer)
        .then(() => {
          setPlayer({ ...newPlayer, id: playerId });
          sessionManager.saveSession(playerId, gameDoc.id, trimmedNickname);
          setState('lobby');
        })
        .catch(error => {
          handleFirestoreError(error, {
            path: playerRef.path,
            operation: 'create',
            requestResourceData: newPlayer
          }, "Error joining game: ");
          toast({ variant: 'destructive', title: 'Error', description: "Could not join the game. Please try again." });
        });
    } catch (error) {
      console.error("Error querying game: ", error);
      toast({ variant: 'destructive', title: 'Error', description: "Could not find the game. Please check the PIN." });
    }
  };

  // Answer handlers
  const handleSingleChoiceAnswer = (answerIndex: number) => {
    if (answerSelected || !question || question.type !== 'single-choice') return;
    setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitSingleChoice(answerIndex, question, time, timeLimit);
  };

  const handleMultipleChoiceAnswer = (answerIndices: number[]) => {
    if (answerSelected || !question || question.type !== 'multiple-choice') return;
    setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitMultipleChoice(answerIndices, question, time, timeLimit);
  };

  const handleSliderAnswer = (sliderValue: number) => {
    if (answerSelected || !question || question.type !== 'slider') return;
    setAnswerSelected(true);
    setState('waiting');
    answerSubmission.submitSlider(sliderValue, question, time);
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
              setNickname('');
            }}
          />
        );

      case 'joining':
        return <JoiningScreen nickname={nickname} setNickname={setNickname} onJoinGame={handleJoinGame} />;

      case 'lobby':
        return <LobbyScreen playerName={player?.name || ''} gamePin={game?.gamePin || ''} />;

      case 'preparing':
        return <PreparingScreen />;

      case 'question':
        return (
          <QuestionScreen
            question={question!}
            quiz={quiz!}
            game={game!}
            time={time}
            timeLimit={timeLimit}
            answerSelected={answerSelected}
            onSubmitSingleChoice={handleSingleChoiceAnswer}
            onSubmitMultipleChoice={handleMultipleChoiceAnswer}
            onSubmitSlider={handleSliderAnswer}
            quizLoading={quizLoading}
          />
        );

      case 'waiting':
        return <WaitingScreen isLastQuestion={isLastQuestion} />;

      case 'result':
        // Slides are informational only - don't show result screen
        if (question?.type === 'slide') {
          return <WaitingScreen isLastQuestion={isLastQuestion} />;
        }
        return <ResultScreen lastAnswer={lastAnswer} playerScore={player?.score || 0} isLastQuestion={isLastQuestion} />;

      case 'ended':
        sessionManager.clearSession();
        return (
          <EndedScreen
            playerScore={player?.score || 0}
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <main className="w-full h-screen max-w-5xl mx-auto flex flex-col items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
}
