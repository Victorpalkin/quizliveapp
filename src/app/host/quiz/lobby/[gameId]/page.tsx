
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Play } from 'lucide-react';
import { ReadinessChecklist, TipBanner } from '@/components/app/host-action-hint';
import { GameHeader } from '@/components/app/game-header';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, DocumentReference, deleteDoc, setDoc, serverTimestamp, query, where, Query, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Game, Quiz, QuestionSubmission, SingleChoiceQuestion, Question, MultipleChoiceQuestion, SliderQuestion, FreeResponseQuestion } from '@/lib/types';
import { removeUndefined } from '@/lib/firestore-utils';
import { saveHostSession, clearHostSession } from '@/lib/host-session';
import { SubmissionsPanel } from './components/submissions-panel';

/**
 * Extracts answer key data from a question (for server-side scoring).
 * This data is stored securely and never sent to players.
 */
function extractAnswerKeyEntry(q: Question) {
  const base = { type: q.type, timeLimit: q.timeLimit || 20 };

  switch (q.type) {
    case 'single-choice':
      return { ...base, correctAnswerIndex: q.correctAnswerIndex };
    case 'multiple-choice':
      return { ...base, correctAnswerIndices: q.correctAnswerIndices };
    case 'slider':
      return {
        ...base,
        correctValue: q.correctValue,
        minValue: q.minValue,
        maxValue: q.maxValue,
        acceptableError: q.acceptableError,
      };
    case 'free-response':
      return {
        ...base,
        correctAnswer: q.correctAnswer,
        alternativeAnswers: q.alternativeAnswers,
        caseSensitive: q.caseSensitive,
        allowTypos: q.allowTypos,
      };
    default:
      // Polls and slides don't have correct answers
      return base;
  }
}

/**
 * Creates a sanitized version of a question with correct answers removed.
 * This is safe to send to players.
 */
function sanitizeQuestionForPlayer(q: Question): Question {
  switch (q.type) {
    case 'single-choice': {
      const { correctAnswerIndex, ...rest } = q;
      return rest as Question;
    }
    case 'multiple-choice': {
      const { correctAnswerIndices, ...rest } = q as MultipleChoiceQuestion;
      // Add expectedAnswerCount for UX (tells player how many to select)
      return { ...rest, expectedAnswerCount: correctAnswerIndices.length } as unknown as Question;
    }
    case 'slider': {
      const { correctValue, acceptableError, ...rest } = q as SliderQuestion;
      return rest as Question;
    }
    case 'free-response': {
      const { correctAnswer, alternativeAnswers, caseSensitive, allowTypos, ...rest } = q as FreeResponseQuestion;
      return rest as Question;
    }
    default:
      // Slides and polls have no secret data
      return q;
  }
}


export default function HostLobbyPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const gameRef = useMemoFirebase(() => doc(firestore, 'games', gameId) as DocumentReference<Game>, [firestore, gameId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Fetch quiz for session saving
  const quizRef = useMemoFirebase(
    () => game ? doc(firestore, 'quizzes', game.quizId) as DocumentReference<Quiz> : null,
    [firestore, game]
  );
  const { data: quiz } = useDoc(quizRef);

  // Only create players query after game is loaded to prevent race condition
  const playersQuery = useMemoFirebase(() => game ? collection(firestore, 'games', gameId, 'players') : null, [firestore, gameId, game]);
  const { data: players, loading: playersLoading } = useCollection(playersQuery);

  // Save host session when lobby is loaded (so host can return if they leave)
  useEffect(() => {
    if (game && quiz && user) {
      saveHostSession(gameId, game.gamePin, game.quizId, quiz.title, user.uid, 'quiz', 'lobby');
    }
  }, [gameId, game, quiz, user]);

  const handleStartGame = async () => {
    if (!gameRef || !quiz) return;

    try {
      // Initialize leaderboard aggregate with player count before starting game
      // This ensures "X / Y Answered" shows correct values from question 1
      const leaderboardRef = doc(firestore, 'games', gameId, 'aggregates', 'leaderboard');
      await setDoc(leaderboardRef, {
        topPlayers: [],
        totalPlayers: players?.length || 0,
        totalAnswered: 0,
        answerCounts: [],
        lastUpdated: serverTimestamp(),
      });

      // Determine the final questions to use (including crowdsourced if enabled)
      // Filter out any undefined/null questions (defensive against corrupted data)
      let finalQuestions: Question[] = (quiz.questions || []).filter(q => q != null);

      if (quiz.crowdsource?.enabled) {
        // Get selected submissions
        const submissionsRef = collection(firestore, 'games', gameId, 'submissions');
        const selectedQuery = query(submissionsRef, where('aiSelected', '==', true));
        const selectedSnapshot = await getDocs(selectedQuery);

        if (!selectedSnapshot.empty) {
          // Convert submissions to questions
          const crowdsourcedQuestions: SingleChoiceQuestion[] = selectedSnapshot.docs.map(docSnap => {
            const sub = docSnap.data() as QuestionSubmission;
            return {
              type: 'single-choice' as const,
              text: sub.questionText,
              timeLimit: 20, // Default time limit
              answers: sub.answers.map(text => ({ text })),
              correctAnswerIndex: sub.correctAnswerIndex,
              submittedBy: sub.playerName, // Include player name for crowdsourced questions
            };
          });

          // Integrate based on mode
          const originalQuestions = (quiz.questions || []).filter(q => q != null);
          const integrationMode = quiz.crowdsource.integrationMode || 'append';

          switch (integrationMode) {
            case 'prepend':
              finalQuestions = [...crowdsourcedQuestions, ...originalQuestions];
              break;
            case 'replace':
              finalQuestions = crowdsourcedQuestions;
              break;
            case 'append':
            default:
              finalQuestions = [...originalQuestions, ...crowdsourcedQuestions];
              break;
          }
        }
      }

      // Create answer key document (server-side only, players cannot read)
      // This contains the correct answers for scoring, not visible to players
      const answerKeyRef = doc(firestore, 'games', gameId, 'aggregates', 'answerKey');
      await setDoc(answerKeyRef, removeUndefined({
        questions: finalQuestions.map(extractAnswerKeyEntry),
      }));

      // Create sanitized questions for players (correct answers removed)
      const sanitizedQuestions = finalQuestions.map(sanitizeQuestionForPlayer);

      // Update game with sanitized questions and start
      const updateData: Partial<Game> = {
        state: 'preparing' as const,
        questions: sanitizedQuestions,
      };

      await updateDoc(gameRef, updateData);
      router.push(`/host/quiz/game/${gameId}`);
    } catch (error) {
      console.error("Error starting game: ", error);
      const permissionError = new FirestorePermissionError({
        path: gameRef.path,
        operation: 'update',
        requestResourceData: { state: 'preparing' }
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleCancelGame = () => {
    if (!gameRef) return;
    clearHostSession();
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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Game Header with PIN, QR, and Cancel */}
          <GameHeader
            gamePin={game?.gamePin || ''}
            playerCount={players?.length || 0}
            activityType="quiz"
            title={quiz?.title}
            onCancel={handleCancelGame}
            isLive={false}
          />

          {/* Tips and Readiness */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TipBanner>
              Share the PIN or scan the QR code with your audience to let them join
            </TipBanner>
            <ReadinessChecklist
              items={[
                {
                  label: 'Players joined',
                  isReady: (players?.length || 0) > 0,
                  detail: `${players?.length || 0} player${(players?.length || 0) !== 1 ? 's' : ''}`,
                },
                ...(quiz?.crowdsource?.enabled ? [{
                  label: 'Crowdsourced questions reviewed',
                  isReady: game?.crowdsourceState?.evaluationComplete || false,
                  detail: game?.crowdsourceState?.selectedCount ? `${game.crowdsourceState.selectedCount} selected` : 'Pending',
                }] : []),
              ]}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players List - Takes 2 columns */}
            <Card className="lg:col-span-2 border border-card-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Players</CardTitle>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {playersLoading || gameLoading ? '...' : players?.length || 0}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {playersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : players?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for players to join...
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                    {players?.map(player => (
                      <span
                        key={player.id}
                        className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium"
                      >
                        {player.name}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Start Game Card */}
            <Card className="border-2 border-primary/20 shadow-sm bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center gap-4">
                <div>
                  <CardTitle className="text-xl mb-2">Ready to Start?</CardTitle>
                  <CardDescription>
                    No more players can join after starting
                  </CardDescription>
                </div>
                <Button
                  onClick={handleStartGame}
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Game
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Crowdsourced Questions Panel */}
          {game && quiz && (
            <SubmissionsPanel gameId={gameId} game={game} quiz={quiz} />
          )}
        </div>
      </main>
    </div>
  );
}
