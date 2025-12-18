'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, setDoc, addDoc, serverTimestamp, getDocs, DocumentReference, Query } from 'firebase/firestore';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { nanoid } from 'nanoid';
import type { Game, Player, ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';
import { gameConverter, thoughtsGatheringActivityConverter, thoughtSubmissionConverter } from '@/firebase/converters';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, CheckCircle, Home, PauseCircle, MessageSquare } from 'lucide-react';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';

type PlayerState = 'joining' | 'submitting' | 'waiting' | 'viewing' | 'ended' | 'cancelled';

export default function ThoughtsGatheringPlayerPage() {
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
  const { data: game, loading: gameLoading } = useDoc(gameRef);

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

    // Handle game state changes
    switch (game.state) {
      case 'collecting':
        // Check if submissions are open
        if (game.submissionsOpen) {
          setState('submitting');
        } else {
          setState('waiting');
        }
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
      // Create player document
      const playerData: Omit<Player, 'id'> = {
        name: nickname.trim(),
        score: 0,
        answers: [],
        currentStreak: 0,
      };

      // Use setDoc with playerId as document ID to match Firestore rules
      await setDoc(doc(firestore, 'games', gameDocId, 'players', playerId), {
        id: playerId,
        ...playerData,
      });

      setPlayer({ id: playerId, ...playerData });

      // Immediately go to submitting or waiting based on game state
      if (game?.submissionsOpen) {
        setState('submitting');
      } else {
        setState('waiting');
      }
    } catch (error) {
      console.error('Error joining game:', error);
    } finally {
      setIsJoining(false);
    }
  };

  // Handle submitting interest
  const handleSubmitInterest = async () => {
    if (!gameDocId || !submissionText.trim() || !player) return;

    // Check max submissions
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

  // Render based on state
  const renderContent = () => {
    switch (state) {
      case 'joining':
        return (
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-white">
                <MessageSquare className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl">Join Thoughts Gathering</CardTitle>
              <CardDescription>Enter your name to participate</CardDescription>
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
                  placeholder="Your Name"
                  className="h-14 text-center text-xl"
                  maxLength={20}
                  minLength={2}
                  required
                  autoComplete="name"
                  autoCapitalize="words"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={isJoining || nickname.trim().length < 2}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-lg"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining...
                    </>
                  ) : (
                    'Join & Submit'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case 'submitting':
        const maxSubmissions = activity?.config.maxSubmissionsPerPlayer || 3;
        const remainingSubmissions = maxSubmissions - submissionCount;

        return (
          <div className="w-full max-w-md space-y-6">
            <Card className="shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Share Your Thoughts</CardTitle>
                <CardDescription className="text-lg">
                  {activity?.config.prompt || 'What topics are on your mind?'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Type your thoughts here..."
                  className="min-h-[100px] text-lg"
                  maxLength={1000}
                  disabled={remainingSubmissions <= 0}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {remainingSubmissions} submission{remainingSubmissions !== 1 ? 's' : ''} remaining
                  </span>
                  <Button
                    onClick={handleSubmitInterest}
                    disabled={isSubmitting || !submissionText.trim() || remainingSubmissions <= 0}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 active:scale-95 transition-transform"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Submit
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Previous submissions */}
            {playerSubmissions && playerSubmissions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Your Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {playerSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{sub.rawText}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'waiting':
        return (
          <Card className="w-full max-w-md text-center shadow-2xl">
            <CardContent className="p-8">
              <PauseCircle className="h-16 w-16 mx-auto mb-4 text-orange-500" />
              <h2 className="text-2xl font-bold mb-2">
                {game?.state === 'processing' ? 'Processing...' : 'Submissions Paused'}
              </h2>
              <p className="text-muted-foreground">
                {game?.state === 'processing'
                  ? 'AI is analyzing all submissions'
                  : 'The host will resume submissions soon'}
              </p>
              {playerSubmissions && playerSubmissions.length > 0 && (
                <div className="mt-6 text-left">
                  <p className="text-sm font-medium mb-2">Your submissions:</p>
                  <div className="space-y-2">
                    {playerSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{sub.rawText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'viewing':
        return (
          <div className="w-full max-w-2xl space-y-6">
            <Card className="shadow-2xl">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6">Grouped Submissions</h2>
                {topicCloud?.topics && topicCloud.topics.length > 0 ? (
                  <ThoughtsGroupedView
                    topics={topicCloud.topics}
                    submissions={allSubmissions || []}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Results will appear here...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'ended':
        return (
          <Card className="w-full max-w-md text-center shadow-2xl">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Thanks for participating, {player?.name}!
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

      case 'cancelled':
        return (
          <Card className="w-full max-w-md text-center shadow-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-2">Session Cancelled</h2>
              <p className="text-muted-foreground mb-6">
                The host has ended this session.
              </p>
              <Button onClick={() => router.push('/')} size="lg" className="w-full">
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
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <main className="w-full h-screen max-w-5xl mx-auto flex flex-col items-center justify-center p-4">
        {renderContent()}
      </main>
    </div>
  );
}
