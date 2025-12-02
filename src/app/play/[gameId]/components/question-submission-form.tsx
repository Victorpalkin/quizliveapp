'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFirestore } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Lightbulb, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { QuestionSubmission } from '@/lib/types';

interface QuestionSubmissionFormProps {
  gameId: string;
  playerId: string;
  playerName: string;
  maxSubmissions: number;
  currentSubmissionCount: number;
  topicPrompt?: string;
  onSubmissionComplete?: () => void;
}

export function QuestionSubmissionForm({
  gameId,
  playerId,
  playerName,
  maxSubmissions,
  currentSubmissionCount,
  topicPrompt,
  onSubmissionComplete,
}: QuestionSubmissionFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmitMore = currentSubmissionCount < maxSubmissions;

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const isFormValid = () => {
    return (
      questionText.trim().length >= 10 &&
      questionText.trim().length <= 500 &&
      answers.every(a => a.trim().length > 0) &&
      correctAnswerIndex !== null
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid() || !canSubmitMore) return;

    setIsSubmitting(true);

    try {
      const submissionsRef = collection(firestore, 'games', gameId, 'submissions');

      const submissionData: Omit<QuestionSubmission, 'id'> = {
        playerId,
        playerName,
        submittedAt: Timestamp.now(),
        expireAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours
        questionText: questionText.trim(),
        answers: answers.map(a => a.trim()),
        correctAnswerIndex: correctAnswerIndex!,
      };

      await addDoc(submissionsRef, submissionData);

      // Reset form
      setQuestionText('');
      setAnswers(['', '', '', '']);
      setCorrectAnswerIndex(null);

      toast({
        title: 'Question submitted!',
        description: `${maxSubmissions - currentSubmissionCount - 1} submissions remaining`,
      });

      onSubmissionComplete?.();
    } catch (error) {
      console.error('Failed to submit question:', error);
      toast({
        title: 'Submission failed',
        description: 'Please try again. Make sure the game is still in the lobby.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canSubmitMore) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
          <p className="text-lg font-medium text-green-800 dark:text-green-200">
            You've submitted {currentSubmissionCount} question{currentSubmissionCount > 1 ? 's' : ''}!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            Maximum submissions reached. Wait for the host to start the game.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Lightbulb className="w-5 h-5 text-primary" />
          Submit a Question
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {currentSubmissionCount} / {maxSubmissions} questions submitted
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question">Your Question</Label>
            <Textarea
              id="question"
              placeholder={topicPrompt
                ? `Write a question about "${topicPrompt}" (10-500 characters)`
                : "Enter your question here (10-500 characters)"}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {questionText.length}/500
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-4">
            <Label>Answer Options (select the correct one)</Label>
            <RadioGroup
              value={correctAnswerIndex?.toString()}
              onValueChange={(value) => setCorrectAnswerIndex(parseInt(value))}
            >
              {answers.map((answer, index) => (
                <div key={index} className="flex items-center gap-3">
                  <RadioGroupItem value={index.toString()} id={`answer-${index}`} />
                  <Input
                    placeholder={`Answer ${index + 1}`}
                    value={answer}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="flex-1"
                  />
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Click the radio button next to the correct answer
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Question'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
