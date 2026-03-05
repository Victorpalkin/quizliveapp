'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MessageSquare, ListChecks, AlignLeft, Users } from 'lucide-react';
import type { PollAnalytics, PollQuestionStats, PollActivity } from '@/lib/types';

interface QuestionsTabProps {
  analytics: PollAnalytics;
  poll: PollActivity | null;
}

export function QuestionsTab({ analytics, poll }: QuestionsTabProps) {
  const { questionStats, totalParticipants } = analytics;
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
      <QuestionCard question={currentQuestion} totalParticipants={totalParticipants} />

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

function QuestionCard({ question, totalParticipants }: { question: PollQuestionStats; totalParticipants: number }) {
  const getQuestionIcon = () => {
    switch (question.questionType) {
      case 'poll-single': return <MessageSquare className="h-4 w-4" />;
      case 'poll-multiple': return <ListChecks className="h-4 w-4" />;
      case 'poll-free-text': return <AlignLeft className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getQuestionTypeLabel = () => {
    switch (question.questionType) {
      case 'poll-single': return 'Single Choice';
      case 'poll-multiple': return 'Multiple Choice';
      case 'poll-free-text': return 'Free Text';
      default: return 'Poll';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Q{question.questionIndex + 1}: {question.questionText}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getQuestionIcon()}
              <Badge variant="secondary">{getQuestionTypeLabel()}</Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {question.totalResponded}/{totalParticipants} responded
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Response Rate */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-3xl font-bold text-teal-500">{question.responseRate.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">Response Rate</p>
        </div>

        {/* Answer Distribution */}
        {question.answerDistribution && (
          <AnswerDistribution distribution={question.answerDistribution} />
        )}

        {/* Free Text Groups */}
        {question.textGroups && (
          <TextGroups groups={question.textGroups} />
        )}
      </CardContent>
    </Card>
  );
}

function AnswerDistribution({
  distribution,
}: {
  distribution: NonNullable<PollQuestionStats['answerDistribution']>;
}) {
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Response Distribution</h4>
      {distribution.map((answer, idx) => {
        const barWidth = (answer.count / maxCount) * 100;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-xs font-medium">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{answer.label}</span>
              <span className="text-muted-foreground">
                {answer.count} ({answer.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TextGroups({
  groups,
}: {
  groups: NonNullable<PollQuestionStats['textGroups']>;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlignLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>No text responses collected</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Top Responses</h4>
      {groups.slice(0, 10).map((group, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="flex-1 truncate">{group.text || '(empty)'}</span>
          <Badge variant="secondary">{group.count} ({group.percentage.toFixed(0)}%)</Badge>
        </div>
      ))}
    </div>
  );
}
