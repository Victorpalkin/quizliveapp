
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, XCircle, Home, Trash2, CheckCircle } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { Progress } from '@/components/ui/progress';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, updateDoc, DocumentReference, deleteDoc } from 'firebase/firestore';
import type { Player, Quiz, Game } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const answerIcons = [
  <TriangleIcon key="0" className="w-5 h-5" />,
  <DiamondIcon key="1" className="w-5 h-5" />,
  <SquareIcon key="2" className="w-5 h-5" />,
  <CircleIcon key="3" className="w-5 h-5" />,
];

const answerColors = [
  'bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'
]

function updateGame(gameRef: DocumentReference<Game>, data: Partial<Game>) {
  updateDoc(gameRef, data).catch(error => {
    console.error("Error updating game: ", error);
    const permissionError = new FirestorePermissionError({
      path: gameRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

function CancelGameButton({ gameRef }: { gameRef: DocumentReference<Game> | null }) {
    const router = useRouter();

    const handleCancelGame = () => {
        if (!gameRef) return;
        deleteDoc(gameRef)
            .then(() => {
                router.push('/host');
            })
            .catch((error) => {
                console.error("Error deleting game: ", error);
                const permissionError = new FirestorePermissionError({
                    path: gameRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Game
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will cancel the game for all players and cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, Cancel Game
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DeleteGameButton({ gameRef }: { gameRef: DocumentReference<Game> | null }) {
    const router = useRouter();

    const handleDeleteGame = () => {
        if (!gameRef) return;
        deleteDoc(gameRef)
            .then(() => {
                router.push('/host');
            })
            .catch((error) => {
                console.error("Error deleting game: ", error);
                const permissionError = new FirestorePermissionError({
                    path: gameRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Game
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this game?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this game session. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function HostGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const firestore = useFirestore();

  const gameRef = useMemoFirebase(() => doc(firestore, 'games', gameId) as DocumentReference<Game>, [firestore, gameId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const quizRef = useMemoFirebase(() => game ? doc(firestore, 'quizzes', game.quizId) : null, [firestore, game]);
  const { data: quiz, loading: quizLoading } = useDoc(quizRef);

  const playersQuery = useMemoFirebase(() => collection(firestore, 'games', gameId, 'players'), [firestore, gameId]);
  const { data: players, loading: playersLoading } = useCollection(playersQuery);
  
  const [time, setTime] = useState(20);

  const question = quiz?.questions[game?.currentQuestionIndex || 0];
  const isLastQuestion = game && quiz ? game.currentQuestionIndex >= quiz.questions.length - 1 : false;


  const chartData = question?.answers.map((ans:any, index:number) => ({
    name: `Option ${index + 1}`,
    // This part is tricky without knowing player answers in real-time.
    // For now, we'll keep it random. A full implementation would require
    // storing player answers temporarily.
    total: Math.floor(Math.random() * (players?.length || 0)), 
    fill: `hsl(var(--chart-${index + 1}))`
  }));

  const finishQuestion = () => {
    if (game?.state === 'question' && gameRef) {
        updateGame(gameRef, { state: 'leaderboard' });
    }
  };

  useEffect(() => {
    if (game?.state === 'question') {
      setTime(20);
      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            finishQuestion(); // Automatically finish when timer runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentQuestionIndex, game?.state]);

  const handleNext = () => {
    if (!game || !quiz || !gameRef) return;

    if (game.state === 'question') {
      // This is handled by finishQuestion now
      updateGame(gameRef, { state: 'leaderboard' });
    } else if (game.state === 'leaderboard') {
      if (!isLastQuestion) {
        updateGame(gameRef, { 
          state: 'question',
          currentQuestionIndex: game.currentQuestionIndex + 1
        });
      } else {
        updateGame(gameRef, { state: 'ended' });
      }
    }
  };

  if (gameLoading || quizLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
            <Skeleton className="w-full h-screen" />
        </div>
    );
  }
  
  if (!game && !gameLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 text-center">
        <XCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-4xl font-bold mb-4">Game Not Found</h1>
        <p className="text-muted-foreground mb-8">This game may have been canceled or never existed.</p>
        <Button asChild>
          <a href="/host">Return to Dashboard</a>
        </Button>
      </div>
    );
  }

  if (game?.state === 'ended') {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
            <h1 className="text-4xl font-bold mb-4">Quiz Over!</h1>
            <p className="text-muted-foreground mb-8">Here are the final results.</p>
            <LeaderboardView players={players || []} />
            <div className="mt-8 flex gap-4">
                <Button asChild>
                    <Link href="/host">
                        <Home className="mr-2 h-4 w-4" />
                        Exit to Dashboard
                    </Link>
                </Button>
                <DeleteGameButton gameRef={gameRef} />
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">QuizLive</h1>
            <div className="text-2xl font-mono bg-muted text-muted-foreground px-4 py-1 rounded-md">{game?.gamePin}</div>
        </div>
        <CancelGameButton gameRef={gameRef} />
      </header>

      {game?.state === 'question' && question && (
        <main className="flex-1 flex flex-col items-center justify-center text-center">
            <Progress value={(time / 20) * 100} className="w-full max-w-4xl h-4 mb-4" />
            <Card className="w-full max-w-4xl bg-card text-card-foreground">
                <CardContent className="p-8">
                    <p className="text-3xl font-bold">{question.text}</p>
                </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-4xl">
              {question.answers.map((ans, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-lg ${answerColors[i]}`}>
                  {answerIcons[i]}
                  <span className="text-xl font-medium">{ans.text}</span>
                </div>
              ))}
            </div>
        </main>
      )}

      {game?.state === 'leaderboard' && (
        <main className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-8">Leaderboard</h1>
            <LeaderboardView players={players || []} />
        </main>
      )}

      <footer className="mt-8 flex justify-end items-center gap-4">
        <span className="text-lg">Question {(game?.currentQuestionIndex || 0) + 1} / {(quiz?.questions.length || 0)}</span>
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
      </footer>
    </div>
  );
}

function LeaderboardView({ players }: { players: Player[] }) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
        <Card className="w-full max-w-2xl bg-card text-card-foreground">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy /> Rankings</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {sortedPlayers.map((player, index) => (
                        <li key={player.id} className="flex items-center justify-between p-3 rounded-md bg-background/50">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-lg w-6">{index + 1}</span>
                                <span className="text-lg">{player.name}</span>
                            </div>
                            <span className="font-bold text-lg text-primary">{player.score}</span>
                        </li>
                    ))}
                    {players.length === 0 && <p className="text-muted-foreground text-center p-4">No players have joined yet.</p>}
                </ul>
            </CardContent>
        </Card>
    );
}
