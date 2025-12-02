import { useCallback, useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import type { Game, Quiz } from '@/lib/types';
import {
  getHostSession,
  saveHostSession,
  clearHostSession,
  HostSession,
} from '@/lib/host-session';

interface UseHostSessionResult {
  /** Current active host session, if any */
  session: HostSession | null;
  /** Whether we're checking if the session is still valid */
  isValidating: boolean;
  /** Save a new host session */
  saveSession: (gameId: string, gamePin: string, quizId: string, quizTitle: string) => void;
  /** Clear the current session */
  clearSession: () => void;
  /** Check if there's a valid session for the current user */
  hasValidSession: () => boolean;
}

/**
 * Hook for managing host game sessions.
 *
 * Automatically validates that a stored session is still active
 * (game exists and hasn't ended) when the component mounts.
 */
export function useHostSession(): UseHostSessionResult {
  const { user } = useUser();
  const firestore = useFirestore();
  const [session, setSession] = useState<HostSession | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // Validate session on mount and when user changes
  useEffect(() => {
    const validateSession = async () => {
      setIsValidating(true);

      const storedSession = getHostSession();

      // No session stored
      if (!storedSession) {
        setSession(null);
        setIsValidating(false);
        return;
      }

      // Session belongs to different user
      if (user && storedSession.hostId !== user.uid) {
        clearHostSession();
        setSession(null);
        setIsValidating(false);
        return;
      }

      // Validate that the game still exists and is active
      try {
        const gameRef = doc(firestore, 'games', storedSession.gameId) as DocumentReference<Game>;
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
          // Game was deleted
          console.log('[HostSession] Game no longer exists, clearing session');
          clearHostSession();
          setSession(null);
        } else {
          const game = gameSnap.data();
          if (game.state === 'ended') {
            // Game has ended
            console.log('[HostSession] Game has ended, clearing session');
            clearHostSession();
            setSession(null);
          } else {
            // Session is valid
            console.log('[HostSession] Valid session found for game:', storedSession.gamePin);
            setSession(storedSession);
          }
        }
      } catch (error) {
        console.error('[HostSession] Error validating session:', error);
        // Keep session in case of network error - user can try reconnecting
        setSession(storedSession);
      }

      setIsValidating(false);
    };

    validateSession();
  }, [user, firestore]);

  const saveSession = useCallback((
    gameId: string,
    gamePin: string,
    quizId: string,
    quizTitle: string
  ) => {
    if (!user) return;

    saveHostSession(gameId, gamePin, quizId, quizTitle, user.uid);
    setSession({
      gameId,
      gamePin,
      quizId,
      quizTitle,
      hostId: user.uid,
      timestamp: Date.now(),
    });
  }, [user]);

  const clearSessionCallback = useCallback(() => {
    clearHostSession();
    setSession(null);
  }, []);

  const hasValidSession = useCallback(() => {
    return session !== null && user !== null && session.hostId === user.uid;
  }, [session, user]);

  return {
    session,
    isValidating,
    saveSession,
    clearSession: clearSessionCallback,
    hasValidSession,
  };
}
