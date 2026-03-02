'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for auto-hiding UI elements after a period of inactivity.
 * Uses setTimeout instead of setInterval for efficiency.
 * Tracks mouse movement and keyboard activity.
 */
export function useAutoHide(timeoutMs: number = 3000) {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setIsVisible(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    const handleActivity = () => {
      resetTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);

    // Start the initial timer
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  return { isVisible, resetTimer };
}
