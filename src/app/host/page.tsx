
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { SharedContent } from '@/components/app/shared-content';
import { QuizShareManager } from '@/components/app/quiz-share-manager';
import { ContentShareManager } from '@/components/app/content-share-manager';
import { QuizPreview } from '@/components/app/quiz-preview';
import { PollPreview } from '@/components/app/poll-preview';
import { ImportDialog } from '@/components/app/import-dialog';
import { Loader2, XCircle, LogIn, Upload } from 'lucide-react';
import { CompletedActivityCard } from './components/completed-activity-card';
import { ContentList } from './components/content-list';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHostDashboard } from './hooks/use-host-dashboard';
import { ACTIVITY_CONFIG } from '@/lib/activity-config';
import { formatRelativeTime } from '@/lib/utils/format-date';
import type { Quiz, Game, PollActivity, ActivityType } from '@/lib/types';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HostReconnectBanner } from '@/components/app/host-reconnect-banner';

function GameStateBadge({ state }: { state: Game['state'] }) {
    let text;
    let className;
    switch (state) {
        case 'lobby':
            text = 'In Lobby';
            className = 'bg-blue-500/20 text-blue-400';
            break;
        case 'preparing':
        case 'question':
        case 'leaderboard':
            text = 'In Progress';
            className = 'bg-green-500/20 text-green-400';
            break;
        case 'ended':
            text = 'Finished';
            className = 'bg-gray-500/20 text-gray-400';
            break;
        default:
            text = 'Unknown';
            className = 'bg-muted text-muted-foreground';
    }
    return <div className={`px-2 py-1 text-xs font-medium rounded-md ${className}`}>{text}</div>;
}


export default function HostDashboardPage() {
  const {
    userLoading,
    quizzesLoading,
    activitiesLoading,
    gamesLoading,
    user,
    quizzes,
    activities,
    presentations,
    activeGames,
    completedGames,
    handleHostGame,
    handleDeleteQuiz,
    handleDeleteGame,
    handleDeleteAllActiveGames,
    handleOpenGame,
    handleHostActivity,
    handleDeleteActivity,
    handleHostPresentation,
    handleDeletePresentation,
    getGameTitle,
  } = useHostDashboard();

  // State for share dialogs
  const [shareDialogQuiz, setShareDialogQuiz] = useState<{ id: string; title: string } | null>(null);
  const [shareDialogPoll, setShareDialogPoll] = useState<{ id: string; title: string } | null>(null);
  const [shareDialogPresentation, setShareDialogPresentation] = useState<{ id: string; title: string } | null>(null);

  // State for preview dialogs
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [previewPoll, setPreviewPoll] = useState<PollActivity | null>(null);

  // State for import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  if (userLoading || !user) {
    return <FullPageLoader />;
  }

  const liveCount = activeGames?.length || 0;
  const historyCount = completedGames?.length || 0;

  return (
    <Tabs defaultValue="templates" className="flex min-h-screen flex-col bg-background">
      <Header>
        <TabsList className="h-auto bg-transparent p-0 gap-1">
          <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent px-3 py-3.5 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
            Activity Templates
          </TabsTrigger>
          <TabsTrigger value="live" className="rounded-none border-b-2 border-transparent px-3 py-3.5 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
            Live Sessions
            {liveCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                {liveCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent px-3 py-3.5 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
            Session History
            {historyCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                {historyCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared" className="rounded-none border-b-2 border-transparent px-3 py-3.5 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
            Shared With Me
          </TabsTrigger>
        </TabsList>
      </Header>
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">

        {/* Host Reconnection Banner */}
        <HostReconnectBanner />

          {/* Activity Templates Tab */}
          <TabsContent value="templates">
            <ContentList
              quizzes={quizzes || null}
              activities={activities}
              presentations={presentations || null}
              quizzesLoading={quizzesLoading}
              activitiesLoading={activitiesLoading}
              onHostGame={handleHostGame}
              onPreviewQuiz={setPreviewQuiz}
              onShareQuiz={setShareDialogQuiz}
              onDeleteQuiz={handleDeleteQuiz}
              onHostActivity={handleHostActivity}
              onPreviewPoll={setPreviewPoll}
              onSharePoll={setShareDialogPoll}
              onDeleteActivity={handleDeleteActivity}
              onHostPresentation={handleHostPresentation}
              onSharePresentation={setShareDialogPresentation}
              onDeletePresentation={handleDeletePresentation}
              onImport={() => setImportDialogOpen(true)}
            />
          </TabsContent>

          {/* Live Sessions Tab */}
          <TabsContent value="live">
            <div className="mb-12">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-semibold">Live Sessions</h2>
                  {liveCount > 0 && (
                    <span className="px-2.5 py-0.5 text-sm font-medium bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                      {liveCount} live
                    </span>
                  )}
                </div>
                {liveCount > 1 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <XCircle className="mr-2 h-4 w-4" />
                        Close All Sessions
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl shadow-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-semibold">Close all sessions?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                          This will end all {liveCount} active sessions. Players will be disconnected and this cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Back</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAllActiveGames}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        >
                          Yes, Close All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {gamesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="p-6">
                        <div className="h-6 bg-muted rounded-lg w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded-lg w-1/2 mt-2 animate-pulse"></div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                        <div className="h-10 bg-muted rounded-lg w-full animate-pulse"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : liveCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-muted-foreground">No live sessions right now. Start one from your Activity Templates.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeGames!.map(game => {
                    const gameTitle = getGameTitle(game);
                    const activityType = (game.activityType || 'quiz') as ActivityType;
                    const config = ACTIVITY_CONFIG[activityType] || ACTIVITY_CONFIG.quiz;
                    const Icon = config.icon;
                    const dateDisplay = formatRelativeTime(game.createdAt);

                    return (
                      <Card key={game.id} variant="interactive" className="flex flex-col">
                        <CardHeader className="p-6">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
                              <CardTitle className="text-lg font-semibold truncate">{gameTitle}</CardTitle>
                            </div>
                            <GameStateBadge state={game.state} />
                          </div>
                          <CardDescription className="text-sm flex items-center gap-1.5 flex-wrap mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}>
                              {config.label}
                            </span>
                            {dateDisplay && (
                              <>
                                <span className="text-muted-foreground">·</span>
                                <span>{dateDisplay}</span>
                              </>
                            )}
                            <span className="text-muted-foreground">·</span>
                            <span className="font-mono text-xs text-muted-foreground">PIN: {game.gamePin}</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-end gap-3 p-6 pt-0">
                          <Button
                            variant="gradient"
                            size="xl"
                            className="w-full"
                            onClick={() => handleOpenGame(game)}
                          >
                            <LogIn className="mr-2 h-4 w-4" /> Open Session
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="xl" className="w-full" variant="outline">
                                <XCircle className="mr-2 h-4 w-4" /> Cancel Session
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl shadow-xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-semibold">Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription className="text-base">
                                  This will cancel the session for all players and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Back</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteGame(game.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                                  Yes, Cancel Session
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Session History Tab */}
          <TabsContent value="history">
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-3xl font-semibold">Session History</h2>
                {historyCount > 0 && (
                  <span className="px-2.5 py-0.5 text-sm font-medium bg-muted text-muted-foreground rounded-full">
                    {historyCount}
                  </span>
                )}
              </div>

              {gamesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="p-6">
                        <div className="h-6 bg-muted rounded-lg w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded-lg w-1/2 mt-2 animate-pulse"></div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                        <div className="h-10 bg-muted rounded-lg w-full animate-pulse"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : historyCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-muted-foreground">No completed sessions yet. Sessions will appear here once they end.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedGames!.map(game => (
                    <CompletedActivityCard
                      key={game.id}
                      game={game}
                      title={getGameTitle(game)}
                      onDelete={handleDeleteGame}
                      onHostAgain={game.quizId ? () => handleHostGame(game.quizId) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Shared With Me Tab */}
          <TabsContent value="shared">
            <SharedContent />
          </TabsContent>

        {/* Share Quiz Dialog */}
        <Dialog open={!!shareDialogQuiz} onOpenChange={(open) => !open && setShareDialogQuiz(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Share Quiz</DialogTitle>
              <DialogDescription className="text-base">
                Share &quot;{shareDialogQuiz?.title}&quot; with other hosts by entering their email address
              </DialogDescription>
            </DialogHeader>
            {shareDialogQuiz && (
              <QuizShareManager
                quizId={shareDialogQuiz.id}
                quizTitle={shareDialogQuiz.title}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Share Poll Dialog */}
        <Dialog open={!!shareDialogPoll} onOpenChange={(open) => !open && setShareDialogPoll(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Share Poll</DialogTitle>
              <DialogDescription className="text-base">
                Share &quot;{shareDialogPoll?.title}&quot; with other hosts by entering their email address
              </DialogDescription>
            </DialogHeader>
            {shareDialogPoll && (
              <ContentShareManager
                contentId={shareDialogPoll.id}
                contentTitle={shareDialogPoll.title}
                contentType="poll"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Share Presentation Dialog */}
        <Dialog open={!!shareDialogPresentation} onOpenChange={(open) => !open && setShareDialogPresentation(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Share Presentation</DialogTitle>
              <DialogDescription className="text-base">
                Share &quot;{shareDialogPresentation?.title}&quot; with other hosts by entering their email address
              </DialogDescription>
            </DialogHeader>
            {shareDialogPresentation && (
              <ContentShareManager
                contentId={shareDialogPresentation.id}
                contentTitle={shareDialogPresentation.title}
                contentType="presentation"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

        {/* Preview Quiz Dialog */}
        <Dialog open={!!previewQuiz} onOpenChange={(open) => !open && setPreviewQuiz(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Quiz Preview</DialogTitle>
            </DialogHeader>
            {previewQuiz && <QuizPreview quiz={previewQuiz} showCorrectAnswers={true} />}
          </DialogContent>
        </Dialog>

        {/* Preview Poll Dialog */}
        <Dialog open={!!previewPoll} onOpenChange={(open) => !open && setPreviewPoll(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Poll Preview</DialogTitle>
            </DialogHeader>
            {previewPoll && <PollPreview poll={previewPoll} />}
          </DialogContent>
        </Dialog>

      </main>
    </Tabs>
  );
}
