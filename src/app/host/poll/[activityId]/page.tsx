'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/app/header';
import { Vote, ArrowLeft, Gamepad2, Pencil, Trash2, MessageSquare, ListChecks, AlignLeft, Users, Eye } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc, collection, addDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import type { PollActivity, PollQuestion } from '@/lib/types';
import { pollActivityConverter } from '@/firebase/converters';
import { FullPageLoader } from '@/components/ui/full-page-loader';
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

function QuestionPreview({ question, index }: { question: PollQuestion; index: number }) {
  const getIcon = () => {
    switch (question.type) {
      case 'poll-single': return <MessageSquare className="h-4 w-4 text-teal-500" />;
      case 'poll-multiple': return <ListChecks className="h-4 w-4 text-teal-500" />;
      case 'poll-free-text': return <AlignLeft className="h-4 w-4 text-teal-500" />;
    }
  };

  const getTypeName = () => {
    switch (question.type) {
      case 'poll-single': return 'Single Choice';
      case 'poll-multiple': return 'Multiple Choice';
      case 'poll-free-text': return 'Free Text';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">Q{index + 1}</span>
          {getIcon()}
          <Badge variant="outline" className="text-xs">{getTypeName()}</Badge>
        </div>
        {question.showLiveResults && (
          <Badge variant="secondary" className="text-xs">
            <Eye className="h-3 w-3 mr-1" /> Live Results
          </Badge>
        )}
      </div>
      <p className="font-medium">{question.text}</p>
      {question.type !== 'poll-free-text' && 'answers' in question && (
        <div className="flex flex-wrap gap-2">
          {question.answers.map((answer, i) => (
            <Badge key={i} variant="outline" className="text-sm">
              {String.fromCharCode(65 + i)}. {answer.text}
            </Badge>
          ))}
        </div>
      )}
      {question.type === 'poll-free-text' && (
        <div className="text-sm text-muted-foreground italic">
          Participants will type their response
        </div>
      )}
    </div>
  );
}

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const activityId = params.activityId as string;

  const activityRef = useMemoFirebase(
    () => doc(firestore, 'activities', activityId).withConverter(pollActivityConverter) as DocumentReference<PollActivity>,
    [firestore, activityId]
  );
  const { data: poll, loading: pollLoading } = useDoc(activityRef);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleLaunchSession = async () => {
    if (!user || !poll) return;

    try {
      const gameData = {
        activityType: 'poll' as const,
        activityId: poll.id,
        hostId: user.uid,
        state: 'lobby' as const,
        currentQuestionIndex: 0,
        gamePin: nanoid(8).toUpperCase(),
        questions: poll.questions,
        createdAt: serverTimestamp(),
        quizId: '', // Required by Game interface, not used for polls
      };

      const gameDoc = await addDoc(collection(firestore, 'games'), gameData);

      toast({
        title: 'Session Created!',
        description: 'Your poll lobby is now open.',
      });

      router.push(`/host/poll/lobby/${gameDoc.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the session. Please try again.",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(firestore, 'activities', activityId));
      toast({
        title: 'Poll Deleted',
        description: 'The poll has been successfully removed.',
      });
      router.push('/host');
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the poll. Please try again.",
      });
    }
  };

  if (userLoading || pollLoading) {
    return <FullPageLoader />;
  }

  if (!poll) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl">
          <Card className="text-center p-8">
            <CardContent>
              <h2 className="text-2xl font-bold mb-4">Poll Not Found</h2>
              <p className="text-muted-foreground mb-6">
                This poll may have been deleted or you don&apos;t have access to it.
              </p>
              <Button asChild>
                <Link href="/host">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/host">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Vote className="h-10 w-10 text-teal-500" />
              <div>
                <h1 className="text-4xl font-bold">{poll.title}</h1>
                {poll.description && (
                  <p className="text-muted-foreground mt-1">{poll.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="icon">
                <Link href={`/host/poll/edit/${poll.id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl shadow-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-semibold">Delete this poll?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                      This action cannot be undone. This will permanently delete &apos;{poll.title}&apos;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Settings Summary */}
        <Card className="shadow-lg rounded-2xl border border-card-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Poll Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant={poll.config.allowAnonymous ? "default" : "secondary"}>
                {poll.config.allowAnonymous ? 'Anonymous Allowed' : 'Named Responses'}
              </Badge>
              <Badge variant={poll.config.defaultShowLiveResults ? "default" : "secondary"}>
                {poll.config.defaultShowLiveResults ? 'Live Results On' : 'Results Hidden'}
              </Badge>
              <Badge variant="outline">
                {poll.questions.length} Question{poll.questions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Questions Preview */}
        <Card className="shadow-lg rounded-2xl border border-card-border mb-6">
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              Preview of your poll questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {poll.questions.map((question, index) => (
              <QuestionPreview key={question.id || index} question={question} index={index} />
            ))}
          </CardContent>
        </Card>

        {/* Launch Button */}
        <Button
          onClick={handleLaunchSession}
          className="w-full py-6 text-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 rounded-xl"
        >
          <Gamepad2 className="mr-2 h-5 w-5" /> Launch Session
        </Button>
      </main>
    </div>
  );
}
