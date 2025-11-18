'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion } from '@/lib/types';
import {
  DiamondIcon,
  TriangleIcon,
  CircleIcon,
  SquareIcon,
} from '@/components/app/quiz-icons';
import { ANSWER_COLORS } from '@/lib/constants';

const answerIcons = [
  TriangleIcon,
  DiamondIcon,
  SquareIcon,
  CircleIcon,
  TriangleIcon, // Repeat for more than 4
  DiamondIcon,
  SquareIcon,
  CircleIcon,
];

interface SingleChoiceQuestionProps {
  question: SingleChoiceQuestion;
  onSubmit: (answerIndex: number) => void;
  disabled: boolean;
}

export function SingleChoiceQuestionComponent({ question, onSubmit, disabled }: SingleChoiceQuestionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleAnswerClick = (index: number) => {
    if (disabled || selectedIndex !== null) return;
    setSelectedIndex(index);
    onSubmit(index);
  };

  return (
    <div className={cn("grid gap-4 w-full h-full p-4", question.answers.length > 4 ? "grid-cols-2 grid-rows-4" : "grid-cols-2 grid-rows-2")}>
      {question.answers.map((ans, i) => {
        const Icon = answerIcons[i % answerIcons.length];
        return (
          <button
            key={i}
            onClick={() => handleAnswerClick(i)}
            disabled={disabled || selectedIndex !== null}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg text-white transition-all duration-300 transform hover:scale-105 p-4',
              ANSWER_COLORS[i % ANSWER_COLORS.length],
              selectedIndex !== null && selectedIndex !== i ? 'opacity-25' : '',
              selectedIndex !== null && selectedIndex === i ? 'scale-110 border-4 border-white' : ''
            )}
          >
            <Icon className="w-16 h-16 md:w-24 md:h-24 mb-2" />
            <span className="text-xl md:text-2xl font-bold">{ans.text}</span>
          </button>
        );
      })}
    </div>
  );
}

interface MultipleChoiceQuestionProps {
  question: MultipleChoiceQuestion;
  onSubmit: (answerIndices: number[]) => void;
  disabled: boolean;
}

export function MultipleChoiceQuestionComponent({ question, onSubmit, disabled }: MultipleChoiceQuestionProps) {
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
    <div className="w-full h-full flex flex-col p-4 gap-4">
      <div className={cn("grid gap-4 flex-1", question.answers.length > 4 ? "grid-cols-2" : "grid-cols-2")}>
        {question.answers.map((ans, i) => {
          const Icon = answerIcons[i % answerIcons.length];
          const isSelected = selectedIndices.includes(i);
          return (
            <button
              key={i}
              onClick={() => toggleAnswer(i)}
              disabled={disabled || submitted}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg text-white transition-all duration-300 p-4 relative',
                ANSWER_COLORS[i % ANSWER_COLORS.length],
                isSelected ? 'scale-105 border-4 border-white' : '',
                submitted && !isSelected ? 'opacity-25' : ''
              )}
            >
              <Checkbox
                checked={isSelected}
                className="absolute top-2 right-2 h-6 w-6 border-2 border-white data-[state=checked]:bg-white data-[state=checked]:text-primary"
                disabled={disabled || submitted}
              />
              <Icon className="w-16 h-16 md:w-20 md:h-20 mb-2" />
              <span className="text-lg md:text-xl font-bold">{ans.text}</span>
            </button>
          );
        })}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || submitted || selectedIndices.length === 0}
        size="lg"
        className="w-full text-xl py-6"
      >
        {submitted ? 'Answers Submitted' : `Submit ${selectedIndices.length} Answer${selectedIndices.length !== 1 ? 's' : ''}`}
      </Button>
    </div>
  );
}

interface SliderQuestionProps {
  question: SliderQuestion;
  onSubmit: (value: number) => void;
  disabled: boolean;
}

export function SliderQuestionComponent({ question, onSubmit, disabled }: SliderQuestionProps) {
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
      <div className="text-center">
        <p className="text-6xl font-bold text-primary mb-4">
          {sliderValue.toFixed(question.step && question.step < 1 ? Math.abs(Math.log10(question.step)) : 0)}
          {question.unit && <span className="text-4xl ml-2 text-muted-foreground">{question.unit}</span>}
        </p>
        <p className="text-sm text-muted-foreground">
          Range: {question.minValue}{question.unit} - {question.maxValue}{question.unit}
        </p>
      </div>
      <Slider
        value={[sliderValue]}
        onValueChange={(val) => setSliderValue(val[0])}
        min={question.minValue}
        max={question.maxValue}
        step={question.step || 1}
        disabled={disabled || submitted}
        className="w-full"
      />
      <Button
        onClick={handleSubmit}
        disabled={disabled || submitted}
        size="lg"
        className="w-full text-xl py-8"
      >
        {submitted ? 'Answer Submitted' : 'Submit Answer'}
      </Button>
    </div>
  );
}

interface SlideQuestionProps {
  question: SlideQuestion;
}

export function SlideQuestionComponent({ question }: SlideQuestionProps) {
  return (
    <div className="w-full max-w-2xl px-8 space-y-8">
      <div className="text-center space-y-6">
        <h2 className="text-4xl font-bold text-primary">
          {question.text}
        </h2>
        {question.description && (
          <p className="text-xl text-muted-foreground whitespace-pre-wrap">
            {question.description}
          </p>
        )}
        <p className="text-lg text-muted-foreground pt-8">
          Waiting for host to continue...
        </p>
      </div>
    </div>
  );
}
