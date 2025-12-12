'use client';

import { useEffect } from 'react';

/**
 * Hook to warn users when they try to leave the page with unsaved changes.
 * Uses the browser's beforeunload event to show a confirmation dialog.
 *
 * @param hasUnsavedChanges - Whether the form has unsaved changes
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
