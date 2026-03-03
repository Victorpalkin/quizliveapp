
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
import { Loader2, XCircle, LogIn } from 'lucide-react';
import { CompletedActivityCard } from './components/completed-activity-card';
import { ContentList } from './components/content-list';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { useHostDashboard } from './hooks/use-host-dashboard';
import type { Quiz, Game, PollActivity } from '@/lib/types';
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

  // State for preview dialogs
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [previewPoll, setPreviewPoll] = useState<PollActivity | null>(null);

  if (userLoading || !user) {
    return <FullPageLoader />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-7xl">

        {/* Host Reconnection Banner */}
        <HostReconnectBanner />

        {/* Active Games Section */}
        {activeGames && activeGames.length > 0 && (
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-3xl font-semibold">Active Games</h2>
                    <span className="px-2.5 py-0.5 text-sm font-medium bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                        {activeGames.length} live
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesLoading ? (
                        <Card><CardContent className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent></Card>
                    ) : (
                        activeGames.map(game => (
                            <Card key={game.id} variant="interactive" className="flex flex-col">
                                <CardHeader className="p-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <CardTitle className="text-2xl font-semibold font-mono tracking-widest">{game.gamePin}</CardTitle>
                                        <GameStateBadge state={game.state} />
                                    </div>
                                    <CardDescription className="text-base">
                                        {quizzes?.find(q => q.id === game.quizId)?.title || '...'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-end gap-3 p-6 pt-0">
                                    <Button
                                        variant="gradient"
                                        size="xl"
                                        className="w-full"
                                        onClick={() => handleOpenGame(game)}
                                    >
                                        <LogIn className="mr-2 h-4 w-4" /> Open Game
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="xl" className="w-full" variant="outline">
                                                <XCircle className="mr-2 h-4 w-4" /> Cancel Game
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-2xl shadow-xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-2xl font-semibold">Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-base">
                                                    This will cancel the game for all players and cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-xl">Back</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteGame(game.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                                                    Yes, Cancel Game
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* My Content Section */}
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
          onDeletePresentation={handleDeletePresentation}
        />

        {/* Shared Content Section */}
        <SharedContent />

        {/* Completed Activities Section */}
        {completedGames && completedGames.length > 0 && (
            <div className="mb-12">
                <div className="border-t border-border pt-8 mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-semibold">Completed Activities</h2>
                        <span className="px-2.5 py-0.5 text-sm font-medium bg-muted text-muted-foreground rounded-full">
                            {completedGames.length}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesLoading ? (
                        <Card><CardContent className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent></Card>
                    ) : (
                        completedGames.map(game => (
                            <CompletedActivityCard
                                key={game.id}
                                game={game}
                                title={getGameTitle(game)}
                                onDelete={handleDeleteGame}
                                onHostAgain={game.quizId ? () => handleHostGame(game.quizId) : undefined}
                            />
                        ))
                    )}
                </div>
            </div>
        )}

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
    </div>
  );
}
