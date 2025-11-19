'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Gauge } from 'lucide-react';
import Image from 'next/image';
import type { Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QuizPreviewProps {
  quiz: Quiz;
  showCorrectAnswers?: boolean;
}

const colorGradients = [
  { bg: 'from-purple-500/15 to-purple-500/8', border: 'border-purple-200 dark:border-purple-900' },
  { bg: 'from-blue-500/15 to-blue-500/8', border: 'border-blue-200 dark:border-blue-900' },
  { bg: 'from-green-500/15 to-green-500/8', border: 'border-green-200 dark:border-green-900' },
  { bg: 'from-amber-500/15 to-amber-500/8', border: 'border-amber-200 dark:border-amber-900' },
  { bg: 'from-rose-500/15 to-rose-500/8', border: 'border-rose-200 dark:border-rose-900' },
  { bg: 'from-cyan-500/15 to-cyan-500/8', border: 'border-cyan-200 dark:border-cyan-900' },
  { bg: 'from-indigo-500/15 to-indigo-500/8', border: 'border-indigo-200 dark:border-indigo-900' },
  { bg: 'from-pink-500/15 to-pink-500/8', border: 'border-pink-200 dark:border-pink-900' },
];

const indexToLetter = (index: number): string => {
  return String.fromCharCode(65 + index); // A, B, C, D, etc.
};

export function QuizPreview({ quiz, showCorrectAnswers = true }: QuizPreviewProps) {
  return (
    <div className="space-y-8">
      {/* Quiz Header - Minimalist */}
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold">{quiz.title}</h2>
        {quiz.description && (
          <p className="text-lg text-muted-foreground">{quiz.description}</p>
        )}
        <Badge variant="secondary" className="rounded-full">
          {quiz.questions.length} {quiz.questions.length === 1 ? 'Question' : 'Questions'}
        </Badge>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {quiz.questions.map((question, qIndex) => (
          <Card key={qIndex} className="rounded-2xl shadow-md border-card-border">
            <CardHeader className="space-y-4">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="rounded-full text-sm font-normal">
                      Question {qIndex + 1}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {question.type === 'slider' ? 'Slider' :
                       question.type === 'slide' ? 'Slide' :
                       question.type === 'single-choice' ? 'Single Choice' :
                       question.type === 'multiple-choice' ? 'Multiple Choice' :
                       question.type === 'poll-single' ? 'Poll' :
                       'Poll (Multiple)'}
                    </Badge>
                  </div>
                  <p className="text-xl font-semibold leading-tight">
                    {question.text}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">{question.timeLimit || 20}s</span>
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
              {/* Single Choice Question */}
              {question.type === 'single-choice' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.answers.map((answer, aIndex) => {
                      const isCorrect = question.correctAnswerIndex === aIndex;
                      const colors = colorGradients[aIndex % colorGradients.length];

                      return (
                        <div
                          key={aIndex}
                          className={cn(
                            'relative p-6 rounded-xl border transition-all duration-300',
                            `bg-gradient-to-r ${colors.bg}`,
                            colors.border,
                            showCorrectAnswers && isCorrect &&
                              'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-background'
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-semibold text-muted-foreground">
                              {indexToLetter(aIndex)}
                            </div>
                            <div className="flex-1 text-base font-normal">
                              {answer.text}
                            </div>
                            {showCorrectAnswers && isCorrect && (
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Multiple Choice Question */}
              {question.type === 'multiple-choice' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {question.correctAnswerIndices.length} correct {question.correctAnswerIndices.length === 1 ? 'answer' : 'answers'}
                    </Badge>
                    {question.showAnswerCount !== false && (
                      <Badge variant="outline" className="rounded-full text-xs">
                        Shows count
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.answers.map((answer, aIndex) => {
                      const isCorrect = question.correctAnswerIndices.includes(aIndex);
                      const colors = colorGradients[aIndex % colorGradients.length];

                      return (
                        <div
                          key={aIndex}
                          className={cn(
                            'relative p-6 rounded-xl border transition-all duration-300',
                            `bg-gradient-to-r ${colors.bg}`,
                            colors.border,
                            showCorrectAnswers && isCorrect &&
                              'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-background'
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-semibold text-muted-foreground">
                              {indexToLetter(aIndex)}
                            </div>
                            <div className="flex-1 text-base font-normal">
                              {answer.text}
                            </div>
                            {showCorrectAnswers && isCorrect && (
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Slider Question */}
              {question.type === 'slider' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gauge className="h-5 w-5" />
                    <p className="text-sm font-medium">Numeric Range</p>
                  </div>

                  <div className="bg-muted/50 p-6 rounded-xl space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Min</p>
                        <p className="text-2xl font-semibold">{question.minValue}{question.unit}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Max</p>
                        <p className="text-2xl font-semibold">{question.maxValue}{question.unit}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Step</p>
                        <p className="text-2xl font-semibold">{question.step || 1}</p>
                      </div>
                    </div>

                    {showCorrectAnswers && (
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">Correct Answer</p>
                            <p className="text-3xl font-semibold text-green-600 dark:text-green-500">
                              {question.correctValue}{question.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Scoring based on proximity to correct answer
                  </p>
                </div>
              )}

              {/* Slide Question */}
              {question.type === 'slide' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full text-xs">
                      Informational
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-xs">
                      No scoring
                    </Badge>
                  </div>

                  {question.description && (
                    <div className="bg-muted/50 p-6 rounded-xl">
                      <p className="text-base whitespace-pre-wrap">{question.description}</p>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Players view and click Continue • No points awarded
                  </p>
                </div>
              )}

              {/* Poll Single Question */}
              {question.type === 'poll-single' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full text-xs">
                      Poll
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-xs">
                      No scoring
                    </Badge>
                  </div>

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
                    Results shown as distribution • No points awarded
                  </p>
                </div>
              )}

              {/* Poll Multiple Question */}
              {question.type === 'poll-multiple' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full text-xs">
                      Poll (Multiple)
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-xs">
                      No scoring
                    </Badge>
                  </div>

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
                    Multiple selections allowed • Results shown as distribution • No points awarded
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
