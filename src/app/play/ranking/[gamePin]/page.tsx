'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Loader2,
  Send,
  Plus,
  Star,
  Check,
  ArrowUp,
  ArrowDown,
  Clock,
  Users,
} from 'lucide-react';
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
  serverTimestamp,
  Timestamp,
  DocumentReference,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { savePlayerSession, getPlayerSession, clearPlayerSession } from '@/lib/player-session';
import { rankingActivityConverter, rankingItemConverter, playerRatingsConverter } from '@/firebase/converters';
import type { Game, RankingActivity, RankingItem, RankingMetric, PlayerRatings, Player } from '@/lib/types';
import { nanoid } from 'nanoid';

type PlayerState = 'joining' | 'collecting' | 'rating' | 'waiting' | 'results' | 'ended';

export default function PlayerRankingPage() {
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
        // Verify player still exists in game
        const playerDoc = await getDocs(query(collection(firestore, 'games', game.id, 'players'), where('__name__', '==', session.playerId)));

        if (!playerDoc.empty) {
          setPlayerId(session.playerId);
          setPlayerName(session.nickname);

          // Determine state based on game state
          if (game.state === 'collecting') {
            setPlayerState('collecting');
          } else if (game.state === 'ranking') {
            // Check if already submitted ratings
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

      // No valid session, show join screen
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
      ? doc(firestore, 'activities', game.activityId).withConverter(rankingActivityConverter) as DocumentReference<RankingActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: activity, loading: activityLoading } = useDoc(activityRef);

  // Items collection
  const itemsQuery = useMemoFirebase(
    () => gameId ? query(
      collection(firestore, 'games', gameId, 'items').withConverter(rankingItemConverter),
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
    } else if (game.state === 'ranking' && (playerState === 'collecting' || playerState === 'joining')) {
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

      // Create player document
      await setDoc(doc(firestore, 'games', gameId, 'players', newPlayerId), {
        id: newPlayerId,  // Required by Firestore rules
        name: playerName.trim(),
        score: 0,
        answers: [],
        currentStreak: 0,
      });

      setPlayerId(newPlayerId);
      savePlayerSession(newPlayerId, gameId, gamePin, playerName.trim());

      // Determine initial state
      if (game?.state === 'collecting') {
        setPlayerState('collecting');
      } else if (game?.state === 'ranking') {
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
      const itemData: Omit<RankingItem, 'id'> = {
        text: newItemText.trim(),
        description: newItemDescription.trim() || undefined,
        submittedBy: playerName,
        submittedByPlayerId: playerId,
        isHostItem: false,
        approved: !activity.config.requireApproval, // Auto-approve if not required
        order: 999, // Will be reordered by host
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(firestore, 'games', gameId, 'items'),
        itemData
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
        isComplete: true, // We'll consider partial submissions as complete for now
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

  const approvedItems = items?.filter(i => i.approved) || [];
  const currentItem = approvedItems[currentItemIndex];
  const metrics = activity?.config.metrics || [];

  // Calculate progress
  const totalRatingsNeeded = approvedItems.length * metrics.length;
  const currentRatingsCount = Object.values(ratings).reduce(
    (acc, itemRatings) => acc + Object.keys(itemRatings).length,
    0
  );
  const progress = totalRatingsNeeded > 0 ? (currentRatingsCount / totalRatingsNeeded) * 100 : 0;

  if (initializing || gameLoading || activityLoading) {
    return <FullPageLoader />;
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle className="text-2xl mb-4">Session Not Found</CardTitle>
          <CardDescription>
            This session may have ended or the PIN is incorrect.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500/10 to-red-500/10 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            <span className="text-lg font-semibold">{activity?.title || 'Ranking'}</span>
          </div>
          {playerId && (
            <Badge variant="secondary">{playerName}</Badge>
          )}
        </div>

        {/* Joining State */}
        {playerState === 'joining' && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>Join Ranking Session</CardTitle>
              <CardDescription>PIN: {gamePin}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  autoFocus
                />
              </div>
              <Button
                onClick={handleJoin}
                disabled={!playerName.trim() || isJoining}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500"
              >
                {isJoining ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Join Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Collecting State */}
        {playerState === 'collecting' && activity && (
          <>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Waiting for Host
                </CardTitle>
                <CardDescription>
                  The host is setting up items to rank
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{players?.length || 0} participants joined</span>
                </div>
              </CardContent>
            </Card>

            {activity.config.allowParticipantItems && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Suggest Items</CardTitle>
                  <CardDescription>
                    {submittedItemCount} / {activity.config.maxItemsPerParticipant} submitted
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="e.g., Feature idea, Topic"
                      disabled={submittedItemCount >= activity.config.maxItemsPerParticipant}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Additional details..."
                      rows={2}
                      disabled={submittedItemCount >= activity.config.maxItemsPerParticipant}
                    />
                  </div>
                  <Button
                    onClick={handleSubmitItem}
                    disabled={
                      !newItemText.trim() ||
                      isSubmitting ||
                      submittedItemCount >= activity.config.maxItemsPerParticipant
                    }
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Submit Item
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Rating State */}
        {playerState === 'rating' && activity && !itemsLoading && (
          <>
            {/* Progress */}
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Item {currentItemIndex + 1} of {approvedItems.length}</span>
                  <span>{currentRatingsCount} / {totalRatingsNeeded} ratings</span>
                </div>
              </CardContent>
            </Card>

            {/* Current Item */}
            {currentItem && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">{currentItem.text}</CardTitle>
                  {currentItem.description && (
                    <CardDescription>{currentItem.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {metrics.map((metric) => (
                    <div key={metric.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1">
                          {metric.name}
                          {metric.lowerIsBetter ? (
                            <ArrowDown className="h-3 w-3 text-green-500" />
                          ) : (
                            <ArrowUp className="h-3 w-3 text-green-500" />
                          )}
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          {metric.lowerIsBetter ? 'Lower is better' : 'Higher is better'}
                        </span>
                      </div>
                      {metric.description && (
                        <p className="text-xs text-muted-foreground">{metric.description}</p>
                      )}

                      {/* Star Rating */}
                      {metric.scaleType === 'stars' && (
                        <div className="flex gap-1">
                          {Array.from({ length: metric.scaleMax - metric.scaleMin + 1 }).map((_, i) => {
                            const value = metric.scaleMin + i;
                            const isSelected = (ratings[currentItem.id]?.[metric.id] || 0) >= value;
                            return (
                              <button
                                key={value}
                                onClick={() => handleRateMetric(currentItem.id, metric.id, value)}
                                className="p-1 transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`h-8 w-8 ${
                                    isSelected
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Numeric Rating */}
                      {metric.scaleType === 'numeric' && (
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: metric.scaleMax - metric.scaleMin + 1 }).map((_, i) => {
                            const value = metric.scaleMin + i;
                            const isSelected = ratings[currentItem.id]?.[metric.id] === value;
                            return (
                              <button
                                key={value}
                                onClick={() => handleRateMetric(currentItem.id, metric.id, value)}
                                className={`w-10 h-10 rounded-full border-2 font-medium transition-all ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-muted-foreground/30 hover:border-primary'
                                }`}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Label Rating */}
                      {metric.scaleType === 'labels' && metric.scaleLabels && (
                        <div className="flex flex-wrap gap-2">
                          {metric.scaleLabels.map((label, i) => {
                            const value = i + 1;
                            const isSelected = ratings[currentItem.id]?.[metric.id] === value;
                            return (
                              <button
                                key={value}
                                onClick={() => handleRateMetric(currentItem.id, metric.id, value)}
                                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-muted-foreground/30 hover:border-primary'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Navigation */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                      disabled={currentItemIndex === 0}
                      className="flex-1"
                    >
                      Previous
                    </Button>
                    {currentItemIndex < approvedItems.length - 1 ? (
                      <Button
                        onClick={() => setCurrentItemIndex(currentItemIndex + 1)}
                        className="flex-1"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitRatings}
                        disabled={isSubmitting || currentRatingsCount === 0}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit Ratings
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Item Navigation Dots */}
            <div className="flex justify-center gap-1">
              {approvedItems.map((item, index) => {
                const hasRatings = Object.keys(ratings[item.id] || {}).length > 0;
                const isComplete = Object.keys(ratings[item.id] || {}).length === metrics.length;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentItemIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentItemIndex
                        ? 'bg-primary scale-125'
                        : isComplete
                        ? 'bg-green-500'
                        : hasRatings
                        ? 'bg-yellow-500'
                        : 'bg-muted-foreground/30'
                    }`}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Waiting State */}
        {playerState === 'waiting' && (
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <Check className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <CardTitle className="text-2xl mb-2">Ratings Submitted!</CardTitle>
              <CardDescription>
                Waiting for host to reveal results...
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Results State */}
        {playerState === 'results' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-center">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground mb-4">
                Check the main screen for detailed results!
              </p>
              {/* Simple list of items */}
              <div className="space-y-2">
                {approvedItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="text-xl font-bold text-primary">#{index + 1}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ended State */}
        {playerState === 'ended' && (
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-2xl mb-2">Session Ended</CardTitle>
              <CardDescription>
                Thank you for participating!
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
