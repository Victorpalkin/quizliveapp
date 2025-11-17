import { useEffect, useRef } from 'react';

/**
 * Custom hook to manage Screen Wake Lock API
 * Prevents screen from turning off on mobile devices during active gameplay
 *
 * @param enabled - Whether wake lock should be active
 * @returns Object with isSupported flag and error state
 */
export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isSupported = typeof window !== 'undefined' && 'wakeLock' in navigator;

  useEffect(() => {
    if (!isSupported || !enabled) {
      return;
    }

    let isActive = true;

    const requestWakeLock = async () => {
      try {
        // Only request if we don't already have a lock
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          const wakeLock = await navigator.wakeLock.request('screen');
          wakeLockRef.current = wakeLock;
          console.log('[WakeLock] Screen wake lock acquired');

          // Handle wake lock release (can happen when tab becomes hidden)
          wakeLock.addEventListener('release', () => {
            console.log('[WakeLock] Screen wake lock released');
          });
        }
      } catch (error) {
        // Wake lock request can fail if:
        // - Document is not active/visible
        // - Battery is too low
        // - User denied permission
        console.error('[WakeLock] Failed to acquire wake lock:', error);
      }
    };

    // Request wake lock initially
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Release wake lock when component unmounts or enabled becomes false
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        wakeLockRef.current.release()
          .then(() => {
            console.log('[WakeLock] Screen wake lock released on cleanup');
            wakeLockRef.current = null;
          })
          .catch((error) => {
            console.error('[WakeLock] Failed to release wake lock:', error);
          });
      }
    };
  }, [enabled, isSupported]);

  return {
    isSupported,
  };
}
