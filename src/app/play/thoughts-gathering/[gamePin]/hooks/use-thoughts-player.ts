'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, setDoc, addDoc, serverTimestamp, getDocs, DocumentReference, Query } from 'firebase/firestore';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { nanoid } from 'nanoid';
import type { Game, Player, ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';
import { gameConverter, thoughtsGatheringActivityConverter, thoughtSubmissionConverter } from '@/firebase/converters';

export type PlayerState = 'joining' | 'submitting' | 'waiting' | 'viewing' | 'ended' | 'cancelled';

export function useThoughtsPlayer() {
  const params = useParams();
  const gamePin = params.gamePin as string;
  const firestore = useFirestore();
  const router = useRouter();

  // Player state
  const [playerId] = useState(nanoid());
  const [nickname, setNickname] = useState('');
  const [gameDocId, setGameDocId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [state, setState] = useState<PlayerState>('joining');
  const [isJoining, setIsJoining] = useState(false);

  // Submission state
  const [submissionText, setSubmissionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);

  // Game data
  const gameRef = useMemoFirebase(
    () => gameDocId ? doc(firestore, 'games', gameDocId).withConverter(gameConverter) as DocumentReference<Game> : null,
    [firestore, gameDocId]
  );
  const { data: game } = useDoc(gameRef);

  // Activity data
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(thoughtsGatheringActivityConverter) as DocumentReference<ThoughtsGatheringActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: activity } = useDoc(activityRef);

  // Topic cloud result
  const topicsRef = useMemoFirebase(
    () => gameDocId ? doc(firestore, 'games', gameDocId, 'aggregates', 'topics') as DocumentReference<TopicCloudResult> : null,
    [firestore, gameDocId]
  );
  const { data: topicCloud } = useDoc(topicsRef);

  // Player's submissions
  const submissionsQuery = useMemoFirebase(
    () => gameDocId ? query(
      collection(firestore, 'games', gameDocId, 'submissions').withConverter(thoughtSubmissionConverter),
      where('playerId', '==', playerId)
    ) as Query<ThoughtSubmission> : null,
    [firestore, gameDocId, playerId]
  );
  const { data: playerSubmissions } = useCollection<ThoughtSubmission>(submissionsQuery);

  // All submissions (for grouped view when viewing results)
  const allSubmissionsQuery = useMemoFirebase(
    () => (gameDocId && (state === 'viewing' || state === 'ended'))
      ? collection(firestore, 'games', gameDocId, 'submissions').withConverter(thoughtSubmissionConverter) as Query<ThoughtSubmission>
      : null,
    [firestore, gameDocId, state]
  );
  const { data: allSubmissions } = useCollection<ThoughtSubmission>(allSubmissionsQuery);

  // Keep awake
  const shouldKeepAwake = ['submitting', 'waiting', 'viewing'].includes(state);
  useWakeLock(shouldKeepAwake);

  // Find game by PIN on mount
  useEffect(() => {
    const findGame = async () => {
      const gamesRef = collection(firestore, 'games');
      const q = query(gamesRef, where('gamePin', '==', gamePin));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setGameDocId(snapshot.docs[0].id);
      }
    };
    findGame();
  }, [firestore, gamePin]);

  // Sync state with game state
  useEffect(() => {
    if (!game || !player) return;

    switch (game.state) {
      case 'collecting':
        setState(game.submissionsOpen ? 'submitting' : 'waiting');
        break;
      case 'processing':
        setState('waiting');
        break;
      case 'display':
        setState('viewing');
        break;
      case 'ended':
        setState('ended');
        break;
    }
  }, [game?.state, game?.submissionsOpen, player]);

  // Handle joining the game
  const handleJoinGame = async () => {
    if (!gameDocId || !nickname.trim()) return;

    setIsJoining(true);

    try {
      const playerData: Omit<Player, 'id'> = {
        name: nickname.trim(),
        score: 0,
        answers: [],
        currentStreak: 0,
      };

      await setDoc(doc(firestore, 'games', gameDocId, 'players', playerId), {
        id: playerId,
        ...playerData,
      });

      setPlayer({ id: playerId, ...playerData });
      setState(game?.submissionsOpen ? 'submitting' : 'waiting');
    } catch (error) {
      console.error('Error joining game:', error);
    } finally {
      setIsJoining(false);
    }
  };

  // Handle submitting interest
  const handleSubmitInterest = async () => {
    if (!gameDocId || !submissionText.trim() || !player) return;

    const maxSubmissions = activity?.config.maxSubmissionsPerPlayer || 3;
    if (submissionCount >= maxSubmissions) return;

    setIsSubmitting(true);

    try {
      const submission: Omit<ThoughtSubmission, 'id'> = {
        playerId,
        playerName: player.name,
        rawText: submissionText.trim(),
        submittedAt: serverTimestamp() as any,
      };

      await addDoc(
        collection(firestore, 'games', gameDocId, 'submissions'),
        submission
      );

      setSubmissionText('');
      setSubmissionCount(prev => prev + 1);
    } catch (error) {
      console.error('Error submitting interest:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update submission count from player submissions
  useEffect(() => {
    if (playerSubmissions) {
      setSubmissionCount(playerSubmissions.length);
    }
  }, [playerSubmissions]);

  return {
    state,
    nickname,
    setNickname,
    isJoining,
    handleJoinGame,
    submissionText,
    setSubmissionText,
    isSubmitting,
    submissionCount,
    handleSubmitInterest,
    game,
    activity,
    player,
    playerSubmissions,
    allSubmissions,
    topicCloud,
    router,
  };
}
