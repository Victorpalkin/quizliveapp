'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GameHeader } from '@/components/app/game-header';
import { HostActionHint } from '@/components/app/host-action-hint';
import { Vote, Users, ArrowRight, CheckCircle, BarChart3, MessageSquare, ListChecks, AlignLeft, Home } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, updateDoc, deleteDoc, DocumentReference, Query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Game, Player, PollActivity, PollQuestion, PlayerAnswer } from '@/lib/types';
import { clearHostSession } from '@/lib/host-session';
import { useHostSession } from '../../../hooks/use-host-session';
import { gameConverter, playerConverter, pollActivityConverter } from '@/firebase/converters';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { PollResultsChart } from './components/poll-results-chart';
import Link from 'next/link';

interface AnswerDistribution {
  [answerIndex: number]: number;
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
  }, [players, game]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Host session tracking
  useHostSession({
    gameId,
    game,
    contentId: game?.activityId || '',
    contentTitle: poll?.title || '',
    userId: user?.uid,
    activityType: 'poll',
    returnPath: `/host/poll/game/${gameId}`,
  });

  const resetLeaderboardForNewQuestion = useCallback(async () => {
    try {
      await updateDoc(doc(firestore, 'games', gameId, 'aggregates', 'leaderboard'), {
        answerCounts: [],
        liveAnswerCounts: {},
        totalAnswered: 0,
      });
    } catch { /* document may not exist yet */ }
  }, [firestore, gameId]);

  const handleNextQuestion = async () => {
    if (!game || !poll) return;

    const nextIndex = game.currentQuestionIndex + 1;

    if (nextIndex >= poll.questions.length) {
      // End the poll
      await updateDoc(doc(firestore, 'games', gameId), {
        state: 'ended',
      });
    } else {
      // Reset leaderboard aggregate before advancing to next question
      await resetLeaderboardForNewQuestion();
      // Go to next question
      await updateDoc(doc(firestore, 'games', gameId), {
        currentQuestionIndex: nextIndex,
        state: 'question',
      });
    }
  };

  const handleShowResults = async () => {
    await updateDoc(doc(firestore, 'games', gameId), {
      state: 'results',
    });
  };

  const handleCancelGame = async () => {
    try {
      clearHostSession();
      await deleteDoc(doc(firestore, 'games', gameId));
      router.push('/host');
    } catch (error) {
      console.error('Error cancelling game:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not end the session. Please try again.",
      });
    }
  };

  if (userLoading || gameLoading) {
    return <FullPageLoader />;
  }

  if (!game || !poll) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold mb-4">Session Not Found</h2>
        <Button onClick={() => router.push('/host')}>Return to Dashboard</Button>
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
                  <Link href={`/host/poll/analytics/${gameId}`}>
                    <BarChart3 className="mr-2 h-5 w-5" /> View Analytics
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8 max-w-4xl">
        {/* Game Header with PIN, QR, player count, and cancel */}
        <GameHeader
          gamePin={game.gamePin}
          playerCount={playerCount}
          activityType="poll"
          title={poll.title}
          onCancel={handleCancelGame}
          isLive={true}
        />

        {/* Host Action Hint */}
        <HostActionHint
          gameState={game.state as 'question' | 'results'}
          activityType="poll"
          answeredCount={respondedCount}
          totalPlayers={playerCount}
          isLastQuestion={isLastQuestion}
          className="mb-6"
        />

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
