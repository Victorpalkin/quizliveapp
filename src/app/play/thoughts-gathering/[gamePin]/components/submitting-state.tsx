'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, CheckCircle } from 'lucide-react';
import type { ThoughtsGatheringActivity, ThoughtSubmission } from '@/lib/types';

interface SubmittingStateProps {
  activity: ThoughtsGatheringActivity | null;
  submissionText: string;
  setSubmissionText: (value: string) => void;
  isSubmitting: boolean;
  submissionCount: number;
  onSubmit: () => void;
  playerSubmissions: ThoughtSubmission[] | null;
}

export function SubmittingState({
  activity,
  submissionText,
  setSubmissionText,
  isSubmitting,
  submissionCount,
  onSubmit,
  playerSubmissions,
}: SubmittingStateProps) {
  const maxSubmissions = activity?.config.maxSubmissionsPerPlayer || 3;
  const remainingSubmissions = maxSubmissions - submissionCount;

  return (
    <div className="w-full max-w-md space-y-6">
      <Card className="shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Share Your Thoughts</CardTitle>
          <CardDescription className="text-lg">
            {activity?.config.prompt || 'What topics are on your mind?'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            placeholder="Type your thoughts here..."
            className="min-h-[100px] text-lg"
            maxLength={1000}
            disabled={remainingSubmissions <= 0}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {remainingSubmissions} submission{remainingSubmissions !== 1 ? 's' : ''} remaining
            </span>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !submissionText.trim() || remainingSubmissions <= 0}
              className="bg-gradient-to-r from-blue-500 to-purple-500 active:scale-95 transition-transform"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Submit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {playerSubmissions && playerSubmissions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playerSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                >
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{sub.rawText}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
