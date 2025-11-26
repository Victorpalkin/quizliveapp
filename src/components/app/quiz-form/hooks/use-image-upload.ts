import { useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase';
import { ref, deleteObject } from 'firebase/storage';
import type {
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  SliderQuestion,
  SlideQuestion,
  FreeResponseQuestion,
  PollSingleQuestion,
  PollMultipleQuestion
} from '@/lib/types';

type Question = SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | FreeResponseQuestion | PollSingleQuestion | PollMultipleQuestion;

export function useImageUpload() {
  const { toast } = useToast();
  const storage = useStorage();
  const imageFiles = useRef<Record<number, File>>({});
  const imagesToDelete = useRef<string[]>([]);

  // Cleanup effect for image deletion
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        for (const url of imagesToDelete.current) {
          if (!url.startsWith('blob:')) {
            try {
              const imageRef = ref(storage, url);
              await deleteObject(imageRef);
            } catch (error) {
              console.error("Failed to delete image during cleanup:", error);
            }
          }
        }
      };
      cleanup();
    };
  }, [storage]);

  const handleImageUpload = async (
    qIndex: number,
    file: File,
    question: Question,
    updateQuestion: (index: number, updatedQuestion: Question) => void
  ) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be less than 5MB. Please choose a smaller file.",
      });
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Only PNG, JPEG, and GIF images are allowed.",
      });
      return;
    }

    if (question.imageUrl) {
      imagesToDelete.current.push(question.imageUrl);
    }

    imageFiles.current[qIndex] = file;
    const newImageUrl = URL.createObjectURL(file);
    updateQuestion(qIndex, { ...question, imageUrl: newImageUrl });
  };

  const removeImage = (
    qIndex: number,
    question: Question,
    updateQuestion: (index: number, updatedQuestion: Question) => void
  ) => {
    if (question.imageUrl) {
      if (question.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
        imagesToDelete.current.push(question.imageUrl);
      } else {
        URL.revokeObjectURL(question.imageUrl);
      }
      delete imageFiles.current[qIndex];
      updateQuestion(qIndex, { ...question, imageUrl: undefined });
    }
  };

  return {
    imageFiles,
    imagesToDelete,
    handleImageUpload,
    removeImage,
  };
}
