'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { CallBackProps, Step } from 'react-joyride';
import { useOnboarding } from '@/hooks/use-onboarding';

// Dynamically import Joyride to avoid SSR issues
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

// Custom styles for the tour (Partial to avoid requiring all properties)
const tourStyles = {
  options: {
    arrowColor: 'hsl(var(--popover))',
    backgroundColor: 'hsl(var(--popover))',
    textColor: 'hsl(var(--popover-foreground))',
    primaryColor: 'hsl(var(--primary))',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 12,
    padding: 16,
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  tooltipContent: {
    fontSize: 14,
    lineHeight: 1.6,
  },
  buttonNext: {
    backgroundColor: 'hsl(var(--primary))',
    borderRadius: 8,
    color: 'hsl(var(--primary-foreground))',
    fontSize: 14,
    fontWeight: 500,
    padding: '8px 16px',
  },
  buttonBack: {
    color: 'hsl(var(--muted-foreground))',
    marginRight: 8,
  },
  buttonSkip: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: 14,
  },
  spotlight: {
    borderRadius: 12,
  },
};

// Tour steps for the activity creation page
const createActivityTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to Zivo! Let me show you around the activity creation options.',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome!',
  },
  {
    target: '[data-tour="quiz-card"]',
    content: 'Quizzes are great for testing knowledge with competitive scoring. Players answer questions and compete on a live leaderboard.',
    placement: 'bottom',
    title: 'Quiz',
  },
  {
    target: '[data-tour="interest-cloud-card"]',
    content: 'Interest Clouds collect topics and ideas from your audience, then display them as an interactive word cloud.',
    placement: 'bottom',
    title: 'Interest Cloud',
  },
  {
    target: '[data-tour="ranking-card"]',
    content: 'Rankings let participants rate and prioritize items using custom metrics. Perfect for decision-making and retrospectives.',
    placement: 'bottom',
    title: 'Ranking',
  },
];

// Tour steps for the quiz form
const quizFormTourSteps: Step[] = [
  {
    target: '[data-tour="quiz-title"]',
    content: 'Start by giving your quiz a descriptive title. This will be shown to players when they join.',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Quiz Title',
  },
  {
    target: '[data-tour="question-type"]',
    content: 'Choose from multiple question types: single choice, multiple choice, sliders, free response, polls, and info slides.',
    placement: 'right',
    title: 'Question Types',
  },
  {
    target: '[data-tour="add-question"]',
    content: 'Click here to add more questions. You can reorder them by dragging.',
    placement: 'top',
    title: 'Add Questions',
  },
  {
    target: '[data-tour="advanced-settings"]',
    content: 'Advanced settings include crowdsourcing, which lets players submit their own questions!',
    placement: 'top',
    title: 'Advanced Features',
  },
];

interface CreationTourProps {
  /** Which tour to show */
  tourType: 'create-activity' | 'quiz-form';
  /** Whether to run the tour immediately */
  run?: boolean;
  /** Callback when tour completes or is skipped */
  onComplete?: () => void;
}

/**
 * CreationTour - Guided tour component for onboarding new users
 *
 * Usage:
 * ```tsx
 * // In create activity page
 * <CreationTour tourType="create-activity" />
 *
 * // In quiz form page
 * <CreationTour tourType="quiz-form" />
 * ```
 *
 * Add `data-tour="..."` attributes to target elements in the UI.
 */
export function CreationTour({ tourType, run: runProp, onComplete }: CreationTourProps) {
  const onboardingKey = tourType === 'create-activity' ? 'create-activity-tour' : 'quiz-form-tour';
  const { shouldShow, complete, isLoaded } = useOnboarding(onboardingKey);
  const [run, setRun] = useState(false);

  // Start the tour when loaded and should show
  useEffect(() => {
    if (isLoaded && shouldShow && runProp !== false) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, shouldShow, runProp]);

  const steps = tourType === 'create-activity' ? createActivityTourSteps : quizFormTourSteps;

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;
    const finishedStatuses = ['finished', 'skipped'];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      complete();
      onComplete?.();
    }
  };

  if (!isLoaded || !shouldShow) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableScrolling={false}
      spotlightPadding={8}
      styles={tourStyles}
      callback={handleJoyrideCallback}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Got it!',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}

/**
 * Hook to manually trigger a tour
 */
export function useTour(tourType: 'create-activity' | 'quiz-form') {
  const onboardingKey = tourType === 'create-activity' ? 'create-activity-tour' : 'quiz-form-tour';
  const { reset, complete } = useOnboarding(onboardingKey);

  return {
    startTour: reset,
    endTour: complete,
  };
}
