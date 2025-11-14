
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PartyPopper, Frown, Trophy, Loader2, XCircle, Timer, Clock } from 'lucide-react';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { cn } from '@/lib/utils';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

type PlayerState = 'joining' | 'lobby' | 'preparing' | 'question' | 'waiting' | 'result' | 'ended' | 'cancelled' | 'reconnecting' | 'session-invalid';

const answerIcons = [
  TriangleIcon,
  DiamondIcon,
  SquareIcon,
  CircleIcon,
  TriangleIcon, // Repeat for more than 4
  DiamondIcon,
  SquareIcon,
  CircleIcon,
];

const answerColors = [
  'bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500',
  'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500',
];

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
  const [lastAnswer, setLastAnswer] = useState<{ selected: number; correct: number[]; points: number; wasTimeout: boolean } | null>(null);
  const [time, setTime] = useState(timeLimit);
  const [answerSelected, setAnswerSelected] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Multi-select and slider state
  const [selectedAnswerIndices, setSelectedAnswerIndices] = useState<number[]>([]);
  const [sliderValue, setSliderValue] = useState<number>(50);

  // Use ref to track question index - refs don't trigger re-renders
  const lastQuestionIndexRef = useRef<number>(-1);

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
      setAnswerSelected(null);
      setTimedOut(false);
      setLastAnswer(null);
      setSelectedAnswerIndices([]);

      // Reset slider to midpoint of range
      if (question?.type === 'slider') {
        const midpoint = (question.minValue + question.maxValue) / 2;
        setSliderValue(midpoint);
      }

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
    if (state === 'question' && time === 0 && answerSelected === null && !timedOut) {
      setTimedOut(true);

      // Set answer selection to prevent multiple submissions
      setAnswerSelected(-1);

      // Set local state immediately for display (in case submission fails)
      if (question) {
        setLastAnswer({
          selected: -1,
          correct: question.correctAnswerIndices,
          points: 0,
          wasTimeout: true
        });
      }

      // Move to waiting state immediately (before API call to prevent race conditions)
      setState('waiting');

      // Try to submit to server (may fail if game state changed due to race condition)
      // But local state is already set, so player will see correct "No Answer" screen
      handleAnswer(); // No parameters = timeout
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

  const handleAnswer = async (answerData?: { type: 'single' | 'multi' | 'slider'; value: number | number[] }) => {
    // Determine answer type based on question type if not provided (for backward compatibility)
    const isTimeout = !answerData;
    let submitData: any = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: game?.currentQuestionIndex,
      timeRemaining: time,
    };

    if (isTimeout) {
      // Timeout submission
      submitData.answerIndex = -1;
      setAnswerSelected(-1);
    } else if (!question) {
      return;
    } else if (answerData.type === 'single') {
      // Single answer submission
      if (answerSelected !== null) return; // Prevent multiple submissions
      const selectedIndex = answerData.value as number;
      submitData.answerIndex = selectedIndex;
      setAnswerSelected(selectedIndex);
    } else if (answerData.type === 'multi') {
      // Multi-answer submission
      if (answerSelected !== null) return;
      submitData.answerIndices = answerData.value as number[];
      setAnswerSelected(0); // Use 0 as a marker that answer was submitted
    } else if (answerData.type === 'slider') {
      // Slider submission
      if (answerSelected !== null) return;
      submitData.sliderValue = answerData.value as number;
      setAnswerSelected(0); // Use 0 as a marker
    }

    // Only change state if still in question state
    if (state === 'question') {
      setState('waiting');
    }

    if (!gameDocId || !game) {
      toast({ variant: 'destructive', title: 'Error', description: "Game not found" });
      return;
    }

    // Set local state immediately for display (in case submission fails)
    if (isTimeout && question && question.type === 'multiple-choice') {
      setLastAnswer({
        selected: -1,
        correct: question.correctAnswerIndices,
        points: 0,
        wasTimeout: true
      });
    }

    try {
      // Call Cloud Function to validate and score the answer
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);

      const { isCorrect, points, newScore } = result.data as {
        success: boolean;
        isCorrect: boolean;
        points: number;
        newScore: number;
      };

      // Update local player state with server-validated score
      if (answerData?.type === 'multi') {
        setPlayer(p => p ? { ...p, score: newScore, lastAnswerIndices: answerData.value as number[] } : null);
      } else if (answerData?.type === 'slider') {
        setPlayer(p => p ? { ...p, score: newScore, lastSliderValue: answerData.value as number } : null);
      } else {
        const selectedIndex = isTimeout ? -1 : (answerData?.value as number);
        setPlayer(p => p ? { ...p, score: newScore, lastAnswerIndex: selectedIndex } : null);
      }

      // Update last answer for result display
      if (question && question.type === 'multiple-choice') {
        const selectedIndex = answerData?.type === 'single' ? (answerData.value as number) : -1;
        setLastAnswer({
          selected: selectedIndex,
          correct: question.correctAnswerIndices,
          points,
          wasTimeout: isTimeout
        });
      } else if (question && question.type === 'slider') {
        setLastAnswer({
          selected: isCorrect ? 1 : 0,
          correct: [1],
          points,
          wasTimeout: isTimeout
        });
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);

      // For timeouts, don't show error toasts or reset state
      if (!isTimeout) {
        // Handle specific error cases for normal answers
        if (error.code === 'functions/failed-precondition') {
          toast({
            variant: 'destructive',
            title: 'Already Answered',
            description: error.message
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to submit answer. Please try again.'
          });
        }

        // Reset UI state on error (only for normal answers, not timeouts)
        setAnswerSelected(null);
        setState('question');
      }
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

        // Render slider question
        if (question.type === 'slider') {
          return (
            <div className="w-full h-full flex flex-col">
              <header className="p-4 flex items-center justify-center">
                <p className="text-2xl font-bold text-center">{question.text}</p>
              </header>
              <div className="flex-grow flex items-center justify-center w-full relative">
                <Progress value={(time / timeLimit) * 100} className="absolute top-0 left-0 w-full h-2 rounded-none" />
                <div className="absolute top-4 right-4 text-2xl font-bold bg-background/80 px-4 py-2 rounded-lg">{time}</div>
                <div className="w-full max-w-2xl px-8 space-y-8">
                  <div className="text-center">
                    <p className="text-6xl font-bold text-primary mb-4">
                      {sliderValue.toFixed(question.step && question.step < 1 ? Math.abs(Math.log10(question.step)) : 0)}
                      {question.unit && <span className="text-4xl ml-2 text-muted-foreground">{question.unit}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Range: {question.minValue}{question.unit} - {question.maxValue}{question.unit}
                    </p>
                  </div>
                  <Slider
                    value={[sliderValue]}
                    onValueChange={(val) => setSliderValue(val[0])}
                    min={question.minValue}
                    max={question.maxValue}
                    step={question.step || 1}
                    disabled={answerSelected !== null}
                    className="w-full"
                  />
                  <Button
                    onClick={() => handleAnswer({ type: 'slider', value: sliderValue })}
                    disabled={answerSelected !== null}
                    size="lg"
                    className="w-full text-xl py-8"
                  >
                    {answerSelected !== null ? 'Answer Submitted' : 'Submit Answer'}
                  </Button>
                </div>
              </div>
              <footer className="p-4 text-center">
                <p>Question {game.currentQuestionIndex + 1} of {quiz.questions.length}</p>
              </footer>
            </div>
          );
        }

        // Render multi-select question
        if (question.type === 'multiple-choice' && question.allowMultipleAnswers) {
          return (
            <div className="w-full h-full flex flex-col">
              <header className="p-4 flex items-center justify-center flex-col gap-2">
                <p className="text-2xl font-bold text-center">{question.text}</p>
                {question.showAnswerCount !== false && (
                  <p className="text-sm text-muted-foreground">
                    Select {question.correctAnswerIndices.length} answer{question.correctAnswerIndices.length > 1 ? 's' : ''}
                  </p>
                )}
              </header>
              <div className="flex-grow flex items-center justify-center w-full relative">
                <Progress value={(time / timeLimit) * 100} className="absolute top-0 left-0 w-full h-2 rounded-none" />
                <div className="absolute top-4 right-4 text-2xl font-bold bg-background/80 px-4 py-2 rounded-lg">{time}</div>
                <div className="w-full h-full flex flex-col p-4 gap-4">
                  <div className={cn("grid gap-4 flex-1", question.answers.length > 4 ? "grid-cols-2" : "grid-cols-2")}>
                    {question.answers.map((ans, i) => {
                      const Icon = answerIcons[i % answerIcons.length];
                      const isSelected = selectedAnswerIndices.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (answerSelected !== null) return;
                            setSelectedAnswerIndices(prev =>
                              prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
                            );
                          }}
                          disabled={answerSelected !== null}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-lg text-white transition-all duration-300 p-4 relative',
                            answerColors[i % answerColors.length],
                            isSelected ? 'scale-105 border-4 border-white' : '',
                            answerSelected !== null && !isSelected ? 'opacity-25' : ''
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            className="absolute top-2 right-2 h-6 w-6 border-2 border-white data-[state=checked]:bg-white data-[state=checked]:text-primary"
                            disabled={answerSelected !== null}
                          />
                          <Icon className="w-16 h-16 md:w-20 md:h-20 mb-2" />
                          <span className="text-lg md:text-xl font-bold">{ans.text}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => handleAnswer({ type: 'multi', value: selectedAnswerIndices })}
                    disabled={answerSelected !== null || selectedAnswerIndices.length === 0}
                    size="lg"
                    className="w-full text-xl py-6"
                  >
                    {answerSelected !== null ? 'Answers Submitted' : `Submit ${selectedAnswerIndices.length} Answer${selectedAnswerIndices.length !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
              <footer className="p-4 text-center">
                <p>Question {game.currentQuestionIndex + 1} of {quiz.questions.length}</p>
              </footer>
            </div>
          );
        }

        // Render single-select question (default)
        return (
          <div className="w-full h-full flex flex-col">
            <header className="p-4 flex items-center justify-center">
              <p className="text-2xl font-bold text-center">{question.text}</p>
            </header>
            <div className="flex-grow flex items-center justify-center w-full relative">
              <Progress value={(time / timeLimit) * 100} className="absolute top-0 left-0 w-full h-2 rounded-none" />
              <div className="absolute top-4 right-4 text-2xl font-bold bg-background/80 px-4 py-2 rounded-lg">{time}</div>
              <div className={cn("grid gap-4 w-full h-full p-4", question.answers.length > 4 ? "grid-cols-2 grid-rows-4" : "grid-cols-2 grid-rows-2")}>
                {question.answers.map((ans, i) => {
                  const Icon = answerIcons[i % answerIcons.length];
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer({ type: 'single', value: i })}
                      disabled={answerSelected !== null}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg text-white transition-all duration-300 transform hover:scale-105 p-4',
                        answerColors[i % answerColors.length],
                         answerSelected !== null && answerSelected !== i ? 'opacity-25' : '',
                         answerSelected !== null && answerSelected === i ? 'scale-110 border-4 border-white' : ''
                      )}
                    >
                      <Icon className="w-16 h-16 md:w-24 md:h-24 mb-2" />
                      <span className="text-xl md:text-2xl font-bold">{ans.text}</span>
                    </button>
                  );
                })}
              </div>
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

        let bgColor = 'bg-red-500';
        let icon = <Frown className="w-24 h-24 mb-4" />;
        let message = 'Incorrect';

        if (isCorrect) {
          bgColor = 'bg-green-500';
          icon = <PartyPopper className="w-24 h-24 mb-4" />;
          message = 'Correct!';
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
