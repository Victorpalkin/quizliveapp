
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PartyPopper, Frown, Trophy, Loader2, XCircle } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAuth, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, addDoc, query, where, getDocs, serverTimestamp, setDoc, updateDoc, DocumentReference } from 'firebase/firestore';
import type { Quiz, Player, Game } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { signInAnonymously } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type PlayerState = 'joining' | 'lobby' | 'question' | 'result' | 'ended' | 'cancelled';

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
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [state, setState] = useState<PlayerState>('joining');
  const [nickname, setNickname] = useState('');
  const [gameDocId, setGameDocId] = useState<string | null>(null);
  
  const gameRef = useMemoFirebase(() => gameDocId ? doc(firestore, 'games', gameDocId) as DocumentReference<Game> : null, [firestore, gameDocId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const quizRef = useMemoFirebase(() => game ? doc(firestore, 'quizzes', game.quizId) : null, [firestore, game]);
  const { data: quiz, loading: quizLoading } = useDoc(quizRef);

  const [player, setPlayer] = useState<Player | null>(null);
  const [lastAnswer, setLastAnswer] = useState<{ selected: number; correct: number; points: number } | null>(null);
  const [time, setTime] = useState(20);
  const [answerSelected, setAnswerSelected] = useState<number | null>(null);

  const question = quiz?.questions[game?.currentQuestionIndex || 0];
  
  useEffect(() => {
    if (!userLoading && !user) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed: ", error);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Could not sign you in. Please try refreshing the page.",
        });
      });
    }
  }, [user, userLoading, auth, toast]);

  useEffect(() => {
    if (!game && !gameLoading && state !== 'joining' && state !== 'cancelled') {
        setState('cancelled');
    }
    else if (game?.state) {
        if (game.state !== 'lobby' && state === 'lobby') {
            setState('question');
        }
        if(game.state === 'question' && state === 'result') {
          setState('question');
        }
        if(game.state === 'ended' && state !== 'ended') {
          setState('ended');
        }
    }
  }, [game, gameLoading, state]);

  useEffect(() => {
    if (state === 'question') {
      setTime(20);
      setAnswerSelected(null);
      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (answerSelected === null) {
              handleAnswer(-1); // Times up
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [game?.currentQuestionIndex, state, answerSelected]);

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      toast({ variant: 'destructive', title: 'Nickname is required' });
      return;
    }
    
    if (!user) {
        toast({ variant: 'destructive', title: 'Could not authenticate', description: "Please wait a moment and try again." });
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

        const playerRef = doc(firestore, 'games', gameDoc.id, 'players', user.uid);
        const newPlayer = { name: nickname, score: 0 };
        
        setDoc(playerRef, newPlayer)
          .then(() => {
            setPlayer({ ...newPlayer, id: user.uid });
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
    if (answerSelected !== null || !user || !gameDocId || !player) return;
    setAnswerSelected(selectedIndex);

    const isCorrect = question?.correctAnswerIndex === selectedIndex;
    const points = isCorrect ? Math.round(100 + (time / 20) * 900) : 0;
    
    const newScore = player.score + points;
    const playerRef = doc(firestore, 'games', gameDocId, 'players', user.uid) as DocumentReference<Player>;
    updatePlayer(playerRef, { score: newScore });

    setPlayer({ ...player, score: newScore });
    setLastAnswer({ selected: selectedIndex, correct: question.correctAnswerIndex, points });

    setTimeout(() => {
        setState('result');
    }, 1000);
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
              <Button type="submit" size="lg" className="w-full" disabled={userLoading}>Join</Button>
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
                  {question.answers.map((ans: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={answerSelected !== null}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg text-white transition-all duration-300 transform",
                        answerIcons[i].color,
                        answerSelected === null ? 'hover:scale-105' : 'opacity-50',
                        answerSelected === i && 'opacity-100 ring-4 ring-white scale-105'
                      )}
                    >
                      <answerIcons[i].icon className="w-24 h-24" />
                    </button>
                  ))}
                </div>
            </div>
            <footer className="p-4 text-center">
                <p>Question {game.currentQuestionIndex + 1} of {quiz.questions.length}</p>
            </footer>
          </div>
        );
      case 'result':
        const isCorrect = lastAnswer?.selected === lastAnswer?.correct;
        return (
          <div className={`flex flex-col items-center justify-center text-center p-8 w-full h-full ${isCorrect ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            {isCorrect ? <PartyPopper className="w-24 h-24 mb-4" /> : <Frown className="w-24 h-24 mb-4" />}
            <h1 className="text-6xl font-bold">{isCorrect ? 'Correct!' : 'Incorrect'}</h1>
            <p className="text-3xl mt-4">+{lastAnswer?.points} points</p>
            <p className="text-2xl mt-8">Your score: {player?.score}</p>
            <div className="mt-12 flex flex-col items-center">
                <Loader2 className="animate-spin w-12 h-12"/>
                <p className="mt-4">Waiting for next question...</p>
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

    