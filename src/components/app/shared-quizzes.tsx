'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Copy, Trash2, Loader2, Play } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useSharedQuizzes } from '@/firebase/firestore/use-shared-quizzes';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { QuizShare, Quiz } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
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

export function SharedQuizzes() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [copying, setCopying] = useState<string | null>(null);
  const [hosting, setHosting] = useState<string | null>(null);

  const { shares: initialShares, loading } = useSharedQuizzes();
  const [shares, setShares] = useState(initialShares);

  // Update local shares when hook data changes
  useEffect(() => {
    setShares(initialShares);
  }, [initialShares]);

  const handleCopyQuiz = async (share: QuizShare) => {
    if (!user) return;

    setCopying(share.id);
    try {
      // Fetch the original quiz
      const quizDoc = await getDoc(doc(firestore, 'quizzes', share.quizId));
      if (!quizDoc.exists()) {
        throw new Error('Quiz not found');
      }

      const originalQuiz = quizDoc.data() as Quiz;

      // Create a copy
      const newQuiz = {
        ...originalQuiz,
        id: undefined,
        title: `${originalQuiz.title} (Copy)`,
        hostId: user.uid,
      };

      const quizzesRef = collection(firestore, 'quizzes');
      const newQuizDoc = await addDoc(quizzesRef, newQuiz);

      toast({
        title: 'Quiz copied',
        description: 'The quiz has been added to your quizzes',
      });

      router.push(`/host/edit/${newQuizDoc.id}`);
    } catch (error) {
      console.error('Error copying quiz:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to copy quiz',
        description: 'Please try again.',
      });
    } finally {
      setCopying(null);
    }
  };

  const handleHostGame = async (share: QuizShare) => {
    if (!user) return;

    setHosting(share.id);
    try {
      const gamesRef = collection(firestore, 'games');
      const gameDoc = await addDoc(gamesRef, {
        quizId: share.quizId,
        hostId: user.uid,
        state: 'lobby',
        currentQuestionIndex: 0,
        gamePin: nanoid(8).toUpperCase(),
        createdAt: serverTimestamp(),
      });

      router.push(`/host/lobby/${gameDoc.id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create game',
        description: 'Please try again.',
      });
      setHosting(null);
    }
  };

  const handleRemoveShare = async (share: QuizShare) => {
    try {
      await deleteDoc(doc(firestore, 'quizzes', share.quizId, 'shares', share.id));
      toast({
        title: 'Share removed',
        description: 'You will no longer see this quiz in your shared quizzes',
      });
      // Refresh shares
      setShares(shares.filter(s => s.id !== share.id));
    } catch (error) {
      console.error('Error removing share:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to remove share',
        description: 'Please try again.',
      });
    }
  };

  if (!user?.email) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <Share2 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Shared With Me</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2 animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : shares && shares.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shares.map((share) => (
            <Card key={share.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{share.quizTitle}</CardTitle>
                <CardDescription>
                  Shared by {share.sharedByEmail}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end gap-2">
                <Button
                  className="w-full"
                  onClick={() => handleHostGame(share)}
                  disabled={hosting === share.id}
                >
                  {hosting === share.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Host Game
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => handleCopyQuiz(share)}
                  disabled={copying === share.id}
                >
                  {copying === share.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  Copy to My Quizzes
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="ghost">
                      <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove shared quiz?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This quiz will be removed from your shared quizzes. You can ask the owner to share it again if needed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveShare(share)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Share2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No quizzes have been shared with you yet</p>
            <p className="text-sm mt-2">Ask other hosts to share their quizzes with your email: {user.email}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
