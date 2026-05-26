'use client';

import { useState, useEffect, useCallback } from 'react';

type ConnectionStatus = 'connected' | 'reconnecting';

/**
 * Combines browser online/offline events with an optional Firestore
 * fromCache signal to produce a single connection status.
 */
export function useConnectionStatus(firestoreFromCache?: boolean): ConnectionStatus {
  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!browserOnline) return 'reconnecting';
  if (firestoreFromCache) return 'reconnecting';
  return 'connected';
}
