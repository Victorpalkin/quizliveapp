
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PartyPopper, Frown, Trophy, Loader2, XCircle, Timer, Clock } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useDoc, useFirestore, useMemoFirebase, useFunctions } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, DocumentReference } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Quiz, Player, Game, Question } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { nanoid } from 'nanoid';

type PlayerState = 'joining' | 'lobby' | 'preparing' | 'question' | 'waiting' | 'result' | 'ended' | 'cancelled';

const answerIcons = [
  TriangleIcon,
  DiamondIcon,
  SquareIcon,
  CircleIcon,
  TriangleIcon, // Repeat for more than 4
  DiamondIcon,
  SquareIcon,
  CircleIcon,
];

const answerColors = [
  'bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500',
  'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500',
];

// Helper to migrate old questions with `correctAnswerIndex` to the new `correctAnswerIndices`
const migrateQuestion = (q: any): Question => {
  const { correctAnswerIndex, correctAnswerIndices, ...rest } = q;
  let newCorrectAnswerIndices = correctAnswerIndices;

  if (typeof correctAnswerIndex === 'number' && !correctAnswerIndices) {
    newCorrectAnswerIndices = [correctAnswerIndex];
  } else if (!Array.isArray(newCorrectAnswerIndices)) {
    newCorrectAnswerIndices = [0];
  }

  return { ...rest, correctAnswerIndices: newCorrectAnswerIndices };
};


export default function PlayerGamePage() {
  const params = useParams();
  const gamePin = params.gameId as string;
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  const router = useRouter();

  const [state, setState] = useState<PlayerState>('joining');
  const [nickname, setNickname] = useState('');
  const [gameDocId, setGameDocId] = useState<string | null>(null);
  const [playerId] = useState(() => nanoid());
  
  const gameRef = useMemoFirebase(() => gameDocId ? doc(firestore, 'games', gameDocId) as DocumentReference<Game> : null, [firestore, gameDocId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const quizRef = useMemoFirebase(() => game ? doc(firestore, 'quizzes', game.quizId) : null, [firestore, game]);
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);

  const quiz = useMemo(() => {
    if (!quizData) return null;
    return {
      ...quizData,
      questions: quizData.questions.map(migrateQuestion)
    }
  }, [quizData]);

  const question = quiz?.questions[game?.currentQuestionIndex || 0];
  const timeLimit = question?.timeLimit || 20;

  const [player, setPlayer] = useState<Player | null>(null);
  const [lastAnswer, setLastAnswer] = useState<{ selected: number; correct: number[]; points: number; wasTimeout: boolean } | null>(null);
  const [time, setTime] = useState(timeLimit);
  const [answerSelected, setAnswerSelected] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const isLastQuestion = game && quiz ? game.currentQuestionIndex >= quiz.questions.length - 1 : false;

  useEffect(() => {
    if (!game && !gameLoading && state !== 'joining' && state !== 'cancelled') {
        setState('cancelled');
        return;
    }

    if (!game) return;

    // Synchronize player state with host game state
    const hostState = game.state;
    const currentQuestionIndex = game.currentQuestionIndex;

    // State machine for player-host sync
    if (hostState === 'lobby' && state === 'joining') {
      setState('lobby');
    }
    else if (hostState === 'preparing') {
      // When host prepares a question, player should also prepare (from any state except joining/cancelled)
      if (state !== 'preparing' && state !== 'joining' && state !== 'cancelled') {
        setState('preparing');
      }
    }
    else if (hostState === 'question') {
      // When host shows question, player should see it (if in preparing state)
      if (state === 'preparing') {
        setState('question');
      }
    }
    else if (hostState === 'leaderboard') {
      // When host shows leaderboard, player should see results
      if (state === 'waiting' || (state === 'question' && timedOut)) {
        setState('result');
      }
    }
    else if (hostState === 'ended') {
      if (state !== 'ended') {
        setState('ended');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.state, game?.currentQuestionIndex, gameLoading, timedOut]);


  // Reset answer state when preparing for new question
  useEffect(() => {
    if (state === 'preparing') {
      setAnswerSelected(null);
      setTimedOut(false);
      setLastAnswer(null);

      // Reset lastAnswerIndex for new question
      if (gameDocId && player?.lastAnswerIndex !== null && player?.lastAnswerIndex !== undefined) {
        const playerRef = doc(firestore, 'games', gameDocId, 'players', playerId) as DocumentReference<Player>;
        setDoc(playerRef, { ...player, lastAnswerIndex: null }, { merge: true }).catch(error => {
          console.error("Error resetting lastAnswerIndex:", error);
        });
        setPlayer(p => p ? { ...p, lastAnswerIndex: null } : null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, game?.currentQuestionIndex]);

  // Start timer when question is shown
  useEffect(() => {
    if (state === 'question') {
      setTime(timeLimit);

      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, game?.currentQuestionIndex, timeLimit]);

  // Handle timeout when time reaches 0
  useEffect(() => {
    if (state === 'question' && time === 0 && answerSelected === null && !timedOut) {
      setTimedOut(true);

      // Set local state immediately for display (in case submission fails)
      if (question) {
        setLastAnswer({
          selected: -1,
          correct: question.correctAnswerIndices,
          points: 0,
          wasTimeout: true
        });
      }

      // Try to submit to server (may fail if game state changed due to race condition)
      handleAnswer(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, state, answerSelected, timedOut]);

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
        const newPlayer = { id: playerId, name: trimmedNickname, score: 0, lastAnswerIndex: null };
        
        setDoc(playerRef, newPlayer)
          .then(() => {
            setPlayer({ ...newPlayer, id: playerId });
            setState('lobby');
          })
          .catch(error => {
            console.error("Error joining game: ", error);
            const permissionError = new FirestorePermissionError({
              path: playerRef.path,
              operation: 'create',
              requestResourceData: newPlayer
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Error', description: "Could not join the game. Please try again." });
          });
    } catch (error) {
        console.error("Error querying game: ", error);
        toast({ variant: 'destructive', title: 'Error', description: "Could not find the game. Please check the PIN." });
    }
  };

  const handleAnswer = async (selectedIndex: number) => {
    // Prevent answering multiple times
    if (answerSelected !== null) return;

    // For timeouts, allow submission even if state changed (race condition handling)
    const isTimeout = selectedIndex === -1;
    if (!isTimeout && state !== 'question') return;

    setAnswerSelected(selectedIndex);

    // Only change state if still in question state
    if (state === 'question') {
      setState('waiting');
    }

    if (!gameDocId || !game) {
      toast({ variant: 'destructive', title: 'Error', description: "Game not found" });
      return;
    }

    try {
      // Call Cloud Function to validate and score the answer
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');

      const result = await submitAnswerFn({
        gameId: gameDocId,
        playerId: playerId,
        questionIndex: game.currentQuestionIndex,
        answerIndex: selectedIndex,
        timeRemaining: time,
      });

      const { isCorrect, points, newScore } = result.data as {
        success: boolean;
        isCorrect: boolean;
        points: number;
        newScore: number;
      };

      // Update local player state with server-validated score
      setPlayer(p => p ? { ...p, score: newScore, lastAnswerIndex: selectedIndex } : null);

      if (question) {
        setLastAnswer({
          selected: selectedIndex,
          correct: question.correctAnswerIndices,
          points,
          wasTimeout: selectedIndex === -1
        });
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);

      // Handle specific error cases
      if (error.code === 'functions/failed-precondition') {
        toast({
          variant: 'destructive',
          title: 'Already Answered',
          description: error.message
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to submit answer. Please try again.'
        });
      }

      // Reset UI state on error
      setAnswerSelected(null);
      setState('question');
    }
  };
  
  const renderContent = () => {
    switch (state) {
      case 'joining':
        return (
          <div className="text-center w-full max-w-sm">
            <h1 className="text-4xl font-bold">Join Game</h1>
            <form onSubmit={handleJoinGame} className="space-y-4 mt-8">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="h-12 text-center text-xl"
                maxLength={20}
                minLength={2}
                required
              />
              <Button type="submit" size="lg" className="w-full">Join</Button>
            </form>
          </div>
        );
      case 'lobby':
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold">You're in, {player?.name}!</h1>
            <p className="text-muted-foreground mt-2 text-xl">Get ready to play...</p>
            <p className="mt-8 text-2xl font-bold">Game PIN: {game?.gamePin}</p>
            <div className="mt-12 flex flex-col items-center">
                <Loader2 className="animate-spin w-12 h-12 text-primary"/>
                <p className="mt-4">Waiting for the host to start the game...</p>
            </div>
          </div>
        );
      case 'preparing':
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-background">
            <h1 className="text-4xl font-bold">Get Ready...</h1>
            <p className="text-muted-foreground mt-2 text-xl">The next question is about to start!</p>
            <Loader2 className="animate-spin w-12 h-12 text-primary mt-8"/>
          </div>
        );
      case 'question':
        if (quizLoading || !question || !game) {
          return <Skeleton className="w-full h-full" />;
        }
        return (
          <div className="w-full h-full flex flex-col">
            <header className="p-4 flex items-center justify-center">
              <p className="text-2xl font-bold text-center">{question.text}</p>
            </header>
            <div className="flex-grow flex items-center justify-center w-full relative">
              <Progress value={(time / timeLimit) * 100} className="absolute top-0 left-0 w-full h-2 rounded-none" />
              <div className="absolute top-4 right-4 text-2xl font-bold bg-background/80 px-4 py-2 rounded-lg">{time}</div>
              <div className={cn("grid gap-4 w-full h-full p-4", question.answers.length > 4 ? "grid-cols-2 grid-rows-4" : "grid-cols-2 grid-rows-2")}>
                {question.answers.map((ans, i) => {
                  const Icon = answerIcons[i % answerIcons.length];
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={answerSelected !== null}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg text-white transition-all duration-300 transform hover:scale-105 p-4',
                        answerColors[i % answerColors.length],
                         answerSelected !== null && answerSelected !== i ? 'opacity-25' : '',
                         answerSelected !== null && answerSelected === i ? 'scale-110 border-4 border-white' : ''
                      )}
                    >
                      <Icon className="w-16 h-16 md:w-24 md:h-24 mb-2" />
                      <span className="text-xl md:text-2xl font-bold">{ans.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <footer className="p-4 text-center">
              <p>Question {game.currentQuestionIndex + 1} of {quiz.questions.length}</p>
            </footer>
          </div>
        );
    case 'waiting':
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-background">
                <Timer className="w-24 h-24 mb-4 text-primary animate-pulse" />
                <h1 className="text-4xl font-bold">Answer Locked In!</h1>
                <p className="text-muted-foreground mt-2 text-xl">Waiting for question to finish...</p>
                <div className="mt-12 flex flex-col items-center">
                    <Loader2 className="animate-spin w-12 h-12"/>
                    <p className="mt-4">
                        {isLastQuestion ? "Waiting for final results..." : "Waiting for other players..."}
                    </p>
                </div>
            </div>
        );
      case 'result':
        const isCorrect = lastAnswer ? lastAnswer.correct.includes(lastAnswer.selected) : false;
        const wasTimeout = lastAnswer?.wasTimeout || false;

        let bgColor = 'bg-red-500';
        let icon = <Frown className="w-24 h-24 mb-4" />;
        let message = 'Incorrect';

        if (isCorrect) {
          bgColor = 'bg-green-500';
          icon = <PartyPopper className="w-24 h-24 mb-4" />;
          message = 'Correct!';
        } else if (wasTimeout) {
          bgColor = 'bg-orange-500';
          icon = <Clock className="w-24 h-24 mb-4" />;
          message = 'No Answer';
        }

        return (
          <div className={`flex flex-col items-center justify-center text-center p-8 w-full h-full ${bgColor} text-white`}>
            {icon}
            <h1 className="text-6xl font-bold">{message}</h1>
            <p className="text-3xl mt-4">+{lastAnswer?.points || 0} points</p>
            <p className="text-2xl mt-8">Your score: {player?.score}</p>
            <div className="mt-12 flex flex-col items-center">
                <Loader2 className="animate-spin w-12 h-12"/>
                <p className="mt-4 text-lg">
                    {isLastQuestion ? "Revealing final scores..." : "Loading next question..."}
                </p>
            </div>
          </div>
        );
      case 'ended':
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-primary text-primary-foreground">
                <Trophy className="w-24 h-24 mb-4 text-yellow-400" />
                <h1 className="text-5xl font-bold">Quiz Finished!</h1>
                <p className="text-3xl mt-4">Your final score is:</p>
                <p className="text-8xl font-bold my-8">{player?.score}</p>
                <Button onClick={() => router.push('/')} size="lg" variant="secondary" className="mt-12 text-xl">
                    Play Again
                </Button>
            </div>
        );
      case 'cancelled':
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-destructive text-destructive-foreground">
                <XCircle className="w-24 h-24 mb-4" />
                <h1 className="text-5xl font-bold">Game Canceled</h1>
                <p className="text-2xl mt-4">The host has canceled the game.</p>
                <Button onClick={() => router.push('/')} size="lg" variant="secondary" className="mt-12 text-xl">
                    Return Home
                </Button>
            </div>
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
