/**
 * Firebase Analytics with Lazy Loading
 *
 * Analytics SDK is loaded after page is interactive to avoid impacting initial load.
 * Events are queued until SDK is ready, then automatically flushed.
 */

import type { Analytics } from 'firebase/analytics';
import type { FirebaseApp } from 'firebase/app';

// Analytics instance (null until lazy loaded)
let analyticsInstance: Analytics | null = null;
let analyticsInitialized = false;
let firebaseApp: FirebaseApp | null = null;

// Event queue for events tracked before SDK is ready
interface QueuedEvent {
  type: 'event' | 'exception';
  name?: string;
  params?: Record<string, unknown>;
  description?: string;
  fatal?: boolean;
}
const eventQueue: QueuedEvent[] = [];

/**
 * Initialize analytics lazily after page is interactive.
 * Call this from the Firebase provider after hydration.
 */
export function initAnalytics(app: FirebaseApp): void {
  if (typeof window === 'undefined' || analyticsInitialized) return;

  firebaseApp = app;
  analyticsInitialized = true;

  // Use requestIdleCallback if available, otherwise setTimeout
  const scheduleInit = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

  scheduleInit(() => {
    loadAnalytics();
  });
}

/**
 * Dynamically import and initialize Analytics SDK
 */
async function loadAnalytics(): Promise<void> {
  if (!firebaseApp || analyticsInstance) return;

  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');

    // Check if analytics is supported in this environment
    const supported = await isSupported();
    if (!supported) {
      console.log('[Analytics] Not supported in this environment');
      return;
    }

    analyticsInstance = getAnalytics(firebaseApp);
    console.log('[Analytics] Initialized');

    // Flush queued events
    flushEventQueue();
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Flush all queued events to Analytics
 */
function flushEventQueue(): void {
  if (!analyticsInstance || eventQueue.length === 0) return;

  import('firebase/analytics').then(({ logEvent }) => {
    while (eventQueue.length > 0) {
      const event = eventQueue.shift();
      if (!event || !analyticsInstance) continue;

      if (event.type === 'event' && event.name) {
        logEvent(analyticsInstance, event.name, event.params);
      } else if (event.type === 'exception') {
        logEvent(analyticsInstance, 'exception', {
          description: event.description,
          fatal: event.fatal,
        });
      }
    }
  });
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  if (analyticsInstance) {
    import('firebase/analytics').then(({ logEvent }) => {
      if (analyticsInstance) {
        logEvent(analyticsInstance, eventName, params);
      }
    });
  } else {
    // Queue event for when SDK is ready
    eventQueue.push({ type: 'event', name: eventName, params });
  }
}

/**
 * Track an exception/error event
 */
export function trackException(
  description: string,
  fatal: boolean = false
): void {
  if (typeof window === 'undefined') return;

  // Truncate description to 150 chars (GA limit)
  const truncatedDescription = description.length > 150
    ? description.substring(0, 147) + '...'
    : description;

  if (analyticsInstance) {
    import('firebase/analytics').then(({ logEvent }) => {
      if (analyticsInstance) {
        logEvent(analyticsInstance, 'exception', {
          description: truncatedDescription,
          fatal,
        });
      }
    });
  } else {
    // Queue exception for when SDK is ready
    eventQueue.push({
      type: 'exception',
      description: truncatedDescription,
      fatal,
    });
  }
}

/**
 * Get the analytics instance (may be null if not yet loaded)
 */
export function getAnalyticsInstance(): Analytics | null {
  return analyticsInstance;
}

/**
 * Check if analytics is ready
 */
export function isAnalyticsReady(): boolean {
  return analyticsInstance !== null;
}
