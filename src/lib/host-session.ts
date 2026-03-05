// Host session management for automatic reconnection
// Stores host session data in localStorage to survive page refreshes and connection loss

import type { ActivityType } from './types';

export interface HostSession {
  gameId: string;
  gamePin: string;
  quizId: string;
  quizTitle: string;
  hostId: string;
  timestamp: number; // When session was last updated
  activityType?: ActivityType; // 'quiz' | 'thoughts-gathering' | 'evaluation' | 'presentation' | 'poll'
  gameState?: string; // Current game state for routing (e.g., 'lobby', 'question', 'collecting')
  returnPath: string; // The path to return to when rejoining (e.g., '/host/presentation/present/abc123')
}

const SESSION_KEY = 'gquiz_host_session';
const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours (games shouldn't last longer)

// Check if we're in a browser environment (not SSR)
const isBrowser = typeof window !== 'undefined';

/**
 * Save host session to localStorage
 */
export function saveHostSession(
  gameId: string,
  gamePin: string,
  quizId: string,
  quizTitle: string,
  hostId: string,
  activityType: ActivityType = 'quiz',
  gameState?: string,
  returnPath?: string
): void {
  if (!isBrowser) return;
  try {
    const session: HostSession = {
      gameId,
      gamePin,
      quizId,
      quizTitle,
      hostId,
      timestamp: Date.now(),
      activityType,
      gameState,
      returnPath: returnPath || `/host/${activityType}/${gameState === 'lobby' ? 'lobby' : 'game'}/${gameId}`,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save host session:', error);
  }
}

/**
 * Get host session from localStorage
 * Returns null if no session exists or if session is expired
 */
export function getHostSession(): HostSession | null {
  if (!isBrowser) return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session: HostSession = JSON.parse(stored);

    // Check if session is expired
    const age = Date.now() - session.timestamp;
    if (age > SESSION_TIMEOUT_MS) {
      clearHostSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to retrieve host session:', error);
    clearHostSession(); // Clear corrupted session
    return null;
  }
}

/**
 * Clear host session from localStorage
 */
export function clearHostSession(): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear host session:', error);
  }
}

/**
 * Check if an active host session exists
 */
export function hasActiveHostSession(): boolean {
  return getHostSession() !== null;
}

/**
 * Update session timestamp to keep it alive
 */
export function refreshHostSessionTimestamp(): void {
  const session = getHostSession();
  if (session) {
    saveHostSession(
      session.gameId,
      session.gamePin,
      session.quizId,
      session.quizTitle,
      session.hostId,
      session.activityType || 'quiz',
      session.gameState,
      session.returnPath
    );
  }
}

/**
 * Check if session matches a specific host user
 */
export function sessionMatchesHost(hostId: string): boolean {
  const session = getHostSession();
  return session?.hostId === hostId;
}

/**
 * Check if session matches a specific game
 */
export function sessionMatchesGame(gameId: string): boolean {
  const session = getHostSession();
  return session?.gameId === gameId;
}
