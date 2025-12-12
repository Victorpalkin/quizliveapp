import { useCallback } from 'react';
import {
  getPlayerSession,
  savePlayerSession,
  clearPlayerSession,
  sessionMatchesPin
} from '@/lib/player-session';

export function useSessionManager(gamePin: string) {
  const getSession = useCallback(() => {
    const session = getPlayerSession();
    if (session && session.gamePin === gamePin) {
      return session;
    }
    return null;
  }, [gamePin]);

  const saveSession = useCallback((playerId: string, gameDocId: string, nickname: string) => {
    savePlayerSession(playerId, gameDocId, gamePin.toUpperCase(), nickname);
  }, [gamePin]);

  const clearSession = useCallback(() => {
    if (sessionMatchesPin(gamePin)) {
      clearPlayerSession();
    }
  }, [gamePin]);

  const hasValidSession = useCallback(() => {
    const session = getPlayerSession();
    return session !== null && session.gamePin === gamePin;
  }, [gamePin]);

  return {
    getSession,
    saveSession,
    clearSession,
    hasValidSession
  };
}
