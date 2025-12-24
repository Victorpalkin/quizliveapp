'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Trophy, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANSWER_COLOR_GRADIENTS } from '@/lib/colors';
import { SlidePlayerProps } from '../types';
import { SingleChoiceQuestion } from '@/lib/types';
import { useQuizPollResponses } from '@/firebase/presentation';

interface QuestionResult {
  slideId: string;
  questionText: string;
  distribution: {
    text: string;
    count: number;
    percentage: number;
    isCorrect: boolean;
  }[];
  totalResponses: number;
  correctPercentage: number;
}

export function QuizResultsPlayer({ slide, presentation, game }: SlidePlayerProps) {
  const title = slide.resultsTitle || 'Quiz Results';
  const displayMode = slide.resultsDisplayMode || 'individual';
  const sourceSlideIds = slide.sourceSlideIds || [];

  // Get selected quiz slides in order
  const selectedSlides = useMemo(() => {
    return presentation.slides
      .filter(s => sourceSlideIds.includes(s.id) && s.type === 'quiz')
      .sort((a, b) => a.order - b.order);
  }, [presentation.slides, sourceSlideIds]);

  // Fetch responses for all selected slides
  const { responses, loading } = useQuizPollResponses(game.id, sourceSlideIds);

  // Build results for each question
  const questionResults: QuestionResult[] = useMemo(() => {
    return selectedSlides.map(quizSlide => {
      const question = quizSlide.question as SingleChoiceQuestion | undefined;
      if (!question) {
        return {
          slideId: quizSlide.id,
          questionText: 'Unknown question',
          distribution: [],
          totalResponses: 0,
          correctPercentage: 0,
        };
      }

      const slideResponses = responses.get(quizSlide.id) || [];
      const answerCount = question.answers.length;

      // Count responses per answer
      const counts = new Array(answerCount).fill(0);
      slideResponses.forEach(response => {
        if (response.answerIndex !== undefined && response.answerIndex < answerCount) {
          counts[response.answerIndex]++;
        }
      });

      const total = slideResponses.length;
      const correctCount = counts[question.correctAnswerIndex] || 0;

      return {
        slideId: quizSlide.id,
        questionText: question.text,
        distribution: question.answers.map((answer, idx) => ({
          text: answer.text,
          count: counts[idx],
          percentage: total > 0 ? (counts[idx] / total) * 100 : 0,
          isCorrect: idx === question.correctAnswerIndex,
        })),
        totalResponses: total,
        correctPercentage: total > 0 ? (correctCount / total) * 100 : 0,
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
        <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No quiz results to display</p>
      </motion.div>
    );
  }

  // Overall stats
  const overallCorrect = questionResults.length > 0
    ? Math.round(questionResults.reduce((sum, r) => sum + r.correctPercentage, 0) / questionResults.length)
    : 0;

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
          <Trophy className="h-5 w-5 text-primary" />
          <span>{overallCorrect}% correct overall</span>
        </div>
      </div>

      {/* Results - scrollable list for players */}
      <div className="space-y-4 overflow-auto max-h-[60vh]">
        {questionResults.map((result, qIndex) => {
          const maxCount = Math.max(...result.distribution.map(d => d.count), 1);

          return (
            <motion.div
              key={result.slideId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qIndex * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  {/* Question header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                      result.correctPercentage >= 70 && 'bg-green-100 text-green-700',
                      result.correctPercentage < 30 && 'bg-red-100 text-red-700',
                      result.correctPercentage >= 30 && result.correctPercentage < 70 && 'bg-yellow-100 text-yellow-700',
                    )}>
                      Q{qIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.questionText}</p>
                    </div>
                    <span className={cn(
                      'font-bold',
                      result.correctPercentage >= 70 && 'text-green-500',
                      result.correctPercentage < 30 && 'text-red-500',
                    )}>
                      {Math.round(result.correctPercentage)}%
                    </span>
                  </div>

                  {/* Answer bars - compact for mobile */}
                  <div className="space-y-2">
                    {result.distribution.map((item, index) => {
                      const colors = ANSWER_COLOR_GRADIENTS[index % ANSWER_COLOR_GRADIENTS.length];

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
                            item.isCorrect && 'ring-1 ring-green-400',
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
                              <div className="flex items-center gap-1">
                                {item.isCorrect && <Check className="h-3 w-3 text-green-500" />}
                                <span className="text-xs font-bold">
                                  {Math.round(item.percentage)}%
                                </span>
                              </div>
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
