/**
 * Firestore Utility Functions
 *
 * This module provides utilities for working with Firestore data,
 * particularly for handling the undefined value limitation.
 */

/**
 * Recursively removes undefined values from objects and arrays.
 *
 * Firestore rejects `undefined` field values with the error:
 * "Function addDoc() called with invalid data. Unsupported field value: undefined"
 *
 * This function should be used in Firestore converters' `toFirestore` methods
 * to ensure all data is safe to write.
 *
 * @example
 * ```typescript
 * // In a converter
 * toFirestore(activity: MyActivity): DocumentData {
 *   const { id, ...data } = activity;
 *   return removeUndefined(data);
 * }
 * ```
 *
 * @param obj - The object to clean (can be any type)
 * @returns The same object structure with all undefined values removed
 */
export function removeUndefined<T>(obj: T): T {
  // Handle null and undefined at top level
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays - recursively clean each element
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as T;
  }

  // Handle objects (but not Date, which is an object but should be preserved)
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    ) as T;
  }

  // Primitives (string, number, boolean) pass through unchanged
  return obj;
}
