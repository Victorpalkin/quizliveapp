import { useState, useEffect, useCallback } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { logError } from '@/lib/error-logging';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export function useAnonymousAuth() {
  const auth = useAuth();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!auth) return;

    let cancelled = false;

    async function attemptSignIn() {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (cancelled) return;
        try {
          await signInAnonymously(auth);
          return;
        } catch (err) {
          logError(err instanceof Error ? err : new Error(String(err)), {
            context: 'useAnonymousAuth:signIn',
            additionalInfo: { attempt },
          });
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          } else if (!cancelled) {
            setError(err instanceof Error ? err : new Error('Authentication failed'));
            setLoading(false);
          }
        }
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setLoading(false);
        setError(null);
      } else {
        attemptSignIn();
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [auth, retryTrigger]);

  return { uid, loading, error, retry };
}
