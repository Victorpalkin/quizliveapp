
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { SharedQuizzes } from '@/components/app/shared-quizzes';
import { QuizShareManager } from '@/components/app/quiz-share-manager';
import { QuizPreview } from '@/components/app/quiz-preview';
import { Loader2, Trash2, XCircle, LogIn, Eye, BarChart3 } from 'lucide-react';
import { CreateDropdown } from './components/create-dropdown';
import { QuizCard } from './components/quiz-card';
import { ActivityCard } from './components/activity-card';
import { EmptyContentState } from './components/empty-content-state';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { useCollection, useFirestore, useUser, useMemoFirebase, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc, deleteDoc, getDoc, Query } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, Game, InterestCloudActivity } from '@/lib/types';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { quizConverter, gameConverter, interestCloudActivityConverter } from '@/firebase/converters';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HostReconnectBanner } from '@/components/app/host-reconnect-banner';

function GameStateBadge({ state }: { state: Game['state'] }) {
    let text;
    let className;
    switch (state) {
        case 'lobby':
            text = 'In Lobby';
            className = 'bg-blue-500/20 text-blue-400';
            break;
        case 'preparing':
        case 'question':
        case 'leaderboard':
            text = 'In Progress';
            className = 'bg-green-500/20 text-green-400';
            break;
        case 'ended':
            text = 'Finished';
            className = 'bg-gray-500/20 text-gray-400';
            break;
        default:
            text = 'Unknown';
            className = 'bg-muted text-muted-foreground';
    }
    return <div className={`px-2 py-1 text-xs font-medium rounded-md ${className}`}>{text}</div>;
}


export default function HostDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, loading: userLoading } = useUser();

  // State for share dialog
  const [shareDialogQuiz, setShareDialogQuiz] = useState<{ id: string; title: string } | null>(null);

  // State for preview dialog
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

  const quizzesQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, 'quizzes').withConverter(quizConverter), where('hostId', '==', user.uid)) as Query<Quiz> : null
  , [user, firestore]);

  const { data: quizzes, loading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

  const gamesQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, 'games').withConverter(gameConverter), where('hostId', '==', user.uid)) as Query<Game> : null
    , [user, firestore]);

  const { data: games, loading: gamesLoading } = useCollection<Game>(gamesQuery);

  // Fetch Interest Cloud activities
  const activitiesQuery = useMemoFirebase(() =>
    user ? query(
      collection(firestore, 'activities').withConverter(interestCloudActivityConverter),
      where('hostId', '==', user.uid)
    ) as Query<InterestCloudActivity> : null
  , [user, firestore]);

  const { data: activities, loading: activitiesLoading } = useCollection<InterestCloudActivity>(activitiesQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    } else if (user && !user.emailVerified) {
      // Redirect to verify-email page if email is not verified
      router.push('/verify-email');
    }
  }, [user, userLoading, router]);

  const handleHostGame = async (quizId: string) => {
    if (!user) return;

    const gameData = {
      quizId: quizId,
      hostId: user.uid,
      state: 'lobby' as const,
      currentQuestionIndex: 0,
      gamePin: nanoid(8).toUpperCase(),
      createdAt: serverTimestamp(),
    };

    addDoc(collection(firestore, 'games'), gameData)
        .then((gameDoc) => {
            toast({
                title: 'Game Created!',
                description: 'Your game lobby is now open.',
            });
            router.push(`/host/quiz/lobby/${gameDoc.id}`);
        })
        .catch((error) => {
            console.error("Error creating game: ", error);
            const permissionError = new FirestorePermissionError({
              path: '/games',
              operation: 'create',
              requestResourceData: gameData
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not create the game. Please try again.",
            });
        });
  };

  const deleteQuizImages = async (quizId: string) => {
    const quizRef = doc(firestore, 'quizzes', quizId);
    const quizSnap = await getDoc(quizRef);
    if (!quizSnap.exists()) return;
    const quiz = quizSnap.data() as Quiz;

    for (const question of quiz.questions) {
      if (question.imageUrl) {
        try {
          const imageRef = ref(storage, question.imageUrl);
          await deleteObject(imageRef);
        } catch (error: any) {
          if (error.code !== 'storage/object-not-found') {
            console.error(`Failed to delete image ${question.imageUrl}:`, error);
          }
        }
      }
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!firestore) return;
    
    // First, delete associated images from Storage
    await deleteQuizImages(quizId);
    
    // Then, delete the quiz document from Firestore
    const quizRef = doc(firestore, 'quizzes', quizId);
    deleteDoc(quizRef)
      .then(() => {
        toast({
          title: 'Quiz Deleted',
          description: 'The quiz and its images have been successfully removed.',
        });
      })
      .catch((error) => {
        console.error("Error deleting quiz:", error);
        const permissionError = new FirestorePermissionError({
            path: quizRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete the quiz. Please try again.",
        });
      });
  };

  const handleDeleteGame = (gameId: string) => {
    if (!firestore) return;
    const gameRef = doc(firestore, 'games', gameId);
    deleteDoc(gameRef)
      .then(() => {
        toast({
          title: 'Game Record Deleted',
          description: 'The game has been removed from your history.',
        });
      })
      .catch((error) => {
        console.error("Error deleting game:", error);
        const permissionError = new FirestorePermissionError({
            path: gameRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete the game. Please try again.",
        });
      });
  }

  const handleOpenGame = (game: Game) => {
    if (game.state === 'lobby') {
        // Route based on activity type
        if (game.activityType === 'interest-cloud') {
            router.push(`/host/interest-cloud/lobby/${game.id}`);
        } else {
            router.push(`/host/quiz/lobby/${game.id}`);
        }
    } else {
        if (game.activityType === 'interest-cloud') {
            router.push(`/host/interest-cloud/game/${game.id}`);
        } else {
            router.push(`/host/quiz/game/${game.id}`);
        }
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!firestore) return;
    const activityRef = doc(firestore, 'activities', activityId);
    deleteDoc(activityRef)
      .then(() => {
        toast({
          title: 'Activity Deleted',
          description: 'The activity has been successfully removed.',
        });
      })
      .catch((error) => {
        console.error("Error deleting activity:", error);
        const permissionError = new FirestorePermissionError({
            path: activityRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete the activity. Please try again.",
        });
      });
  }


  if (userLoading || !user) {
    return <FullPageLoader />;
  }

  const activeGames = games?.filter(g => g.state !== 'ended');
  const completedGames = games?.filter(g => g.state === 'ended');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">

        {/* Host Reconnection Banner */}
        <HostReconnectBanner />

        {/* Active Games Section */}
        {activeGames && activeGames.length > 0 && (
            <div className="mb-12">
                <h2 className="text-3xl font-semibold mb-6">Active Games</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesLoading ? (
                        <Card className="shadow-md"><CardContent className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent></Card>
                    ) : (
                        activeGames.map(game => (
                            <Card key={game.id} className="flex flex-col border border-card-border shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
                                <CardHeader className="p-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <CardTitle className="text-2xl font-semibold font-mono tracking-widest">{game.gamePin}</CardTitle>
                                        <GameStateBadge state={game.state} />
                                    </div>
                                    <CardDescription className="text-base">
                                        {quizzes?.find(q => q.id === game.quizId)?.title || '...'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-end gap-3 p-6 pt-0">
                                    <Button
                                        className="w-full px-6 py-4 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300 rounded-xl font-semibold"
                                        onClick={() => handleOpenGame(game)}
                                    >
                                        <LogIn className="mr-2 h-4 w-4" /> Open Game
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full px-6 py-4 rounded-xl" variant="outline">
                                                <XCircle className="mr-2 h-4 w-4" /> Cancel Game
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-2xl shadow-xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-2xl font-semibold">Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-base">
                                                    This will cancel the game for all players and cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-xl">Back</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteGame(game.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                                                    Yes, Cancel Game
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* My Content Section */}
        <div className="mb-12">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <h1 className="text-5xl font-semibold">My Content</h1>
                <CreateDropdown />
            </div>

            {(quizzesLoading || activitiesLoading) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="shadow-md rounded-2xl border border-card-border">
                            <CardHeader className="p-6">
                                <div className="h-6 bg-muted rounded-lg w-3/4 animate-pulse"></div>
                                <div className="h-4 bg-muted rounded-lg w-1/2 mt-2 animate-pulse"></div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                <div className="h-10 bg-muted rounded-lg w-full animate-pulse"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes?.map(quiz => (
                        <QuizCard
                            key={quiz.id}
                            quiz={quiz}
                            onHost={handleHostGame}
                            onPreview={setPreviewQuiz}
                            onShare={setShareDialogQuiz}
                            onDelete={handleDeleteQuiz}
                        />
                    ))}
                    {activities?.map(activity => (
                        <ActivityCard
                            key={activity.id}
                            activity={activity}
                            onDelete={handleDeleteActivity}
                        />
                    ))}
                    {(!quizzes?.length && !activities?.length) && (
                        <EmptyContentState />
                    )}
                </div>
            )}
        </div>

        {/* Shared Quizzes Section */}
        <SharedQuizzes />

        {/* Completed Games Section */}
        {completedGames && completedGames.length > 0 && (
            <div className="mb-12">
                <h2 className="text-3xl font-semibold mb-6">Completed Games</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesLoading ? (
                        <Card className="shadow-md"><CardContent className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent></Card>
                    ) : (
                        completedGames.map(game => (
                            <Card key={game.id} className="flex flex-col border border-card-border shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
                                <CardHeader className="p-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <CardTitle className="text-2xl font-semibold font-mono tracking-widest">{game.gamePin}</CardTitle>
                                        <GameStateBadge state={game.state} />
                                    </div>
                                    <CardDescription className="text-base">
                                        {quizzes?.find(q => q.id === game.quizId)?.title || '...'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-end gap-3 p-6 pt-0">
                                    <Button className="w-full px-6 py-4 rounded-xl" variant="outline" onClick={() => handleOpenGame(game)}>
                                        <Eye className="mr-2 h-4 w-4" /> View Results
                                    </Button>
                                    <Button asChild className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300 font-semibold">
                                        <Link href={`/host/quiz/analytics/${game.id}`}>
                                            <BarChart3 className="mr-2 h-4 w-4" /> View Analytics
                                        </Link>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full px-6 py-4 rounded-xl" variant="ghost">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-2xl shadow-xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-2xl font-semibold">Delete this game record?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-base">
                                                    This will permanently delete the record for game '{game.gamePin}'.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-xl">Back</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteGame(game.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                                                    Yes, Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* Share Quiz Dialog */}
        <Dialog open={!!shareDialogQuiz} onOpenChange={(open) => !open && setShareDialogQuiz(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Share Quiz</DialogTitle>
              <DialogDescription className="text-base">
                Share "{shareDialogQuiz?.title}" with other hosts by entering their email address
              </DialogDescription>
            </DialogHeader>
            {shareDialogQuiz && (
              <QuizShareManager
                quizId={shareDialogQuiz.id}
                quizTitle={shareDialogQuiz.title}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Preview Quiz Dialog */}
        <Dialog open={!!previewQuiz} onOpenChange={(open) => !open && setPreviewQuiz(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Quiz Preview</DialogTitle>
            </DialogHeader>
            {previewQuiz && <QuizPreview quiz={previewQuiz} showCorrectAnswers={true} />}
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
