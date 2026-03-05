'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageSquare, ListChecks, AlignLeft, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { PollActivity } from '@/lib/types';

// Poll question types for AI-generated polls
interface PollAnswer {
  text: string;
}

// Generic poll question that accepts any of the poll types
interface GenericPollQuestion {
  type: 'poll-single' | 'poll-multiple' | 'poll-free-text';
  text: string;
  answers?: PollAnswer[];
  placeholder?: string;
  maxLength?: number;
  timeLimit?: number;
  showLiveResults?: boolean;
  imageUrl?: string;
}

// Accept either PollActivity or the AI-generated format
interface PollPreviewProps {
  poll: PollActivity | {
    title: string;
    description?: string;
    questions: GenericPollQuestion[];
    allowAnonymous?: boolean;
  };
}

// Helper to check if poll is PollActivity
function isPollActivity(poll: PollPreviewProps['poll']): poll is PollActivity {
  return 'config' in poll;
}

const colorGradients = [
  { bg: 'from-teal-500/15 to-teal-500/8', border: 'border-teal-200 dark:border-teal-900' },
  { bg: 'from-cyan-500/15 to-cyan-500/8', border: 'border-cyan-200 dark:border-cyan-900' },
  { bg: 'from-emerald-500/15 to-emerald-500/8', border: 'border-emerald-200 dark:border-emerald-900' },
  { bg: 'from-sky-500/15 to-sky-500/8', border: 'border-sky-200 dark:border-sky-900' },
  { bg: 'from-blue-500/15 to-blue-500/8', border: 'border-blue-200 dark:border-blue-900' },
  { bg: 'from-indigo-500/15 to-indigo-500/8', border: 'border-indigo-200 dark:border-indigo-900' },
];

const indexToLetter = (index: number): string => {
  return String.fromCharCode(65 + index); // A, B, C, D, etc.
};

export function PollPreview({ poll }: PollPreviewProps) {
  // Normalize to consistent format
  const allowAnonymous = isPollActivity(poll) ? poll.config?.allowAnonymous : poll.allowAnonymous;
  const questions = poll.questions as GenericPollQuestion[];

  return (
    <div className="space-y-8">
      {/* Poll Header */}
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold">{poll.title}</h2>
        {poll.description && (
          <p className="text-lg text-muted-foreground">{poll.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full">
            {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
          </Badge>
          {allowAnonymous && (
            <Badge variant="outline" className="rounded-full">
              Anonymous allowed
            </Badge>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, qIndex) => (
          <Card key={qIndex} className="rounded-2xl shadow-md border-card-border">
            <CardHeader className="space-y-4">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="rounded-full text-sm font-normal">
                      Question {qIndex + 1}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full text-xs flex items-center gap-1">
                      {question.type === 'poll-single' && (
                        <>
                          <MessageSquare className="h-3 w-3" />
                          Single Choice
                        </>
                      )}
                      {question.type === 'poll-multiple' && (
                        <>
                          <ListChecks className="h-3 w-3" />
                          Multiple Choice
                        </>
                      )}
                      {question.type === 'poll-free-text' && (
                        <>
                          <AlignLeft className="h-3 w-3" />
                          Free Text
                        </>
                      )}
                    </Badge>
                    {question.showLiveResults !== false ? (
                      <Badge variant="outline" className="rounded-full text-xs flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Live results
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full text-xs flex items-center gap-1 text-muted-foreground">
                        <EyeOff className="h-3 w-3" />
                        Hidden results
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-semibold leading-tight">
                    {question.text}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">{question.timeLimit || 30}s</span>
                </div>
              </div>

              {/* Question Image */}
              {question.imageUrl && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
                  <Image
                    src={question.imageUrl}
                    alt={`Question ${qIndex + 1} image`}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Single Choice Poll */}
              {question.type === 'poll-single' && question.answers && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.answers.map((answer, aIndex) => {
                      const colors = colorGradients[aIndex % colorGradients.length];

                      return (
                        <div
                          key={aIndex}
                          className={cn(
                            'p-6 rounded-xl border',
                            `bg-gradient-to-r ${colors.bg}`,
                            colors.border
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-semibold text-muted-foreground">
                              {indexToLetter(aIndex)}
                            </div>
                            <div className="text-base font-normal">
                              {answer.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select one option
                  </p>
                </div>
              )}

              {/* Multiple Choice Poll */}
              {question.type === 'poll-multiple' && question.answers && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.answers.map((answer, aIndex) => {
                      const colors = colorGradients[aIndex % colorGradients.length];

                      return (
                        <div
                          key={aIndex}
                          className={cn(
                            'p-6 rounded-xl border',
                            `bg-gradient-to-r ${colors.bg}`,
                            colors.border
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-semibold text-muted-foreground">
                              {indexToLetter(aIndex)}
                            </div>
                            <div className="text-base font-normal">
                              {answer.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select all that apply
                  </p>
                </div>
              )}

              {/* Free Text Poll */}
              {question.type === 'poll-free-text' && (
                <div className="space-y-4">
                  <div className="bg-muted/50 p-6 rounded-xl space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 min-h-[100px] flex items-center justify-center">
                      <p className="text-muted-foreground italic">
                        {question.placeholder || 'Share your thoughts...'}
                      </p>
                    </div>
                    {question.maxLength && (
                      <p className="text-xs text-muted-foreground text-right">
                        Max {question.maxLength} characters
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Open-ended response
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
