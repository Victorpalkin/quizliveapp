'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { CallBackProps, Step } from 'react-joyride';
import { useOnboarding, type OnboardingKey } from '@/hooks/use-onboarding';

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
    target: '[data-tour="thoughts-gathering-card"]',
    content: 'Thoughts Gathering collects topics and ideas from your audience, then displays them as an interactive word cloud.',
    placement: 'bottom',
    title: 'Thoughts Gathering',
  },
  {
    target: '[data-tour="evaluation-card"]',
    content: 'Evaluation lets participants rate and prioritize items using custom metrics. Perfect for decision-making and retrospectives.',
    placement: 'bottom',
    title: 'Evaluation',
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

// Tour steps for the lobby page
const lobbyTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Your session is ready! Let\'s see how to get players to join.',
    placement: 'center',
    disableBeacon: true,
    title: 'Session Created!',
  },
  {
    target: '[data-tour="game-pin"]',
    content: 'Share this PIN with your audience. They can enter it at the join page to participate.',
    placement: 'bottom',
    title: 'Game PIN',
  },
  {
    target: '[data-tour="qr-code"]',
    content: 'For in-person events, display the QR code. Participants can scan it to join instantly.',
    placement: 'bottom',
    title: 'QR Code',
  },
  {
    target: '[data-tour="players-list"]',
    content: 'Watch players join in real-time. Their names will appear here as they connect.',
    placement: 'top',
    title: 'Player List',
  },
  {
    target: '[data-tour="start-game"]',
    content: 'When everyone has joined, click here to start. No more players can join after this!',
    placement: 'left',
    title: 'Start the Game',
  },
];

// Tour steps for the dashboard page
const dashboardTourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to your dashboard! This is where you manage all your activities and games.',
    placement: 'center',
    disableBeacon: true,
    title: 'Your Dashboard',
  },
  {
    target: '[data-tour="create-button"]',
    content: 'Click here to create a new quiz, thoughts gathering, or evaluation activity.',
    placement: 'bottom',
    title: 'Create New Content',
  },
  {
    target: '[data-tour="content-filters"]',
    content: 'Filter and sort your content to quickly find what you need.',
    placement: 'bottom',
    title: 'Filter & Sort',
  },
  {
    target: '[data-tour="content-grid"]',
    content: 'Your quizzes and activities appear here. Click any card to edit or launch it.',
    placement: 'top',
    title: 'Your Content',
  },
];

type TourType = 'create-activity' | 'quiz-form' | 'lobby' | 'dashboard';

interface CreationTourProps {
  /** Which tour to show */
  tourType: TourType;
  /** Whether to run the tour immediately */
  run?: boolean;
  /** Callback when tour completes or is skipped */
  onComplete?: () => void;
}

const tourConfig: Record<TourType, { key: OnboardingKey; steps: Step[] }> = {
  'create-activity': { key: 'create-activity-tour', steps: createActivityTourSteps },
  'quiz-form': { key: 'quiz-form-tour', steps: quizFormTourSteps },
  'lobby': { key: 'lobby-tour', steps: lobbyTourSteps },
  'dashboard': { key: 'dashboard-tour', steps: dashboardTourSteps },
};

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
 *
 * // In lobby page
 * <CreationTour tourType="lobby" />
 * ```
 *
 * Add `data-tour="..."` attributes to target elements in the UI.
 */
export function CreationTour({ tourType, run: runProp, onComplete }: CreationTourProps) {
  const config = tourConfig[tourType];
  const { shouldShow, complete, isLoaded } = useOnboarding(config.key);
  const [run, setRun] = useState(false);

  // Start the tour when loaded and should show
  useEffect(() => {
    if (isLoaded && shouldShow && runProp !== false) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, shouldShow, runProp]);

  const steps = config.steps;

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
      disableOverlayClose
      spotlightPadding={8}
      scrollOffset={80}
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
export function useTour(tourType: TourType) {
  const config = tourConfig[tourType];
  const { reset, complete } = useOnboarding(config.key);

  return {
    startTour: reset,
    endTour: complete,
  };
}
