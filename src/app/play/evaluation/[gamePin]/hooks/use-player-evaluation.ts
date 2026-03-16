'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import {
  doc,
  collection,
  addDoc,
  setDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  DocumentReference,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { savePlayerSession, getPlayerSession, clearPlayerSession } from '@/lib/player-session';
import { evaluationActivityConverter, evaluationItemConverter } from '@/firebase/converters';
import type { Game, EvaluationActivity, EvaluationItem, PlayerRatings } from '@/lib/types';
import { nanoid } from 'nanoid';

export type PlayerState = 'joining' | 'collecting' | 'rating' | 'waiting' | 'results' | 'ended';

export function usePlayerEvaluation() {
  const params = useParams();
  const gamePin = (params.gamePin as string).toUpperCase();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [playerState, setPlayerState] = useState<PlayerState>('joining');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item submission state
  const [newItemText, setNewItemText] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [submittedItemCount, setSubmittedItemCount] = useState(0);

  // Rating state
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({});
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Fetch game by PIN
  const findGameByPin = useCallback(async () => {
    const gamesQuery = query(
      collection(firestore, 'games'),
      where('gamePin', '==', gamePin)
    );
    const snapshot = await getDocs(gamesQuery);
    if (!snapshot.empty) {
      const gameDoc = snapshot.docs[0];
      return { id: gameDoc.id, ...gameDoc.data() } as Game & { id: string };
    }
    return null;
  }, [firestore, gamePin]);

  // Initialize and check for existing session
  useEffect(() => {
    const init = async () => {
      const game = await findGameByPin();
      if (!game) {
        setInitializing(false);
        toast({
          variant: "destructive",
          title: "Game not found",
          description: "Please check the PIN and try again.",
        });
        return;
      }

      setGameId(game.id);

      // Check for existing session
      const session = getPlayerSession();
      if (session && session.gamePin === gamePin) {
        const playerDoc = await getDocs(query(collection(firestore, 'games', game.id, 'players'), where('__name__', '==', session.playerId)));

        if (!playerDoc.empty) {
          setPlayerId(session.playerId);
          setPlayerName(session.nickname);

          if (game.state === 'collecting') {
            setPlayerState('collecting');
          } else if (game.state === 'rating') {
            const ratingsDoc = await getDocs(
              query(collection(firestore, 'games', game.id, 'ratings'), where('playerId', '==', session.playerId))
            );
            if (!ratingsDoc.empty) {
              setPlayerState('waiting');
            } else {
              setPlayerState('rating');
            }
          } else if (game.state === 'results') {
            setPlayerState('results');
          } else if (game.state === 'ended') {
            setPlayerState('ended');
          }
          setInitializing(false);
          return;
        }
      }

      setPlayerState('joining');
      setInitializing(false);
    };

    init();
  }, [firestore, gamePin, findGameByPin, toast]);

  // Game document listener
  const gameRef = useMemoFirebase(
    () => gameId ? doc(firestore, 'games', gameId) as DocumentReference<Game> : null,
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

  // Items collection
  const itemsQuery = useMemoFirebase(
    () => gameId ? query(
      collection(firestore, 'games', gameId, 'items').withConverter(evaluationItemConverter),
      orderBy('order', 'asc')
    ) : null,
    [firestore, gameId]
  );
  const { data: items, loading: itemsLoading } = useCollection(itemsQuery);

  // Players count
  const playersQuery = useMemoFirebase(
    () => gameId ? collection(firestore, 'games', gameId, 'players') : null,
    [firestore, gameId]
  );
  const { data: players } = useCollection(playersQuery);

  // Sync player state with game state
  useEffect(() => {
    if (!game || !playerId) return;

    if (game.state === 'collecting' && playerState === 'joining') {
      setPlayerState('collecting');
    } else if (game.state === 'rating' && (playerState === 'collecting' || playerState === 'joining')) {
      setPlayerState('rating');
    } else if (game.state === 'results' && playerState !== 'results') {
      setPlayerState('results');
    } else if (game.state === 'ended') {
      setPlayerState('ended');
      clearPlayerSession();
    }
  }, [game?.state, playerId, playerState]);

  const handleJoin = async () => {
    if (!playerName.trim() || !gameId) return;

    setIsJoining(true);
    try {
      const newPlayerId = nanoid(12);

      await setDoc(doc(firestore, 'games', gameId, 'players', newPlayerId), {
        id: newPlayerId,
        name: playerName.trim(),
        score: 0,
        answers: [],
        currentStreak: 0,
        maxStreak: 0,
      });

      setPlayerId(newPlayerId);
      savePlayerSession(newPlayerId, gameId, gamePin, playerName.trim());

      if (game?.state === 'collecting') {
        setPlayerState('collecting');
      } else if (game?.state === 'rating') {
        setPlayerState('rating');
      } else if (game?.state === 'results') {
        setPlayerState('results');
      } else {
        setPlayerState('waiting');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not join the game. Please try again.",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmitItem = async () => {
    if (!newItemText.trim() || !gameId || !playerId || !activity) return;

    if (submittedItemCount >= activity.config.maxItemsPerParticipant) {
      toast({
        variant: "destructive",
        title: "Limit reached",
        description: `You can only submit ${activity.config.maxItemsPerParticipant} items.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const itemData: Omit<EvaluationItem, 'id'> = {
        text: newItemText.trim(),
        description: newItemDescription.trim() || undefined,
        submittedBy: playerName,
        submittedByPlayerId: playerId,
        isHostItem: false,
        approved: !activity.config.requireApproval,
        order: 999,
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(firestore, 'games', gameId, 'items').withConverter(evaluationItemConverter),
        itemData as EvaluationItem
      );

      setSubmittedItemCount(prev => prev + 1);
      setNewItemText('');
      setNewItemDescription('');

      toast({
        title: 'Item submitted!',
        description: activity.config.requireApproval
          ? 'Waiting for host approval.'
          : 'Your item has been added.',
      });
    } catch (error) {
      console.error('Error submitting item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not submit item.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateMetric = (itemId: string, metricId: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [metricId]: value,
      },
    }));
  };

  const handleSubmitRatings = async () => {
    if (!gameId || !playerId || !activity) return;

    setIsSubmitting(true);
    try {
      const ratingsData: PlayerRatings = {
        playerId,
        playerName,
        ratings,
        submittedAt: Timestamp.now(),
        isComplete: true,
      };

      await setDoc(
        doc(firestore, 'games', gameId, 'ratings', playerId),
        ratingsData
      );

      setPlayerState('waiting');
      toast({
        title: 'Ratings submitted!',
        description: 'Waiting for results...',
      });
    } catch (error) {
      console.error('Error submitting ratings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not submit ratings.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed values
  const approvedItems = items?.filter(i => i.approved) || [];
  const currentItem = approvedItems[currentItemIndex];
  const metrics = activity?.config.metrics || [];

  const totalRatingsNeeded = approvedItems.length * metrics.length;
  const currentRatingsCount = Object.values(ratings).reduce(
    (acc, itemRatings) => acc + Object.keys(itemRatings).length,
    0
  );
  const progress = totalRatingsNeeded > 0 ? (currentRatingsCount / totalRatingsNeeded) * 100 : 0;

  return {
    // Loading states
    loading: initializing || gameLoading || activityLoading,
    itemsLoading,
    isJoining,
    isSubmitting,

    // Data
    gamePin,
    game,
    activity,
    players,
    approvedItems,
    currentItem,
    metrics,
    playerState,
    playerName,
    playerId,
    ratings,
    currentItemIndex,
    submittedItemCount,

    // Form state
    newItemText,
    setNewItemText,
    newItemDescription,
    setNewItemDescription,
    setPlayerName,
    setCurrentItemIndex,

    // Progress
    progress,
    currentRatingsCount,
    totalRatingsNeeded,

    // Handlers
    handleJoin,
    handleSubmitItem,
    handleRateMetric,
    handleSubmitRatings,
  };
}
