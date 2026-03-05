'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, updateDoc, deleteDoc, DocumentReference, Query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { gameConverter, thoughtsGatheringActivityConverter, thoughtSubmissionConverter } from '@/firebase/converters';
import { clearHostSession, saveHostSession } from '@/lib/host-session';
import { exportThoughtsToMarkdown, downloadMarkdown, generateExportFilename } from '@/lib/export-thoughts';
import type { Game, ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';

export function useThoughtsGatheringGame() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Typed ref for reading with converter
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId).withConverter(gameConverter) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Plain ref for updates (updateDoc doesn't work well with converters)
  const gameDocRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId),
    [firestore, gameId]
  );

  // Fetch activity
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(thoughtsGatheringActivityConverter) as DocumentReference<ThoughtsGatheringActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: activity } = useDoc(activityRef);

  // Fetch participants
  const playersQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'players') : null,
    [firestore, gameId, game]
  );
  const { data: players } = useCollection(playersQuery);

  // Fetch submissions
  const submissionsQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'submissions').withConverter(thoughtSubmissionConverter) as Query<ThoughtSubmission> : null,
    [firestore, gameId, game]
  );
  const { data: submissions } = useCollection<ThoughtSubmission>(submissionsQuery);

  // Fetch topic cloud result
  const topicsRef = useMemoFirebase(
    () => game ? doc(firestore, 'games', gameId, 'aggregates', 'topics') as DocumentReference<TopicCloudResult> : null,
    [firestore, gameId, game]
  );
  const { data: topicCloud } = useDoc(topicsRef);

  // Save host session
  useEffect(() => {
    if (game && activity && user) {
      saveHostSession(gameId, game.gamePin, game.activityId || '', activity.title, user.uid, 'thoughts-gathering', game.state, `/host/thoughts-gathering/game/${gameId}`);
    }
  }, [gameId, game, activity, user, game?.state]);

  const handleCancelGame = useCallback(() => {
    if (!gameDocRef) return;
    clearHostSession();
    deleteDoc(gameDocRef)
      .then(() => router.push('/host'))
      .catch(error => console.error('Error deleting game:', error));
  }, [gameDocRef, router]);

  const handleToggleSubmissions = async () => {
    if (!gameDocRef || !game) return;

    try {
      await updateDoc(gameDocRef, { submissionsOpen: !game.submissionsOpen });
    } catch (error) {
      console.error("Error toggling submissions: ", error);
    }
  };

  const handleStopAndProcess = async () => {
    if (!gameDocRef) return;

    setIsProcessing(true);

    try {
      await updateDoc(gameDocRef, { state: 'processing', submissionsOpen: false });

      const functions = getFunctions(undefined, 'europe-west4');
      const extractTopics = httpsCallable(functions, 'extractTopics');

      await extractTopics({ gameId });
    } catch (error) {
      console.error("Error processing submissions: ", error);
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: "Could not process submissions. Please try again.",
      });
      await updateDoc(gameDocRef, { state: 'collecting', submissionsOpen: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCollectMore = async () => {
    if (!gameDocRef) return;

    try {
      await updateDoc(gameDocRef, { state: 'collecting', submissionsOpen: true });
    } catch (error) {
      console.error("Error resuming collection: ", error);
    }
  };

  const handleEndSession = async () => {
    if (!gameDocRef) return;

    try {
      await updateDoc(gameDocRef, { state: 'ended', submissionsOpen: false });
      clearHostSession();
    } catch (error) {
      console.error("Error ending session: ", error);
    }
  };

  const handleReturnToDashboard = () => {
    clearHostSession();
    router.push('/host');
  };

  const handleExportResults = useCallback(() => {
    if (!topicCloud?.topics || !submissions || !activity) return;

    const markdown = exportThoughtsToMarkdown(
      activity.title,
      topicCloud.topics,
      submissions,
      players?.length || 0,
      topicCloud.processedAt?.toDate?.(),
      topicCloud.agentMatches,
      topicCloud.topMatureAgents
    );

    const filename = generateExportFilename(activity.title);
    downloadMarkdown(markdown, filename);
  }, [topicCloud, submissions, activity, players?.length]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      if (game?.state === 'collecting') {
        handleToggleSubmissions();
      } else if (game?.state === 'display' && activity?.config.allowMultipleRounds) {
        handleCollectMore();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (game?.state === 'collecting' && submissions?.length) {
        handleStopAndProcess();
      } else if (game?.state === 'display') {
        handleEndSession();
      }
    }
  }, [game?.state, activity?.config.allowMultipleRounds, submissions?.length]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    // Loading
    loading: userLoading || gameLoading,
    isProcessing,

    // Data
    game,
    gameId,
    activity,
    players,
    submissions,
    topicCloud,

    // Handlers
    handleCancelGame,
    handleToggleSubmissions,
    handleStopAndProcess,
    handleCollectMore,
    handleEndSession,
    handleReturnToDashboard,
    handleExportResults,

    // Navigation
    router,
  };
}
