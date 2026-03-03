'use client';

import { Radio } from 'lucide-react';
import type { PresentationSlide } from '@/lib/types';

interface IdleViewProps {
  currentSlide: PresentationSlide | null;
  responded: boolean;
}

export function IdleView({ responded }: IdleViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Radio className="h-8 w-8 text-primary animate-pulse" />
      </div>

      {responded ? (
        <>
          <h2 className="text-lg font-semibold mb-1">Answer submitted!</h2>
          <p className="text-sm text-muted-foreground">Waiting for the next slide...</p>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-1">Listening...</h2>
          <p className="text-sm text-muted-foreground">
            The presenter is showing content. React using the emojis below!
          </p>
        </>
      )}
    </div>
  );
}
