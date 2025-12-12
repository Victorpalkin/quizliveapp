import { useState, useCallback } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import type {
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  SliderQuestion,
  SlideQuestion,
  FreeResponseQuestion,
  PollSingleQuestion,
  PollMultipleQuestion
} from '@/lib/types';
import type { QuizFormData } from '../../quiz-form';

type Question = SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | FreeResponseQuestion | PollSingleQuestion | PollMultipleQuestion;

export function useQuestionOperations(
  setValue: UseFormSetValue<QuizFormData>,
  imagesToDelete: React.MutableRefObject<string[]>,
  imageFiles?: React.MutableRefObject<Record<number, File>>
) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);

  const addQuestion = useCallback((
    text: string = '',
    type: 'single-choice' | 'multiple-choice' | 'slider' | 'slide' | 'free-response' | 'poll-single' | 'poll-multiple' = 'single-choice'
  ) => {
    let newQuestion: Question;

    if (type === 'slide') {
      newQuestion = {
        type: 'slide',
        text: text,
        description: '',
        timeLimit: 10,
      };
    } else if (type === 'slider') {
      newQuestion = {
        type: 'slider',
        text: text,
        minValue: 0,
        maxValue: 100,
        correctValue: 50,
        step: 1,
        unit: '',
        timeLimit: 20,
      };
    } else if (type === 'free-response') {
      newQuestion = {
        type: 'free-response',
        text: text,
        correctAnswer: '',
        alternativeAnswers: [],
        caseSensitive: false,
        allowTypos: true,
        timeLimit: 30,
      };
    } else if (type === 'multiple-choice') {
      newQuestion = {
        type: 'multiple-choice',
        text: text,
        answers: [{ text: '' }, { text: '' }],
        correctAnswerIndices: [0, 1],
        timeLimit: 20,
        showAnswerCount: true,
      };
    } else if (type === 'poll-single') {
      newQuestion = {
        type: 'poll-single',
        text: text,
        answers: [{ text: '' }, { text: '' }],
        timeLimit: 20,
      };
    } else if (type === 'poll-multiple') {
      newQuestion = {
        type: 'poll-multiple',
        text: text,
        answers: [{ text: '' }, { text: '' }],
        timeLimit: 20,
      };
    } else {
      newQuestion = {
        type: 'single-choice',
        text: text,
        answers: [{ text: '' }, { text: '' }],
        correctAnswerIndex: 0,
        timeLimit: 20,
      };
    }

    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    setValue('questions', newQuestions);
  }, [questions, setValue]);

  const updateQuestion = useCallback((index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
    setValue('questions', newQuestions, { shouldValidate: true });
  }, [questions, setValue]);

  const removeQuestion = useCallback((index: number) => {
    const questionToRemove = questions[index];
    if (questionToRemove.imageUrl) {
      imagesToDelete.current.push(questionToRemove.imageUrl);
    }
    const newQuestions = questions.filter((_, qIndex) => qIndex !== index);
    setQuestions(newQuestions);
    setValue('questions', newQuestions, { shouldValidate: true });
  }, [questions, setValue, imagesToDelete]);

  const addAnswer = useCallback((qIndex: number) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];

    if (question.type !== 'single-choice' && question.type !== 'multiple-choice' && question.type !== 'poll-single' && question.type !== 'poll-multiple') return;

    if (question.answers.length < 8) {
      question.answers.push({ text: '' });
      setQuestions(newQuestions);
      setValue('questions', newQuestions, { shouldValidate: true });
    } else {
      toast({
        variant: "destructive",
        title: "Answer limit reached",
        description: "You can only have a maximum of 8 answers per question.",
      });
    }
  }, [questions, setValue, toast]);

  const removeAnswer = useCallback((qIndex: number, aIndex: number) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];

    if (question.type !== 'single-choice' && question.type !== 'multiple-choice' && question.type !== 'poll-single' && question.type !== 'poll-multiple') return;

    if (question.answers.length > 2) {
      question.answers.splice(aIndex, 1);

      if (question.type === 'single-choice') {
        // Adjust correctAnswerIndex
        if (question.correctAnswerIndex === aIndex) {
          question.correctAnswerIndex = 0; // Default to first answer
        } else if (question.correctAnswerIndex > aIndex) {
          question.correctAnswerIndex -= 1;
        }
      } else if (question.type === 'multiple-choice') {
        // Adjust correctAnswerIndices
        const newCorrectIndices = question.correctAnswerIndices
          .filter(i => i !== aIndex)
          .map(i => i > aIndex ? i - 1 : i);
        if (newCorrectIndices.length < 2) {
          // Ensure at least 2 correct answers for multiple-choice
          newCorrectIndices.push(...[0, 1].filter(i => !newCorrectIndices.includes(i) && i < question.answers.length - 1));
        }
        question.correctAnswerIndices = newCorrectIndices;
      }
      // Poll types don't have correct answers, so no adjustment needed

      setQuestions(newQuestions);
      setValue('questions', newQuestions, { shouldValidate: true });
    } else {
      toast({
        variant: "destructive",
        title: "Answer limit reached",
        description: "You must have at least 2 answers per question.",
      });
    }
  }, [questions, setValue, toast]);

  const convertQuestionType = useCallback((
    qIndex: number,
    targetType: 'single-choice' | 'multiple-choice' | 'slider' | 'slide' | 'free-response' | 'poll-single' | 'poll-multiple'
  ) => {
    const q = questions[qIndex];
    if (targetType === q.type) return;

    let convertedQuestion: Question;

    // Helper to check if question type has answers array
    const hasAnswers = (type: string) => !['slider', 'slide', 'free-response'].includes(type);

    // Convert to slide
    if (targetType === 'slide') {
      convertedQuestion = {
        type: 'slide',
        text: q.text,
        description: '',
        timeLimit: q.timeLimit || 10,
        imageUrl: q.imageUrl,
      };
    }
    // Convert to slider
    else if (targetType === 'slider') {
      convertedQuestion = {
        type: 'slider',
        text: q.text,
        minValue: 0,
        maxValue: 100,
        correctValue: 50,
        step: 1,
        unit: '',
        timeLimit: q.timeLimit || 20,
        imageUrl: q.imageUrl,
      };
    }
    // Convert to free-response
    else if (targetType === 'free-response') {
      convertedQuestion = {
        type: 'free-response',
        text: q.text,
        correctAnswer: '',
        alternativeAnswers: [],
        caseSensitive: false,
        allowTypos: true,
        timeLimit: q.timeLimit || 30,
        imageUrl: q.imageUrl,
      };
    }
    // Convert to single-choice
    else if (targetType === 'single-choice') {
      const answers = hasAnswers(q.type)
        ? (q as SingleChoiceQuestion | MultipleChoiceQuestion | PollSingleQuestion | PollMultipleQuestion).answers
        : [{ text: '' }, { text: '' }];
      convertedQuestion = {
        type: 'single-choice',
        text: q.text,
        answers: answers,
        correctAnswerIndex: 0,
        timeLimit: q.timeLimit || 20,
        imageUrl: q.imageUrl,
      };
    }
    // Convert to multiple-choice
    else if (targetType === 'multiple-choice') {
      const answers = hasAnswers(q.type)
        ? (q as SingleChoiceQuestion | MultipleChoiceQuestion | PollSingleQuestion | PollMultipleQuestion).answers
        : [{ text: '' }, { text: '' }];
      convertedQuestion = {
        type: 'multiple-choice',
        text: q.text,
        answers: answers,
        correctAnswerIndices: [0, 1],
        timeLimit: q.timeLimit || 20,
        showAnswerCount: true,
        imageUrl: q.imageUrl,
      };
    }
    // Convert to poll-single
    else if (targetType === 'poll-single') {
      const answers = hasAnswers(q.type)
        ? (q as SingleChoiceQuestion | MultipleChoiceQuestion | PollSingleQuestion | PollMultipleQuestion).answers
        : [{ text: '' }, { text: '' }];
      convertedQuestion = {
        type: 'poll-single',
        text: q.text,
        answers: answers,
        timeLimit: q.timeLimit || 20,
        imageUrl: q.imageUrl,
      };
    }
    // Convert to poll-multiple
    else {
      const answers = hasAnswers(q.type)
        ? (q as SingleChoiceQuestion | MultipleChoiceQuestion | PollSingleQuestion | PollMultipleQuestion).answers
        : [{ text: '' }, { text: '' }];
      convertedQuestion = {
        type: 'poll-multiple',
        text: q.text,
        answers: answers,
        timeLimit: q.timeLimit || 20,
        imageUrl: q.imageUrl,
      };
    }

    updateQuestion(qIndex, convertedQuestion);
  }, [questions, updateQuestion]);

  const duplicateQuestion = useCallback((index: number) => {
    const questionToDuplicate = questions[index];

    // Deep clone the question (excluding imageUrl - images are not duplicated)
    const duplicatedQuestion: Question = {
      ...JSON.parse(JSON.stringify(questionToDuplicate)),
      imageUrl: undefined,
    };

    // Insert after the original question
    const newQuestions = [
      ...questions.slice(0, index + 1),
      duplicatedQuestion,
      ...questions.slice(index + 1),
    ];

    setQuestions(newQuestions);
    setValue('questions', newQuestions, { shouldValidate: true });

    toast({
      title: 'Question Duplicated',
      description: 'A copy has been added below the original.',
    });
  }, [questions, setValue, toast]);

  const reorderQuestion = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newQuestions = [...questions];
    const [movedQuestion] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, movedQuestion);

    // Remap imageFiles to match new indices if imageFiles ref is provided
    if (imageFiles) {
      const newImageFiles: Record<number, File> = {};
      Object.keys(imageFiles.current).forEach(key => {
        const index = parseInt(key, 10);
        let newIndex = index;

        if (index === fromIndex) {
          newIndex = toIndex;
        } else if (fromIndex < toIndex) {
          // Moving down: shift questions between fromIndex and toIndex up
          if (index > fromIndex && index <= toIndex) {
            newIndex = index - 1;
          }
        } else {
          // Moving up: shift questions between toIndex and fromIndex down
          if (index >= toIndex && index < fromIndex) {
            newIndex = index + 1;
          }
        }

        newImageFiles[newIndex] = imageFiles.current[index];
      });

      // Replace imageFiles ref with remapped files
      imageFiles.current = newImageFiles;
    }

    setQuestions(newQuestions);
    setValue('questions', newQuestions, { shouldValidate: true });
  }, [questions, setValue, imageFiles]);

  return {
    questions,
    setQuestions,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addAnswer,
    removeAnswer,
    convertQuestionType,
    duplicateQuestion,
    reorderQuestion,
  };
}
