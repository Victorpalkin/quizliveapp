
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, LabelList, Cell, Rectangle, Text } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, XCircle, Home, Trash2, CheckCircle, Users } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { Progress } from '@/components/ui/progress';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, updateDoc, DocumentReference, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Player, Quiz, Game, Question } from '@/lib/types';
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
import { cn } from '@/lib/utils';

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


export default function HostGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const firestore = useFirestore();

  const gameRef = useMemoFirebase(() => doc(firestore, 'games', gameId) as DocumentReference<Game>, [firestore, gameId]);
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

  const playersQuery = useMemoFirebase(() => collection(firestore, 'games', gameId, 'players'), [firestore, gameId]);
  const { data: players, loading: playersLoading } = useCollection<Player>(playersQuery);
  
  const question = quiz?.questions[game?.currentQuestionIndex || 0];
  const timeLimit = question?.timeLimit || 20;

  const [time, setTime] = useState(timeLimit);

  const isLastQuestion = game && quiz ? game.currentQuestionIndex >= quiz.questions.length - 1 : false;

  const answeredPlayers = players?.filter(p => p.lastAnswerIndex !== null && p.lastAnswerIndex !== undefined).length || 0;

  const answerDistribution = useMemo(() => {
    if (!question || !players) return [];

    const counts = Array(question.answers.length).fill(0);
    players.forEach(player => {
        if (player.lastAnswerIndex !== null && player.lastAnswerIndex !== undefined && player.lastAnswerIndex >= 0) {
            counts[player.lastAnswerIndex]++;
        }
    });

    return question.answers.map((ans, index) => ({
        name: ans.text,
        total: counts[index],
        isCorrect: question.correctAnswerIndices.includes(index),
    }));
}, [question, players]);


  const finishQuestion = () => {
    if (game?.state === 'question' && gameRef) {
        updateGame(gameRef, { state: 'leaderboard' });
    }
  };

  useEffect(() => {
    if (game?.state === 'question') {
      if (players && players.length > 0 && answeredPlayers === players.length) {
        finishQuestion();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, answeredPlayers, game?.state]);

  useEffect(() => {
    if (game?.state === 'question') {
      setTime(timeLimit);
      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            finishQuestion(); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentQuestionIndex, game?.state, timeLimit]);

  useEffect(() => {
    if (game?.state === 'preparing' && gameRef) {
      updateGame(gameRef, {
        state: 'question',
        questionStartTime: serverTimestamp() // Use Firestore server timestamp for clock-independent sync
      });
    }
  }, [game?.state, gameRef]);

  const handleNext = async () => {
    if (!game || !quiz || !gameRef || !players) return;

    if (game.state === 'question') {
      updateGame(gameRef, { state: 'leaderboard' });
    } else if (game.state === 'leaderboard') {
      if (!isLastQuestion) {
        const batch = writeBatch(firestore);
        players.forEach(player => {
            const playerRef = doc(firestore, 'games', gameId, 'players', player.id);
            batch.update(playerRef, { lastAnswerIndex: null });
        });
        await batch.commit();

        updateGame(gameRef, { 
          state: 'preparing',
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
            <h1 className="text-xl font-bold">gQuiz</h1>
            <div className="text-2xl font-mono bg-muted text-muted-foreground px-4 py-1 rounded-md">{game?.gamePin}</div>
        </div>
        <CancelGameButton gameRef={gameRef} />
      </header>

      {game?.state === 'preparing' && (
        <main className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold">Get ready for the next question...</h1>
        </main>
      )}

      {game?.state === 'question' && question && (
        <main className="flex-1 flex flex-col items-center justify-center text-center">
            <Progress value={(time / timeLimit) * 100} className="w-full max-w-4xl h-4 mb-4" />
            
            <div className="w-full max-w-4xl">
              <Card className="bg-card text-card-foreground mb-4">
                  <CardContent className="p-8">
                      <p className="text-3xl font-bold">{question.text}</p>
                  </CardContent>
              </Card>

              {question.imageUrl && (
                <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-lg overflow-hidden my-6">
                    <Image src={question.imageUrl} alt="Question image" layout="fill" objectFit="contain" />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-auto w-full max-w-4xl">
              {question.answers.map((ans, i) => {
                const Icon = answerIcons[i % answerIcons.length];
                return (
                    <div key={i} className={cn(`flex items-center gap-4 p-4 rounded-lg text-white`, answerColors[i % answerColors.length])}>
                        <Icon className="w-8 h-8" />
                        <span className="text-2xl font-medium">{ans.text}</span>
                    </div>
                )
              })}
            </div>
        </main>
      )}

      {game?.state === 'leaderboard' && (
        <main className="flex-1 flex flex-col items-center justify-center gap-8 md:flex-row md:items-start">
            <LeaderboardView players={players || []} />
            <AnswerDistributionChart data={answerDistribution} />
        </main>
      )}

      <footer className="mt-8 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          <Users className="h-5 w-5"/>
          <span>{answeredPlayers} / {players?.length || 0} Answered</span>
        </div>
        <div>
          <span className="text-lg mr-4">Question {(game?.currentQuestionIndex || 0) + 1} / {(quiz?.questions.length || 0)}</span>
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
      </footer>
    </div>
  );
}

function LeaderboardView({ players }: { players: Player[] }) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
        <Card className="w-full max-w-md bg-card text-card-foreground">
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


function AnswerDistributionChart({ data }: { data: { name: string; total: number; isCorrect: boolean }[] }) {
    const CustomBarLabel = (props: any) => {
        const { x, y, width, height, value } = props;
        if (value === 0) return null;
        return (
          <text x={x + width + 10} y={y + height / 2} fill="hsl(var(--foreground))" textAnchor="start" dominantBaseline="middle" className="text-sm font-bold">
              {`${value}`}
          </text>
        );
    };

    const CustomBar = (props: any) => {
      const { fill, x, y, width, height, isCorrect, name, ...restProps } = props;

      return (
        <g>
          <rect
            {...restProps}
            fill={isCorrect ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
            x={x}
            y={y}
            width={width}
            height={height}
            radius={[0, 4, 4, 0]}
          />
          {isCorrect && (
             <CheckCircle
                x={x + width - 24}
                y={y + height / 2 - 8}
                width={16}
                height={16}
                className="text-white"
              />
          )}
        </g>
      );
    };

    const CustomizedYAxisTick = (props: any) => {
        const { x, y, payload } = props;
        return (
            <Text
                x={x}
                y={y}
                width={150}
                textAnchor="end"
                verticalAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                className="text-xs"
            >
                {payload.value}
            </Text>
        );
    };

    return (
        <Card className="w-full max-w-2xl flex-1">
            <CardHeader>
                <CardTitle>Answer Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                        <XAxis type="number" hide={true} />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={150} 
                            tickLine={false} 
                            axisLine={false} 
                            tick={<CustomizedYAxisTick/>}
                        />
                        <Bar dataKey="total" minPointSize={2} shape={<CustomBar />}>
                             <LabelList dataKey="total" content={<CustomBarLabel />} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

    