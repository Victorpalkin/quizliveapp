'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, setDoc, updateDoc, getDocs, DocumentReference, arrayUnion, Timestamp } from 'firebase/firestore';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { nanoid } from 'nanoid';
import type { Game, Player, PollActivity, PollQuestion, PlayerAnswer } from '@/lib/types';
import { gameConverter, pollActivityConverter } from '@/firebase/converters';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, CheckCircle, Home, Vote, Clock } from 'lucide-react';
import { FullPageLoader } from '@/components/ui/full-page-loader';

type PlayerState = 'joining' | 'lobby' | 'answering' | 'waiting' | 'results' | 'ended';

export default function PollPlayerPage() {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Answer state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  // Track current question
  const lastQuestionIndexRef = useRef<number>(-1);

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

  // Keep awake
  const shouldKeepAwake = ['answering', 'waiting', 'results'].includes(state);
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

    // Detect new question
    if (game.currentQuestionIndex !== lastQuestionIndexRef.current) {
      lastQuestionIndexRef.current = game.currentQuestionIndex;
      // Reset answer state for new question
      setSelectedIndex(null);
      setSelectedIndices([]);
      setTextAnswer('');
      setHasAnswered(false);
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
        break;
    }
  }, [game?.state, game?.currentQuestionIndex, player, hasAnswered]);

  // Handle joining
  const handleJoinGame = async () => {
    if (!gameDocId) return;

    // For anonymous polls, name can be empty
    const playerName = nickname.trim() || 'Anonymous';

    setIsJoining(true);

    try {
      const playerData: Omit<Player, 'id'> = {
        name: playerName,
        score: 0,
        answers: [],
        currentStreak: 0,
      };

      await setDoc(doc(firestore, 'games', gameDocId, 'players', playerId), {
        id: playerId,
        ...playerData,
      });

      setPlayer({ id: playerId, ...playerData });
      setState('lobby');
    } catch (error) {
      console.error('Error joining game:', error);
    } finally {
      setIsJoining(false);
    }
  };

  // Handle submitting answer
  const handleSubmitAnswer = async () => {
    if (!gameDocId || !player || !game || !poll) return;

    const currentQuestion = poll.questions[game.currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSubmitting(true);

    try {
      const answer: PlayerAnswer = {
        questionIndex: game.currentQuestionIndex,
        questionType: currentQuestion.type,
        timestamp: Timestamp.now(),
        points: 0,
        isCorrect: false,
        wasTimeout: false,
      };

      if (currentQuestion.type === 'poll-single' && selectedIndex !== null) {
        answer.answerIndex = selectedIndex;
      } else if (currentQuestion.type === 'poll-multiple' && selectedIndices.length > 0) {
        answer.answerIndices = selectedIndices;
      } else if (currentQuestion.type === 'poll-free-text' && textAnswer.trim()) {
        answer.textAnswer = textAnswer.trim();
      } else {
        setIsSubmitting(false);
        return;
      }

      // Update player document with answer
      await updateDoc(doc(firestore, 'games', gameDocId, 'players', playerId), {
        answers: arrayUnion(answer),
      });

      setHasAnswered(true);
      setState('waiting');
    } catch (error) {
      console.error('Error submitting answer:', error);
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

  // Render content based on state
  const renderContent = () => {
    switch (state) {
      case 'joining':
        const allowAnonymous = poll?.config.allowAnonymous ?? false;

        return (
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500 text-white">
                <Vote className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl">Join Poll</CardTitle>
              <CardDescription>
                {allowAnonymous
                  ? 'Enter your name (optional for anonymous response)'
                  : 'Enter your name to participate'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoinGame();
                }}
                className="space-y-6"
              >
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={allowAnonymous ? "Your Name (optional)" : "Your Name"}
                  className="h-14 text-center text-xl"
                  maxLength={20}
                  minLength={allowAnonymous ? 0 : 2}
                  required={!allowAnonymous}
                  autoComplete="name"
                  autoCapitalize="words"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={isJoining || (!allowAnonymous && nickname.trim().length < 2)}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-lg"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining...
                    </>
                  ) : (
                    'Join Poll'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case 'lobby':
        return (
          <Card className="w-full max-w-md text-center shadow-2xl">
            <CardContent className="p-8">
              <Vote className="h-16 w-16 mx-auto mb-4 text-teal-500" />
              <h2 className="text-2xl font-bold mb-2">You&apos;re In!</h2>
              <p className="text-muted-foreground mb-4">
                Welcome, {player?.name || 'Anonymous'}!
              </p>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5 animate-pulse" />
                <span>Waiting for the poll to start...</span>
              </div>
            </CardContent>
          </Card>
        );

      case 'answering':
        if (!poll || !game) return <FullPageLoader />;

        const currentQuestion = poll.questions[game.currentQuestionIndex];
        if (!currentQuestion) return <FullPageLoader />;

        return (
          <div className="w-full max-w-lg space-y-6">
            <Card className="shadow-2xl">
              <CardHeader className="text-center">
                <div className="text-sm text-muted-foreground mb-2">
                  Question {game.currentQuestionIndex + 1} of {poll.questions.length}
                </div>
                <CardTitle className="text-2xl">{currentQuestion.text}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQuestion.type === 'poll-single' && 'answers' in currentQuestion && (
                  <div className="space-y-3">
                    {currentQuestion.answers.map((answer, index) => (
                      <Button
                        key={index}
                        variant={selectedIndex === index ? "default" : "outline"}
                        className={`w-full py-6 text-left justify-start text-lg ${
                          selectedIndex === index ? 'bg-teal-500 hover:bg-teal-600' : ''
                        }`}
                        onClick={() => setSelectedIndex(index)}
                      >
                        <span className="w-8 h-8 flex items-center justify-center bg-muted rounded-full mr-3 text-sm font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {answer.text}
                      </Button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'poll-multiple' && 'answers' in currentQuestion && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground text-center">Select all that apply</p>
                    {currentQuestion.answers.map((answer, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedIndices.includes(index)
                            ? 'border-teal-500 bg-teal-500/10'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                        onClick={() => toggleMultipleChoice(index)}
                      >
                        <Checkbox
                          checked={selectedIndices.includes(index)}
                          onCheckedChange={() => toggleMultipleChoice(index)}
                        />
                        <span className="text-lg">{answer.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'poll-free-text' && (
                  <div className="space-y-3">
                    <Textarea
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder={currentQuestion.placeholder || 'Share your thoughts...'}
                      className="min-h-[150px] text-lg"
                      maxLength={currentQuestion.maxLength || 500}
                    />
                    <div className="text-right text-sm text-muted-foreground">
                      {textAnswer.length}/{currentQuestion.maxLength || 500}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmitAnswer}
                  disabled={isSubmitting || !isAnswerValid()}
                  className="w-full py-6 text-lg bg-gradient-to-r from-teal-500 to-cyan-500"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" /> Submit
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'waiting':
        return (
          <Card className="w-full max-w-md text-center shadow-2xl">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-bold mb-2">Response Submitted!</h2>
              <p className="text-muted-foreground">
                Waiting for others to respond...
              </p>
            </CardContent>
          </Card>
        );

      case 'results':
        return (
          <Card className="w-full max-w-md text-center shadow-2xl">
            <CardContent className="p-8">
              <Vote className="h-16 w-16 mx-auto mb-4 text-teal-500" />
              <h2 className="text-2xl font-bold mb-2">Results Are In!</h2>
              <p className="text-muted-foreground">
                The host is reviewing the results...
              </p>
            </CardContent>
          </Card>
        );

      case 'ended':
        return (
          <Card className="w-full max-w-md text-center shadow-2xl">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-bold mb-2">Poll Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Thanks for participating, {player?.name || 'Anonymous'}!
              </p>
              <Button
                onClick={() => router.push('/')}
                size="lg"
                className="w-full"
              >
                <Home className="mr-2 h-5 w-5" /> Return Home
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return <FullPageLoader />;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <main className="w-full h-screen max-w-5xl mx-auto flex flex-col items-center justify-center p-4">
        {renderContent()}
      </main>
    </div>
  );
}
