// src/app/play/[gameId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { mockQuiz } from '@/lib/mock-data';
import { PartyPopper, Frown, CheckCircle, XCircle, Trophy } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type PlayerState = 'lobby' | 'question' | 'result' | 'leaderboard' | 'ended';

const answerIcons = [
  { icon: TriangleIcon, color: 'bg-red-500', textColor: 'text-red-500' },
  { icon: DiamondIcon, color: 'bg-blue-500', textColor: 'text-blue-500' },
  { icon: SquareIcon, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { icon: CircleIcon, color: 'bg-green-500', textColor: 'text-green-500' },
];

export default function PlayerGamePage({ params }: { params: { gameId: string } }) {
  const [state, setState] = useState<PlayerState>('lobby');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<{ selected: number; correct: number; points: number } | null>(null);
  const [time, setTime] = useState(20);
  const [answerSelected, setAnswerSelected] = useState<number | null>(null);

  const question = mockQuiz.questions[currentQuestionIndex];

  useEffect(() => {
    if (state === 'question') {
      setTime(20);
      setAnswerSelected(null);
      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAnswer(-1); // Times up
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentQuestionIndex, state]);

  const handleAnswer = (selectedIndex: number) => {
    if (answerSelected !== null) return;
    setAnswerSelected(selectedIndex);

    const isCorrect = question.answers[selectedIndex]?.isCorrect || false;
    const points = isCorrect ? Math.round(100 + (time / 20) * 900) : 0;
    setScore(prev => prev + points);
    setLastAnswer({ selected: selectedIndex, correct: question.answers.findIndex(a => a.isCorrect), points });

    setTimeout(() => {
        setState('result');
    }, 1000); // Wait a moment before showing result
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < mockQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setState('question');
    } else {
      setState('ended');
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'lobby':
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold">You're in!</h1>
            <p className="text-muted-foreground mt-2 text-xl">Get ready to play...</p>
            <p className="mt-8 text-2xl font-bold">Game PIN: {params.gameId}</p>
            <Button onClick={() => setState('question')} size="lg" className="mt-12">I'm Ready!</Button>
          </div>
        );
      case 'question':
        return (
          <div className="w-full h-full flex flex-col">
            <header className="p-4 text-center">
              <p className="text-2xl font-bold">{question.text}</p>
            </header>
            <div className="flex-grow flex items-center justify-center w-full">
                <Progress value={(time / 20) * 100} className="absolute top-0 left-0 w-full h-2 rounded-none" />
                <div className="absolute top-4 right-4 text-2xl font-bold bg-background/80 px-4 py-2 rounded-lg">{time}</div>
                <div className="grid grid-cols-2 gap-4 w-full h-full p-4">
                  {question.answers.map((ans, i) => (
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
                <p>Question {currentQuestionIndex + 1} of {mockQuiz.questions.length}</p>
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
            <p className="text-2xl mt-8">Your score: {score}</p>
            <Button onClick={handleNext} size="lg" variant="secondary" className="mt-12 text-xl">
              {currentQuestionIndex === mockQuiz.questions.length - 1 ? 'Show Final Results' : 'Next Question'}
            </Button>
          </div>
        );
      case 'ended':
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-primary text-primary-foreground">
                <Trophy className="w-24 h-24 mb-4 text-yellow-400" />
                <h1 className="text-5xl font-bold">Quiz Finished!</h1>
                <p className="text-3xl mt-4">Your final score is:</p>
                <p className="text-8xl font-bold my-8">{score}</p>
                <Button onClick={() => window.location.href = '/'} size="lg" variant="secondary" className="mt-12 text-xl">
                    Play Again
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
