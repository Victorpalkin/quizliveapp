
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, DocumentReference, deleteDoc, setDoc, serverTimestamp, query, where, Query, getDocs } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Game, Quiz, QuestionSubmission, SingleChoiceQuestion, Question, Player } from '@/lib/types';
import { removeUndefined } from '@/lib/firestore-utils';
import { clearHostSession } from '@/lib/host-session';
import { useHostSession } from '../../../hooks/use-host-session';
import { extractAnswerKeyEntry, sanitizeQuestionForPlayer } from '@/lib/question-utils';
import { SubmissionsPanel } from './components/submissions-panel';
import { LobbyLayout } from '../../../components/lobby-layout';
import { FullPageLoader } from '@/components/ui/full-page-loader';

export default function HostLobbyPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const gameRef = useMemoFirebase(() => doc(firestore, 'games', gameId) as DocumentReference<Game>, [firestore, gameId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const quizRef = useMemoFirebase(
    () => game ? doc(firestore, 'quizzes', game.quizId) as DocumentReference<Quiz> : null,
    [firestore, game]
  );
  const { data: quiz } = useDoc(quizRef);

  const playersQuery = useMemoFirebase(() => game ? collection(firestore, 'games', gameId, 'players') : null, [firestore, gameId, game]);
  const { data: players, loading: playersLoading } = useCollection(playersQuery);

  useHostSession({
    gameId,
    game,
    contentId: game?.quizId || '',
    contentTitle: quiz?.title || '',
    userId: user?.uid,
    activityType: 'quiz',
    returnPath: `/host/quiz/lobby/${gameId}`,
  });

  // Sync crowdsource settings from quiz to game doc so players don't need quiz access
  useEffect(() => {
    if (quiz?.crowdsource && game && !game.crowdsource) {
      updateDoc(gameRef, { crowdsource: quiz.crowdsource }).catch(() => {});
    }
  }, [quiz?.crowdsource, game, gameRef]);

  const handleStartGame = async () => {
    if (!gameRef || !quiz) return;

    try {
      const leaderboardRef = doc(firestore, 'games', gameId, 'aggregates', 'leaderboard');
      await setDoc(leaderboardRef, {
        topPlayers: [],
        totalPlayers: players?.length || 0,
        totalAnswered: 0,
        answerCounts: [],
        lastUpdated: serverTimestamp(),
      });

      let finalQuestions: Question[] = (quiz.questions || []).filter(q => q != null);

      if (quiz.crowdsource?.enabled) {
        const submissionsRef = collection(firestore, 'games', gameId, 'submissions');
        const selectedQuery = query(submissionsRef, where('aiSelected', '==', true));
        const selectedSnapshot = await getDocs(selectedQuery);

        if (!selectedSnapshot.empty) {
          const crowdsourcedQuestions: SingleChoiceQuestion[] = selectedSnapshot.docs.map(docSnap => {
            const sub = docSnap.data() as QuestionSubmission;
            return {
              type: 'single-choice' as const,
              text: sub.questionText,
              timeLimit: 20,
              answers: sub.answers.map(text => ({ text })),
              correctAnswerIndex: sub.correctAnswerIndex,
              submittedBy: sub.playerName,
            };
          });

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

      const answerKeyRef = doc(firestore, 'games', gameId, 'aggregates', 'answerKey');
      await setDoc(answerKeyRef, removeUndefined({
        questions: finalQuestions.map(extractAnswerKeyEntry),
      }));

      const sanitizedQuestions = finalQuestions.map(sanitizeQuestionForPlayer);

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
      .then(() => router.push('/host'))
      .catch((error) => {
        console.error("Error deleting game: ", error);
        const permissionError = new FirestorePermissionError({
          path: gameRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (gameLoading) {
    return <FullPageLoader />;
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Game not found</h1>
        <button onClick={() => router.push('/host')} className="text-primary underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const playerCount = players?.length || 0;

  return (
    <LobbyLayout
      gamePin={game.gamePin}
      playerCount={playerCount}
      activityType="quiz"
      title={quiz?.title}
      onCancel={handleCancelGame}
      tipText="Share the PIN or scan the QR code with your audience to let them join"
      readinessItems={[
        {
          label: 'Players joined',
          isReady: playerCount > 0,
          detail: `${playerCount} player${playerCount !== 1 ? 's' : ''}`,
        },
        ...(quiz?.crowdsource?.enabled ? [{
          label: 'Crowdsourced questions reviewed',
          isReady: game.crowdsourceState?.evaluationComplete || false,
          detail: game.crowdsourceState?.selectedCount ? `${game.crowdsourceState.selectedCount} selected` : 'Pending',
        }] : []),
      ]}
      players={players as Player[] | null}
      playersLoading={playersLoading}
      gameLoading={gameLoading}
      startLabel="Start Game"
      startDescription="No more players can join after starting"
      startConfirmTitle="Start the game?"
      startConfirmDescription={`No more players will be able to join after the game starts. ${playerCount} player${playerCount !== 1 ? 's' : ''} currently in the lobby.`}
      onStart={handleStartGame}
    >
      {game && quiz && (
        <SubmissionsPanel gameId={gameId} game={game} quiz={quiz} />
      )}
    </LobbyLayout>
  );
}
