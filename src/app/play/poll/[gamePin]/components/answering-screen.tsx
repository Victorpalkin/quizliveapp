'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send } from 'lucide-react';
import type { PollActivity, Game } from '@/lib/types';

interface AnsweringScreenProps {
  poll: PollActivity;
  game: Game;
  selectedIndex: number | null;
  setSelectedIndex: (index: number) => void;
  selectedIndices: number[];
  toggleMultipleChoice: (index: number) => void;
  textAnswer: string;
  setTextAnswer: (value: string) => void;
  isSubmitting: boolean;
  isAnswerValid: () => boolean;
  handleSubmitAnswer: () => void;
}

export function AnsweringScreen({
  poll,
  game,
  selectedIndex,
  setSelectedIndex,
  selectedIndices,
  toggleMultipleChoice,
  textAnswer,
  setTextAnswer,
  isSubmitting,
  isAnswerValid,
  handleSubmitAnswer,
}: AnsweringScreenProps) {
  const currentQuestion = poll.questions[game.currentQuestionIndex];
  if (!currentQuestion) return null;

  return (
    <div className="w-full max-w-lg space-y-6">
      <Card className="shadow-2xl">
        <CardHeader className="text-center">
          <div className="text-sm text-muted-foreground mb-2">
            Question {game.currentQuestionIndex + 1} of {poll.questions.length}
          </div>
          <CardTitle className="text-2xl">{currentQuestion.text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.type === 'poll-single' && 'answers' in currentQuestion && (
            <div className="space-y-3">
              {currentQuestion.answers.map((answer, index) => (
                <Button
                  key={index}
                  variant={selectedIndex === index ? "default" : "outline"}
                  className={`w-full py-6 text-left justify-start text-lg ${
                    selectedIndex === index ? 'bg-teal-500 hover:bg-teal-600' : ''
                  }`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <span className="w-8 h-8 flex items-center justify-center bg-muted rounded-full mr-3 text-sm font-medium">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {answer.text}
                </Button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'poll-multiple' && 'answers' in currentQuestion && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">Select all that apply</p>
              {currentQuestion.answers.map((answer, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedIndices.includes(index)
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => toggleMultipleChoice(index)}
                >
                  <Checkbox
                    checked={selectedIndices.includes(index)}
                    onCheckedChange={() => toggleMultipleChoice(index)}
                  />
                  <span className="text-lg">{answer.text}</span>
                </div>
              ))}
            </div>
          )}

          {currentQuestion.type === 'poll-free-text' && (
            <div className="space-y-3">
              <Textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder={currentQuestion.placeholder || 'Share your thoughts...'}
                className="min-h-[150px] text-lg"
                maxLength={currentQuestion.maxLength || 500}
              />
              <div className="text-right text-sm text-muted-foreground">
                {textAnswer.length}/{currentQuestion.maxLength || 500}
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting || !isAnswerValid()}
            className="w-full py-6 text-lg bg-gradient-to-r from-teal-500 to-cyan-500"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" /> Submit
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
