// Player session management for automatic reconnection
// Stores player session data in localStorage to survive page refreshes and connection loss

export interface PlayerSession {
  playerId: string;
  gameDocId: string;
  gamePin: string;
  nickname: string;
  timestamp: number; // When session was last updated
}

const SESSION_KEY = 'gquiz_player_session';
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check if we're in a browser environment (not SSR)
const isBrowser = typeof window !== 'undefined';

/**
 * Save player session to localStorage
 */
export function savePlayerSession(
  playerId: string,
  gameDocId: string,
  gamePin: string,
  nickname: string
): void {
  if (!isBrowser) return;
  try {
    const session: PlayerSession = {
      playerId,
      gameDocId,
      gamePin,
      nickname,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save player session:', error);
  }
}

/**
 * Get player session from localStorage
 * Returns null if no session exists or if session is expired
 */
export function getPlayerSession(): PlayerSession | null {
  if (!isBrowser) return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session: PlayerSession = JSON.parse(stored);

    // Check if session is expired
    const age = Date.now() - session.timestamp;
    if (age > SESSION_TIMEOUT_MS) {
      clearPlayerSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to retrieve player session:', error);
    clearPlayerSession(); // Clear corrupted session
    return null;
  }
}

/**
 * Clear player session from localStorage
 */
export function clearPlayerSession(): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear player session:', error);
  }
}

/**
 * Check if an active session exists
 */
export function hasActiveSession(): boolean {
  return getPlayerSession() !== null;
}

/**
 * Update session timestamp to keep it alive
 */
export function refreshSessionTimestamp(): void {
  const session = getPlayerSession();
  if (session) {
    savePlayerSession(
      session.playerId,
      session.gameDocId,
      session.gamePin,
      session.nickname
    );
  }
}

/**
 * Check if session matches a specific game PIN
 */
export function sessionMatchesPin(gamePin: string): boolean {
  const session = getPlayerSession();
  return session?.gamePin === gamePin;
}
