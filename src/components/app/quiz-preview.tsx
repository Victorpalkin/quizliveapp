'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Gauge } from 'lucide-react';
import Image from 'next/image';
import type { Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';

const answerColors = [
  'bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500',
  'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500',
];

interface QuizPreviewProps {
  quiz: Quiz;
  showCorrectAnswers?: boolean;
}

export function QuizPreview({ quiz, showCorrectAnswers = true }: QuizPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{quiz.title}</h2>
        {quiz.description && (
          <p className="text-muted-foreground">{quiz.description}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{quiz.questions.length} questions</Badge>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {quiz.questions.map((question, qIndex) => (
          <Card key={qIndex}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      Question {qIndex + 1}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {question.type === 'slider' ? 'Slider' : question.type === 'single-choice' ? 'Single Choice' : 'Multiple Choice'}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {question.text}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{question.timeLimit || 20}s</span>
                </div>
              </div>

              {/* Question Image */}
              {question.imageUrl && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden mt-4 bg-muted">
                  <Image
                    src={question.imageUrl}
                    alt={`Question ${qIndex + 1} image`}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </CardHeader>

            <CardContent>
              {/* Single Choice Question */}
              {question.type === 'single-choice' && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {showCorrectAnswers ? 'Correct Answer:' : 'Answers:'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.answers.map((answer, aIndex) => {
                      const isCorrect = question.correctAnswerIndex === aIndex;
                      const colorClass = answerColors[aIndex % answerColors.length];

                      return (
                        <div
                          key={aIndex}
                          className={cn(
                            'p-4 rounded-lg text-white relative',
                            colorClass,
                            showCorrectAnswers && isCorrect && 'ring-4 ring-green-400 ring-offset-2'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{answer.text}</span>
                            {showCorrectAnswers && isCorrect && (
                              <CheckCircle className="h-5 w-5 flex-shrink-0" />
                            )}
                          </div>
                          {showCorrectAnswers && isCorrect && (
                            <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">
                              Correct
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Multiple Choice Question */}
              {question.type === 'multiple-choice' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {question.correctAnswerIndices.length} correct answers
                    </Badge>
                    <Badge variant="default" className="text-xs">
                      Proportional scoring
                    </Badge>
                    {question.showAnswerCount !== false && (
                      <Badge variant="secondary" className="text-xs">
                        Shows answer count
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm font-medium text-muted-foreground">
                    {showCorrectAnswers ? 'Correct Answers:' : 'Answers:'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.answers.map((answer, aIndex) => {
                      const isCorrect = question.correctAnswerIndices.includes(aIndex);
                      const colorClass = answerColors[aIndex % answerColors.length];

                      return (
                        <div
                          key={aIndex}
                          className={cn(
                            'p-4 rounded-lg text-white relative',
                            colorClass,
                            showCorrectAnswers && isCorrect && 'ring-4 ring-green-400 ring-offset-2'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{answer.text}</span>
                            {showCorrectAnswers && isCorrect && (
                              <CheckCircle className="h-5 w-5 flex-shrink-0" />
                            )}
                          </div>
                          {showCorrectAnswers && isCorrect && (
                            <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">
                              Correct
                            </Badge>
                          )}
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
                    <p className="text-sm font-medium">
                      Numeric Range Question
                    </p>
                  </div>

                  <div className="bg-muted p-6 rounded-lg space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Minimum</p>
                        <p className="text-2xl font-bold">{question.minValue}{question.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Maximum</p>
                        <p className="text-2xl font-bold">{question.maxValue}{question.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Step</p>
                        <p className="text-2xl font-bold">{question.step || 1}</p>
                      </div>
                    </div>

                    {showCorrectAnswers && (
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Correct Answer</p>
                            <p className="text-3xl font-bold text-green-600">
                              {question.correctValue}{question.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    Players will use a slider to select a value. Scoring is based on proximity to the correct answer.
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
