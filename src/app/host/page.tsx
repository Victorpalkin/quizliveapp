
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { SharedQuizzes } from '@/components/app/shared-quizzes';
import { QuizShareManager } from '@/components/app/quiz-share-manager';
import { QuizPreview } from '@/components/app/quiz-preview';
import { Loader2, Trash2, XCircle, LogIn, Eye, BarChart3, Cloud, FileQuestion, Gamepad2, ArrowUpDown, Sparkles, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import type { Quiz, Game, ThoughtsGatheringActivity, EvaluationActivity } from '@/lib/types';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { quizConverter, gameConverter, thoughtsGatheringActivityConverter, evaluationActivityConverter } from '@/firebase/converters';

type Activity = ThoughtsGatheringActivity | EvaluationActivity;
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

  // Filter and sort state
  type FilterType = 'all' | 'quiz' | 'thoughts-gathering' | 'evaluation';
  type SortType = 'recent' | 'alphabetical' | 'created';
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recent');

  const quizzesQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, 'quizzes').withConverter(quizConverter), where('hostId', '==', user.uid)) as Query<Quiz> : null
  , [user, firestore]);

  const { data: quizzes, loading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

  const gamesQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, 'games').withConverter(gameConverter), where('hostId', '==', user.uid)) as Query<Game> : null
    , [user, firestore]);

  const { data: games, loading: gamesLoading } = useCollection<Game>(gamesQuery);

  // Fetch Thoughts Gathering activities
  const thoughtsGatheringQuery = useMemoFirebase(() =>
    user ? query(
      collection(firestore, 'activities').withConverter(thoughtsGatheringActivityConverter),
      where('hostId', '==', user.uid),
      where('type', '==', 'thoughts-gathering')
    ) as Query<ThoughtsGatheringActivity> : null
  , [user, firestore]);

  const { data: thoughtsGatheringActivities, loading: thoughtsGatheringLoading } = useCollection<ThoughtsGatheringActivity>(thoughtsGatheringQuery);

  // Fetch Evaluation activities
  const evaluationQuery = useMemoFirebase(() =>
    user ? query(
      collection(firestore, 'activities').withConverter(evaluationActivityConverter),
      where('hostId', '==', user.uid),
      where('type', '==', 'evaluation')
    ) as Query<EvaluationActivity> : null
  , [user, firestore]);

  const { data: evaluationActivities, loading: evaluationLoading } = useCollection<EvaluationActivity>(evaluationQuery);

  // Combine activities for display
  const activities: Activity[] = [
    ...(thoughtsGatheringActivities || []),
    ...(evaluationActivities || [])
  ];
  const activitiesLoading = thoughtsGatheringLoading || evaluationLoading;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    } else if (user && !user.emailVerified) {
      // Redirect to verify-email page if email is not verified
      router.push('/verify-email');
    }
  }, [user, userLoading, router]);

  // Redirect first-time users (no content at all) to the create page
  // Only redirect once data has fully loaded and confirmed empty
  useEffect(() => {
    // Wait for all data to finish loading
    if (quizzesLoading || activitiesLoading || !user) return;

    // quizzes/activities will be null/undefined while loading, then an array when loaded
    // Only redirect if we have confirmed empty arrays (not null/undefined)
    const quizzesLoaded = Array.isArray(quizzes);
    const activitiesLoaded = Array.isArray(activities);

    if (!quizzesLoaded || !activitiesLoaded) return;

    const hasNoContent = quizzes.length === 0 && activities.length === 0;
    if (hasNoContent) {
      router.push('/host/create');
    }
  }, [quizzes, activities, quizzesLoading, activitiesLoading, user, router]);

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
        if (game.activityType === 'thoughts-gathering') {
            router.push(`/host/thoughts-gathering/lobby/${game.id}`);
        } else if (game.activityType === 'evaluation') {
            router.push(`/host/evaluation/game/${game.id}`);
        } else {
            router.push(`/host/quiz/lobby/${game.id}`);
        }
    } else {
        if (game.activityType === 'thoughts-gathering') {
            router.push(`/host/thoughts-gathering/game/${game.id}`);
        } else if (game.activityType === 'evaluation') {
            router.push(`/host/evaluation/game/${game.id}`);
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

  // Helper to get activity/quiz title for a game
  const getGameTitle = (game: Game): string => {
    if (game.activityType === 'thoughts-gathering') {
      return activities.find(a => a.id === game.activityId)?.title || 'Thoughts Gathering';
    }
    if (game.activityType === 'evaluation') {
      return activities.find(a => a.id === game.activityId)?.title || 'Evaluation';
    }
    return quizzes?.find(q => q.id === game.quizId)?.title || 'Quiz';
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">

        {/* Host Reconnection Banner */}
        <HostReconnectBanner />

        {/* Active Games Section */}
        {activeGames && activeGames.length > 0 && (
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-3xl font-semibold">Active Games</h2>
                    <span className="px-2.5 py-0.5 text-sm font-medium bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                        {activeGames.length} live
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesLoading ? (
                        <Card><CardContent className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent></Card>
                    ) : (
                        activeGames.map(game => (
                            <Card key={game.id} variant="interactive" className="flex flex-col">
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
                                        variant="gradient"
                                        size="xl"
                                        className="w-full"
                                        onClick={() => handleOpenGame(game)}
                                    >
                                        <LogIn className="mr-2 h-4 w-4" /> Open Game
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="xl" className="w-full" variant="outline">
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
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-semibold">My Content</h1>
                    {!quizzesLoading && !activitiesLoading && (quizzes?.length || 0) + (activities?.length || 0) > 0 && (
                        <span className="px-3 py-1 text-sm font-medium bg-muted text-muted-foreground rounded-full">
                            {(quizzes?.length || 0) + (activities?.length || 0)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild variant="outline">
                        <Link href="/host/create">
                            <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                            Explore Activity Types
                        </Link>
                    </Button>
                    <CreateDropdown />
                </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 mb-6">
                {/* Filter Tabs - 2x2 grid on mobile, horizontal on desktop */}
                <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-muted p-1.5 rounded-xl w-full sm:w-auto">
                    {[
                        { value: 'all', label: 'All', icon: null },
                        { value: 'quiz', label: 'Quizzes', icon: FileQuestion },
                        { value: 'thoughts-gathering', label: 'Thoughts', icon: Cloud },
                        { value: 'evaluation', label: 'Evaluations', icon: BarChart3 },
                    ].map(({ value, label, icon: Icon }) => (
                        <Button
                            key={value}
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilterType(value as FilterType)}
                            className={`rounded-lg transition-all duration-200 justify-center ${
                                filterType === value
                                    ? 'bg-background shadow-sm text-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {Icon && <Icon className={`h-4 w-4 mr-1.5 ${filterType === value ? 'text-primary' : ''}`} />}
                            {label}
                        </Button>
                    ))}
                </div>

                {/* Sort Dropdown - full width on mobile */}
                <Select value={sortType} onValueChange={(value) => setSortType(value as SortType)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="recent">Recently edited</SelectItem>
                        <SelectItem value="created">Recently created</SelectItem>
                        <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {(quizzesLoading || activitiesLoading) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
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
            ) : (() => {
                // Build unified list of items for filtering and sorting
                type ContentItem = {
                    type: 'quiz' | 'thoughts-gathering' | 'evaluation';
                    data: Quiz | Activity;
                    title: string;
                    updatedAt?: Date;
                    createdAt?: Date;
                };

                const allItems: ContentItem[] = [
                    ...(quizzes?.map(q => ({
                        type: 'quiz' as const,
                        data: q,
                        title: q.title,
                        updatedAt: q.updatedAt,
                        createdAt: q.createdAt,
                    })) || []),
                    ...(activities?.map(a => ({
                        type: a.type,
                        data: a,
                        title: a.title,
                        updatedAt: a.updatedAt,
                        createdAt: a.createdAt,
                    })) || []),
                ];

                // Apply filter
                const filteredItems = filterType === 'all'
                    ? allItems
                    : allItems.filter(item => item.type === filterType);

                // Apply sort
                const sortedItems = [...filteredItems].sort((a, b) => {
                    const getDate = (item: ContentItem, field: 'updatedAt' | 'createdAt') => {
                        const date = item[field];
                        return date ? new Date(date).getTime() : 0;
                    };

                    switch (sortType) {
                        case 'recent':
                            return getDate(b, 'updatedAt') - getDate(a, 'updatedAt') || getDate(b, 'createdAt') - getDate(a, 'createdAt');
                        case 'created':
                            return getDate(b, 'createdAt') - getDate(a, 'createdAt');
                        case 'alphabetical':
                            return a.title.localeCompare(b.title);
                        default:
                            return 0;
                    }
                });

                if (sortedItems.length === 0) {
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <EmptyContentState filterType={filterType} />
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedItems.map(item => {
                            if (item.type === 'quiz') {
                                const quiz = item.data as Quiz;
                                return (
                                    <QuizCard
                                        key={quiz.id}
                                        quiz={quiz}
                                        onHost={handleHostGame}
                                        onPreview={setPreviewQuiz}
                                        onShare={setShareDialogQuiz}
                                        onDelete={handleDeleteQuiz}
                                    />
                                );
                            }
                            const activity = item.data as Activity;
                            return (
                                <ActivityCard
                                    key={activity.id}
                                    activity={activity}
                                    onDelete={handleDeleteActivity}
                                />
                            );
                        })}
                    </div>
                );
            })()}
        </div>

        {/* Shared Quizzes Section */}
        <SharedQuizzes />

        {/* Completed Activities Section */}
        {completedGames && completedGames.length > 0 && (
            <div className="mb-12">
                <div className="border-t border-border pt-8 mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-semibold">Completed Activities</h2>
                        <span className="px-2.5 py-0.5 text-sm font-medium bg-muted text-muted-foreground rounded-full">
                            {completedGames.length}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesLoading ? (
                        <Card><CardContent className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent></Card>
                    ) : (
                        completedGames.map(game => {
                            const isThoughtsGathering = game.activityType === 'thoughts-gathering';
                            const isEvaluation = game.activityType === 'evaluation';
                            const isQuiz = !isThoughtsGathering && !isEvaluation;

                            // Determine badge styling
                            const badgeClass = isThoughtsGathering
                                ? 'bg-blue-500/20 text-blue-500'
                                : isEvaluation
                                    ? 'bg-orange-500/20 text-orange-500'
                                    : 'bg-purple-500/20 text-purple-500';
                            const badgeIcon = isThoughtsGathering
                                ? <Cloud className="h-3 w-3" />
                                : isEvaluation
                                    ? <BarChart3 className="h-3 w-3" />
                                    : <FileQuestion className="h-3 w-3" />;
                            const badgeLabel = isThoughtsGathering ? 'Thoughts Gathering' : isEvaluation ? 'Evaluation' : 'Quiz';

                            return (
                                <Card key={game.id} variant="interactive" className="flex flex-col">
                                    <CardHeader className="p-4 pb-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                {badgeIcon}
                                                <CardTitle className="text-lg font-semibold font-mono tracking-widest">{game.gamePin}</CardTitle>
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-2xl shadow-xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-2xl font-semibold">Delete this record?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-base">
                                                            This will permanently delete the record for &apos;{game.gamePin}&apos;.
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
                                        </div>
                                        <CardDescription className="text-sm">
                                            {getGameTitle(game)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2 p-4 pt-0">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="gradient"
                                                className="flex-1"
                                                onClick={() => handleOpenGame(game)}
                                            >
                                                <Eye className="mr-2 h-4 w-4" /> Results
                                            </Button>
                                            {isQuiz && (
                                                <Button asChild variant="gradient" className="flex-1">
                                                    <Link href={`/host/quiz/analytics/${game.id}`}>
                                                        <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                        {isQuiz && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => handleHostGame(game.quizId)}
                                            >
                                                <Gamepad2 className="mr-2 h-4 w-4" /> Host Again
                                            </Button>
                                        )}
                                        {isEvaluation && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => router.push(`/host/evaluation/game/${game.id}`)}
                                            >
                                                <RotateCcw className="mr-2 h-4 w-4" /> Reopen Session
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })
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
