'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  DocumentReference,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveHostSession, clearHostSession } from '@/lib/host-session';
import { evaluationActivityConverter, evaluationItemConverter, playerRatingsConverter, playerConverter } from '@/firebase/converters';
import type { Game, EvaluationActivity, EvaluationItem, PlayerRatings, EvaluationGameState, Player, EvaluationResults } from '@/lib/types';

export function useEvaluationGame() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user, loading: userLoading } = useUser();

  const [newItemText, setNewItemText] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Game document
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Activity document
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(evaluationActivityConverter) as DocumentReference<EvaluationActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: activity, loading: activityLoading } = useDoc(activityRef);

  // Players collection
  const playersQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'players').withConverter(playerConverter) : null,
    [firestore, gameId, game]
  );
  const { data: players, loading: playersLoading } = useCollection<Player>(playersQuery);

  // Items collection
  const itemsQuery = useMemoFirebase(
    () => game ? query(
      collection(firestore, 'games', gameId, 'items').withConverter(evaluationItemConverter),
      orderBy('order', 'asc')
    ) : null,
    [firestore, gameId, game]
  );
  const { data: items, loading: itemsLoading } = useCollection(itemsQuery);

  // Ratings collection
  const ratingsQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'ratings').withConverter(playerRatingsConverter) : null,
    [firestore, gameId, game]
  );
  const { data: ratings } = useCollection(ratingsQuery);

  // Evaluation results aggregate (when in results or ended state)
  const resultsRef = useMemoFirebase(
    () => (game?.state === 'results' || game?.state === 'ended')
      ? doc(firestore, 'games', gameId, 'aggregates', 'evaluations') as DocumentReference<EvaluationResults>
      : null,
    [firestore, gameId, game?.state]
  );
  const { data: evaluationResults, loading: resultsLoading } = useDoc(resultsRef);

  // Save host session
  useEffect(() => {
    if (game && activity && user && game.state !== 'ended') {
      saveHostSession(
        gameId,
        game.gamePin,
        game.activityId || '',
        activity.title,
        user.uid,
        'evaluation',
        game.state,
        `/host/evaluation/game/${gameId}`
      );
    }
  }, [gameId, game, activity, user]);

  // Clear session when game ends
  useEffect(() => {
    if (game?.state === 'ended') {
      clearHostSession();
    }
  }, [game?.state]);

  const handleAddItem = async () => {
    if (!newItemText.trim() || !game) return;

    setIsAddingItem(true);
    try {
      const itemData: Omit<EvaluationItem, 'id'> = {
        text: newItemText.trim(),
        description: newItemDescription.trim() || undefined,
        isHostItem: true,
        approved: true,
        order: (items?.length || 0) + 1,
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(firestore, 'games', gameId, 'items').withConverter(evaluationItemConverter),
        itemData as EvaluationItem
      );

      setNewItemText('');
      setNewItemDescription('');
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not add item. Please try again.",
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(firestore, 'games', gameId, 'items', itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete item.",
      });
    }
  };

  const handleApproveItem = async (itemId: string, approved: boolean) => {
    try {
      await updateDoc(doc(firestore, 'games', gameId, 'items', itemId), { approved });
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleStartRating = async () => {
    if (!game || !items || items.length === 0) {
      toast({
        variant: "destructive",
        title: "No items to rate",
        description: "Please add at least one item before starting.",
      });
      return;
    }

    setIsTransitioning(true);
    try {
      await updateDoc(gameRef, {
        state: 'rating' as EvaluationGameState,
        itemSubmissionsOpen: false,
      });
    } catch (error) {
      console.error('Error starting rating:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start rating phase.",
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleEndRating = async () => {
    if (!game) return;

    setIsTransitioning(true);
    try {
      await updateDoc(gameRef, {
        state: 'analyzing' as EvaluationGameState,
      });

      const computeEvaluationResults = httpsCallable<
        { gameId: string },
        { success: boolean; message: string }
      >(functions, 'computeEvaluationResults');

      const result = await computeEvaluationResults({ gameId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to compute results');
      }

      setIsTransitioning(false);
    } catch (error) {
      console.error('Error ending rating:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not compute evaluation results. Please try again.",
      });
      await updateDoc(gameRef, {
        state: 'rating' as EvaluationGameState,
      });
      setIsTransitioning(false);
    }
  };

  const handleEndSession = async () => {
    if (!game) return;

    try {
      await updateDoc(gameRef, {
        state: 'ended' as EvaluationGameState,
      });
      clearHostSession();
      router.push('/host');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleCancelGame = async () => {
    if (!game) return;
    clearHostSession();
    try {
      await deleteDoc(gameRef);
      router.push('/host');
    } catch (error) {
      console.error('Error canceling game:', error);
    }
  };

  const handleReopenKeepData = async () => {
    if (!game) return;
    setIsTransitioning(true);
    try {
      await updateDoc(gameRef, { state: 'rating' as EvaluationGameState });
      toast({
        title: 'Session Reopened',
        description: 'Participants can now submit additional ratings using the same PIN.',
      });
    } catch (error) {
      console.error('Error reopening session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not reopen the session. Please try again.",
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleReopenClearData = async () => {
    if (!game) return;
    setIsTransitioning(true);
    try {
      const ratingsSnapshot = await getDocs(collection(firestore, 'games', gameId, 'ratings'));
      if (ratingsSnapshot.docs.length > 0) {
        const batch = writeBatch(firestore);
        ratingsSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }

      try {
        await deleteDoc(doc(firestore, 'games', gameId, 'aggregates', 'evaluations'));
      } catch {
        // Aggregates may not exist, ignore
      }

      await updateDoc(gameRef, {
        state: 'collecting' as EvaluationGameState,
        itemSubmissionsOpen: activity?.config.allowParticipantItems || false,
      });

      toast({
        title: 'Session Reopened',
        description: 'Starting fresh with no ratings. Previous data has been cleared.',
      });
    } catch (error) {
      console.error('Error reopening session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not reopen the session. Please try again.",
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  // Computed values
  const approvedItems = items?.filter(i => i.approved) || [];
  const pendingItems = items?.filter(i => !i.approved && !i.isHostItem) || [];
  const ratingsCount = ratings?.length || 0;
  const playersCount = players?.length || 0;

  // Keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (game?.state === 'collecting' && items && items.filter(i => i.approved).length > 0 && !isTransitioning) {
        handleStartRating();
      } else if (game?.state === 'rating' && !isTransitioning) {
        handleEndRating();
      } else if (game?.state === 'results') {
        handleEndSession();
      }
    }
  }, [game?.state, items, isTransitioning]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    // Loading states
    loading: userLoading || gameLoading || activityLoading,
    itemsLoading,
    resultsLoading,
    isTransitioning,
    isAddingItem,

    // Data
    game,
    activity,
    players,
    ratings,
    approvedItems,
    pendingItems,
    ratingsCount,
    playersCount,
    evaluationResults,

    // Form state
    newItemText,
    setNewItemText,
    newItemDescription,
    setNewItemDescription,

    // Handlers
    handleAddItem,
    handleDeleteItem,
    handleApproveItem,
    handleStartRating,
    handleEndRating,
    handleEndSession,
    handleCancelGame,
    handleReopenKeepData,
    handleReopenClearData,

    // Navigation
    router,
  };
}
