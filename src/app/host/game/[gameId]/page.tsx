'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, CheckCircle, Users, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CircularTimer } from '@/components/app/circular-timer';
import { AnswerButton } from '@/components/app/answer-button';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { QuestionCounter } from '@/components/app/question-counter';
import { QuestionTypeBadges } from '@/components/app/question-type-badges';
import { isSingleChoice, isMultipleChoice, isPoll } from '@/lib/type-guards';

// Hooks
import { useGameState } from './hooks/use-game-state';
import { useQuestionTimer } from './hooks/use-question-timer';
import { useAnswerDistribution } from './hooks/use-answer-distribution';
import { useGameControls } from './hooks/use-game-controls';

// Components
import { CancelGameButton } from './components/controls/cancel-game-button';
import { DeleteGameButton } from './components/controls/delete-game-button';
import { LeaderboardView } from './components/visualizations/leaderboard-view';
import { FinalLeaderboardView } from './components/visualizations/final-leaderboard-view';
import { AnswerDistributionChart } from './components/visualizations/answer-distribution-chart';
import { SliderResultsView } from './components/visualizations/slider-results-view';

// Helper to convert index to letter (0 = A, 1 = B, etc.)
const indexToLetter = (index: number): string => String.fromCharCode(65 + index);

export default function HostGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;

  // Game state
  const { game, gameRef, quiz, players, gameLoading, quizLoading } = useGameState(gameId);

  const question = quiz?.questions[game?.currentQuestionIndex || 0];
  const timeLimit = question?.timeLimit || 20;

  // Game controls
  const { finishQuestion, handleNext, startQuestion, isLastQuestion } = useGameControls(
    gameId,
    gameRef,
    game,
    quiz,
    players
  );

  // Timer
  const { time, answeredPlayers } = useQuestionTimer(game, players, timeLimit, finishQuestion);

  // Answer distribution
  const { answerDistribution, sliderResponses } = useAnswerDistribution(question, players, game);

  // Auto-transition from preparing to question
  useEffect(() => {
    if (game?.state === 'preparing') {
      startQuestion();
    }
  }, [game?.state, startQuestion]);

  // Loading state
  if (gameLoading || quizLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
        <Skeleton className="w-full h-screen" />
      </div>
    );
  }

  // Game not found
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

  // Game ended state
  if (game?.state === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
        <h1 className="text-4xl font-bold mb-4">Quiz Over!</h1>
        <p className="text-muted-foreground mb-8">Here are the final results.</p>
        <FinalLeaderboardView players={players} currentQuestionIndex={game?.currentQuestionIndex} />
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
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">gQuiz</h1>
          <div className="text-2xl font-mono bg-muted text-muted-foreground px-4 py-1 rounded-md">{game?.gamePin}</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <CancelGameButton gameRef={gameRef} />
        </div>
      </header>

      {/* Preparing State */}
      {game?.state === 'preparing' && (
        <main className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold">Get ready for the next question...</h1>
        </main>
      )}

      {/* Question State */}
      {game?.state === 'question' && question && (
        <main className="flex-1 flex flex-col items-center justify-center text-center relative">
          <div className="absolute top-4 right-4">
            <CircularTimer time={time} timeLimit={timeLimit} size={80} />
          </div>

          <div className="w-full max-w-4xl">
            <Card className="bg-card text-card-foreground mb-4">
              <CardContent className="p-8">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-3xl font-bold">{question.text}</p>
                  <QuestionTypeBadges question={question} />
                </div>
              </CardContent>
            </Card>

            {question.imageUrl && (
              <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-lg overflow-hidden my-6">
                <Image src={question.imageUrl} alt="Question image" layout="fill" objectFit="contain" />
              </div>
            )}
          </div>

          {/* Question Type Display */}
          {question.type === 'slide' ? (
            <Card className="w-full max-w-2xl mx-auto mt-8">
              <CardContent className="p-8 text-center">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-sm">Informational Slide</Badge>
                    <h2 className="text-4xl font-bold text-primary">{question.text}</h2>
                    {question.description && (
                      <p className="text-xl text-muted-foreground whitespace-pre-wrap mt-4">
                        {question.description}
                      </p>
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground">Players are viewing this slide...</p>
                </div>
              </CardContent>
            </Card>
          ) : question.type === 'slider' ? (
            <Card className="w-full max-w-2xl mx-auto mt-8">
              <CardContent className="p-8 text-center">
                <p className="text-lg text-muted-foreground mb-4">Players are submitting their answers...</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Range:</p>
                    <p className="text-4xl font-bold">
                      {question.minValue}{question.unit} - {question.maxValue}{question.unit}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 w-full max-w-4xl">
              {question.answers.map((ans, i) => (
                <AnswerButton
                  key={i}
                  letter={indexToLetter(i)}
                  text={ans.text}
                  disabled={true}
                  colorIndex={i}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* Leaderboard State */}
      {game?.state === 'leaderboard' && (
        <main className="flex-1 flex flex-col items-center justify-center gap-8 md:flex-row md:items-start">
          <LeaderboardView players={players} currentQuestionIndex={game?.currentQuestionIndex} />
          {question?.type === 'slide' ? (
            <Card className="w-full max-w-2xl flex-1">
              <CardContent className="p-8 text-center space-y-4">
                <Badge variant="secondary" className="text-lg">Informational Content</Badge>
                <p className="text-lg text-muted-foreground">
                  This was an informational slide. No scoring applied.
                </p>
                <div className="space-y-2 pt-4">
                  <h3 className="text-2xl font-bold text-primary">{question.text}</h3>
                  {question.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{question.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : question?.type === 'slider' ? (
            <SliderResultsView
              responses={sliderResponses}
              correctValue={question.correctValue}
              minValue={question.minValue}
              maxValue={question.maxValue}
              unit={question.unit}
              acceptableError={question.acceptableError}
            />
          ) : (
            <AnswerDistributionChart data={answerDistribution} />
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="mt-8 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          <Users className="h-5 w-5"/>
          <span>{answeredPlayers} / {players.length || 0} Answered</span>
        </div>
        <div>
          <QuestionCounter
            current={(game?.currentQuestionIndex || 0) + 1}
            total={quiz?.questions.length || 0}
            className="text-lg mr-4"
          />
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
