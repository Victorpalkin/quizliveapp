'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANSWER_COLOR_GRADIENTS } from '@/lib/colors';
import { SlidePlayerProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';
import { useQuizPollResponses } from '@/firebase/presentation';

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;

interface PollResult {
  slideId: string;
  questionText: string;
  isMultiple: boolean;
  distribution: {
    text: string;
    count: number;
    percentage: number;
  }[];
  totalResponses: number;
  totalVotes: number;
  topAnswerIndex: number;
}

export function PollResultsPlayer({ slide, presentation, game }: SlidePlayerProps) {
  const title = slide.resultsTitle || 'Poll Results';
  const sourceSlideIds = slide.sourceSlideIds || [];

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
          response.answerIndices.forEach(idx => {
            if (idx >= 0 && idx < answerCount) {
              counts[idx]++;
            }
          });
        } else if (response.answerIndex !== undefined && response.answerIndex < answerCount) {
          counts[response.answerIndex]++;
        }
      });

      const totalVotes = counts.reduce((sum, c) => sum + c, 0);
      const topAnswerIndex = counts.indexOf(Math.max(...counts));

      return {
        slideId: pollSlide.id,
        questionText: question.text,
        isMultiple,
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

  if (loading) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-[60vh]"
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
        className="flex flex-col items-center justify-center min-h-[60vh] p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No poll results to display</p>
      </motion.div>
    );
  }

  // Total participants across all polls
  const maxParticipants = Math.max(...pollResults.map(r => r.totalResponses));

  return (
    <motion.div
      className="flex flex-col p-4 gap-4 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
          <Users className="h-5 w-5 text-primary" />
          <span>{maxParticipants} participants</span>
        </div>
      </div>

      {/* Results - scrollable list for players */}
      <div className="space-y-4 overflow-auto max-h-[60vh]">
        {pollResults.map((result, pIndex) => {
          const maxCount = Math.max(...result.distribution.map(d => d.count), 1);

          return (
            <motion.div
              key={result.slideId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: pIndex * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  {/* Poll header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-sm">
                      P{pIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.questionText}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {result.totalResponses} votes
                    </span>
                  </div>

                  {/* Answer bars - compact for mobile */}
                  <div className="space-y-2">
                    {result.distribution.map((item, index) => {
                      const colors = ANSWER_COLOR_GRADIENTS[index % ANSWER_COLOR_GRADIENTS.length];
                      const isTop = index === result.topAnswerIndex && item.count > 0;

                      return (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                              `bg-gradient-to-br ${colors.badge}`,
                            )}
                          >
                            {String.fromCharCode(65 + index)}
                          </div>
                          <div className={cn(
                            'flex-1 h-8 rounded overflow-hidden relative',
                            `bg-gradient-to-r ${colors.bg}`,
                            isTop && 'ring-1 ring-primary',
                          )}>
                            <motion.div
                              className={cn(
                                'h-full rounded',
                                `bg-gradient-to-r ${colors.bar}`,
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.count / maxCount) * 100}%` }}
                              transition={{ delay: 0.2 + index * 0.05, duration: 0.4 }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-2">
                              <span className="text-xs font-medium truncate max-w-[60%]">
                                {item.text}
                              </span>
                              <span className="text-xs font-bold">
                                {Math.round(item.percentage)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
