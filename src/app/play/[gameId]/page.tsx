
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PartyPopper, Frown, Trophy, Loader2, XCircle, Timer, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useDoc, useFirestore, useMemoFirebase, useFunctions } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, DocumentReference, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Quiz, Player, Game, Question } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { nanoid } from 'nanoid';
import {
  getPlayerSession,
  savePlayerSession,
  clearPlayerSession,
  sessionMatchesPin
} from '@/lib/player-session';
import { useWakeLock } from '@/hooks/use-wake-lock';
import {
  SingleChoiceQuestionComponent,
  MultipleChoiceQuestionComponent,
  SliderQuestionComponent,
  SlideQuestionComponent
} from '@/components/app/player-question';

type PlayerState = 'joining' | 'lobby' | 'preparing' | 'question' | 'waiting' | 'result' | 'ended' | 'cancelled' | 'reconnecting' | 'session-invalid';

export default function PlayerGamePage() {
  const params = useParams();
  const gamePin = params.gameId as string;
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  const router = useRouter();

  // Initialize from session if available
  const [state, setState] = useState<PlayerState>(() => {
    const session = getPlayerSession();
    if (session && session.gamePin === gamePin) {
      return 'reconnecting';
    }
    return 'joining';
  });
  const [nickname, setNickname] = useState(() => {
    const session = getPlayerSession();
    return session && session.gamePin === gamePin ? session.nickname : '';
  });
  const [gameDocId, setGameDocId] = useState<string | null>(() => {
    const session = getPlayerSession();
    return session && session.gamePin === gamePin ? session.gameDocId : null;
  });
  const [playerId] = useState(() => {
    const session = getPlayerSession();
    return session && session.gamePin === gamePin ? session.playerId : nanoid();
  });
  
  const gameRef = useMemoFirebase(() => gameDocId ? doc(firestore, 'games', gameDocId) as DocumentReference<Game> : null, [firestore, gameDocId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const quizRef = useMemoFirebase(() => game ? doc(firestore, 'quizzes', game.quizId) : null, [firestore, game]);
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);

  const quiz = quizData;

  const question = quiz?.questions[game?.currentQuestionIndex || 0];
  const timeLimit = question?.timeLimit || 20;

  const [player, setPlayer] = useState<Player | null>(null);
  const [lastAnswer, setLastAnswer] = useState<{ selected: number; correct: number[]; points: number; wasTimeout: boolean; isPartiallyCorrect?: boolean } | null>(null);
  const [time, setTime] = useState(timeLimit);
  const [answerSelected, setAnswerSelected] = useState<boolean>(false);
  const [timedOut, setTimedOut] = useState(false);

  // Use ref to track question index - refs don't trigger re-renders
  const lastQuestionIndexRef = useRef<number>(-1);

  // Use ref to track if answer was submitted - prevents timeout race condition
  const answerSubmittedRef = useRef<boolean>(false);

  const isLastQuestion = game && quiz ? game.currentQuestionIndex >= quiz.questions.length - 1 : false;

  // Keep screen awake during active gameplay
  // Enable wake lock for active states, disable for terminal states
  const shouldKeepAwake = ['lobby', 'preparing', 'question', 'waiting', 'result'].includes(state);
  useWakeLock(shouldKeepAwake);

  // Session restore effect - runs once on mount
  useEffect(() => {
    if (state === 'reconnecting') {
      const attemptReconnect = async () => {
        try {
          // Verify game exists
          if (!gameRef) {
            console.log('[Reconnect] No game reference, clearing session');
            clearPlayerSession();
            setState('session-invalid');
            return;
          }

          // Wait for game data to load
          if (gameLoading) {
            return; // Will retry when gameLoading changes
          }

          if (!game) {
            console.log('[Reconnect] Game not found, clearing session');
            clearPlayerSession();
            setState('session-invalid');
            toast({
              variant: 'destructive',
              title: 'Session Expired',
              description: 'The game has ended or was cancelled.'
            });
            return;
          }

          // Check if game has ended
          if (game.state === 'ended') {
            console.log('[Reconnect] Game has ended');
            clearPlayerSession();
            setState('ended');
            return;
          }

          // Verify player document exists
          const playerRef = doc(firestore, 'games', gameDocId!, 'players', playerId) as DocumentReference<Player>;
          const playerDoc = await getDocs(query(collection(firestore, 'games', gameDocId!, 'players'), where('__name__', '==', playerId)));

          if (playerDoc.empty) {
            // Player document doesn't exist, try to recreate it
            console.log('[Reconnect] Player document missing, attempting to recreate');
            const newPlayer = { id: playerId, name: nickname, score: 0, lastAnswerIndex: null };
            await setDoc(playerRef, newPlayer);
            setPlayer(newPlayer);
            toast({
              title: 'Reconnected!',
              description: 'Successfully rejoined the game.'
            });
          } else {
            // Player exists, restore their data
            const playerData = playerDoc.docs[0].data() as Player;
            setPlayer(playerData);
            toast({
              title: 'Reconnected!',
              description: 'Successfully resumed your session.'
            });
          }

          // Transition to appropriate state based on game state
          if (game.state === 'lobby') {
            setState('lobby');
          } else if (game.state === 'preparing') {
            setState('preparing');
          } else if (game.state === 'question') {
            // Sync timer with host when reconnecting during question
            // Use Firestore server timestamp to avoid client clock sync issues
            if (game.questionStartTime && question) {
              const elapsedSeconds = Math.floor((Date.now() - game.questionStartTime.toMillis()) / 1000);
              const remainingTime = Math.max(0, timeLimit - elapsedSeconds);
              console.log(`[Reconnect] Syncing timer: elapsed=${elapsedSeconds}s, remaining=${remainingTime}s`);
              setTime(remainingTime);
            }
            setState('question');
          } else if (game.state === 'leaderboard') {
            setState('result');
          }

        } catch (error) {
          console.error('[Reconnect] Error during reconnection:', error);
          clearPlayerSession();
          setState('session-invalid');
          toast({
            variant: 'destructive',
            title: 'Reconnection Failed',
            description: 'Could not restore your session. Please rejoin the game.'
          });
        }
      };

      attemptReconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, game, gameLoading]);

  useEffect(() => {
    if (!game && !gameLoading && state !== 'joining' && state !== 'cancelled') {
        setState('cancelled');
        return;
    }

    if (!game) return;

    const hostState = game.state;
    const currentQuestionIndex = game.currentQuestionIndex;

    // CRITICAL: Detect question index change using ref
    // Refs don't trigger re-renders, but we can compare against them
    const questionChanged = currentQuestionIndex !== lastQuestionIndexRef.current && lastQuestionIndexRef.current !== -1;

    if (questionChanged) {
      console.log(`[Player State] Question changed: ${lastQuestionIndexRef.current} → ${currentQuestionIndex}`);
      // Update ref immediately
      lastQuestionIndexRef.current = currentQuestionIndex;

      // When question changes, force player to 'preparing' state to reset for new question
      // This ensures player never gets stuck on result screens
      if (state !== 'joining' && state !== 'lobby' && state !== 'cancelled') {
        console.log(`[Player State] Resetting to 'preparing' due to question change`);
        setState('preparing');
        return; // Effect will run again due to state change
      }
    }

    // Update ref on first run or when syncing
    if (currentQuestionIndex !== lastQuestionIndexRef.current) {
      lastQuestionIndexRef.current = currentQuestionIndex;
    }

    // State machine for player-host sync
    // Order matters! Handle states from most specific to least specific

    // 1. Terminal state - game ended
    if (hostState === 'ended') {
      if (state !== 'ended') {
        console.log(`[Player State] Game ended: ${state} → ended`);
        setState('ended');
      }
      return;
    }

    // 2. Initial join flow
    if (hostState === 'lobby' && state === 'joining') {
      console.log(`[Player State] Joined lobby: joining → lobby`);
      setState('lobby');
      return;
    }

    // 3. Leaderboard - show results to players who answered or timed out
    if (hostState === 'leaderboard') {
      if (state === 'waiting' || (state === 'question' && timedOut)) {
        console.log(`[Player State] Showing result: ${state} → result`);
        setState('result');
      }
      // If already in result, stay there
      return;
    }

    // 4. Question - transition from preparing to question
    if (hostState === 'question') {
      if (state === 'preparing') {
        console.log(`[Player State] Showing question: preparing → question`);
        setState('question');
      }
      // If in other states (waiting, result), stay there until question changes
      return;
    }

    // 5. Preparing - handle game start from lobby
    if (hostState === 'preparing') {
      if (state === 'lobby') {
        console.log(`[Player State] Game starting: lobby → preparing`);
        setState('preparing');
      }
      // If in other states, question change handler above should have moved to preparing
      return;
    }

  // Include 'state' in dependencies so effect runs when player state changes
  // This allows the preparing → question transition to happen
  // NOTE: timedOut is NOT in dependencies - it's only used as a condition check
  // Including it causes unwanted re-runs when reset effect sets it to false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.state, game?.currentQuestionIndex, gameLoading, state]);


  // Reset answer state when preparing for new question
  useEffect(() => {
    if (state === 'preparing') {
      console.log('[Player State] Resetting for new question');
      setAnswerSelected(false);
      setTimedOut(false);
      setLastAnswer(null);
      answerSubmittedRef.current = false; // Reset answer submission flag

      // CRITICAL: Reset time to prevent false timeout on next question
      // Without this, if player timed out on previous question (time = 0),
      // the timeout effect can fire before timer effect resets time on new question
      setTime(timeLimit);

      // Reset lastAnswerIndex for new question
      if (gameDocId && player?.lastAnswerIndex !== null && player?.lastAnswerIndex !== undefined) {
        const playerRef = doc(firestore, 'games', gameDocId, 'players', playerId) as DocumentReference<Player>;
        setDoc(playerRef, { ...player, lastAnswerIndex: null }, { merge: true }).catch(error => {
          console.error("Error resetting lastAnswerIndex:", error);
        });
        setPlayer(p => p ? { ...p, lastAnswerIndex: null } : null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, game?.currentQuestionIndex]);

  // Start timer when question is shown
  useEffect(() => {
    if (state === 'question') {
      // Sync timer with host's questionStartTime if available
      // Use Firestore server timestamp to avoid client clock sync issues
      let initialTime = timeLimit;
      if (game?.questionStartTime) {
        const elapsedSeconds = Math.floor((Date.now() - game.questionStartTime.toMillis()) / 1000);
        initialTime = Math.max(0, timeLimit - elapsedSeconds);
        console.log(`[Timer] Syncing with host: elapsed=${elapsedSeconds}s, remaining=${initialTime}s`);
      }
      setTime(initialTime);

      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, game?.currentQuestionIndex, timeLimit, game?.questionStartTime]);

  // Handle timeout when time reaches 0
  useEffect(() => {
    // Check both state and ref to prevent race condition with answer submission
    if (state === 'question' && time === 0 && !answerSelected && !timedOut && !answerSubmittedRef.current) {
      // Skip timeout for slides - they don't have a time limit for viewing
      if (question?.type === 'slide') {
        return;
      }

      setTimedOut(true);

      // Set answer selection to prevent multiple submissions
      setAnswerSelected(true);

      // Set local state immediately for display (in case submission fails)
      if (question) {
        setLastAnswer({
          selected: -1,
          correct: question.type === 'single-choice' ? [question.correctAnswerIndex] : (question.type === 'multiple-choice' ? question.correctAnswerIndices : [1]),
          points: 0,
          wasTimeout: true
        });
      }

      // Move to waiting state immediately (before API call to prevent race conditions)
      setState('waiting');

      // Try to submit to server (may fail if game state changed due to race condition)
      // But local state is already set, so player will see correct "No Answer" screen
      handleTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, state, answerSelected, timedOut]);

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      toast({ variant: 'destructive', title: 'Nickname is required' });
      return;
    }

    if (trimmedNickname.length < 2) {
      toast({ variant: 'destructive', title: 'Nickname too short', description: 'Nickname must be at least 2 characters long.' });
      return;
    }

    if (trimmedNickname.length > 20) {
      toast({ variant: 'destructive', title: 'Nickname too long', description: 'Nickname must be 20 characters or less.' });
      return;
    }

    try {
        const pin = gamePin.toUpperCase();
        const gamesRef = collection(firestore, 'games');
        const q = query(gamesRef, where('gamePin', '==', pin), where('state', '==', 'lobby'));

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Game not found', description: "Couldn't find a game with that PIN." });
        return;
        }

        const gameDoc = querySnapshot.docs[0];
        setGameDocId(gameDoc.id);

        const playerRef = doc(firestore, 'games', gameDoc.id, 'players', playerId);
        const newPlayer = { id: playerId, name: trimmedNickname, score: 0, lastAnswerIndex: null };
        
        setDoc(playerRef, newPlayer)
          .then(() => {
            setPlayer({ ...newPlayer, id: playerId });
            // Save session for reconnection
            savePlayerSession(playerId, gameDoc.id, gamePin.toUpperCase(), trimmedNickname);
            setState('lobby');
          })
          .catch(error => {
            console.error("Error joining game: ", error);
            const permissionError = new FirestorePermissionError({
              path: playerRef.path,
              operation: 'create',
              requestResourceData: newPlayer
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Error', description: "Could not join the game. Please try again." });
          });
    } catch (error) {
        console.error("Error querying game: ", error);
        toast({ variant: 'destructive', title: 'Error', description: "Could not find the game. Please check the PIN." });
    }
  };

  // Handle single choice answer submission
  const handleSingleChoiceAnswer = async (answerIndex: number) => {
    if (answerSelected || !gameDocId || !game || !question || question.type !== 'single-choice') return;

    answerSubmittedRef.current = true;
    setAnswerSelected(true);
    setState('waiting');

    // Optimistic UI: Calculate estimated points client-side
    const isCorrectAnswer = answerIndex === question.correctAnswerIndex;
    let estimatedPoints = 0;
    if (isCorrectAnswer) {
      estimatedPoints = 100;
      const timeBonus = Math.round((time / timeLimit) * 900);
      estimatedPoints = Math.min(1000, estimatedPoints + timeBonus);
    }

    // Show result immediately (optimistic)
    setLastAnswer({
      selected: answerIndex,
      correct: [question.correctAnswerIndex],
      points: estimatedPoints,
      wasTimeout: false
    });
    setPlayer(p => p ? { ...p, score: p.score + estimatedPoints, lastAnswerIndex: answerIndex } : null);

    // Submit to server in background
    const submitData = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: game.currentQuestionIndex,
      answerIndex,
      timeRemaining: time,
      // Question metadata to avoid server quiz fetch
      questionType: 'single-choice' as const,
      questionTimeLimit: question.timeLimit,
      correctAnswerIndex: question.correctAnswerIndex,
    };

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore } = result.data as any;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
      }
      setPlayer(p => p ? { ...p, score: newScore, lastAnswerIndex: answerIndex } : null);
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit answer. Your score may not be saved.' });
      // Keep optimistic UI - don't rollback as it creates bad UX
    }
  };

  // Handle multiple choice answer submission
  const handleMultipleChoiceAnswer = async (answerIndices: number[]) => {
    if (answerSelected || !gameDocId || !game || !question || question.type !== 'multiple-choice') return;

    answerSubmittedRef.current = true;
    setAnswerSelected(true);
    setState('waiting');

    // Optimistic UI: Calculate estimated points client-side
    const correctAnswerIndices = question.correctAnswerIndices;
    const correctSelected = answerIndices.filter(i => correctAnswerIndices.includes(i)).length;
    const wrongSelected = answerIndices.filter(i => !correctAnswerIndices.includes(i)).length;
    const totalCorrect = correctAnswerIndices.length;

    const correctRatio = correctSelected / totalCorrect;
    const penalty = wrongSelected * 0.2;
    const scoreMultiplier = Math.max(0, correctRatio - penalty);
    const basePoints = Math.round(1000 * scoreMultiplier);

    const isCorrectAnswer = correctSelected === totalCorrect && wrongSelected === 0;
    const isPartiallyCorrectAnswer = !isCorrectAnswer && scoreMultiplier > 0;

    let estimatedPoints = basePoints;
    if (isCorrectAnswer && estimatedPoints > 0) {
      const timeBonus = Math.round((time / timeLimit) * 900);
      estimatedPoints = Math.min(1000, estimatedPoints + timeBonus);
    }

    // Show result immediately (optimistic)
    setLastAnswer({
      selected: isCorrectAnswer ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false,
      isPartiallyCorrect: isPartiallyCorrectAnswer
    });
    setPlayer(p => p ? { ...p, score: p.score + estimatedPoints, lastAnswerIndices: answerIndices } : null);

    // Submit to server in background
    const submitData = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: game.currentQuestionIndex,
      answerIndices,
      timeRemaining: time,
      // Question metadata to avoid server quiz fetch
      questionType: 'multiple-choice' as const,
      questionTimeLimit: question.timeLimit,
      correctAnswerIndices: question.correctAnswerIndices,
    };

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore, isPartiallyCorrect } = result.data as any;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
      }
      if (isPartiallyCorrect !== isPartiallyCorrectAnswer) {
        setLastAnswer(prev => prev ? { ...prev, isPartiallyCorrect } : null);
      }
      setPlayer(p => p ? { ...p, score: newScore, lastAnswerIndices: answerIndices } : null);
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit answer. Your score may not be saved.' });
      // Keep optimistic UI - don't rollback as it creates bad UX
    }
  };

  // Handle slider answer submission
  const handleSliderAnswer = async (sliderValue: number) => {
    if (answerSelected || !gameDocId || !game || !question || question.type !== 'slider') return;

    answerSubmittedRef.current = true;
    setAnswerSelected(true);
    setState('waiting');

    // Optimistic UI: Calculate estimated points client-side
    const range = question.maxValue - question.minValue;
    const distance = Math.abs(sliderValue - question.correctValue);
    const accuracy = Math.max(0, 1 - (distance / range));
    const errorMargin = distance / range;

    const scoreMultiplier = Math.pow(accuracy, 2);
    const basePoints = Math.round(1000 * scoreMultiplier);
    const estimatedPoints = basePoints; // No time bonus for sliders

    const isCorrectAnswer = errorMargin <= 0.1;
    const isPartiallyCorrectAnswer = !isCorrectAnswer && errorMargin <= 0.2;

    // Show result immediately (optimistic)
    setLastAnswer({
      selected: isCorrectAnswer ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false,
      isPartiallyCorrect: isPartiallyCorrectAnswer
    });
    setPlayer(p => p ? { ...p, score: p.score + estimatedPoints, lastSliderValue: sliderValue } : null);

    // Submit to server in background
    const submitData = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: game.currentQuestionIndex,
      sliderValue,
      timeRemaining: time,
      // Question metadata to avoid server quiz fetch
      questionType: 'slider' as const,
      questionTimeLimit: question.timeLimit,
      correctValue: question.correctValue,
      minValue: question.minValue,
      maxValue: question.maxValue,
    };

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore, isPartiallyCorrect } = result.data as any;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
      }
      if (isPartiallyCorrect !== isPartiallyCorrectAnswer) {
        setLastAnswer(prev => prev ? { ...prev, isPartiallyCorrect } : null);
      }
      setPlayer(p => p ? { ...p, score: newScore, lastSliderValue: sliderValue } : null);
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit answer. Your score may not be saved.' });
      // Keep optimistic UI - don't rollback as it creates bad UX
    }
  };

  // Handle slide view (no scoring, just mark as viewed)
  const handleSlideView = () => {
    if (answerSelected || !gameDocId || !game || !question || question.type !== 'slide') return;

    answerSubmittedRef.current = true;
    setAnswerSelected(true);
    setState('waiting');

    // Show "No Answer" result with 0 points (like timeout but informational)
    setLastAnswer({
      selected: -1,
      correct: [-1],
      points: 0,
      wasTimeout: false
    });

    // Update player state locally - mark as viewed with lastAnswerIndex = -1
    if (gameDocId && player) {
      const playerRef = doc(firestore, 'games', gameDocId, 'players', playerId) as DocumentReference<Player>;
      setDoc(playerRef, { ...player, lastAnswerIndex: -1 }, { merge: true }).catch(error => {
        console.error("Error marking slide as viewed:", error);
      });
      setPlayer(p => p ? { ...p, lastAnswerIndex: -1 } : null);
    }
  };

  // Handle timeout
  const handleTimeout = async () => {
    if (!gameDocId || !game || !question) return;

    // Slides don't timeout - players just view them
    if (question.type === 'slide') {
      console.log('[Timeout] Skipping timeout for slide question');
      return;
    }

    const submitData: any = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: game.currentQuestionIndex,
      timeRemaining: 0,
      questionType: question.type,
      questionTimeLimit: question.timeLimit,
    };

    // Add appropriate field based on question type
    if (question.type === 'single-choice') {
      submitData.answerIndex = -1;
      submitData.correctAnswerIndex = question.correctAnswerIndex;
    } else if (question.type === 'multiple-choice') {
      submitData.answerIndices = [];
      submitData.correctAnswerIndices = question.correctAnswerIndices;
    } else if (question.type === 'slider') {
      submitData.sliderValue = question.minValue;
      submitData.correctValue = question.correctValue;
      submitData.minValue = question.minValue;
      submitData.maxValue = question.maxValue;
    }

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      await submitAnswerFn(submitData);
    } catch (error: any) {
      console.error('Error submitting timeout:', error);
    }
  };
  
  const renderContent = () => {
    switch (state) {
      case 'reconnecting':
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold">Reconnecting...</h1>
            <p className="text-muted-foreground mt-2 text-xl">Restoring your session</p>
            <div className="mt-12 flex flex-col items-center">
              <Loader2 className="animate-spin w-12 h-12 text-primary"/>
              <p className="mt-4">Please wait while we reconnect you to the game...</p>
            </div>
          </div>
        );
      case 'session-invalid':
        return (
          <div className="text-center w-full max-w-sm">
            <h1 className="text-4xl font-bold text-destructive">Session Expired</h1>
            <p className="text-muted-foreground mt-4 text-lg">
              Your previous session could not be restored.
            </p>
            <p className="text-muted-foreground mt-2">
              Please join the game again with the PIN.
            </p>
            <Button
              onClick={() => {
                clearPlayerSession();
                setState('joining');
                setNickname('');
              }}
              size="lg"
              className="w-full mt-8"
            >
              Join Game
            </Button>
          </div>
        );
      case 'joining':
        return (
          <div className="text-center w-full max-w-sm">
            <h1 className="text-4xl font-bold">Join Game</h1>
            <form onSubmit={handleJoinGame} className="space-y-4 mt-8">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="h-12 text-center text-xl"
                maxLength={20}
                minLength={2}
                required
              />
              <Button type="submit" size="lg" className="w-full">Join</Button>
            </form>
          </div>
        );
      case 'lobby':
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold">You're in, {player?.name}!</h1>
            <p className="text-muted-foreground mt-2 text-xl">Get ready to play...</p>
            <p className="mt-8 text-2xl font-bold">Game PIN: {game?.gamePin}</p>
            <div className="mt-12 flex flex-col items-center">
                <Loader2 className="animate-spin w-12 h-12 text-primary"/>
                <p className="mt-4">Waiting for the host to start the game...</p>
            </div>
          </div>
        );
      case 'preparing':
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-background">
            <h1 className="text-4xl font-bold">Get Ready...</h1>
            <p className="text-muted-foreground mt-2 text-xl">The next question is about to start!</p>
            <Loader2 className="animate-spin w-12 h-12 text-primary mt-8"/>
          </div>
        );
      case 'question':
        if (quizLoading || !question || !game) {
          return <Skeleton className="w-full h-full" />;
        }

        // Render using modular components based on question type
        return (
          <div className="w-full h-full flex flex-col">
            <header className="p-4 flex items-center justify-center flex-col gap-2">
              <p className="text-2xl font-bold text-center">{question.text}</p>
              {question.type === 'multiple-choice' && question.showAnswerCount !== false && (
                <p className="text-sm text-muted-foreground">
                  Select {question.correctAnswerIndices.length} answer{question.correctAnswerIndices.length > 1 ? 's' : ''}
                </p>
              )}
            </header>
            <div className="flex-grow flex items-center justify-center w-full relative">
              <Progress value={(time / timeLimit) * 100} className="absolute top-0 left-0 w-full h-2 rounded-none" />
              <div className="absolute top-4 right-4 text-2xl font-bold bg-background/80 px-4 py-2 rounded-lg">{time}</div>

              {question.type === 'single-choice' && (
                <SingleChoiceQuestionComponent
                  question={question}
                  onSubmit={handleSingleChoiceAnswer}
                  disabled={answerSelected}
                />
              )}

              {question.type === 'multiple-choice' && (
                <MultipleChoiceQuestionComponent
                  question={question}
                  onSubmit={handleMultipleChoiceAnswer}
                  disabled={answerSelected}
                />
              )}

              {question.type === 'slider' && (
                <SliderQuestionComponent
                  question={question}
                  onSubmit={handleSliderAnswer}
                  disabled={answerSelected}
                />
              )}

              {question.type === 'slide' && (
                <SlideQuestionComponent
                  question={question}
                  onSubmit={handleSlideView}
                  disabled={answerSelected}
                />
              )}
            </div>
            <footer className="p-4 text-center">
              <p>Question {game.currentQuestionIndex + 1} of {quiz.questions.length}</p>
            </footer>
          </div>
        );
    case 'waiting':
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-background">
                <Timer className="w-24 h-24 mb-4 text-primary animate-pulse" />
                <h1 className="text-4xl font-bold">Answer Locked In!</h1>
                <p className="text-muted-foreground mt-2 text-xl">Waiting for question to finish...</p>
                <div className="mt-12 flex flex-col items-center">
                    <Loader2 className="animate-spin w-12 h-12"/>
                    <p className="mt-4">
                        {isLastQuestion ? "Waiting for final results..." : "Waiting for other players..."}
                    </p>
                </div>
            </div>
        );
      case 'result':
        const isCorrect = lastAnswer ? lastAnswer.correct.includes(lastAnswer.selected) : false;
        const wasTimeout = lastAnswer?.wasTimeout || false;
        const isPartiallyCorrect = lastAnswer?.isPartiallyCorrect || false;

        let bgColor = 'bg-red-500';
        let icon = <Frown className="w-24 h-24 mb-4" />;
        let message = 'Incorrect';

        if (isCorrect) {
          bgColor = 'bg-green-500';
          icon = <PartyPopper className="w-24 h-24 mb-4" />;
          message = 'Correct!';
        } else if (isPartiallyCorrect) {
          bgColor = 'bg-yellow-500';
          icon = <PartyPopper className="w-24 h-24 mb-4" />;
          message = 'Partially Correct!';
        } else if (wasTimeout) {
          bgColor = 'bg-orange-500';
          icon = <Clock className="w-24 h-24 mb-4" />;
          message = 'No Answer';
        }

        return (
          <div className={`flex flex-col items-center justify-center text-center p-8 w-full h-full ${bgColor} text-white`}>
            {icon}
            <h1 className="text-6xl font-bold">{message}</h1>
            <p className="text-3xl mt-4">+{lastAnswer?.points || 0} points</p>
            <p className="text-2xl mt-8">Your score: {player?.score}</p>
            <div className="mt-12 flex flex-col items-center">
                <Loader2 className="animate-spin w-12 h-12"/>
                <p className="mt-4 text-lg">
                    {isLastQuestion ? "Revealing final scores..." : "Loading next question..."}
                </p>
            </div>
          </div>
        );
      case 'ended':
        // Clear session when game ends
        if (sessionMatchesPin(gamePin)) {
          clearPlayerSession();
        }
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-primary text-primary-foreground">
                <Trophy className="w-24 h-24 mb-4 text-yellow-400" />
                <h1 className="text-5xl font-bold">Quiz Finished!</h1>
                <p className="text-3xl mt-4">Your final score is:</p>
                <p className="text-8xl font-bold my-8">{player?.score}</p>
                <Button onClick={() => {
                    clearPlayerSession();
                    router.push('/');
                }} size="lg" variant="secondary" className="mt-12 text-xl">
                    Play Again
                </Button>
            </div>
        );
      case 'cancelled':
        // Clear session when game is cancelled
        if (sessionMatchesPin(gamePin)) {
          clearPlayerSession();
        }
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-destructive text-destructive-foreground">
                <XCircle className="w-24 h-24 mb-4" />
                <h1 className="text-5xl font-bold">Game Canceled</h1>
                <p className="text-2xl mt-4">The host has canceled the game.</p>
                <Button onClick={() => {
                    clearPlayerSession();
                    router.push('/');
                }} size="lg" variant="secondary" className="mt-12 text-xl">
                    Return Home
                </Button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <main className="w-full h-screen max-w-5xl mx-auto flex flex-col items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
}
