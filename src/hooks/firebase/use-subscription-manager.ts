import { useEffect, useRef } from 'react';

/**
 * Manages Firebase subscriptions to prevent memory leaks
 *
 * Usage:
 * ```tsx
 * const subscriptions = useSubscriptionManager();
 *
 * useEffect(() => {
 *   const unsubscribe = onSnapshot(docRef, callback);
 *   subscriptions.add(unsubscribe);
 * }, [dependencies]);
 * ```
 */
export function useSubscriptionManager() {
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  // Add a subscription cleanup function
  const add = (unsubscribe: () => void) => {
    unsubscribeFunctions.current.push(unsubscribe);
  };

  // Remove a specific subscription
  const remove = (unsubscribe: () => void) => {
    const index = unsubscribeFunctions.current.indexOf(unsubscribe);
    if (index > -1) {
      unsubscribeFunctions.current.splice(index, 1);
    }
  };

  // Clear all subscriptions manually
  const clear = () => {
    unsubscribeFunctions.current.forEach(unsub => unsub());
    unsubscribeFunctions.current = [];
  };

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, []);

  return { add, remove, clear };
}

/**
 * Simplified hook for a single subscription
 *
 * Usage:
 * ```tsx
 * useSingleSubscription(() => {
 *   return onSnapshot(docRef, callback);
 * }, [dependencies]);
 * ```
 */
export function useSingleSubscription(
  subscribe: () => (() => void) | undefined | null,
  dependencies: React.DependencyList
) {
  useEffect(() => {
    const unsubscribe = subscribe();
    return () => {
      unsubscribe?.();
    };
  }, dependencies);
}
