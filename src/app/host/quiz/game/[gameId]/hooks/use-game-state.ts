import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { Game, Quiz } from '@/lib/types';
import { useLeaderboard } from './use-leaderboard';

/**
 * Answer key entry for a question (server-side scoring data)
 */
interface AnswerKeyEntry {
  type: string;
  timeLimit: number;
  correctAnswerIndex?: number;      // For single-choice
  correctAnswerIndices?: number[];  // For multiple-choice
  correctValue?: number;            // For slider
  correctAnswer?: string;           // For free-response
  alternativeAnswers?: string[];    // For free-response
}

/**
 * Answer key document structure
 */
interface AnswerKey {
  questions: AnswerKeyEntry[];
}

/**
 * Host game state hook.
 *
 * Uses aggregate document for leaderboard data instead of subscribing to
 * all player documents. This reduces Firestore reads from O(n) to O(1)
 * and eliminates the "update storm" problem with 500+ players.
 */
export function useGameState(gameId: string) {
  const firestore = useFirestore();

  // Game document
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Quiz document
  const quizRef = useMemoFirebase(
    () => game ? doc(firestore, 'quizzes', game.quizId) : null,
    [firestore, game]
  );
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);
  const quiz = quizData as Quiz | null;

  // Answer key document (contains correct answers for all questions, including crowdsourced)
  const answerKeyRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId, 'aggregates', 'answerKey') as DocumentReference<AnswerKey>,
    [firestore, gameId]
  );
  const { data: answerKey } = useDoc(answerKeyRef);

  // Leaderboard aggregate (top 20 + answer counts + totals)
  // Replaces the expensive useCollection subscription to all players
  const { topPlayers, totalPlayers, totalAnswered, answerCounts, loading: leaderboardLoading } = useLeaderboard(gameId);

  return {
    game,
    gameRef,
    quiz,
    answerKey,          // Answer key for determining correct answers
    // Leaderboard data from aggregate (O(1) instead of O(n))
    topPlayers,        // Top 20 players (show 10 during game, 20 at end)
    totalPlayers,      // Total player count
    totalAnswered,     // How many answered current question
    answerCounts,      // Answer distribution for current question
    gameLoading,
    quizLoading,
    leaderboardLoading,
  };
}
