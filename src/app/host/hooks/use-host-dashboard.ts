'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc, deleteDoc, getDoc, Query } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { quizConverter, gameConverter, thoughtsGatheringActivityConverter, evaluationActivityConverter, pollActivityConverter } from '@/firebase/converters';
import { usePresentations, usePresentationMutations } from '@/firebase/presentation/use-presentation';
import { useCreatePresentationGame } from '@/firebase/presentation/use-presentation-game';
import type { Quiz, Game, ThoughtsGatheringActivity, EvaluationActivity, PollActivity, Presentation as PresentationType } from '@/lib/types';
import { getGameRoutePath } from '@/lib/activity-config';

type Activity = ThoughtsGatheringActivity | EvaluationActivity | PollActivity;

export function useHostDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, loading: userLoading } = useUser();

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

  // Fetch Poll activities
  const pollQuery = useMemoFirebase(() =>
    user ? query(
      collection(firestore, 'activities').withConverter(pollActivityConverter),
      where('hostId', '==', user.uid),
      where('type', '==', 'poll')
    ) as Query<PollActivity> : null
  , [user, firestore]);

  const { data: pollActivities, loading: pollLoading } = useCollection<PollActivity>(pollQuery);

  // Fetch presentations
  const { presentations, loading: presentationsLoading } = usePresentations();
  const { deletePresentation } = usePresentationMutations();
  const { createGame: createPresentationGame } = useCreatePresentationGame();

  // Combine activities for display
  const activities: Activity[] = [
    ...(thoughtsGatheringActivities || []),
    ...(evaluationActivities || []),
    ...(pollActivities || [])
  ];
  const activitiesLoading = thoughtsGatheringLoading || evaluationLoading || pollLoading;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    } else if (user && !user.emailVerified) {
      router.push('/verify-email');
    }
  }, [user, userLoading, router]);

  // Redirect first-time users (no content at all) to the create page
  useEffect(() => {
    if (quizzesLoading || activitiesLoading || !user) return;

    const quizzesLoaded = Array.isArray(quizzes);
    const activitiesLoaded = Array.isArray(activities);

    if (!quizzesLoaded || !activitiesLoaded) return;

    const hasNoContent = quizzes.length === 0 && activities.length === 0 && (!presentations || presentations.length === 0);
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

    try {
      const gameDoc = await addDoc(collection(firestore, 'games'), gameData);
      toast({
        title: 'Game Created!',
        description: 'Your game lobby is now open.',
      });
      router.push(`/host/quiz/lobby/${gameDoc.id}`);
    } catch (error) {
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
      throw error;
    }
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

    await deleteQuizImages(quizId);

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
  };

  const handleOpenGame = (game: Game) => {
    const path = getGameRoutePath(game.activityType, game.state, game.id);
    router.push(path);
  };

  const handleHostActivity = (activityId: string) => {
    router.push(`/host/poll/${activityId}`);
  };

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
  };

  const handleHostPresentation = async (presentationId: string) => {
    if (!user) return;
    try {
      const pres = presentations?.find(p => p.id === presentationId);
      if (!pres) return;
      const gameId = await createPresentationGame(presentationId, user.uid, pres.settings);
      router.push(`/host/presentation/lobby/${gameId}`);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create game.' });
    }
  };

  const handleDeletePresentation = async (presentationId: string) => {
    try {
      await deletePresentation(presentationId);
      toast({ title: 'Presentation deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete presentation.' });
    }
  };

  // Helper to get activity/quiz title for a game
  const getGameTitle = (game: Game): string => {
    if (game.activityType === 'thoughts-gathering') {
      return activities.find(a => a.id === game.activityId)?.title || 'Thoughts Gathering';
    }
    if (game.activityType === 'evaluation') {
      return activities.find(a => a.id === game.activityId)?.title || 'Evaluation';
    }
    if (game.activityType === 'poll') {
      return activities.find(a => a.id === game.activityId)?.title || 'Poll';
    }
    if (game.activityType === 'presentation') {
      return 'Presentation';
    }
    return quizzes?.find(q => q.id === game.quizId)?.title || 'Quiz';
  };

  const activeGames = games?.filter(g => g.state !== 'ended');
  const completedGames = games?.filter(g => g.state === 'ended');

  return {
    // Loading
    userLoading,
    quizzesLoading,
    activitiesLoading,
    gamesLoading,

    // Data
    user,
    quizzes,
    activities,
    presentations,
    games,
    activeGames,
    completedGames,

    // Handlers
    handleHostGame,
    handleDeleteQuiz,
    handleDeleteGame,
    handleOpenGame,
    handleHostActivity,
    handleDeleteActivity,
    handleHostPresentation,
    handleDeletePresentation,
    getGameTitle,
  };
}
