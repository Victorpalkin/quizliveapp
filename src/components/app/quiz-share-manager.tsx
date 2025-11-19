'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Share2, Trash2, Loader2, UserPlus } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirestore, useUser } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { QuizShare } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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

interface QuizShareManagerProps {
  quizId: string;
  quizTitle: string;
}

export function QuizShareManager({ quizId, quizTitle }: QuizShareManagerProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sharing, setSharing] = useState(false);

  const sharesRef = useMemoFirebase(
    () => collection(firestore, 'quizzes', quizId, 'shares') as any,
    [firestore, quizId]
  );
  const { data: shares, loading } = useCollection<QuizShare>(sharesRef);

  const handleShare = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast({ variant: 'destructive', title: 'Email is required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({ variant: 'destructive', title: 'Invalid email address' });
      return;
    }

    // Can't share with yourself
    if (trimmedEmail === user?.email?.toLowerCase()) {
      toast({ variant: 'destructive', title: "You can't share with yourself" });
      return;
    }

    // Check if already shared
    if (shares?.some(s => s.sharedWith.toLowerCase() === trimmedEmail)) {
      toast({ variant: 'destructive', title: 'Already shared with this user' });
      return;
    }

    setSharing(true);
    try {
      // Use email as document ID for efficient exists() checks in security rules
      // This also prevents duplicate shares to the same email
      const shareDocRef = doc(firestore, 'quizzes', quizId, 'shares', trimmedEmail);

      await setDoc(shareDocRef, {
        quizId,
        quizTitle,
        sharedWith: trimmedEmail,
        sharedBy: user?.uid,
        sharedByEmail: user?.email,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Quiz shared successfully',
        description: `Shared with ${trimmedEmail}`,
      });
      setEmail('');
    } catch (error) {
      console.error('Error sharing quiz:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to share quiz',
        description: 'Please try again.',
      });
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string, sharedWith: string) => {
    try {
      await deleteDoc(doc(firestore, 'quizzes', quizId, 'shares', shareId));
      toast({
        title: 'Share removed',
        description: `Removed share with ${sharedWith}`,
      });
    } catch (error) {
      console.error('Error removing share:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to remove share',
        description: 'Please try again.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <CardTitle>Share Quiz</CardTitle>
        </div>
        <CardDescription>
          Share this quiz with other hosts by entering their email address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleShare(e as any);
              }
            }}
            disabled={sharing}
            className="flex-1"
          />
          <Button type="button" onClick={handleShare} disabled={sharing}>
            {sharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Share
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Shared with ({shares?.length || 0})</h4>
          {loading ? (
            <div className="space-y-2">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ) : shares && shares.length > 0 ? (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm">{share.sharedWith}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove share?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {share.sharedWith} will no longer be able to host games with this quiz or see it in their shared quizzes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveShare(share.id, share.sharedWith)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              Not shared with anyone yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
