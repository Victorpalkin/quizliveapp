'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';
import { AGENTIC_DESIGNER_STEPS } from '@/lib/agentic-designer-steps';
import type { SlideElement, PresentationSlide } from '@/lib/types';
import type { AgenticDesignerSession } from '@/lib/types/agentic-designer';

interface HostAgenticDesignerResultsElementProps {
  element: SlideElement;
  slides: PresentationSlide[];
  gameId: string;
}

export function HostAgenticDesignerResultsElement({ element, slides, gameId }: HostAgenticDesignerResultsElementProps) {
  const firestore = useFirestore();
  const [session, setSession] = useState<AgenticDesignerSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Find source element
  const sourceSlide = slides.find((s) => s.id === element.sourceSlideId);
  const sourceElement = sourceSlide?.elements.find((el) => el.id === element.sourceElementId);
  const sourceElementId = sourceElement?.id;

  // Subscribe to agentic session for the source element
  useEffect(() => {
    if (!firestore || !gameId || !sourceElementId) {
      setSession(null);
      setLoading(false);
      return;
    }

    const sessionRef = doc(firestore, 'games', gameId, 'agenticSessions', sourceElementId);
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        setSession(snapshot.data() as AgenticDesignerSession);
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId, sourceElementId]);

  if (!sourceElement) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No source agentic designer element linked
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show final report (step 11) if available, otherwise show the latest completed step output
  const finalReport = session?.aiOutputs[11];
  const latestOutput = (() => {
    if (finalReport) return { step: 11, output: finalReport };
    if (!session?.aiOutputs) return null;
    const completedSteps = Object.keys(session.aiOutputs)
      .map(Number)
      .filter((s) => session.aiOutputs[s])
      .sort((a, b) => b - a);
    if (completedSteps.length === 0) return null;
    const latest = completedSteps[0];
    return { step: latest, output: session.aiOutputs[latest] };
  })();

  if (!latestOutput) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>No results yet</p>
        <p className="text-sm">The host needs to run the agentic designer first</p>
      </div>
    );
  }

  const stepConfig = AGENTIC_DESIGNER_STEPS[latestOutput.step - 1];
  const target = sourceElement.agenticDesignerConfig?.target || '';

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="mb-3 flex-shrink-0">
        <h2 className="text-xl font-bold">
          {latestOutput.step === 11 ? 'Final Report' : `${stepConfig?.title || `Step ${latestOutput.step}`} Results`}
        </h2>
        {target && (
          <p className="text-sm text-muted-foreground">Target: {target}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto prose prose-base dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {latestOutput.output}
        </ReactMarkdown>
        {session?.imageUrls?.[10] && (
          <div className="mt-4 rounded-lg overflow-hidden border not-prose">
            <img
              src={session.imageUrls[10]}
              alt="AI Data Foundation Map"
              className="w-full h-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
