'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Copy, Trash2, Loader2, Play, Eye, FileQuestion, Vote, Presentation } from 'lucide-react';
import { useFirestore, useUser, useStorage, trackEvent } from '@/firebase';
import { useSharedQuizzes } from '@/firebase/firestore/use-shared-quizzes';
import { useSharedPolls } from '@/firebase/firestore/use-shared-polls';
import { useSharedPresentations } from '@/firebase/firestore/use-shared-presentations';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import type { QuizShare, Quiz, PollShare, PollActivity, PresentationShare, Presentation as PresentationType, ContentType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { QuizPreview } from './quiz-preview';
import { PollPreview } from './poll-preview';
import { PresentationPreview } from './presentation-preview';
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

type FilterType = 'all' | ContentType;

type SharedItem =
  | { type: 'quiz'; share: QuizShare & { quiz?: Quiz }; title: string; sharedByEmail: string; createdAt: Date }
  | { type: 'poll'; share: PollShare & { poll?: PollActivity }; title: string; sharedByEmail: string; createdAt: Date }
  | { type: 'presentation'; share: PresentationShare & { presentation?: PresentationType }; title: string; sharedByEmail: string; createdAt: Date };

export function SharedContent() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Loading states
  const [copying, setCopying] = useState<string | null>(null);
  const [hosting, setHosting] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Preview states
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [previewPoll, setPreviewPoll] = useState<PollActivity | null>(null);
  const [previewPresentation, setPreviewPresentation] = useState<PresentationType | null>(null);

  // Fetch shared content
  const { shares: quizShares, loading: quizzesLoading } = useSharedQuizzes();
  const { shares: pollShares, loading: pollsLoading } = useSharedPolls();
  const { shares: presentationShares, loading: presentationsLoading } = useSharedPresentations();

  const loading = quizzesLoading || pollsLoading || presentationsLoading;

  // Local state for managing removes
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Combine and sort all shared items
  const allItems: SharedItem[] = useMemo(() => {
    const items: SharedItem[] = [
      ...(quizShares || []).map(share => ({
        type: 'quiz' as const,
        share,
        title: share.quizTitle,
        sharedByEmail: share.sharedByEmail,
        createdAt: share.createdAt,
      })),
      ...(pollShares || []).map(share => ({
        type: 'poll' as const,
        share,
        title: share.pollTitle,
        sharedByEmail: share.sharedByEmail,
        createdAt: share.createdAt,
      })),
      ...(presentationShares || []).map(share => ({
        type: 'presentation' as const,
        share,
        title: share.presentationTitle,
        sharedByEmail: share.sharedByEmail,
        createdAt: share.createdAt,
      })),
    ];

    // Filter out removed items
    const filtered = items.filter(item => !removedIds.has(item.share.id));

    // Sort by createdAt descending (most recent first)
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [quizShares, pollShares, presentationShares, removedIds]);

  // Apply type filter
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return allItems;
    return allItems.filter(item => item.type === filterType);
  }, [allItems, filterType]);

  // Get counts for filter badges
  const counts = useMemo(() => ({
    all: allItems.length,
    quiz: allItems.filter(i => i.type === 'quiz').length,
    poll: allItems.filter(i => i.type === 'poll').length,
    presentation: allItems.filter(i => i.type === 'presentation').length,
  }), [allItems]);

  /**
   * Copy image from original quiz to new quiz in Firebase Storage
   */
  const copyImageToNewQuiz = async (
    originalImageUrl: string,
    newQuizId: string,
    questionIndex: number
  ): Promise<string> => {
    try {
      const response = await fetch(originalImageUrl);
      if (!response.ok) throw new Error('Failed to download image');
      const blob = await response.blob();

      const newImagePath = `quizzes/${newQuizId}/questions/${questionIndex}/image`;
      const newImageRef = ref(storage, newImagePath);
      await uploadBytes(newImageRef, blob);
      return await getDownloadURL(newImageRef);
    } catch (error) {
      console.error('Error copying image:', error);
      return originalImageUrl;
    }
  };

  // Quiz handlers
  const handlePreviewQuiz = async (share: QuizShare & { quiz?: Quiz }) => {
    if (share.quiz) {
      setPreviewQuiz(share.quiz);
      return;
    }
    setLoadingPreview(true);
    try {
      const quizDoc = await getDoc(doc(firestore, 'quizzes', share.quizId));
      if (!quizDoc.exists()) throw new Error('Quiz not found');
      setPreviewQuiz({ id: quizDoc.id, ...quizDoc.data() } as Quiz);
    } catch (error) {
      console.error('Error loading quiz preview:', error);
      toast({ variant: 'destructive', title: 'Failed to load quiz preview' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCopyQuiz = async (share: QuizShare & { quiz?: Quiz }) => {
    if (!user) return;

    setCopying(share.id);
    try {
      const quizDoc = await getDoc(doc(firestore, 'quizzes', share.quizId));
      if (!quizDoc.exists()) throw new Error('Quiz not found');

      const originalQuiz = quizDoc.data() as Quiz;
      const { id, ...quizDataWithoutId } = originalQuiz;

      const newQuiz = {
        ...quizDataWithoutId,
        title: `${originalQuiz.title} (Copy)`,
        hostId: user.uid,
      };

      const newQuizDoc = await addDoc(collection(firestore, 'quizzes'), newQuiz);
      const newQuizId = newQuizDoc.id;

      const imagePromises = originalQuiz.questions.map(async (question, index) => {
        if (question.imageUrl) {
          return copyImageToNewQuiz(question.imageUrl, newQuizId, index);
        }
        return null;
      });

      const newImageUrls = await Promise.all(imagePromises);
      const copiedImageCount = newImageUrls.filter(
        (url, index) => url && url !== originalQuiz.questions[index].imageUrl
      ).length;

      if (copiedImageCount > 0) {
        const updatedQuestions = originalQuiz.questions.map((question, index) => ({
          ...question,
          imageUrl: newImageUrls[index] || question.imageUrl,
        }));
        await updateDoc(newQuizDoc, { questions: updatedQuestions });
        toast({ title: 'Quiz copied', description: `Copied with ${copiedImageCount} image${copiedImageCount > 1 ? 's' : ''}` });
      } else {
        toast({ title: 'Quiz copied', description: 'Added to your quizzes' });
      }

      trackEvent('quiz_copied', { question_count: originalQuiz.questions.length, has_images: copiedImageCount > 0 });
      router.push(`/host/quiz/${newQuizId}`);
    } catch (error) {
      console.error('Error copying quiz:', error);
      toast({ variant: 'destructive', title: 'Failed to copy quiz' });
    } finally {
      setCopying(null);
    }
  };

  const handleHostQuiz = async (share: QuizShare) => {
    if (!user) return;
    setHosting(share.id);
    try {
      const gameDoc = await addDoc(collection(firestore, 'games'), {
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
      toast({ variant: 'destructive', title: 'Failed to create game' });
      setHosting(null);
    }
  };

  // Poll handlers
  const handlePreviewPoll = (share: PollShare & { poll?: PollActivity }) => {
    if (share.poll) {
      setPreviewPoll(share.poll);
    }
  };

  const handleHostPoll = async (share: PollShare) => {
    if (!user) return;
    setHosting(share.id);
    try {
      const gameDoc = await addDoc(collection(firestore, 'games'), {
        activityId: share.pollId,
        activityType: 'poll',
        hostId: user.uid,
        state: 'lobby',
        gamePin: nanoid(8).toUpperCase(),
        createdAt: serverTimestamp(),
      });
      router.push(`/host/poll/lobby/${gameDoc.id}`);
    } catch (error) {
      console.error('Error creating poll game:', error);
      toast({ variant: 'destructive', title: 'Failed to launch poll' });
      setHosting(null);
    }
  };

  // Presentation handlers
  const handlePreviewPresentation = (share: PresentationShare & { presentation?: PresentationType }) => {
    if (share.presentation) {
      setPreviewPresentation(share.presentation);
    }
  };

  const handleHostPresentation = async (share: PresentationShare) => {
    if (!user) return;
    setHosting(share.id);
    try {
      const gameDoc = await addDoc(collection(firestore, 'games'), {
        presentationId: share.presentationId,
        activityType: 'presentation',
        hostId: user.uid,
        state: 'lobby',
        currentSlideIndex: 0,
        gamePin: nanoid(8).toUpperCase(),
        createdAt: serverTimestamp(),
      });
      router.push(`/host/presentation/lobby/${gameDoc.id}`);
    } catch (error) {
      console.error('Error creating presentation game:', error);
      toast({ variant: 'destructive', title: 'Failed to start presentation' });
      setHosting(null);
    }
  };

  // Remove share handler
  const handleRemoveShare = async (item: SharedItem) => {
    try {
      let docPath: string;
      if (item.type === 'quiz') {
        docPath = `quizzes/${item.share.quizId}/shares/${item.share.id}`;
      } else if (item.type === 'poll') {
        docPath = `activities/${item.share.pollId}/shares/${item.share.id}`;
      } else {
        docPath = `presentations/${item.share.presentationId}/shares/${item.share.id}`;
      }

      await deleteDoc(doc(firestore, docPath));
      setRemovedIds(prev => new Set(prev).add(item.share.id));
      toast({ title: 'Share removed', description: `Removed from your shared ${item.type}s` });
    } catch (error) {
      console.error('Error removing share:', error);
      toast({ variant: 'destructive', title: 'Failed to remove share' });
    }
  };

  if (!user?.email) return null;

  const getTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'quiz': return <FileQuestion className="h-4 w-4 text-purple-500" />;
      case 'poll': return <Vote className="h-4 w-4 text-teal-500" />;
      case 'presentation': return <Presentation className="h-4 w-4 text-indigo-500" />;
    }
  };

  const getTypeLabel = (type: ContentType) => {
    switch (type) {
      case 'quiz': return 'Quiz';
      case 'poll': return 'Poll';
      case 'presentation': return 'Presentation';
    }
  };

  return (
    <div className="mb-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-3xl font-semibold">Shared With Me</h2>
        {allItems.length > 0 && (
          <span className="px-2.5 py-0.5 text-sm font-medium bg-muted text-muted-foreground rounded-full">
            {allItems.length}
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      {allItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 bg-muted p-1.5 rounded-xl mb-6 w-fit">
          {[
            { value: 'all', label: 'All', icon: null },
            { value: 'quiz', label: 'Quizzes', icon: FileQuestion },
            { value: 'poll', label: 'Polls', icon: Vote },
            { value: 'presentation', label: 'Presentations', icon: Presentation },
          ].map(({ value, label, icon: Icon }) => {
            const count = counts[value as keyof typeof counts];
            if (value !== 'all' && count === 0) return null;

            return (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                onClick={() => setFilterType(value as FilterType)}
                className={`rounded-lg transition-all duration-200 ${
                  filterType === value
                    ? 'bg-background shadow-sm text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {Icon && <Icon className={`h-4 w-4 mr-1.5 ${filterType === value ? 'text-primary' : ''}`} />}
                {label}
                {count > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
                )}
              </Button>
            );
          })}
        </div>
      )}

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
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={`${item.type}-${item.share.id}`} className="flex flex-col">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  {getTypeIcon(item.type)}
                  <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  <span className="text-muted-foreground">{getTypeLabel(item.type)}</span>
                  <span className="mx-1.5">·</span>
                  Shared by {item.sharedByEmail}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end gap-2 p-4 pt-0">
                {/* Host/Present button */}
                <Button
                  className="w-full"
                  onClick={() => {
                    if (item.type === 'quiz') handleHostQuiz(item.share as QuizShare);
                    else if (item.type === 'poll') handleHostPoll(item.share as PollShare);
                    else handleHostPresentation(item.share as PresentationShare);
                  }}
                  disabled={hosting === item.share.id}
                >
                  {hosting === item.share.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {item.type === 'presentation' ? 'Present' : 'Host'}
                </Button>

                {/* Preview button */}
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (item.type === 'quiz') handlePreviewQuiz(item.share as QuizShare & { quiz?: Quiz });
                    else if (item.type === 'poll') handlePreviewPoll(item.share as PollShare & { poll?: PollActivity });
                    else handlePreviewPresentation(item.share as PresentationShare & { presentation?: PresentationType });
                  }}
                  disabled={loadingPreview}
                >
                  {loadingPreview ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Preview
                </Button>

                {/* Copy button (quiz only) */}
                {item.type === 'quiz' && (
                  <Button
                    className="w-full"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyQuiz(item.share as QuizShare & { quiz?: Quiz })}
                    disabled={copying === item.share.id}
                  >
                    {copying === item.share.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copy to My Quizzes
                  </Button>
                )}

                {/* Remove button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="ghost" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove shared {item.type}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This {item.type} will be removed from your shared content. You can ask the owner to share it again if needed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveShare(item)}
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
      ) : allItems.length > 0 ? (
        // Has items but filter shows none
        <div className="flex items-center gap-3 py-4 px-4 bg-muted/50 rounded-lg text-muted-foreground">
          <Share2 className="h-5 w-5 opacity-50 flex-shrink-0" />
          <p className="text-sm">No shared {filterType}s found. Try selecting a different filter.</p>
        </div>
      ) : (
        // No shared items at all
        <div className="flex items-center gap-3 py-4 px-4 bg-muted/50 rounded-lg text-muted-foreground">
          <Share2 className="h-5 w-5 opacity-50 flex-shrink-0" />
          <p className="text-sm">No content shared with you yet. Other hosts can share quizzes, polls, and presentations with <span className="font-medium">{user.email}</span></p>
        </div>
      )}

      {/* Quiz Preview Dialog */}
      <Dialog open={!!previewQuiz} onOpenChange={(open) => !open && setPreviewQuiz(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Preview</DialogTitle>
          </DialogHeader>
          {previewQuiz && <QuizPreview quiz={previewQuiz} showCorrectAnswers={true} />}
        </DialogContent>
      </Dialog>

      {/* Poll Preview Dialog */}
      <Dialog open={!!previewPoll} onOpenChange={(open) => !open && setPreviewPoll(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Poll Preview</DialogTitle>
          </DialogHeader>
          {previewPoll && <PollPreview poll={previewPoll} />}
        </DialogContent>
      </Dialog>

      {/* Presentation Preview Dialog */}
      <Dialog open={!!previewPresentation} onOpenChange={(open) => !open && setPreviewPresentation(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Presentation Preview</DialogTitle>
          </DialogHeader>
          {previewPresentation && <PresentationPreview presentation={previewPresentation} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
