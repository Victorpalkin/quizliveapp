'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';
import { CircularTimer } from '@/components/app/circular-timer';
import { AnswerButton } from '@/components/app/answer-button';
import { QuestionTypeBadges } from '@/components/app/question-type-badges';
import type { Question } from '@/lib/types';

const indexToLetter = (index: number): string => String.fromCharCode(65 + index);

interface QuestionStateProps {
  question: Question;
  time: number;
  timeLimit: number;
  isComputingResults: boolean;
  answerCounts: number[];
  totalAnswered: number;
}

export function QuestionState({
  question,
  time,
  timeLimit,
  isComputingResults,
  answerCounts,
  totalAnswered,
}: QuestionStateProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center text-center relative">
      {/* Computing Results Overlay */}
      {isComputingResults && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Calculating results...</p>
        </div>
      )}

      <div className="absolute top-4 right-4">
        <CircularTimer time={time} timeLimit={timeLimit} size={80} />
      </div>

      <div className="w-full max-w-4xl">
        <Card className="bg-card text-card-foreground mb-4">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-3">
              <p className="text-3xl font-bold">{question.text}</p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <QuestionTypeBadges question={question} />
                {question?.submittedBy && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    <Users className="w-3 h-3 mr-1" />
                    Submitted by {question.submittedBy}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {question.imageUrl && (
          <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-lg overflow-hidden my-6">
            <Image src={question.imageUrl} alt="Question image" layout="fill" objectFit="contain" />
          </div>
        )}
      </div>

      {/* Question Type Display */}
      {question.type === 'slide' ? (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge variant="secondary" className="text-sm">Informational Slide</Badge>
                <h2 className="text-4xl font-bold text-primary">{question.text}</h2>
                {question.description && (
                  <p className="text-xl text-muted-foreground whitespace-pre-wrap mt-4">
                    {question.description}
                  </p>
                )}
              </div>
              <p className="text-lg text-muted-foreground">Players are viewing this slide...</p>
            </div>
          </CardContent>
        </Card>
      ) : question.type === 'slider' ? (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardContent className="p-8 text-center">
            <p className="text-lg text-muted-foreground mb-4">Players are submitting their answers...</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Range:</p>
                <p className="text-4xl font-bold">
                  {question.minValue}{question.unit} - {question.maxValue}{question.unit}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : question.type === 'free-response' || question.type === 'poll-free-text' ? (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardContent className="p-8 text-center">
            <p className="text-lg text-muted-foreground mb-4">Players are typing their answers...</p>
            <div className="space-y-4">
              <Badge variant="secondary" className="text-sm">{question.type === 'poll-free-text' ? 'Poll Free Text' : 'Free Response Question'}</Badge>
              {question.type === 'free-response' && (
                <p className="text-sm text-muted-foreground">
                  {question.allowTypos !== false ? 'Typo tolerance enabled' : 'Exact match required'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : 'answers' in question ? (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 w-full max-w-4xl">
          {question.answers.map((ans: { text: string }, i: number) => (
            <AnswerButton
              key={i}
              letter={indexToLetter(i)}
              text={ans.text}
              disabled={true}
              colorIndex={i}
              showLiveCount={question.showLiveResults}
              count={answerCounts[i] || 0}
              totalCount={totalAnswered}
            />
          ))}
        </div>
      ) : null}
    </main>
  );
}
