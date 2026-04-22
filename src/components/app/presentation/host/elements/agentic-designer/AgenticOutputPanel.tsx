'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, ChevronRight, Check } from 'lucide-react';
import { AgenticAIOutput } from './AgenticAIOutput';
import { AGENTIC_DESIGNER_STEPS } from '@/lib/agentic-designer-steps';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AgenticOutputPanelProps {
  currentStep: number;
  isProcessing: boolean;
  completedSteps: number[];
  aiOutputs: Record<number, string>;
  imageUrls?: Record<number, string>;
}

export function AgenticOutputPanel({
  currentStep,
  isProcessing,
  completedSteps,
  aiOutputs,
  imageUrls,
}: AgenticOutputPanelProps) {
  const previousSteps = completedSteps
    .filter((s) => s < currentStep)
    .sort((a, b) => b - a);

  const hasPrevious = previousSteps.length > 0;
  const currentOutput = aiOutputs[currentStep] || null;
  const stepTitle = AGENTIC_DESIGNER_STEPS[currentStep - 1]?.title || '';

  return (
    <div className="flex flex-col h-full">
      {/* Header with reference button */}
      <div className="flex items-center justify-end gap-2 pb-2 flex-shrink-0">
        {hasPrevious && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-sm">
                <BookOpen className="h-4 w-4 mr-1.5" />
                Reference Prior Steps ({previousSteps.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[500px] sm:w-[600px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-base">Prior Step Outputs</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto h-[calc(100vh-80px)] p-4 space-y-2">
                {previousSteps.map((stepId) => {
                  const step = AGENTIC_DESIGNER_STEPS[stepId - 1];
                  const output = aiOutputs[stepId];
                  if (!output) return null;

                  return (
                    <Collapsible key={stepId}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">
                          Step {stepId}: {step?.title}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 ml-6 prose prose-base dark:prose-invert max-w-none border-l-2 border-muted">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Current step output */}
      <div className="flex-1 min-h-0">
        <AgenticAIOutput
          output={currentOutput}
          imageUrl={imageUrls?.[currentStep] || (currentStep === 11 ? imageUrls?.[10] : undefined) || null}
          isProcessing={isProcessing}
          stepTitle={stepTitle}
        />
      </div>
    </div>
  );
}
