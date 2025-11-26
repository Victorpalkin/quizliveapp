'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { AnswerButton } from '@/components/app/answer-button';
import type { SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion, FreeResponseQuestion, PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';

// Helper to convert index to letter (0 = A, 1 = B, etc.)
const indexToLetter = (index: number): string => String.fromCharCode(65 + index);

interface SingleChoiceQuestionProps {
  question: SingleChoiceQuestion;
  onSubmit: (answerIndex: number) => void;
  disabled: boolean;
}

export const SingleChoiceQuestionComponent = React.memo(
  function SingleChoiceQuestionComponent({ question, onSubmit, disabled }: SingleChoiceQuestionProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleAnswerClick = (index: number) => {
      if (disabled || selectedIndex !== null) return;
      setSelectedIndex(index);
      onSubmit(index);
    };

    return (
      <div className="h-full flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 w-full max-w-4xl mx-auto px-4">
        {question.answers.map((ans, i) => (
          <AnswerButton
            key={i}
            letter={indexToLetter(i)}
            text={ans.text}
            selected={selectedIndex === i}
            disabled={disabled || selectedIndex !== null}
            onClick={() => handleAnswerClick(i)}
            colorIndex={i}
          />
        ))}
      </div>
    );
  }
);
SingleChoiceQuestionComponent.displayName = 'SingleChoiceQuestionComponent';

interface MultipleChoiceQuestionProps {
  question: MultipleChoiceQuestion;
  onSubmit: (answerIndices: number[]) => void;
  disabled: boolean;
}

export const MultipleChoiceQuestionComponent = React.memo(
  function MultipleChoiceQuestionComponent({ question, onSubmit, disabled }: MultipleChoiceQuestionProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleAnswer = (index: number) => {
    if (disabled || submitted) return;
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(idx => idx !== index) : [...prev, index]
    );
  };

  const handleSubmit = () => {
    if (disabled || submitted || selectedIndices.length === 0) return;
    setSubmitted(true);
    onSubmit(selectedIndices);
  };

  return (
    <div className="w-full h-full flex flex-col px-4 gap-4">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 flex-1">
        {question.answers.map((ans, i) => (
          <AnswerButton
            key={i}
            letter={indexToLetter(i)}
            text={ans.text}
            selected={selectedIndices.includes(i)}
            disabled={disabled || submitted}
            showCheck={true}
            onClick={() => toggleAnswer(i)}
            colorIndex={i}
          />
        ))}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || submitted || selectedIndices.length === 0}
        size="lg"
        className="w-full text-xl py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
      >
        {submitted ? 'Answers Submitted' : `Submit ${selectedIndices.length} Answer${selectedIndices.length !== 1 ? 's' : ''}`}
      </Button>
    </div>
  );
}
);
MultipleChoiceQuestionComponent.displayName = 'MultipleChoiceQuestionComponent';

interface SliderQuestionProps {
  question: SliderQuestion;
  onSubmit: (value: number) => void;
  disabled: boolean;
}

export const SliderQuestionComponent = React.memo(
  function SliderQuestionComponent({ question, onSubmit, disabled }: SliderQuestionProps) {
  const midpoint = (question.minValue + question.maxValue) / 2;
  const [sliderValue, setSliderValue] = useState<number>(midpoint);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (disabled || submitted) return;
    setSubmitted(true);
    onSubmit(sliderValue);
  };

  return (
    <div className="w-full max-w-2xl px-8 space-y-8">
      <div className="bg-card border border-card-border rounded-2xl p-8 shadow-lg">
        <div className="text-center space-y-4">
          <p className="text-6xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {sliderValue.toFixed(question.step && question.step < 1 ? Math.abs(Math.log10(question.step)) : 0)}
            {question.unit && <span className="text-4xl ml-2">{question.unit}</span>}
          </p>
          <p className="text-sm text-muted-foreground">
            Range: {question.minValue}{question.unit} - {question.maxValue}{question.unit}
          </p>
        </div>

        <div className="mt-8">
          <Slider
            value={[sliderValue]}
            onValueChange={(val) => setSliderValue(val[0])}
            min={question.minValue}
            max={question.maxValue}
            step={question.step || 1}
            disabled={disabled || submitted}
            className="w-full"
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={disabled || submitted}
        size="lg"
        className="w-full text-xl py-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
      >
        {submitted ? 'Answer Submitted' : 'Submit Answer'}
      </Button>
    </div>
  );
}
);
SliderQuestionComponent.displayName = 'SliderQuestionComponent';

interface SlideQuestionProps {
  question: SlideQuestion;
}

export const SlideQuestionComponent = React.memo(
  function SlideQuestionComponent({ question }: SlideQuestionProps) {
    return (
      <div className="w-full max-w-2xl px-8">
        <div className="bg-card border border-card-border rounded-2xl p-10 shadow-lg">
          <div className="text-center space-y-6">
            <h2 className="text-4xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {question.text}
            </h2>
            {question.description && (
              <p className="text-xl text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {question.description}
              </p>
            )}
            <p className="text-lg text-muted-foreground pt-8">
              Waiting for host to continue...
            </p>
          </div>
        </div>
      </div>
    );
  }
);
SlideQuestionComponent.displayName = 'SlideQuestionComponent';

interface PollSingleQuestionProps {
  question: PollSingleQuestion;
  onSubmit: (answerIndex: number) => void;
  disabled: boolean;
}

export const PollSingleQuestionComponent = React.memo(
  function PollSingleQuestionComponent({ question, onSubmit, disabled }: PollSingleQuestionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleAnswerClick = (index: number) => {
    if (disabled || selectedIndex !== null) return;
    setSelectedIndex(index);
    onSubmit(index);
  };

  return (
    <div className="h-full flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 w-full max-w-4xl mx-auto px-4">
      {question.answers.map((ans, i) => (
        <AnswerButton
          key={i}
          letter={indexToLetter(i)}
          text={ans.text}
          selected={selectedIndex === i}
          disabled={disabled || selectedIndex !== null}
          onClick={() => handleAnswerClick(i)}
          colorIndex={i}
        />
      ))}
    </div>
  );
}
);
PollSingleQuestionComponent.displayName = 'PollSingleQuestionComponent';

interface PollMultipleQuestionProps {
  question: PollMultipleQuestion;
  onSubmit: (answerIndices: number[]) => void;
  disabled: boolean;
}

export const PollMultipleQuestionComponent = React.memo(
  function PollMultipleQuestionComponent({ question, onSubmit, disabled }: PollMultipleQuestionProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleAnswer = (index: number) => {
    if (disabled || submitted) return;
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(idx => idx !== index) : [...prev, index]
    );
  };

  const handleSubmit = () => {
    if (disabled || submitted || selectedIndices.length === 0) return;
    setSubmitted(true);
    onSubmit(selectedIndices);
  };

  return (
    <div className="w-full h-full flex flex-col px-4 gap-4">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 flex-1">
        {question.answers.map((ans, i) => (
          <AnswerButton
            key={i}
            letter={indexToLetter(i)}
            text={ans.text}
            selected={selectedIndices.includes(i)}
            disabled={disabled || submitted}
            showCheck={true}
            onClick={() => toggleAnswer(i)}
            colorIndex={i}
          />
        ))}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || submitted || selectedIndices.length === 0}
        size="lg"
        className="w-full text-xl py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
      >
        {submitted ? 'Responses Submitted' : `Submit ${selectedIndices.length} Response${selectedIndices.length !== 1 ? 's' : ''}`}
      </Button>
    </div>
  );
}
);
PollMultipleQuestionComponent.displayName = 'PollMultipleQuestionComponent';

interface FreeResponseQuestionProps {
  question: FreeResponseQuestion;
  onSubmit: (textAnswer: string) => void;
  disabled: boolean;
}

export const FreeResponseQuestionComponent = React.memo(
  function FreeResponseQuestionComponent({ question, onSubmit, disabled }: FreeResponseQuestionProps) {
  const [textAnswer, setTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (disabled || submitted || !textAnswer.trim()) return;
    setSubmitted(true);
    onSubmit(textAnswer.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl px-8 space-y-8">
      <div className="bg-card border border-card-border rounded-2xl p-8 shadow-lg">
        <div className="text-center space-y-6">
          <p className="text-lg text-muted-foreground">Type your answer below</p>
          <Input
            type="text"
            placeholder="Enter your answer..."
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || submitted}
            className="text-2xl text-center h-16 font-medium"
            autoFocus
            maxLength={200}
          />
          {!question.caseSensitive && (
            <p className="text-sm text-muted-foreground">
              Case-insensitive • Minor typos allowed
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={disabled || submitted || !textAnswer.trim()}
        size="lg"
        className="w-full text-xl py-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
      >
        {submitted ? 'Answer Submitted' : 'Submit Answer'}
      </Button>
    </div>
  );
}
);
FreeResponseQuestionComponent.displayName = 'FreeResponseQuestionComponent';
