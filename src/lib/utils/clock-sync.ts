import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * Clock Synchronization Utility for gQuiz
 *
 * Implements NTP-like clock synchronization between client and Firestore server.
 * Used to ensure all players see synchronized countdown timers regardless of device clock accuracy.
 *
 * Algorithm:
 * 1. Client sends timestamp request (T1 = client send time)
 * 2. Server receives and writes server timestamp to Firestore
 * 3. Client receives response (T4 = client receive time)
 * 4. Calculate round-trip time (RTT) = T4 - T1
 * 5. Estimate server time at receive = T3 + (RTT / 2)
 * 6. Calculate offset = estimated server time - client time
 *
 * Accuracy: Typically ±50-200ms depending on network conditions
 */

interface ClockSyncResult {
  /** Clock offset in milliseconds (positive = client ahead, negative = client behind) */
  offset: number;
  /** Round-trip time in milliseconds */
  roundTripTime: number;
  /** Server timestamp when sync occurred */
  serverTime: number;
}

/**
 * Calculate clock offset between client and Firestore server
 *
 * @param firestore - Firestore instance
 * @returns Promise resolving to clock offset in milliseconds
 *
 * @example
 * const offset = await calculateClockOffset(firestore);
 * // offset = 3000 means client clock is 3 seconds ahead of server
 * // offset = -2000 means client clock is 2 seconds behind server
 */
export async function calculateClockOffset(firestore: Firestore): Promise<number> {
  const result = await calculateClockOffsetDetailed(firestore);
  return result.offset;
}

/**
 * Calculate clock offset with detailed metrics
 *
 * @param firestore - Firestore instance
 * @returns Promise resolving to detailed sync result
 */
export async function calculateClockOffsetDetailed(firestore: Firestore): Promise<ClockSyncResult> {
  // Create a temporary sync document
  const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const syncRef = doc(firestore, '_clockSync', syncId);

  try {
    // T1: Client send time (using performance.now for higher precision)
    const perfStart = performance.now();
    const clientSendTime = Date.now();

    // Write to Firestore with server timestamp
    await setDoc(syncRef, {
      timestamp: serverTimestamp(),
      clientSendTime
    });

    // Read back to get server timestamp
    const syncDoc = await getDoc(syncRef);

    // T4: Client receive time
    const perfEnd = performance.now();
    const clientReceiveTime = Date.now();

    if (!syncDoc.exists()) {
      throw new Error('Clock sync failed: sync document does not exist');
    }

    const data = syncDoc.data();
    if (!data.timestamp) {
      throw new Error('Clock sync failed: server timestamp not found');
    }

    // T3: Server timestamp (when server wrote the document)
    const serverTime = data.timestamp.toMillis();

    // Calculate round-trip time
    const roundTripTime = perfEnd - perfStart;

    // Estimate server time at the moment we received the response
    // We assume network latency is symmetric (half on request, half on response)
    const estimatedServerTimeAtReceive = serverTime + (roundTripTime / 2);

    // Calculate clock offset
    const offset = estimatedServerTimeAtReceive - clientReceiveTime;

    // Clean up temporary document
    deleteDoc(syncRef).catch(err => {
      console.warn('[ClockSync] Failed to delete sync document:', err);
    });

    console.log(
      `[ClockSync] Synchronized - Offset: ${offset.toFixed(0)}ms, RTT: ${roundTripTime.toFixed(0)}ms, ` +
      `Server time: ${new Date(serverTime).toISOString()}`
    );

    return {
      offset,
      roundTripTime,
      serverTime
    };

  } catch (error) {
    console.error('[ClockSync] Synchronization failed:', error);

    // Clean up on error
    deleteDoc(syncRef).catch(() => {
      // Ignore cleanup errors
    });

    throw error;
  }
}

/**
 * Get current server time estimate using cached clock offset
 *
 * @param clockOffset - Previously calculated clock offset (from calculateClockOffset)
 * @returns Estimated current server time in milliseconds since epoch
 *
 * @example
 * const offset = await calculateClockOffset(firestore);
 * // Later...
 * const serverNow = getServerNow(offset);
 * const elapsed = serverNow - questionStartTime;
 */
export function getServerNow(clockOffset: number): number {
  return Date.now() + clockOffset;
}

/**
 * Calculate remaining time for a countdown using server-synchronized time
 *
 * @param questionStartTime - Server timestamp when question started (in milliseconds)
 * @param timeLimit - Total time limit in seconds
 * @param clockOffset - Previously calculated clock offset
 * @returns Remaining time in seconds (0 or positive)
 *
 * @example
 * const offset = await calculateClockOffset(firestore);
 * const remaining = calculateTimeRemaining(questionStartTime, 20, offset);
 * // Returns number between 0 and 20
 */
export function calculateTimeRemaining(
  questionStartTime: number,
  timeLimit: number,
  clockOffset: number
): number {
  const serverNow = getServerNow(clockOffset);
  const elapsedMillis = serverNow - questionStartTime;
  const elapsedSeconds = Math.floor(elapsedMillis / 1000);
  return Math.max(0, timeLimit - elapsedSeconds);
}

/**
 * Detect if there's significant drift between local countdown and server time
 *
 * @param localTime - Current local countdown value in seconds
 * @param questionStartTime - Server timestamp when question started (in milliseconds)
 * @param timeLimit - Total time limit in seconds
 * @param clockOffset - Previously calculated clock offset
 * @param threshold - Drift threshold in seconds (default: 0.5)
 * @returns Object indicating if drift detected and the correct time
 */
export function detectDrift(
  localTime: number,
  questionStartTime: number,
  timeLimit: number,
  clockOffset: number,
  threshold: number = 0.5
): { hasDrift: boolean; correctTime: number; driftAmount: number } {
  const correctTime = calculateTimeRemaining(questionStartTime, timeLimit, clockOffset);
  const driftAmount = Math.abs(correctTime - localTime);
  const hasDrift = driftAmount > threshold;

  if (hasDrift) {
    console.warn(
      `[ClockSync] Drift detected: local=${localTime}s, correct=${correctTime}s, ` +
      `drift=${driftAmount.toFixed(2)}s`
    );
  }

  return { hasDrift, correctTime, driftAmount };
}

/**
 * Validate clock offset to ensure it's reasonable
 * Rejects offsets that are unreasonably large (likely due to network issues)
 *
 * @param offset - Clock offset to validate
 * @param maxOffsetSeconds - Maximum acceptable offset in seconds (default: 300 = 5 minutes)
 * @returns True if offset is reasonable, false otherwise
 */
export function isOffsetReasonable(offset: number, maxOffsetSeconds: number = 300): boolean {
  const maxOffsetMs = maxOffsetSeconds * 1000;
  const isReasonable = Math.abs(offset) < maxOffsetMs;

  if (!isReasonable) {
    console.warn(
      `[ClockSync] Unreasonable offset detected: ${(offset / 1000).toFixed(0)}s ` +
      `(max: ±${maxOffsetSeconds}s)`
    );
  }

  return isReasonable;
}
