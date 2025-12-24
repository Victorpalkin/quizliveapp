'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANSWER_COLOR_GRADIENTS } from '@/lib/colors';
import { SlideHostProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';
import { useQuizPollResponses } from '@/firebase/presentation';

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;

interface PollResult {
  slideId: string;
  questionText: string;
  isMultiple: boolean;
  answers: { text: string }[];
  distribution: {
    text: string;
    count: number;
    percentage: number;
  }[];
  totalResponses: number;
  totalVotes: number; // For multiple choice, can exceed totalResponses
  topAnswerIndex: number;
}

export function PollResultsHost({ slide, presentation, game }: SlideHostProps) {
  const title = slide.resultsTitle || 'Poll Results';
  const displayMode = slide.resultsDisplayMode || 'individual';
  const sourceSlideIds = slide.sourceSlideIds || [];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Get selected poll slides in order
  const selectedSlides = useMemo(() => {
    return presentation.slides
      .filter(s => sourceSlideIds.includes(s.id) && s.type === 'poll')
      .sort((a, b) => a.order - b.order);
  }, [presentation.slides, sourceSlideIds]);

  // Fetch responses for all selected slides
  const { responses, loading } = useQuizPollResponses(game.id, sourceSlideIds);

  // Build results for each poll
  const pollResults: PollResult[] = useMemo(() => {
    return selectedSlides.map(pollSlide => {
      const question = pollSlide.question as PollQuestion | undefined;
      if (!question) {
        return {
          slideId: pollSlide.id,
          questionText: 'Unknown poll',
          isMultiple: false,
          answers: [],
          distribution: [],
          totalResponses: 0,
          totalVotes: 0,
          topAnswerIndex: 0,
        };
      }

      const isMultiple = question.type === 'poll-multiple';
      const slideResponses = responses.get(pollSlide.id) || [];
      const answerCount = question.answers.length;

      // Count responses per answer
      const counts = new Array(answerCount).fill(0);
      slideResponses.forEach(response => {
        if (isMultiple && response.answerIndices) {
          // Multiple choice - count each selected option
          response.answerIndices.forEach(idx => {
            if (idx >= 0 && idx < answerCount) {
              counts[idx]++;
            }
          });
        } else if (response.answerIndex !== undefined && response.answerIndex < answerCount) {
          // Single choice
          counts[response.answerIndex]++;
        }
      });

      const totalVotes = counts.reduce((sum, c) => sum + c, 0);
      const topAnswerIndex = counts.indexOf(Math.max(...counts));

      return {
        slideId: pollSlide.id,
        questionText: question.text,
        isMultiple,
        answers: question.answers,
        distribution: question.answers.map((answer, idx) => ({
          text: answer.text,
          count: counts[idx],
          percentage: totalVotes > 0 ? (counts[idx] / totalVotes) * 100 : 0,
        })),
        totalResponses: slideResponses.length,
        totalVotes,
        topAnswerIndex,
      };
    });
  }, [selectedSlides, responses]);

  const currentResult = pollResults[currentIndex];
  const maxCount = currentResult
    ? Math.max(...currentResult.distribution.map(d => d.count), 1)
    : 1;

  if (loading) {
    return (
      <motion.div
        className="w-full h-full flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-pulse text-muted-foreground">Loading results...</div>
      </motion.div>
    );
  }

  if (selectedSlides.length === 0) {
    return (
      <motion.div
        className="w-full h-full flex flex-col items-center justify-center p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-muted-foreground">No polls selected</h2>
        <p className="text-muted-foreground mt-2">Edit this slide to select poll questions.</p>
      </motion.div>
    );
  }

  // Combined view - summary grid
  if (displayMode === 'combined') {
    return (
      <motion.div
        className="w-full h-full flex flex-col p-8 overflow-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">{title}</h1>
          <p className="text-xl text-muted-foreground mt-2">
            {pollResults.length} {pollResults.length === 1 ? 'poll' : 'polls'}
          </p>
        </div>

        {/* Summary Grid */}
        <div className="w-full max-w-4xl mx-auto space-y-4">
          {pollResults.map((result, index) => {
            const topAnswer = result.distribution[result.topAnswerIndex];

            return (
              <motion.div
                key={result.slideId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold">
                        P{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.questionText}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.totalResponses} {result.totalResponses === 1 ? 'response' : 'responses'}
                          {result.isMultiple && result.totalVotes > result.totalResponses && (
                            <span> ({result.totalVotes} votes)</span>
                          )}
                        </p>
                      </div>
                      {topAnswer && (
                        <div className="text-right">
                          <p className="text-sm font-medium truncate max-w-32">{topAnswer.text}</p>
                          <p className="text-lg font-bold text-primary">
                            {Math.round(topAnswer.percentage)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Total participants */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-3">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {Math.max(...pollResults.map(r => r.totalResponses))} participants
            </span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Individual view - carousel
  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header with navigation */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">
            Poll {currentIndex + 1} of {pollResults.length}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentIndex(i => Math.min(pollResults.length - 1, i + 1))}
          disabled={currentIndex === pollResults.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {currentResult && (
        <motion.div
          key={currentResult.slideId}
          className="w-full max-w-4xl"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
        >
          {/* Question */}
          <Card className="mb-6 bg-card/95 backdrop-blur">
            <CardContent className="p-6 text-center">
              <h2 className="text-2xl font-bold">{currentResult.questionText}</h2>
              <p className="text-muted-foreground mt-2">
                {currentResult.totalResponses} {currentResult.totalResponses === 1 ? 'response' : 'responses'}
                {currentResult.isMultiple && currentResult.totalVotes > currentResult.totalResponses && (
                  <span> • {currentResult.totalVotes} total votes</span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Results Bars */}
          <div className="space-y-4">
            {currentResult.distribution.map((item, index) => {
              const colors = ANSWER_COLOR_GRADIENTS[index % ANSWER_COLOR_GRADIENTS.length];
              const isTop = index === currentResult.topAnswerIndex && item.count > 0;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    {/* Answer label */}
                    <div className="flex-shrink-0 w-48 flex items-center gap-2">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white',
                          `bg-gradient-to-br ${colors.badge}`,
                        )}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="font-medium truncate">{item.text}</span>
                    </div>

                    {/* Bar */}
                    <div className={cn(
                      'flex-1 h-12 rounded-lg overflow-hidden relative',
                      `bg-gradient-to-r ${colors.bg}`,
                      colors.border,
                      'border',
                      isTop && 'ring-2 ring-primary',
                    )}>
                      <motion.div
                        className={cn(
                          'h-full rounded-lg',
                          `bg-gradient-to-r ${colors.bar}`,
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.count / maxCount) * 100}%` }}
                        transition={{
                          delay: 0.3 + index * 0.1,
                          type: 'spring',
                          stiffness: 100,
                          damping: 15,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-end pr-4">
                        <span className="font-bold text-lg">
                          {item.count} ({Math.round(item.percentage)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Dots indicator */}
      {pollResults.length > 1 && (
        <div className="flex gap-2 mt-8">
          {pollResults.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-3 h-3 rounded-full transition-colors',
                index === currentIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
