
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Copy, XCircle, QrCode, Play } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Header } from '@/components/app/header';
import { QRCodeSVG } from 'qrcode.react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, DocumentReference, deleteDoc, setDoc, serverTimestamp, query, where, Query, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Game, Quiz, QuestionSubmission, SingleChoiceQuestion, Question } from '@/lib/types';
import { saveHostSession, clearHostSession } from '@/lib/host-session';
import { SubmissionsPanel } from './components/submissions-panel';
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


export default function HostLobbyPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const [joinUrl, setJoinUrl] = useState<string>('');

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

  useEffect(() => {
    if (game?.gamePin) {
      setJoinUrl(`${window.location.origin}/play/${game.gamePin}`);
    }
  }, [game?.gamePin]);
  
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

      // Check if crowdsourcing is enabled and integrate selected questions
      const updateData: Partial<Game> = { state: 'preparing' as const };

      if (quiz.crowdsource?.enabled) {
        // Get selected submissions
        const submissionsRef = collection(firestore, 'games', gameId, 'submissions');
        const selectedQuery = query(submissionsRef, where('aiSelected', '==', true));
        const selectedSnapshot = await getDocs(selectedQuery);

        if (!selectedSnapshot.empty) {
          // Convert submissions to questions
          const crowdsourcedQuestions: SingleChoiceQuestion[] = selectedSnapshot.docs.map(doc => {
            const sub = doc.data() as QuestionSubmission;
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
          const originalQuestions = quiz.questions || [];
          const integrationMode = quiz.crowdsource.integrationMode || 'append';

          let integratedQuestions: Question[];
          switch (integrationMode) {
            case 'prepend':
              integratedQuestions = [...crowdsourcedQuestions, ...originalQuestions];
              break;
            case 'replace':
              integratedQuestions = crowdsourcedQuestions;
              break;
            case 'append':
            default:
              integratedQuestions = [...originalQuestions, ...crowdsourcedQuestions];
              break;
          }

          // Store integrated questions in the game document
          updateData.questions = integratedQuestions;
        }
      }

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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Compact Join Bar */}
          <Card className="border border-card-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* PIN Section */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">PIN</span>
                  {gameLoading ? (
                    <Skeleton className="h-10 w-32" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-mono font-bold tracking-widest">{game?.gamePin}</span>
                      {game?.gamePin && <CopyButton text={game.gamePin} />}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="hidden sm:block h-8 w-px bg-border" />

                {/* QR & Link Actions */}
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="end">
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-sm font-medium">Scan to join</p>
                        {joinUrl && (
                          <div className="bg-white p-3 rounded-lg">
                            <QRCodeSVG value={joinUrl} size={160} level="M" />
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(joinUrl)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Cancel Game - Subtle footer action */}
          <div className="pt-4 border-t border-border flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Game
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this game?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all players and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Back</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelGame}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Cancel Game
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </main>
    </div>
  );
}
