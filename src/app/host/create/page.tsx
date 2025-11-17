'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/app/header';
import { QuizForm, type QuizFormData } from '@/components/app/quiz-form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { nanoid } from 'nanoid';

// Helper function to remove undefined values from objects
function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined) as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export default function CreateQuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, loading: userLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleSubmit = async (data: QuizFormData, imageFiles: Record<number, File>, imagesToDelete: string[]) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "You must be signed in",
        description: "Please sign in to create a quiz.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const quizDataForUpload = { ...data, questions: [...data.questions] };

      // Upload images and update URLs
      for (const qIndex in imageFiles) {
        const file = imageFiles[Number(qIndex)];
        if (file) {
          const imageRef = ref(storage, `quiz-images/${user.uid}/${nanoid()}`);
          await uploadBytes(imageRef, file);
          const downloadURL = await getDownloadURL(imageRef);
          quizDataForUpload.questions[Number(qIndex)].imageUrl = downloadURL;
        }
      }

      // Final quiz data for Firestore
      const finalQuizData = {
        ...quizDataForUpload,
        hostId: user.uid,
        createdAt: serverTimestamp(),
      };

      // Remove undefined values to prevent Firestore errors
      const cleanedQuizData = removeUndefined(finalQuizData);

      await addDoc(collection(firestore, 'quizzes'), cleanedQuizData);

      // Clean up deleted images from storage
      for (const url of imagesToDelete) {
        try {
          const imageRef = ref(storage, url);
          await deleteObject(imageRef);
        } catch (error: any) {
          if (error.code !== 'storage/object-not-found') {
            console.error("Failed to delete image:", error);
          }
        }
      }

      toast({
        title: 'Quiz Saved!',
        description: 'Your new quiz has been saved to your dashboard.',
      });
      router.push(`/host`);
    } catch (error) {
      console.error("Error creating quiz: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save the quiz. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
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
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <QuizForm
          mode="create"
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          userId={user.uid}
        />
      </main>
    </div>
  );
}
