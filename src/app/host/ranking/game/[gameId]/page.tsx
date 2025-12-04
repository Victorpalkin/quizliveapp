'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/app/header';
import { CopyButton } from '@/components/ui/copy-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Users,
  QrCode,
  Copy,
  Play,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  ChevronRight,
  XCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QRCodeSVG } from 'qrcode.react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentReference,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { saveHostSession, clearHostSession } from '@/lib/host-session';
import { rankingActivityConverter, rankingItemConverter, playerRatingsConverter, playerConverter } from '@/firebase/converters';
import type { Game, RankingActivity, RankingItem, PlayerRatings, RankingGameState, Player, RankingResults } from '@/lib/types';
import { RankingBarChart } from '@/components/app/ranking-bar-chart';
import { RankingHeatmap } from '@/components/app/ranking-heatmap';
import { RankingMatrix } from '@/components/app/ranking-matrix';
import { ConsensusList } from '@/components/app/consensus-indicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KeyboardShortcutsHint } from '@/components/app/game-header';

export default function RankingGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user, loading: userLoading } = useUser();

  const [joinUrl, setJoinUrl] = useState<string>('');
  const [newItemText, setNewItemText] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Game document
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId) as DocumentReference<Game>,
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

  // Players collection
  const playersQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'players').withConverter(playerConverter) : null,
    [firestore, gameId, game]
  );
  const { data: players, loading: playersLoading } = useCollection<Player>(playersQuery);

  // Items collection
  const itemsQuery = useMemoFirebase(
    () => game ? query(
      collection(firestore, 'games', gameId, 'items').withConverter(rankingItemConverter),
      orderBy('order', 'asc')
    ) : null,
    [firestore, gameId, game]
  );
  const { data: items, loading: itemsLoading } = useCollection(itemsQuery);

  // Ratings collection
  const ratingsQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'ratings').withConverter(playerRatingsConverter) : null,
    [firestore, gameId, game]
  );
  const { data: ratings, loading: ratingsLoading } = useCollection(ratingsQuery);

  // Ranking results aggregate (only when in results state)
  const resultsRef = useMemoFirebase(
    () => game?.state === 'results'
      ? doc(firestore, 'games', gameId, 'aggregates', 'rankings') as DocumentReference<RankingResults>
      : null,
    [firestore, gameId, game?.state]
  );
  const { data: rankingResults, loading: resultsLoading } = useDoc(resultsRef);

  // Set join URL
  useEffect(() => {
    if (game?.gamePin) {
      setJoinUrl(`${window.location.origin}/play/ranking/${game.gamePin}`);
    }
  }, [game?.gamePin]);

  // Save host session
  useEffect(() => {
    if (game && activity && user && game.state !== 'ended') {
      saveHostSession(
        gameId,
        game.gamePin,
        game.activityId || '',
        activity.title,
        user.uid,
        'ranking',
        game.state
      );
    }
  }, [gameId, game, activity, user]);

  // Clear session when game ends
  useEffect(() => {
    if (game?.state === 'ended') {
      clearHostSession();
    }
  }, [game?.state]);

  const handleAddItem = async () => {
    if (!newItemText.trim() || !game) return;

    setIsAddingItem(true);
    try {
      const itemData: Omit<RankingItem, 'id'> = {
        text: newItemText.trim(),
        description: newItemDescription.trim() || undefined,
        isHostItem: true,
        approved: true,
        order: (items?.length || 0) + 1,
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(firestore, 'games', gameId, 'items').withConverter(rankingItemConverter),
        itemData as RankingItem
      );

      setNewItemText('');
      setNewItemDescription('');
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not add item. Please try again.",
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(firestore, 'games', gameId, 'items', itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete item.",
      });
    }
  };

  const handleApproveItem = async (itemId: string, approved: boolean) => {
    try {
      await updateDoc(doc(firestore, 'games', gameId, 'items', itemId), { approved });
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleStartRanking = async () => {
    if (!game || !items || items.length === 0) {
      toast({
        variant: "destructive",
        title: "No items to rank",
        description: "Please add at least one item before starting.",
      });
      return;
    }

    setIsTransitioning(true);
    try {
      await updateDoc(gameRef, {
        state: 'ranking' as RankingGameState,
        itemSubmissionsOpen: false,
      });
    } catch (error) {
      console.error('Error starting ranking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start ranking phase.",
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleEndRanking = async () => {
    if (!game) return;

    setIsTransitioning(true);
    try {
      // Update state to analyzing first
      await updateDoc(gameRef, {
        state: 'analyzing' as RankingGameState,
      });

      // Call Cloud Function to compute results
      const computeRankingResults = httpsCallable<
        { gameId: string },
        { success: boolean; message: string }
      >(functions, 'computeRankingResults');

      const result = await computeRankingResults({ gameId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to compute results');
      }

      // The Cloud Function updates the state to 'results' on success
      setIsTransitioning(false);
    } catch (error) {
      console.error('Error ending ranking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not compute ranking results. Please try again.",
      });
      // Revert state on error
      await updateDoc(gameRef, {
        state: 'ranking' as RankingGameState,
      });
      setIsTransitioning(false);
    }
  };

  const handleEndSession = async () => {
    if (!game) return;

    try {
      await updateDoc(gameRef, {
        state: 'ended' as RankingGameState,
      });
      clearHostSession();
      router.push('/host');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleCancelGame = async () => {
    if (!game) return;
    clearHostSession();
    try {
      await deleteDoc(gameRef);
      router.push('/host');
    } catch (error) {
      console.error('Error canceling game:', error);
    }
  };

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (game?.state === 'collecting' && items && items.filter(i => i.approved).length > 0 && !isTransitioning) {
        handleStartRanking();
      } else if (game?.state === 'ranking' && !isTransitioning) {
        handleEndRanking();
      } else if (game?.state === 'results') {
        handleEndSession();
      }
    }
  }, [game?.state, items, isTransitioning]);

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (userLoading || gameLoading || activityLoading) {
    return <FullPageLoader />;
  }

  if (!game || !activity) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Card className="text-center p-8">
            <CardTitle className="text-2xl mb-4">Session Not Found</CardTitle>
            <CardDescription className="mb-6">
              This session may have ended or been deleted.
            </CardDescription>
            <Button onClick={() => router.push('/host')}>Back to Dashboard</Button>
          </Card>
        </main>
      </div>
    );
  }

  const approvedItems = items?.filter(i => i.approved) || [];
  const pendingItems = items?.filter(i => !i.approved && !i.isHostItem) || [];
  const ratingsCount = ratings?.length || 0;
  const playersCount = players?.length || 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Title & State Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="text-2xl font-bold">{activity.title}</h1>
                <p className="text-muted-foreground">Ranking Session</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {game.state === 'collecting' && 'Collecting Items'}
              {game.state === 'ranking' && 'Ranking in Progress'}
              {game.state === 'analyzing' && 'Analyzing Results'}
              {game.state === 'results' && 'Results Ready'}
              {game.state === 'ended' && 'Session Ended'}
            </Badge>
          </div>

          {/* Join Bar */}
          <Card className="border border-card-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">PIN</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-mono font-bold tracking-widest">{game.gamePin}</span>
                    <CopyButton text={game.gamePin} />
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-border" />

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-semibold">{playersCount}</span>
                    <span className="text-muted-foreground">joined</span>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="end">
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-sm font-medium">Scan to join</p>
                        {joinUrl && (
                          <div className="bg-white p-3 rounded-lg">
                            <QRCodeSVG value={joinUrl} size={160} level="M" />
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(joinUrl)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collecting State */}
          {game.state === 'collecting' && (
            <>
              {/* Add Item Form */}
              <Card className="border border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle>Add Items to Rank</CardTitle>
                  <CardDescription>
                    Add items that participants will rate on your metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemText">Item Name *</Label>
                    <Input
                      id="itemText"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="e.g., Feature A, Project X"
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddItem()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemDesc">Description (optional)</Label>
                    <Textarea
                      id="itemDesc"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Additional context..."
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleAddItem}
                    disabled={!newItemText.trim() || isAddingItem}
                  >
                    {isAddingItem ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Item
                  </Button>
                </CardContent>
              </Card>

              {/* Items List */}
              <Card className="border border-card-border shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Items ({approvedItems.length})</CardTitle>
                      <CardDescription>Items that will be ranked</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {itemsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : approvedItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No items yet. Add items above to get started.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {approvedItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground font-mono text-sm">
                              {index + 1}.
                            </span>
                            <div>
                              <p className="font-medium">{item.text}</p>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              )}
                              {item.submittedBy && (
                                <p className="text-xs text-muted-foreground">
                                  Submitted by {item.submittedBy}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Submissions */}
              {activity.config.allowParticipantItems && pendingItems.length > 0 && (
                <Card className="border border-yellow-500/30 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Pending Submissions ({pendingItems.length})
                    </CardTitle>
                    <CardDescription>Review participant suggestions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pendingItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{item.text}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Submitted by {item.submittedBy}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveItem(item.id, true)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Start Ranking Button */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div>
                    <CardTitle className="text-xl mb-2">Ready to Start Ranking?</CardTitle>
                    <CardDescription>
                      {approvedItems.length} items • {playersCount} participants
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleStartRanking}
                    disabled={approvedItems.length === 0 || isTransitioning}
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
                  >
                    {isTransitioning ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5 mr-2" />
                    )}
                    Start Ranking
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Ranking State */}
          {game.state === 'ranking' && (
            <>
              <Card className="border border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle>Ranking in Progress</CardTitle>
                  <CardDescription>
                    Participants are rating items on your metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Responses</p>
                      <p className="text-3xl font-bold">
                        {ratingsCount} / {playersCount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Items to Rate</p>
                      <p className="text-3xl font-bold">{approvedItems.length}</p>
                    </div>
                  </div>

                  {/* Progress per participant (simplified) */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Participant Progress</p>
                    {players?.map((player) => {
                      const playerRating = ratings?.find(r => r.playerId === player.id);
                      const hasSubmitted = !!playerRating;
                      return (
                        <div key={player.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span>{player.name}</span>
                          {hasSubmitted ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div>
                    <CardTitle className="text-xl mb-2">End Ranking?</CardTitle>
                    <CardDescription>
                      This will calculate results based on current submissions
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleEndRanking}
                    disabled={isTransitioning}
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
                  >
                    {isTransitioning ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <ChevronRight className="h-5 w-5 mr-2" />
                    )}
                    End Ranking & Show Results
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Analyzing State */}
          {game.state === 'analyzing' && (
            <Card className="border border-card-border shadow-sm">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <CardTitle className="text-2xl mb-2">Analyzing Results</CardTitle>
                <CardDescription>
                  Computing aggregate rankings and consensus...
                </CardDescription>
              </CardContent>
            </Card>
          )}

          {/* Results State */}
          {game.state === 'results' && (
            <>
              <Card className="border border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    {rankingResults?.participantsWhoRated || ratingsCount} participants rated {rankingResults?.items.length || approvedItems.length} items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {resultsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : rankingResults?.items && rankingResults.items.length > 0 ? (
                    <Tabs defaultValue="ranking" className="w-full">
                      <TabsList className={`grid w-full mb-4 ${activity && activity.config.metrics.length >= 2 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        <TabsTrigger value="ranking">Ranking</TabsTrigger>
                        <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                        {activity && activity.config.metrics.length >= 2 && (
                          <TabsTrigger value="matrix">Matrix</TabsTrigger>
                        )}
                        <TabsTrigger value="consensus">Consensus</TabsTrigger>
                      </TabsList>

                      <TabsContent value="ranking" className="mt-0">
                        <RankingBarChart items={rankingResults.items} />
                      </TabsContent>

                      <TabsContent value="heatmap" className="mt-0">
                        {activity && (
                          <RankingHeatmap
                            items={rankingResults.items}
                            metrics={activity.config.metrics}
                          />
                        )}
                      </TabsContent>

                      {activity && activity.config.metrics.length >= 2 && (
                        <TabsContent value="matrix" className="mt-0">
                          <RankingMatrix
                            items={rankingResults.items}
                            metrics={activity.config.metrics}
                          />
                        </TabsContent>
                      )}

                      <TabsContent value="consensus" className="mt-0">
                        <ConsensusList items={rankingResults.items} />
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No results available yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleEndSession}
                size="lg"
                className="w-full"
              >
                End Session & Return to Dashboard
              </Button>
            </>
          )}

          {/* Keyboard Shortcuts Hint */}
          {game.state !== 'ended' && game.state !== 'analyzing' && (
            <KeyboardShortcutsHint
              shortcuts={
                game.state === 'collecting'
                  ? [{ key: 'Enter', action: 'Start Ranking' }]
                  : game.state === 'ranking'
                  ? [{ key: 'Enter', action: 'Show Results' }]
                  : game.state === 'results'
                  ? [{ key: 'Enter', action: 'End Session' }]
                  : []
              }
              className="justify-center"
            />
          )}

          {/* Cancel Game */}
          {game.state !== 'ended' && game.state !== 'results' && (
            <div className="pt-4 border-t border-border flex justify-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will end the session and remove all data. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelGame}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Cancel Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
