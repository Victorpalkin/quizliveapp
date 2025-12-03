'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import type { GameAnalytics, QuestionStats } from '@/lib/types';

interface QuestionsTabProps {
  analytics: GameAnalytics;
}

export function QuestionsTab({ analytics }: QuestionsTabProps) {
  const { questionStats } = analytics;
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = questionStats[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(questionStats.length - 1, prev + 1));
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questionStats.length}
        </span>
        <Button
          variant="outline"
          onClick={goToNext}
          disabled={currentIndex === questionStats.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Question Card */}
      <QuestionCard question={currentQuestion} totalPlayers={analytics.totalPlayers} />

      {/* Quick Navigation Pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {questionStats.map((q, idx) => (
          <Button
            key={idx}
            variant={idx === currentIndex ? 'default' : 'outline'}
            size="sm"
            className="w-10 h-10"
            onClick={() => setCurrentIndex(idx)}
          >
            {idx + 1}
          </Button>
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ question, totalPlayers }: { question: QuestionStats; totalPlayers: number }) {
  const isScored = !['slide', 'poll-single', 'poll-multiple'].includes(question.questionType);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Q{question.questionIndex + 1}: {question.questionText}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{formatQuestionType(question.questionType)}</Badge>
              {question.submittedBy && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {question.submittedBy}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Image */}
        {question.imageUrl && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
            <Image
              src={question.imageUrl}
              alt="Question image"
              fill
              className="object-contain"
            />
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Answered" value={question.totalAnswered} total={totalPlayers} />
          <StatBox label="Timed Out" value={question.totalTimeout} total={totalPlayers} />
          {isScored && (
            <>
              <StatBox label="Correct" value={question.correctCount} total={question.totalAnswered} />
              <StatBox label="Avg Points" value={Math.round(question.avgPoints)} />
            </>
          )}
        </div>

        {/* Correct Rate (for scored questions) */}
        {isScored && question.totalAnswered > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Correct Rate</span>
              <span className="font-medium">{question.correctRate.toFixed(1)}%</span>
            </div>
            <Progress value={question.correctRate} />
          </div>
        )}

        {/* Answer Distribution */}
        {question.answerDistribution && (
          <AnswerDistribution distribution={question.answerDistribution} totalAnswered={question.totalAnswered} />
        )}

        {/* Slider Distribution */}
        {question.sliderDistribution && (
          <SliderDistribution distribution={question.sliderDistribution} />
        )}

        {/* Free Response Distribution */}
        {question.freeResponseDistribution && (
          <FreeResponseDistribution distribution={question.freeResponseDistribution} />
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div className="text-center p-3 bg-muted rounded-lg">
      <p className="text-2xl font-bold">
        {value}
        {total !== undefined && <span className="text-sm text-muted-foreground">/{total}</span>}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AnswerDistribution({
  distribution,
  totalAnswered,
}: {
  distribution: NonNullable<QuestionStats['answerDistribution']>;
  totalAnswered: number;
}) {
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Answer Distribution</h4>
      {distribution.map((answer, idx) => {
        const percentage = totalAnswered > 0 ? (answer.count / totalAnswered) * 100 : 0;
        const barWidth = (answer.count / maxCount) * 100;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              {answer.isCorrect ? (
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={answer.isCorrect ? 'font-medium' : ''}>
                {answer.label}
              </span>
              <span className="ml-auto text-muted-foreground">
                {answer.count} ({percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded overflow-hidden">
              <div
                className={`h-full transition-all ${answer.isCorrect ? 'bg-green-500' : 'bg-primary/50'}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SliderDistribution({
  distribution,
}: {
  distribution: NonNullable<QuestionStats['sliderDistribution']>;
}) {
  const { correctValue, minValue, maxValue, unit, playerValues } = distribution;

  if (playerValues.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No slider responses recorded</div>
    );
  }

  // Calculate stats
  const avgValue = playerValues.reduce((a, b) => a + b, 0) / playerValues.length;
  const sortedValues = [...playerValues].sort((a, b) => a - b);
  const medianValue = sortedValues[Math.floor(sortedValues.length / 2)];

  // Build histogram bins
  const range = maxValue - minValue;
  const binCount = 10;
  const binSize = range / binCount;
  const bins = Array(binCount).fill(0);

  playerValues.forEach(val => {
    const binIndex = Math.min(Math.floor((val - minValue) / binSize), binCount - 1);
    bins[binIndex]++;
  });

  const maxBinCount = Math.max(...bins);

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Slider Responses</h4>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-2 bg-muted rounded">
          <p className="text-sm text-muted-foreground">Correct</p>
          <p className="font-bold">{correctValue}{unit}</p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-sm text-muted-foreground">Average</p>
          <p className="font-bold">{avgValue.toFixed(1)}{unit}</p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-sm text-muted-foreground">Median</p>
          <p className="font-bold">{medianValue}{unit}</p>
        </div>
      </div>

      {/* Histogram */}
      <div className="flex items-end gap-1 h-24">
        {bins.map((count, idx) => {
          const height = maxBinCount > 0 ? (count / maxBinCount) * 100 : 0;
          const binStart = minValue + idx * binSize;
          const isCorrectBin = correctValue >= binStart && correctValue < binStart + binSize;

          return (
            <div
              key={idx}
              className="flex-1 group relative"
              title={`${binStart.toFixed(0)}-${(binStart + binSize).toFixed(0)}${unit || ''}: ${count} players`}
            >
              <div
                className={`w-full rounded-t transition-all ${isCorrectBin ? 'bg-green-500' : 'bg-primary'}`}
                style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minValue}{unit}</span>
        <span>{maxValue}{unit}</span>
      </div>
    </div>
  );
}

function FreeResponseDistribution({
  distribution,
}: {
  distribution: NonNullable<QuestionStats['freeResponseDistribution']>;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Top Responses</h4>
      {distribution.slice(0, 10).map((response, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          {response.isCorrect ? (
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className={`flex-1 ${response.isCorrect ? 'font-medium' : ''}`}>
            {response.text || '(empty)'}
          </span>
          <Badge variant="secondary">{response.count}</Badge>
        </div>
      ))}
    </div>
  );
}

function formatQuestionType(type: string): string {
  const typeMap: Record<string, string> = {
    'single-choice': 'Single Choice',
    'multiple-choice': 'Multiple Choice',
    'slider': 'Slider',
    'slide': 'Info Slide',
    'free-response': 'Free Response',
    'poll-single': 'Poll (Single)',
    'poll-multiple': 'Poll (Multiple)',
  };
  return typeMap[type] || type;
}
