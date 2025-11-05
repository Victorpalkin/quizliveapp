
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PartyPopper, Frown, Trophy, Loader2, XCircle, Timer } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, updateDoc, DocumentReference } from 'firebase/firestore';
import type { Quiz, Player, Game } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { nanoid } from 'nanoid';

type PlayerState = 'joining' | 'lobby' | 'question' | 'waiting' | 'result' | 'ended' | 'cancelled';

const answerIcons = [
  { icon: TriangleIcon, color: 'bg-red-500', textColor: 'text-red-500' },
  { icon: DiamondIcon, color: 'bg-blue-500', textColor: 'text-blue-500' },
  { icon: SquareIcon, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { icon: CircleIcon, color: 'bg-green-500', textColor: 'text-green-500' },
];

function updatePlayer(playerRef: DocumentReference<Player>, data: Partial<Player>) {
  updateDoc(playerRef, data).catch(error => {
    console.error("Error updating player:", error);
    const permissionError = new FirestorePermissionError({
      path: playerRef.path,
      operation: 'update',
      requestResourceData: data
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}


export default function PlayerGamePage() {
  const params = useParams();
  const gamePin = params.gameId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [state, setState] = useState<PlayerState>('joining');
  const [nickname, setNickname] = useState('');
  const [gameDocId, setGameDocId] = useState<string | null>(null);
  const [playerId] = useState(() => nanoid());
  
  const gameRef = useMemoFirebase(() => gameDocId ? doc(firestore, 'games', gameDocId) as DocumentReference<Game> : null, [firestore, gameDocId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const quizRef = useMemoFirebase(() => game ? doc(firestore, 'quizzes', game.quizId) : null, [firestore, game]);
  const { data: quiz, loading: quizLoading } = useDoc(quizRef);

  const [player, setPlayer] = useState<Player | null>(null);
  const [lastAnswer, setLastAnswer] = useState<{ selected: number; correct: number; points: number } | null>(null);
  const [time, setTime] = useState(20);
  const [answerSelected, setAnswerSelected] = useState<number | null>(null);

  const question = quiz?.questions[game?.currentQuestionIndex || 0];
  const isLastQuestion = game && quiz ? game.currentQuestionIndex >= quiz.questions.length - 1 : false;

  useEffect(() => {
    if (!game && !gameLoading && state !== 'joining' && state !== 'cancelled') {
        setState('cancelled');
        return;
    }

    if (!game) return;

    // This effect synchronizes the player's state with the host's game state.
    switch (game.state) {
        case 'lobby':
            if (state === 'joining') setState('lobby');
            break;
        case 'question':
            // Host started a new question. Move from lobby/result to question.
            if ((state === 'result' || state === 'lobby') && answerSelected !== null) {
                setState('question');
            }
            break;
        case 'leaderboard':
            // Host finished question, player moves from 'waiting' to 'result'
            if (state === 'waiting') {
                setState('result');
            }
            break;
        case 'ended':
            if (state !== 'ended') {
                setState('ended');
            }
            break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameLoading]);


  useEffect(() => {
    if (state === 'question') {
      setTime(20);
      setAnswerSelected(null);
      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // If timer expires and no answer was selected, handle it as a wrong answer
            if (answerSelected === null) {
              handleAnswer(-1); // -1 indicates timeout
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, game?.currentQuestionIndex]); // Rerun timer only when a new question starts

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      toast({ variant: 'destructive', title: 'Nickname is required' });
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
        const newPlayer = { name: nickname, score: 0, lastAnswerIndex: null };
        
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

  const handleAnswer = (selectedIndex: number) => {
    // Prevent answering multiple times or after time is up
    if (answerSelected !== null || state !== 'question') return;
    
    setAnswerSelected(selectedIndex);
    setState('waiting'); // Move to waiting state immediately

    const isCorrect = question?.correctAnswerIndex === selectedIndex;
    const points = isCorrect ? Math.round(100 + (time / 20) * 900) : 0;
    
    const newScore = (player?.score || 0) + points;
    
    if (gameDocId && player) {
        const playerRef = doc(firestore, 'games', gameDocId, 'players', playerId) as DocumentReference<Player>;
        updatePlayer(playerRef, { score: newScore, lastAnswerIndex: selectedIndex });
    }

    setPlayer(p => p ? { ...p, score: newScore, lastAnswerIndex: selectedIndex } : null);
    setLastAnswer({ selected: selectedIndex, correct: question.correctAnswerIndex, points });
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
      case 'question':
        if (quizLoading || !question || !game) {
          return <Skeleton className="w-full h-full" />;
        }
        return (
          <div className="w-full h-full flex flex-col">
            <header className="p-4 text-center">
              <p className="text-2xl font-bold">{question.text}</p>
            </header>
            <div className="flex-grow flex items-center justify-center w-full">
              <Progress value={(time / 20) * 100} className="absolute top-0 left-0 w-full h-2 rounded-none" />
              <div className="absolute top-4 right-4 text-2xl font-bold bg-background/80 px-4 py-2 rounded-lg">{time}</div>
              <div className="grid grid-cols-2 gap-4 w-full h-full p-4">
                {question.answers.map((ans: any, i: number) => {
                  const Icon = answerIcons[i].icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={answerSelected !== null}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg text-white transition-all duration-300 transform hover:scale-105',
                        answerIcons[i].color
                      )}
                    >
                      <Icon className="w-24 h-24" />
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
        const isCorrect = lastAnswer?.selected === lastAnswer?.correct;
        return (
          <div className={`flex flex-col items-center justify-center text-center p-8 w-full h-full ${isCorrect ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            {isCorrect ? <PartyPopper className="w-24 h-24 mb-4" /> : <Frown className="w-24 h-24 mb-4" />}
            <h1 className="text-6xl font-bold">{isCorrect ? 'Correct!' : 'Incorrect'}</h1>
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
