import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CircularTimer } from '@/components/app/circular-timer';
import type { Question, Game } from '@/lib/types';
import {
  SingleChoiceQuestionComponent,
  MultipleChoiceQuestionComponent,
  SliderQuestionComponent,
  SlideQuestionComponent,
  FreeResponseQuestionComponent,
  PollSingleQuestionComponent,
  PollMultipleQuestionComponent
} from '@/components/app/player-question';
import { QuestionCounter } from '@/components/app/question-counter';
import { QuestionTypeBadges } from '@/components/app/question-type-badges';
import { Users } from 'lucide-react';

interface QuestionScreenProps {
  question: Question;
  game: Game;
  totalQuestions: number;
  time: number;
  timeLimit: number;
  answerSelected: boolean;
  onSubmitSingleChoice: (answerIndex: number) => void;
  onSubmitMultipleChoice: (answerIndices: number[]) => void;
  onSubmitSlider: (value: number) => void;
  onSubmitFreeResponse: (textAnswer: string) => void;
  onSubmitPollSingle: (answerIndex: number) => void;
  onSubmitPollMultiple: (answerIndices: number[]) => void;
  quizLoading: boolean;
}

export function QuestionScreen({
  question,
  game,
  totalQuestions,
  time,
  timeLimit,
  answerSelected,
  onSubmitSingleChoice,
  onSubmitMultipleChoice,
  onSubmitSlider,
  onSubmitFreeResponse,
  onSubmitPollSingle,
  onSubmitPollMultiple,
  quizLoading
}: QuestionScreenProps) {
  if (quizLoading || !question || !game) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <header className="p-4 flex items-center justify-center flex-col gap-2">
        <p className="text-2xl font-bold text-center">{question.text}</p>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <QuestionTypeBadges question={question} />
          {question?.submittedBy && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              <Users className="w-3 h-3 mr-1" />
              Submitted by {question.submittedBy}
            </Badge>
          )}
        </div>
        {question.type === 'multiple-choice' && question.showAnswerCount !== false && (question as any).expectedAnswerCount && (
          <p className="text-sm text-muted-foreground">
            Select {(question as any).expectedAnswerCount} answer{(question as any).expectedAnswerCount > 1 ? 's' : ''}
          </p>
        )}
      </header>
      <div className="flex-grow flex items-center justify-center w-full relative">
        <div className="absolute top-4 right-4">
          <CircularTimer time={time} timeLimit={timeLimit} size={80} />
        </div>

        {question.type === 'single-choice' && (
          <SingleChoiceQuestionComponent
            question={question}
            onSubmit={onSubmitSingleChoice}
            disabled={answerSelected}
          />
        )}

        {question.type === 'multiple-choice' && (
          <MultipleChoiceQuestionComponent
            question={question}
            onSubmit={onSubmitMultipleChoice}
            disabled={answerSelected}
          />
        )}

        {question.type === 'slider' && (
          <SliderQuestionComponent
            question={question}
            onSubmit={onSubmitSlider}
            disabled={answerSelected}
          />
        )}

        {question.type === 'slide' && (
          <SlideQuestionComponent
            question={question}
          />
        )}

        {question.type === 'free-response' && (
          <FreeResponseQuestionComponent
            question={question}
            onSubmit={onSubmitFreeResponse}
            disabled={answerSelected}
          />
        )}

        {question.type === 'poll-single' && (
          <PollSingleQuestionComponent
            question={question}
            onSubmit={onSubmitPollSingle}
            disabled={answerSelected}
          />
        )}

        {question.type === 'poll-multiple' && (
          <PollMultipleQuestionComponent
            question={question}
            onSubmit={onSubmitPollMultiple}
            disabled={answerSelected}
          />
        )}
      </div>
      <footer className="p-4 text-center">
        <QuestionCounter
          current={game.currentQuestionIndex + 1}
          total={totalQuestions}
          variant="full"
        />
      </footer>
    </div>
  );
}
