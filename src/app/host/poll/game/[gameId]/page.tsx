'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Header } from '@/components/app/header';
import { Vote, Users, ArrowRight, CheckCircle, BarChart3, MessageSquare, ListChecks, AlignLeft, Home } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, updateDoc, DocumentReference, Query, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Game, Player, PollActivity, PollQuestion, PlayerAnswer } from '@/lib/types';
import { gameConverter, playerConverter, pollActivityConverter } from '@/firebase/converters';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import Link from 'next/link';

interface AnswerDistribution {
  [answerIndex: number]: number;
}

function PollResultsChart({ question, distribution, totalResponses }: {
  question: PollQuestion;
  distribution: AnswerDistribution;
  totalResponses: number;
}) {
  if (question.type === 'poll-free-text') {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlignLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Free text responses will be grouped by AI</p>
        <p className="text-sm">{totalResponses} response{totalResponses !== 1 ? 's' : ''} collected</p>
      </div>
    );
  }

  if (!('answers' in question)) return null;

  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="space-y-4">
      {question.answers.map((answer, index) => {
        const count = distribution[index] || 0;
        const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-xs font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="font-medium">{answer.text}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{count} vote{count !== 1 ? 's' : ''}</span>
                <Badge variant="secondary">{percentage}%</Badge>
              </div>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PollGamePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const gameId = params.gameId as string;

  const [answerDistribution, setAnswerDistribution] = useState<AnswerDistribution>({});
  const [respondedCount, setRespondedCount] = useState(0);

  // Game data
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId).withConverter(gameConverter) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Activity data
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(pollActivityConverter) as DocumentReference<PollActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: poll } = useDoc(activityRef);

  // Players
  const playersQuery = useMemoFirebase(
    () => collection(firestore, 'games', gameId, 'players').withConverter(playerConverter) as Query<Player>,
    [firestore, gameId]
  );
  const { data: players } = useCollection<Player>(playersQuery);

  // Calculate live results from player answers
  useEffect(() => {
    if (!players || !game) return;

    const currentQuestionIndex = game.currentQuestionIndex;
    const distribution: AnswerDistribution = {};
    let responded = 0;

    players.forEach(player => {
      const answer = player.answers.find(a => a.questionIndex === currentQuestionIndex);
      if (answer) {
        responded++;
        if (answer.answerIndex !== undefined) {
          distribution[answer.answerIndex] = (distribution[answer.answerIndex] || 0) + 1;
        } else if (answer.answerIndices) {
          answer.answerIndices.forEach(idx => {
            distribution[idx] = (distribution[idx] || 0) + 1;
          });
        }
      }
    });

    setAnswerDistribution(distribution);
    setRespondedCount(responded);
  }, [players, game?.currentQuestionIndex]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleNextQuestion = async () => {
    if (!game || !poll) return;

    const nextIndex = game.currentQuestionIndex + 1;

    if (nextIndex >= poll.questions.length) {
      // End the poll
      await updateDoc(doc(firestore, 'games', gameId), {
        state: 'ended',
      });
    } else {
      // Go to next question
      await updateDoc(doc(firestore, 'games', gameId), {
        currentQuestionIndex: nextIndex,
        state: 'question',
      });
      setAnswerDistribution({});
      setRespondedCount(0);
    }
  };

  const handleShowResults = async () => {
    await updateDoc(doc(firestore, 'games', gameId), {
      state: 'results',
    });
  };

  if (userLoading || gameLoading) {
    return <FullPageLoader />;
  }

  if (!game || !poll) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4">Session Not Found</h2>
          <Button onClick={() => router.push('/host')}>Return to Dashboard</Button>
        </main>
      </div>
    );
  }

  const currentQuestion = poll.questions[game.currentQuestionIndex];
  const playerCount = players?.length || 0;
  const responsePercentage = playerCount > 0 ? Math.round((respondedCount / playerCount) * 100) : 0;
  const isLastQuestion = game.currentQuestionIndex >= poll.questions.length - 1;
  const showLiveResults = currentQuestion?.showLiveResults ?? poll.config.defaultShowLiveResults;

  if (game.state === 'ended') {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl">
          <Card className="shadow-2xl rounded-3xl text-center">
            <CardContent className="p-12">
              <CheckCircle className="h-20 w-20 mx-auto mb-6 text-green-500" />
              <h1 className="text-4xl font-bold mb-4">Poll Complete!</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Thank you for running this poll with {playerCount} participant{playerCount !== 1 ? 's' : ''}.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500">
                  <Link href="/host">
                    <Home className="mr-2 h-5 w-5" /> Return to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const getQuestionIcon = () => {
    switch (currentQuestion?.type) {
      case 'poll-single': return <MessageSquare className="h-5 w-5" />;
      case 'poll-multiple': return <ListChecks className="h-5 w-5" />;
      case 'poll-free-text': return <AlignLeft className="h-5 w-5" />;
      default: return <Vote className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-4xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Question {game.currentQuestionIndex + 1} of {poll.questions.length}
            </span>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {respondedCount}/{playerCount} responded
            </Badge>
          </div>
          <Progress value={((game.currentQuestionIndex + 1) / poll.questions.length) * 100} className="h-2" />
        </div>

        {/* Current Question */}
        <Card className="shadow-2xl rounded-3xl mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {getQuestionIcon()}
              <Badge variant="secondary">
                {currentQuestion?.type === 'poll-single' ? 'Single Choice' :
                 currentQuestion?.type === 'poll-multiple' ? 'Multiple Choice' : 'Free Text'}
              </Badge>
              {showLiveResults && (
                <Badge variant="outline" className="ml-auto">
                  <BarChart3 className="h-3 w-3 mr-1" /> Live Results
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl">{currentQuestion?.text}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Response Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Response Progress</span>
                <span className="text-sm font-medium">{responsePercentage}%</span>
              </div>
              <Progress value={responsePercentage} className="h-3" />
            </div>

            {/* Results */}
            {(showLiveResults || game.state === 'results') && (
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {game.state === 'results' ? 'Final Results' : 'Live Results'}
                </h3>
                <PollResultsChart
                  question={currentQuestion}
                  distribution={answerDistribution}
                  totalResponses={respondedCount}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {game.state === 'question' && !showLiveResults && (
            <Button
              onClick={handleShowResults}
              variant="outline"
              className="flex-1 py-6 text-lg rounded-xl"
            >
              <BarChart3 className="mr-2 h-5 w-5" /> Show Results
            </Button>
          )}
          <Button
            onClick={handleNextQuestion}
            className="flex-1 py-6 text-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 rounded-xl"
          >
            {isLastQuestion ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" /> End Poll
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-5 w-5" /> Next Question
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
