import type {
  Question,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  SliderQuestion,
  SlideQuestion,
  PollSingleQuestion,
  PollMultipleQuestion,
} from './types';

// Individual question type guards
export function isSingleChoice(q: Question): q is SingleChoiceQuestion {
  return q.type === 'single-choice';
}

export function isMultipleChoice(q: Question): q is MultipleChoiceQuestion {
  return q.type === 'multiple-choice';
}

export function isSlider(q: Question): q is SliderQuestion {
  return q.type === 'slider';
}

export function isSlide(q: Question): q is SlideQuestion {
  return q.type === 'slide';
}

export function isPollSingle(q: Question): q is PollSingleQuestion {
  return q.type === 'poll-single';
}

export function isPollMultiple(q: Question): q is PollMultipleQuestion {
  return q.type === 'poll-multiple';
}

// Composite type guards for common patterns
export function hasAnswers(
  q: Question
): q is SingleChoiceQuestion | MultipleChoiceQuestion | PollSingleQuestion | PollMultipleQuestion {
  return 'answers' in q && Array.isArray(q.answers);
}

export function hasCorrectAnswer(
  q: Question
): q is SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion {
  return (
    q.type === 'single-choice' ||
    q.type === 'multiple-choice' ||
    q.type === 'slider'
  );
}

export function isInteractive(
  q: Question
): q is SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | PollSingleQuestion | PollMultipleQuestion {
  return q.type !== 'slide';
}

export function isPoll(
  q: Question
): q is PollSingleQuestion | PollMultipleQuestion {
  return q.type === 'poll-single' || q.type === 'poll-multiple';
}

export function hasPoints(
  q: Question
): q is SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion {
  return hasCorrectAnswer(q);
}
