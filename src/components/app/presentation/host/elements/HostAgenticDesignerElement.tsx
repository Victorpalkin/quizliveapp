'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, RefreshCw, ChevronLeft, ChevronRight, Loader2, Info } from 'lucide-react';
import { useAgenticSession } from '@/firebase/presentation';
import { AGENTIC_DESIGNER_STEPS, AGENTIC_PHASES } from '@/lib/agentic-designer-steps';
import { AgenticStepForm } from './agentic-designer/AgenticStepForm';
import { AgenticOutputPanel } from './agentic-designer/AgenticOutputPanel';
import { AgenticNudgePanel } from './agentic-designer/AgenticNudgePanel';
import { AgenticPhaseNavigator } from './agentic-designer/AgenticPhaseNavigator';
import type { SlideElement } from '@/lib/types';

const TOTAL_STEPS = AGENTIC_DESIGNER_STEPS.length;
const EMPTY_STEPS: number[] = [];
const EMPTY_OUTPUTS: Record<number, string> = {};
const EMPTY_IMAGE_URLS: Record<number, string> = {};

interface HostAgenticDesignerElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostAgenticDesignerElement({ element, gameId, playerCount }: HostAgenticDesignerElementProps) {
  const config = element.agenticDesignerConfig;
  const {
    session,
    isLoading,
    nudges,
    runStep,
    updateStepData,
    setCurrentStep,
    toggleNudges,
    summarizeNudges,
    clearNudges,
  } = useAgenticSession(gameId, element.id);

  const [nudgeText, setNudgeText] = useState('');
  const [running, setRunning] = useState(false);

  // Auto-populate target field on step 1
  useEffect(() => {
    if (session && session.currentStep === 1 && config?.target && !session.stepsData[1]?.target) {
      updateStepData(1, { target: config.target });
    }
  }, [session, config, updateStepData]);

  const currentStep = session?.currentStep || 1;
  const stepConfig = AGENTIC_DESIGNER_STEPS[currentStep - 1];
  const stepData = session?.stepsData[currentStep] || {};
  const aiOutput = session?.aiOutputs[currentStep] || null;
  const isCompleted = session?.completedSteps?.includes(currentStep) || false;
  const hasStructuredOutput = (session?.structuredOutputs?.[currentStep]?.items?.length ?? 0) > 0;

  const handleFieldChange = useCallback(
    (id: string, value: string | boolean) => {
      const newData = { ...stepData, [id]: value };
      updateStepData(currentStep, newData);
    },
    [stepData, currentStep, updateStepData]
  );

  const handleRunAI = useCallback(async () => {
    setRunning(true);
    try {
      await runStep(currentStep, nudgeText || undefined, session?.stepsData);
      setNudgeText('');
    } finally {
      setRunning(false);
    }
  }, [currentStep, nudgeText, runStep, session?.stepsData]);

  const handleNextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      setNudgeText('');
    }
  }, [currentStep, setCurrentStep]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setNudgeText('');
    }
  }, [currentStep, setCurrentStep]);

  if (!config) return null;

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isProcessing = session?.isProcessing || running;

  return (
    <div className="w-full h-full flex flex-col bg-background/95 rounded-lg border overflow-hidden" data-interactive>
      {/* Phase Navigator */}
      <AgenticPhaseNavigator
        currentStep={currentStep}
        completedSteps={session?.completedSteps || EMPTY_STEPS}
        aiOutputs={session?.aiOutputs || EMPTY_OUTPUTS}
        onStepChange={(step) => { setCurrentStep(step); setNudgeText(''); }}
      />

      {/* Step title + guidance */}
      <div className="px-3 py-2 border-b flex-shrink-0">
        {/* Breadcrumb */}
        {(() => {
          const phase = AGENTIC_PHASES.find((p) => p.steps.includes(currentStep));
          return phase ? (
            <p className="text-sm text-muted-foreground mb-0.5">
              {phase.label} &rsaquo; {stepConfig?.title}
            </p>
          ) : null;
        })()}
        <h3 className="text-lg font-semibold">
          Step {currentStep}: {stepConfig?.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">{stepConfig?.shortDescription || stepConfig?.description}</p>
        <Collapsible key={currentStep} defaultOpen={!isCompleted}>
          <CollapsibleTrigger className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline">
            <Info className="h-4 w-4" /> Step guidance
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1.5 space-y-1.5 text-sm bg-muted/30 rounded-md p-2">
              <div>
                <span className="font-medium text-foreground">Your input: </span>
                <span className="text-muted-foreground">{stepConfig?.inputGuidance}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">AI output: </span>
                <span className="text-muted-foreground">{stepConfig?.outputExpectation}</span>
              </div>
              {stepConfig?.dependsOn && stepConfig.dependsOn.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-foreground">Requires:</span>
                  {stepConfig.dependsOn.map((dep) => {
                    const depTitle = AGENTIC_DESIGNER_STEPS[dep - 1]?.title;
                    return (
                      <Badge key={dep} variant="outline" className="text-sm h-6 px-2">
                        Step {dep}{depTitle ? `: ${depTitle}` : ''}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Main content: form + output */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel: form + nudges */}
        <div className="w-[340px] flex-shrink-0 border-r flex flex-col">
          <ScrollArea className="flex-1 p-3">
            <AgenticStepForm
              fields={stepConfig?.fields || []}
              values={stepData}
              onChange={handleFieldChange}
              disabled={isProcessing}
            />

            {config.enablePlayerNudges !== false && (
              <div className="mt-3 pt-3 border-t">
                <AgenticNudgePanel
                  nudges={nudges}
                  nudgesOpen={session?.nudgesOpen || false}
                  nudgeText={nudgeText}
                  nudgeHints={stepConfig?.nudgeHints || []}
                  onNudgeTextChange={setNudgeText}
                  onToggleNudges={toggleNudges}
                  onSummarize={summarizeNudges}
                  onClearNudges={clearNudges}
                  disabled={isProcessing}
                />
              </div>
            )}
          </ScrollArea>

          {/* Action buttons */}
          <div className="p-2 border-t space-y-1.5 flex-shrink-0">
            <Button
              onClick={handleRunAI}
              disabled={isProcessing}
              className="w-full h-10 text-sm"
              variant="gradient"
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Processing...</>
              ) : aiOutput ? (
                <><RefreshCw className="h-4 w-4 mr-1.5" /> Regenerate</>
              ) : (
                <><Play className="h-4 w-4 mr-1.5" /> Generate</>
              )}
            </Button>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-sm"
                onClick={handlePrevStep}
                disabled={currentStep <= 1 || isProcessing}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-sm"
                onClick={handleNextStep}
                disabled={currentStep >= TOTAL_STEPS || isProcessing}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right panel: AI output */}
        <div className="flex-1 p-3 min-w-0">
          <AgenticOutputPanel
            currentStep={currentStep}
            isProcessing={isProcessing || false}
            completedSteps={session?.completedSteps || EMPTY_STEPS}
            aiOutputs={session?.aiOutputs || EMPTY_OUTPUTS}
            imageUrls={session?.imageUrls || EMPTY_IMAGE_URLS}
          />
        </div>
      </div>
    </div>
  );
}
