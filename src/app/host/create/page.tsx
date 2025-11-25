'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/app/header';
import { QuizForm, type QuizFormData } from '@/components/app/quiz-form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
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

  // Generate stable tempId for AI image generation (used before quiz has an ID)
  const tempIdRef = useRef<string>(nanoid());
  const tempId = tempIdRef.current;

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

      const docRef = await addDoc(collection(firestore, 'quizzes'), cleanedQuizData);
      const quizId = docRef.id;

      // Move temp AI images to final quiz path
      try {
        const tempFolderRef = ref(storage, `temp/${tempId}/questions`);
        const tempContents = await listAll(tempFolderRef);

        for (const folderRef of tempContents.prefixes) {
          // Each folder is a question index folder
          const questionFiles = await listAll(folderRef);
          for (const fileRef of questionFiles.items) {
            // Get the file name (e.g., "image.png")
            const fileName = fileRef.name;
            const questionIndex = folderRef.name;

            // Download the temp file
            const tempUrl = await getDownloadURL(fileRef);
            const response = await fetch(tempUrl);
            const blob = await response.blob();

            // Upload to final path
            const finalPath = `quizzes/${quizId}/questions/${questionIndex}/${fileName}`;
            const finalRef = ref(storage, finalPath);
            await uploadBytes(finalRef, blob);
            const finalUrl = await getDownloadURL(finalRef);

            // Update the question imageUrl if it matches the temp URL
            const qIdx = parseInt(questionIndex, 10);
            if (quizDataForUpload.questions[qIdx]?.imageUrl?.includes(`temp/${tempId}`)) {
              // Update the document with the new URL
              // Note: The image URL was already saved with the temp URL
              // We need to update it in Firestore
              await import('firebase/firestore').then(async ({ updateDoc }) => {
                const updatedQuestions = [...quizDataForUpload.questions];
                updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], imageUrl: finalUrl };
                await updateDoc(docRef, { questions: updatedQuestions.map(q => removeUndefined(q)) });
              });
            }

            // Delete the temp file
            await deleteObject(fileRef);
          }
        }
      } catch (error) {
        // Temp folder might not exist if no AI images were generated
        console.log('No temp images to move or error moving:', error);
      }

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
          tempId={tempId}
        />
      </main>
    </div>
  );
}
