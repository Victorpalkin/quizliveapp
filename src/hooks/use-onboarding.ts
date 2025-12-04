'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Onboarding keys for tracking different tours/tips
 */
export type OnboardingKey =
  | 'dashboard-welcome'
  | 'create-activity-tour'
  | 'quiz-form-tour'
  | 'live-game-tour'
  | 'question-types-seen';

interface OnboardingState {
  completed: OnboardingKey[];
  dismissed: OnboardingKey[];
  lastSeen: Record<OnboardingKey, number>;
}

const STORAGE_KEY = 'zivo-onboarding';

const defaultState: OnboardingState = {
  completed: [],
  dismissed: [],
  lastSeen: {} as Record<OnboardingKey, number>,
};

/**
 * Load onboarding state from localStorage
 */
function loadState(): OnboardingState {
  if (typeof window === 'undefined') return defaultState;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    return { ...defaultState, ...JSON.parse(stored) };
  } catch {
    return defaultState;
  }
}

/**
 * Save onboarding state to localStorage
 */
function saveState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for managing onboarding/tour state
 *
 * Usage:
 * ```tsx
 * function Dashboard() {
 *   const { shouldShow, complete, dismiss, reset } = useOnboarding('dashboard-welcome');
 *
 *   if (shouldShow) {
 *     return <WelcomeModal onComplete={complete} onDismiss={dismiss} />;
 *   }
 *
 *   return <DashboardContent />;
 * }
 * ```
 */
export function useOnboarding(key: OnboardingKey) {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state on mount
  useEffect(() => {
    setState(loadState());
    setIsLoaded(true);
  }, []);

  // Check if this onboarding should be shown
  const shouldShow = isLoaded &&
    !state.completed.includes(key) &&
    !state.dismissed.includes(key);

  // Check if this onboarding was completed
  const isCompleted = state.completed.includes(key);

  // Check if this onboarding was dismissed
  const isDismissed = state.dismissed.includes(key);

  // Mark as completed (won't show again)
  const complete = useCallback(() => {
    setState((prev) => {
      const newState = {
        ...prev,
        completed: [...new Set([...prev.completed, key])],
        lastSeen: { ...prev.lastSeen, [key]: Date.now() },
      };
      saveState(newState);
      return newState;
    });
  }, [key]);

  // Mark as dismissed (won't show again, but different from completed)
  const dismiss = useCallback(() => {
    setState((prev) => {
      const newState = {
        ...prev,
        dismissed: [...new Set([...prev.dismissed, key])],
        lastSeen: { ...prev.lastSeen, [key]: Date.now() },
      };
      saveState(newState);
      return newState;
    });
  }, [key]);

  // Reset this specific onboarding (will show again)
  const reset = useCallback(() => {
    setState((prev) => {
      const newState = {
        ...prev,
        completed: prev.completed.filter((k) => k !== key),
        dismissed: prev.dismissed.filter((k) => k !== key),
      };
      saveState(newState);
      return newState;
    });
  }, [key]);

  return {
    shouldShow,
    isCompleted,
    isDismissed,
    isLoaded,
    complete,
    dismiss,
    reset,
  };
}

/**
 * Hook for managing multiple onboarding states at once
 */
export function useOnboardingMultiple(keys: OnboardingKey[]) {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setState(loadState());
    setIsLoaded(true);
  }, []);

  const shouldShowAny = isLoaded && keys.some(
    (key) => !state.completed.includes(key) && !state.dismissed.includes(key)
  );

  const getStatus = (key: OnboardingKey) => ({
    shouldShow: isLoaded && !state.completed.includes(key) && !state.dismissed.includes(key),
    isCompleted: state.completed.includes(key),
    isDismissed: state.dismissed.includes(key),
  });

  const completeAll = useCallback(() => {
    setState((prev) => {
      const newState = {
        ...prev,
        completed: [...new Set([...prev.completed, ...keys])],
        lastSeen: keys.reduce(
          (acc, key) => ({ ...acc, [key]: Date.now() }),
          prev.lastSeen
        ),
      };
      saveState(newState);
      return newState;
    });
  }, [keys]);

  const complete = useCallback((key: OnboardingKey) => {
    setState((prev) => {
      const newState = {
        ...prev,
        completed: [...new Set([...prev.completed, key])],
        lastSeen: { ...prev.lastSeen, [key]: Date.now() },
      };
      saveState(newState);
      return newState;
    });
  }, []);

  return {
    shouldShowAny,
    getStatus,
    complete,
    completeAll,
    isLoaded,
  };
}

/**
 * Reset all onboarding state (useful for testing)
 */
export function resetAllOnboarding(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
