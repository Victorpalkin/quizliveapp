
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { PlusCircle, Loader2, Gamepad2, Trash2, XCircle, LogIn, Eye, Edit } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc, deleteDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, Game } from '@/lib/types';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
} from "@/components/ui/alert-dialog"

function GameStateBadge({ state }: { state: Game['state'] }) {
    let text;
    let className;
    switch (state) {
        case 'lobby':
            text = 'In Lobby';
            className = 'bg-blue-500/20 text-blue-400';
            break;
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
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  
  const quizzesQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, 'quizzes'), where('hostId', '==', user.uid)) : null
  , [user, firestore]);

  const { data: quizzes, loading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);
  
  const gamesQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, 'games'), where('hostId', '==', user.uid)) : null
    , [user, firestore]);

  const { data: games, loading: gamesLoading } = useCollection<Game>(gamesQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleHostGame = async (quizId: string) => {
    if (!user) return;

    const gameData = {
      quizId: quizId,
      hostId: user.uid,
      state: 'lobby' as const,
      currentQuestionIndex: 0,
      gamePin: nanoid(6).toUpperCase(),
      createdAt: serverTimestamp(),
    };

    addDoc(collection(firestore, 'games'), gameData)
        .then((gameDoc) => {
            toast({
                title: 'Game Created!',
                description: 'Your game lobby is now open.',
            });
            router.push(`/host/lobby/${gameDoc.id}`);
        })
        .catch((error) => {
            console.error("Error creating game: ", error);
            const permissionError = new FirestorePermissionError({
              path: '/games',
              operation: 'create',
              requestResourceData: gameData
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not create the game. Please try again.",
            });
        });
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (!firestore) return;
    const quizRef = doc(firestore, 'quizzes', quizId);
    deleteDoc(quizRef)
      .then(() => {
        toast({
          title: 'Quiz Deleted',
          description: 'The quiz has been successfully removed.',
        });
      })
      .catch((error) => {
        console.error("Error deleting quiz:", error);
        const permissionError = new FirestorePermissionError({
            path: quizRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete the quiz. Please try again.",
        });
      });
  };

  const handleDeleteGame = (gameId: string) => {
    if (!firestore) return;
    const gameRef = doc(firestore, 'games', gameId);
    deleteDoc(gameRef)
      .then(() => {
        toast({
          title: 'Game Record Deleted',
          description: 'The game has been removed from your history.',
        });
      })
      .catch((error) => {
        console.error("Error deleting game:", error);
        const permissionError = new FirestorePermissionError({
            path: gameRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete the game. Please try again.",
        });
      });
  }

  const handleOpenGame = (game: Game) => {
    if (game.state === 'lobby') {
        router.push(`/host/lobby/${game.id}`);
    } else {
        router.push(`/host/game/${game.id}`);
    }
  }


  if (userLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const activeGames = games?.filter(g => g.state !== 'ended');
  const completedGames = games?.filter(g => g.state === 'ended');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        
        {/* Active Games Section */}
        {activeGames && activeGames.length > 0 && (
            <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Active Games</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesLoading ? (
                        <Card><CardContent><Loader2 className="m-4 animate-spin"/></CardContent></Card>
                    ) : (
                        activeGames.map(game => (
                            <Card key={game.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="font-mono tracking-widest">{game.gamePin}</CardTitle>
                                        <GameStateBadge state={game.state} />
                                    </div>
                                    <CardDescription>
                                        {quizzes?.find(q => q.id === game.quizId)?.title || '...'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-end gap-2">
                                    <Button className="w-full" onClick={() => handleOpenGame(game)}>
                                        <LogIn className="mr-2 h-4 w-4" /> Open Game
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full" variant="destructive">
                                                <XCircle className="mr-2 h-4 w-4" /> Cancel Game
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will cancel the game for all players and cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Back</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteGame(game.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

        {/* My Quizzes Section */}
        <div className="mb-12">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Quizzes</h1>
                <Button asChild>
                    <Link href="/host/create">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Quiz
                    </Link>
                </Button>
            </div>

            {quizzesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <div className="h-6 bg-muted rounded w-3/4"></div>
                                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-10 bg-muted rounded w-full"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes && quizzes.map(quiz => (
                        <Card key={quiz.id} className="flex flex-col">
                            <CardHeader>
                                <div className='flex-grow'>
                                    <CardTitle>{quiz.title}</CardTitle>
                                    <CardDescription>{quiz.questions.length} questions</CardDescription>
                                </div>
                                <div className='flex items-center gap-1'>
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={`/host/edit/${quiz.id}`}>
                                            <Edit className="h-4 w-4 text-muted-foreground" />
                                        </Link>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure you want to delete this quiz?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the quiz '{quiz.title}'.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteQuiz(quiz.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-end">
                                <Button className="w-full" onClick={() => handleHostGame(quiz.id)}>
                                <Gamepad2 className="mr-2 h-4 w-4" /> Host Game
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    {quizzes?.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-16">
                            <p className="mb-4">You haven't created any quizzes yet.</p>
                            <Button asChild variant="outline">
                                <Link href="/host/create">
                                    Create Your First Quiz
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* Completed Games Section */}
        {completedGames && completedGames.length > 0 && (
            <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Completed Games</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gamesLoading ? (
                        <Card><CardContent><Loader2 className="m-4 animate-spin"/></CardContent></Card>
                    ) : (
                        completedGames.map(game => (
                            <Card key={game.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="font-mono tracking-widest">{game.gamePin}</CardTitle>
                                        <GameStateBadge state={game.state} />
                                    </div>
                                    <CardDescription>
                                        {quizzes?.find(q => q.id === game.quizId)?.title || '...'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-end gap-2">
                                    <Button className="w-full" variant="secondary" onClick={() => handleOpenGame(game)}>
                                        <Eye className="mr-2 h-4 w-4" /> View Results
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full" variant="ghost">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this game record?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the record for game '{game.gamePin}'.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Back</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteGame(game.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    Yes, Delete
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
      </main>
    </div>
  );
}
