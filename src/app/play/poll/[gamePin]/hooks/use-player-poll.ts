'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useFunctions, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, setDoc, getDocs, getDoc, DocumentReference } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { nanoid } from 'nanoid';
import type { Game, Player, PollActivity } from '@/lib/types';
import { gameConverter, pollActivityConverter, playerConverter } from '@/firebase/converters';
import { useToast } from '@/hooks/use-toast';
import { getPlayerSession, savePlayerSession, clearPlayerSession, sessionMatchesPin } from '@/lib/player-session';
import { logError } from '@/lib/error-logging';

export type PlayerState = 'joining' | 'reconnecting' | 'lobby' | 'answering' | 'waiting' | 'results' | 'ended';

export function usePlayerPoll() {
  const params = useParams();
  const gamePin = params.gamePin as string;
  const firestore = useFirestore();
  const functions = useFunctions();
  const router = useRouter();
  const { toast } = useToast();

  // Session-aware player state initialization
  const storedSession = useRef(getPlayerSession());
  const hasValidSession = storedSession.current && sessionMatchesPin(gamePin);
  const [playerId] = useState(() => hasValidSession ? storedSession.current!.playerId : nanoid());
  const [nickname, setNickname] = useState(() => hasValidSession ? storedSession.current!.nickname : '');
  const [gameDocId, setGameDocId] = useState<string | null>(() => hasValidSession ? storedSession.current!.gameDocId : null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [state, setState] = useState<PlayerState>(() => hasValidSession ? 'reconnecting' : 'joining');
  const [isJoining, setIsJoining] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Answer state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  // Track current question and answered questions (for reconnection)
  const lastQuestionIndexRef = useRef<number>(-1);
  const answeredQuestionsRef = useRef<Set<number>>(new Set());

  // Game data
  const gameRef = useMemoFirebase(
    () => gameDocId ? doc(firestore, 'games', gameDocId).withConverter(gameConverter) as DocumentReference<Game> : null,
    [firestore, gameDocId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Activity data
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(pollActivityConverter) as DocumentReference<PollActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: poll } = useDoc(activityRef);

  // Find game by PIN on mount (skip if already have gameDocId from session)
  useEffect(() => {
    if (gameDocId) return;
    const findGame = async () => {
      const gamesRef = collection(firestore, 'games');
      const q = query(gamesRef, where('gamePin', '==', gamePin));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setGameDocId(snapshot.docs[0].id);
      }
    };
    findGame();
  }, [firestore, gamePin, gameDocId]);

  // Reconnection logic: check if player document still exists
  useEffect(() => {
    if (state !== 'reconnecting' || !gameDocId) return;

    const attemptReconnect = async () => {
      try {
        const playerDocRef = doc(firestore, 'games', gameDocId, 'players', playerId).withConverter(playerConverter);
        const playerDoc = await getDoc(playerDocRef);

        if (playerDoc.exists()) {
          const playerData = playerDoc.data();
          setPlayer(playerData);
          setNickname(playerData.name);

          const answeredQuestions = new Set(playerData.answers.map(a => a.questionIndex));
          answeredQuestionsRef.current = answeredQuestions;
        } else {
          clearPlayerSession();
          setState('joining');
        }
      } catch (error) {
        logError(error as Error, { context: 'PollPlayer:reconnect', gameId: gameDocId });
        clearPlayerSession();
        setState('joining');
      }
    };
    attemptReconnect();
  }, [state, gameDocId, firestore, playerId]);

  // Sync state with game state
  useEffect(() => {
    if (!game || !player) return;

    // Detect new question
    if (game.currentQuestionIndex !== lastQuestionIndexRef.current) {
      lastQuestionIndexRef.current = game.currentQuestionIndex;

      const alreadyAnswered = answeredQuestionsRef.current.has(game.currentQuestionIndex);
      if (alreadyAnswered) {
        setHasAnswered(true);
      } else {
        setSelectedIndex(null);
        setSelectedIndices([]);
        setTextAnswer('');
        setHasAnswered(false);
      }
    }

    switch (game.state) {
      case 'lobby':
        setState('lobby');
        break;
      case 'question':
        setState(hasAnswered ? 'waiting' : 'answering');
        break;
      case 'results':
        setState('results');
        break;
      case 'ended':
        setState('ended');
        clearPlayerSession();
        break;
    }
  }, [game?.state, game?.currentQuestionIndex, player, hasAnswered]);

  // Handle joining
  const handleJoinGame = async () => {
    if (!gameDocId) return;

    const playerName = nickname.trim() || 'Anonymous';

    setIsJoining(true);

    try {
      const playerData: Omit<Player, 'id'> = {
        name: playerName,
        score: 0,
        answers: [],
        currentStreak: 0,
        maxStreak: 0,
      };

      await setDoc(doc(firestore, 'games', gameDocId, 'players', playerId), {
        id: playerId,
        ...playerData,
      });

      setPlayer({ id: playerId, ...playerData });
      savePlayerSession(playerId, gameDocId, gamePin, playerName);
      setState('lobby');
    } catch (error) {
      logError(error as Error, { context: 'PollPlayer:join', gameId: gameDocId });
    } finally {
      setIsJoining(false);
    }
  };

  // Handle submitting answer via Cloud Function
  const handleSubmitAnswer = async () => {
    if (!gameDocId || !player || !game || !poll) return;

    const currentQuestion = poll.questions[game.currentQuestionIndex];
    if (!currentQuestion) return;

    if (currentQuestion.type === 'poll-single' && selectedIndex === null) return;
    if (currentQuestion.type === 'poll-multiple' && selectedIndices.length === 0) return;
    if (currentQuestion.type === 'poll-free-text' && !textAnswer.trim()) return;

    setIsSubmitting(true);

    try {
      const request: {
        gameId: string;
        playerId: string;
        questionIndex: number;
        questionType: string;
        answerIndex?: number;
        answerIndices?: number[];
        textAnswer?: string;
      } = {
        gameId: gameDocId,
        playerId,
        questionIndex: game.currentQuestionIndex,
        questionType: currentQuestion.type,
      };

      if (currentQuestion.type === 'poll-single') {
        request.answerIndex = selectedIndex!;
      } else if (currentQuestion.type === 'poll-multiple') {
        request.answerIndices = selectedIndices;
      } else if (currentQuestion.type === 'poll-free-text') {
        request.textAnswer = textAnswer.trim();
      }

      const submitPollAnswerFn = httpsCallable(functions, 'submitPollAnswer');
      await submitPollAnswerFn(request);

      setHasAnswered(true);
      answeredQuestionsRef.current.add(game.currentQuestionIndex);
      setState('waiting');
    } catch (error: unknown) {
      logError(error as Error, { context: 'PollPlayer:submit', gameId: gameDocId || undefined });

      const errorCode = (error as { code?: string })?.code;
      if (errorCode === 'functions/failed-precondition') {
        toast({
          variant: 'destructive',
          title: 'Already Answered',
          description: 'You have already submitted a response for this question.',
        });
        setHasAnswered(true);
        setState('waiting');
      } else {
        toast({
          variant: 'destructive',
          title: 'Submission Error',
          description: 'Failed to submit your response. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle selection for multiple choice
  const toggleMultipleChoice = (index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Check if answer is valid
  const isAnswerValid = () => {
    if (!poll || !game) return false;
    const currentQuestion = poll.questions[game.currentQuestionIndex];
    if (!currentQuestion) return false;

    switch (currentQuestion.type) {
      case 'poll-single':
        return selectedIndex !== null;
      case 'poll-multiple':
        return selectedIndices.length > 0;
      case 'poll-free-text':
        return textAnswer.trim().length > 0;
      default:
        return false;
    }
  };

  return {
    // State
    state,
    gamePin,
    player,
    nickname,
    setNickname,
    isJoining,
    isSubmitting,

    // Game data
    game,
    gameLoading,
    poll,

    // Answer state
    selectedIndex,
    setSelectedIndex,
    selectedIndices,
    textAnswer,
    setTextAnswer,

    // Handlers
    handleJoinGame,
    handleSubmitAnswer,
    toggleMultipleChoice,
    isAnswerValid,

    // Navigation
    router,
  };
}
