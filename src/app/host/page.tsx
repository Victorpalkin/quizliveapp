
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { PlusCircle, Loader2, Gamepad2 } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import type { Quiz } from '@/lib/types';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function HostDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  
  const quizzesQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, 'quizzes'), where('hostId', '==', user.uid)) : null
  , [user, firestore]);

  const { data: quizzes, loading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

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
      state: 'lobby',
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


  if (userLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 md-p-8">
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
                            <CardTitle>{quiz.title}</CardTitle>
                            <CardDescription>{quiz.questions.length} questions</CardDescription>
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
        
      </main>
    </div>
  );
}
