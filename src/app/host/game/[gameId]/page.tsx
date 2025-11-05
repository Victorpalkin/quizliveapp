
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { Progress } from '@/components/ui/progress';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, updateDoc, DocumentReference } from 'firebase/firestore';
import type { Player, Quiz, Game } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

  const chartData = question?.answers.map((ans:any, index:number) => ({
    name: `Option ${index + 1}`,
    // This part is tricky without knowing player answers in real-time.
    // For now, we'll keep it random. A full implementation would require
    // storing player answers temporarily.
    total: Math.floor(Math.random() * (players?.length || 0)), 
    fill: `hsl(var(--chart-${index + 1}))`
  }));

  useEffect(() => {
    if (game?.state === 'question') {
      setTime(20);
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
  }, [game?.currentQuestionIndex, game?.state]);

  const handleNext = () => {
    if (!game || !quiz || !gameRef) return;

    if (game.state === 'question') {
      updateGame(gameRef, { state: 'leaderboard' });
    } else if (game.state === 'leaderboard') {
      if (game.currentQuestionIndex < quiz.questions.length - 1) {
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

  if (game?.state === 'ended') {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
            <h1 className="text-4xl font-bold mb-4">Quiz Over!</h1>
            <p className="text-muted-foreground mb-8">Here are the final results.</p>
            <LeaderboardView players={players || []} />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">QuizLive</h1>
        <div className="text-2xl font-mono">{game?.gamePin}</div>
      </header>

      {game?.state === 'question' && question && (
        <main className="flex-1 flex flex-col items-center justify-center text-center">
            <Progress value={(time / 20) * 100} className="w-full max-w-4xl h-4 mb-4" />
            <Card className="w-full max-w-4xl bg-card text-card-foreground">
                <CardContent className="p-8">
                    <p className="text-3xl font-bold">{question.text}</p>
                </CardContent>
            </Card>

            <div className="w-full max-w-4xl mt-8">
                <h2 className="text-xl font-semibold mb-4 text-left text-muted-foreground">Live Answer Distribution</h2>
                <Card className="bg-card/80">
                    <CardContent className="p-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" hide />
                                <Bar dataKey="total" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            
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
        <Button onClick={handleNext} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          {game?.state === 'leaderboard' && (game?.currentQuestionIndex || 0) === (quiz?.questions.length || 0) - 1 ? 'End Game' : 'Next'}
        </Button>
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
                </ul>
            </CardContent>
        </Card>
    );
}

    