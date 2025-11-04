// src/app/host/game/[gameId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockQuiz, mockPlayers } from '@/lib/mock-data';
import { Trophy } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { Progress } from '@/components/ui/progress';

type GameState = 'question' | 'leaderboard' | 'ended';

const answerIcons = [
  <TriangleIcon key="0" className="w-5 h-5" />,
  <DiamondIcon key="1" className="w-5 h-5" />,
  <SquareIcon key="2" className="w-5 h-5" />,
  <CircleIcon key="3" className="w-5 h-5" />,
];

const answerColors = [
  'bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'
]

export default function HostGamePage({ params: { gameId } }: { params: { gameId: string } }) {
  const [gameState, setGameState] = useState<GameState>('question');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [scores, setScores] = useState(mockPlayers.map(p => ({ ...p, score: 0 })));
  const [time, setTime] = useState(20);

  const question = mockQuiz.questions[currentQuestionIndex];
  const chartData = question.answers.map((ans, index) => ({
    name: `Option ${index + 1}`,
    // Generate random number of answers for demonstration
    total: Math.floor(Math.random() * scores.length), 
    fill: `hsl(var(--chart-${index + 1}))`
  }));

  useEffect(() => {
    if (gameState === 'question') {
      setTime(20);
      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Simulate updating scores
            setScores(scores.map(p => ({ ...p, score: p.score + (Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : 0) })))
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentQuestionIndex, gameState]);

  const handleNext = () => {
    if (gameState === 'question') {
      setGameState('leaderboard');
    } else if (gameState === 'leaderboard') {
      if (currentQuestionIndex < mockQuiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setGameState('question');
      } else {
        setGameState('ended');
      }
    }
  };

  if (gameState === 'ended') {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
            <h1 className="text-4xl font-bold mb-4">Quiz Over!</h1>
            <p className="text-muted-foreground mb-8">Here are the final results.</p>
            <LeaderboardView scores={scores} />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">QuizLive</h1>
        <div className="text-2xl font-mono">{gameId}</div>
      </header>

      {gameState === 'question' && (
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

      {gameState === 'leaderboard' && (
        <main className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-8">Leaderboard</h1>
            <LeaderboardView scores={scores} />
        </main>
      )}

      <footer className="mt-8 flex justify-end items-center gap-4">
        <span className="text-lg">Question {currentQuestionIndex + 1} / {mockQuiz.questions.length}</span>
        <Button onClick={handleNext} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          {gameState === 'leaderboard' && currentQuestionIndex === mockQuiz.questions.length - 1 ? 'End Game' : 'Next'}
        </Button>
      </footer>
    </div>
  );
}

function LeaderboardView({ scores }: { scores: { id: string; name: string; score: number }[] }) {
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    return (
        <Card className="w-full max-w-2xl bg-card text-card-foreground">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy /> Rankings</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {sortedScores.map((player, index) => (
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
