'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FullPageLoader } from '@/components/ui/full-page-loader';
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

// Helper to remove undefined values from an object (Firestore doesn't accept undefined)
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      // Recursively clean nested objects
      if (Array.isArray(value)) {
        cleaned[key] = value.map((item: any) =>
          typeof item === 'object' && item !== null ? removeUndefined(item) : item
        );
      } else if (typeof value === 'object' && value !== null && Object.prototype.toString.call(value) !== '[object Date]') {
        cleaned[key] = removeUndefined(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

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
        crowdsource: quizData.crowdsource,
      });
    }
  }, [quizData]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Check ownership - prevent editing quizzes the user doesn't own
  useEffect(() => {
    if (!quizLoading && quizData && user) {
      if (quizData.hostId !== user.uid) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You can only edit quizzes that you created.",
        });
        router.push('/host');
      }
    }
  }, [quizData, quizLoading, user, router, toast]);

  const handleSubmit = async (data: QuizFormData, imageFiles: Record<number, File>, imagesToDelete: string[]) => {
    if (!user) {
      toast({ variant: "destructive", title: "You must be signed in" });
      return;
    }

    // Double-check ownership before submitting
    if (quizData && quizData.hostId !== user.uid) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You can only edit quizzes that you created.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Update attempt:', {
        quizId,
        userUid: user.uid,
        quizHostId: quizData?.hostId,
        match: user.uid === quizData?.hostId
      });

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
      // Only update the fields that can change - preserve hostId and createdAt
      // Filter out undefined values (Firestore doesn't accept undefined)

      // Clean each question to remove undefined values
      const cleanedQuestions = quizDataForUpload.questions.map(q => removeUndefined(q));

      const finalQuizUpdate: any = {
        title: quizDataForUpload.title,
        questions: cleanedQuestions,
        updatedAt: serverTimestamp(),
      };

      // Only include description if it has a value
      if (quizDataForUpload.description !== undefined && quizDataForUpload.description !== '') {
        finalQuizUpdate.description = quizDataForUpload.description;
      }

      // Include crowdsource settings (clean undefined values)
      if (quizDataForUpload.crowdsource) {
        finalQuizUpdate.crowdsource = removeUndefined(quizDataForUpload.crowdsource);
      }

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
    } catch (error: any) {
      console.error("Error updating quiz: ", error);
      console.error("Error details:", {
        code: error?.code,
        message: error?.message,
        quizId,
        userUid: user?.uid,
        quizHostId: quizData?.hostId
      });

      const permissionError = new FirestorePermissionError({
        path: quizRef.path,
        operation: 'update',
      });
      errorEmitter.emit('permission-error', permissionError);

      // Provide more helpful error message
      let description = "Could not update the quiz. Please try again.";
      if (error?.code === 'permission-denied') {
        description = "Permission denied. You may not have access to edit this quiz. Please refresh and try again.";
      }

      toast({
        variant: "destructive",
        title: "Error",
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || quizLoading || !user) {
    return <FullPageLoader />;
  }

  if (!initialData) {
    return <FullPageLoader message="Loading quiz data..." />;
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
          quizId={quizId}
          additionalContent={
            quizData && <QuizShareManager quizId={quizId} quizTitle={quizData.title} />
          }
        />
      </main>
    </div>
  );
}
