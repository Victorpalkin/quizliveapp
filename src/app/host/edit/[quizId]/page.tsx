'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/app/header';
import { QuizShareManager } from '@/components/app/quiz-share-manager';
import { QuizForm, type QuizFormData } from '@/components/app/quiz-form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase, useStorage } from '@/firebase';
import { doc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { nanoid } from 'nanoid';
import type { Quiz } from '@/lib/types';

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, loading: userLoading } = useUser();

  const quizRef = useMemoFirebase(() => doc(firestore, 'quizzes', quizId) as DocumentReference<Quiz>, [firestore, quizId]);
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<QuizFormData | undefined>(undefined);

  useEffect(() => {
    if (quizData) {
      setInitialData({
        title: quizData.title,
        description: quizData.description,
        questions: quizData.questions as any,
      });
    }
  }, [quizData]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleSubmit = async (data: QuizFormData, imageFiles: Record<number, File>, imagesToDelete: string[]) => {
    if (!user) {
      toast({ variant: "destructive", title: "You must be signed in" });
      return;
    }

    setIsSubmitting(true);

    try {
      const quizDataForUpload = { ...data, questions: [...data.questions] };

      // Upload new/updated images
      for (const qIndexStr in imageFiles) {
        const qIndex = parseInt(qIndexStr, 10);
        const file = imageFiles[qIndex];
        if (file) {
          const imageRef = ref(storage, `quiz-images/${user.uid}/${nanoid()}`);
          await uploadBytes(imageRef, file);
          const downloadURL = await getDownloadURL(imageRef);
          quizDataForUpload.questions[qIndex].imageUrl = downloadURL;
        }
      }

      // Final update data for Firestore
      const finalQuizUpdate = {
        ...quizDataForUpload,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(quizRef, finalQuizUpdate);

      // Clean up images marked for deletion from storage
      for (const url of imagesToDelete) {
        if (!url.startsWith('blob:')) {
          try {
            const imageRef = ref(storage, url);
            await deleteObject(imageRef);
          } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
              console.error("Failed to delete image:", error);
            }
          }
        }
      }

      toast({
        title: 'Quiz Updated!',
        description: 'Your quiz has been successfully updated.',
      });
      router.push(`/host`);
    } catch (error) {
      console.error("Error updating quiz: ", error);
      const permissionError = new FirestorePermissionError({
        path: quizRef.path,
        operation: 'update',
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update the quiz. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || quizLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading quiz data...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <QuizForm
          mode="edit"
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          userId={user.uid}
          additionalContent={
            quizData && <QuizShareManager quizId={quizId} quizTitle={quizData.title} />
          }
        />
      </main>
    </div>
  );
}
