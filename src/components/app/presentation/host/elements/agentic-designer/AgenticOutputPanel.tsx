'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgenticAIOutput } from './AgenticAIOutput';
import { AGENTIC_DESIGNER_STEPS } from '@/lib/agentic-designer-steps';

interface AgenticOutputPanelProps {
  currentStep: number;
  currentOutput: string | null;
  isProcessing: boolean;
  stepTitle: string;
  completedSteps: number[];
  aiOutputs: Record<number, string>;
}

export function AgenticOutputPanel({
  currentStep,
  currentOutput,
  isProcessing,
  stepTitle,
  completedSteps,
  aiOutputs,
}: AgenticOutputPanelProps) {
  const previousSteps = completedSteps
    .filter((s) => s < currentStep)
    .sort((a, b) => b - a);

  const [viewingStep, setViewingStep] = useState<string>(
    previousSteps[0]?.toString() || ''
  );

  const hasPrevious = previousSteps.length > 0;

  return (
    <Tabs defaultValue="current" className="flex flex-col h-full">
      <TabsList className="flex-shrink-0 h-8">
        <TabsTrigger value="current" className="text-xs h-7">
          Step {currentStep} Output
        </TabsTrigger>
        <TabsTrigger value="previous" className="text-xs h-7" disabled={!hasPrevious}>
          Previous Steps {hasPrevious ? `(${previousSteps.length})` : ''}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="current" className="flex-1 min-h-0 mt-2">
        <AgenticAIOutput
          output={currentOutput}
          isProcessing={isProcessing}
          stepTitle={stepTitle}
        />
      </TabsContent>

      <TabsContent value="previous" className="flex-1 min-h-0 mt-2">
        {hasPrevious && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground">View output from:</span>
              <Select value={viewingStep} onValueChange={setViewingStep}>
                <SelectTrigger className="h-7 text-xs w-[220px]">
                  <SelectValue placeholder="Select a step" />
                </SelectTrigger>
                <SelectContent>
                  {previousSteps.map((s) => (
                    <SelectItem key={s} value={String(s)} className="text-xs">
                      Step {s}: {AGENTIC_DESIGNER_STEPS[s - 1]?.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2 flex-shrink-0">
              Use previous results to inform your nudge for the current step.
            </p>
            <div className="flex-1 min-h-0">
              <AgenticAIOutput
                output={viewingStep ? aiOutputs[Number(viewingStep)] || null : null}
                isProcessing={false}
                stepTitle={viewingStep ? AGENTIC_DESIGNER_STEPS[Number(viewingStep) - 1]?.title || '' : ''}
              />
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
