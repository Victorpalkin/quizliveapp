'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Copy, Trash2, Loader2, Play, Eye } from 'lucide-react';
import { useFirestore, useUser, useStorage, trackEvent } from '@/firebase';
import { useSharedQuizzes } from '@/firebase/firestore/use-shared-quizzes';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import type { QuizShare, Quiz } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { QuizPreview } from './quiz-preview';
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SharedQuizzes() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [copying, setCopying] = useState<string | null>(null);
  const [hosting, setHosting] = useState<string | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { shares: initialShares, loading } = useSharedQuizzes();
  const [shares, setShares] = useState(initialShares);

  // Update local shares when hook data changes
  useEffect(() => {
    setShares(initialShares);
  }, [initialShares]);

  const handlePreviewQuiz = async (share: QuizShare) => {
    setLoadingPreview(true);
    try {
      const quizDoc = await getDoc(doc(firestore, 'quizzes', share.quizId));
      if (!quizDoc.exists()) {
        throw new Error('Quiz not found');
      }

      const quiz = quizDoc.data() as Quiz;
      setPreviewQuiz(quiz);
    } catch (error) {
      console.error('Error loading quiz preview:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load quiz preview',
        description: 'Please try again.',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  /**
   * Copy image from original quiz to new quiz in Firebase Storage
   * This ensures each quiz has its own independent images
   */
  const copyImageToNewQuiz = async (
    originalImageUrl: string,
    newQuizId: string,
    questionIndex: number
  ): Promise<string> => {
    try {
      // Download the original image
      const response = await fetch(originalImageUrl);
      if (!response.ok) {
        throw new Error('Failed to download image');
      }
      const blob = await response.blob();

      // Upload to new location
      const newImagePath = `quizzes/${newQuizId}/questions/${questionIndex}/image`;
      const newImageRef = ref(storage, newImagePath);

      await uploadBytes(newImageRef, blob);

      // Get the new download URL
      const newImageUrl = await getDownloadURL(newImageRef);

      return newImageUrl;
    } catch (error) {
      console.error('Error copying image:', error);
      // Return original URL as fallback (better than breaking the quiz)
      return originalImageUrl;
    }
  };

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

      // Create a copy - exclude 'id' field by destructuring
      const { id, ...quizDataWithoutId } = originalQuiz;

      // First create the quiz document to get the new quiz ID
      const newQuiz = {
        ...quizDataWithoutId,
        title: `${originalQuiz.title} (Copy)`,
        hostId: user.uid,
      };

      const quizzesRef = collection(firestore, 'quizzes');
      const newQuizDoc = await addDoc(quizzesRef, newQuiz);
      const newQuizId = newQuizDoc.id;

      // Copy images for questions that have them
      // Process all images in parallel for better performance
      const imagePromises = originalQuiz.questions.map(async (question, index) => {
        if (question.imageUrl) {
          return copyImageToNewQuiz(question.imageUrl, newQuizId, index);
        }
        return null;
      });

      const newImageUrls = await Promise.all(imagePromises);

      // Count successfully copied images (URLs that are different from original)
      const copiedImageCount = newImageUrls.filter(
        (url, index) => url && url !== originalQuiz.questions[index].imageUrl
      ).length;

      // If any images were copied, update the quiz with new image URLs
      if (copiedImageCount > 0) {
        const updatedQuestions = originalQuiz.questions.map((question, index) => ({
          ...question,
          imageUrl: newImageUrls[index] || question.imageUrl,
        }));

        // Update the quiz document with new image URLs
        await updateDoc(newQuizDoc, {
          questions: updatedQuestions,
        });

        toast({
          title: 'Quiz copied',
          description: `Copied quiz with ${copiedImageCount} image${copiedImageCount > 1 ? 's' : ''}`,
        });
      } else {
        toast({
          title: 'Quiz copied',
          description: 'The quiz has been added to your quizzes',
        });
      }

      // Track quiz copy
      trackEvent('quiz_copied', {
        question_count: originalQuiz.questions.length,
        has_images: copiedImageCount > 0,
      });

      router.push(`/host/quiz/${newQuizId}`);
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

      router.push(`/host/quiz/lobby/${gameDoc.id}`);
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
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-3xl font-semibold">Shared With Me</h2>
        {shares && shares.length > 0 && (
          <span className="px-2.5 py-0.5 text-sm font-medium bg-muted text-muted-foreground rounded-full">
            {shares.length}
          </span>
        )}
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
                  variant="outline"
                  onClick={() => handlePreviewQuiz(share)}
                  disabled={loadingPreview}
                >
                  {loadingPreview ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Preview Quiz
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
        <div className="flex items-center gap-3 py-4 px-4 bg-muted/50 rounded-lg text-muted-foreground">
          <Share2 className="h-5 w-5 opacity-50 flex-shrink-0" />
          <p className="text-sm">No quizzes shared with you yet. Other hosts can share quizzes with <span className="font-medium">{user.email}</span></p>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewQuiz} onOpenChange={(open) => !open && setPreviewQuiz(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Preview</DialogTitle>
          </DialogHeader>
          {previewQuiz && <QuizPreview quiz={previewQuiz} showCorrectAnswers={true} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
