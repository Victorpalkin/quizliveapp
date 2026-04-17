'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, ChevronLeft, ChevronRight, Check, Loader2, SendToBack } from 'lucide-react';
import { useAgenticSession } from '@/firebase/presentation';
import { AGENTIC_DESIGNER_STEPS } from '@/lib/agentic-designer-steps';
import { EXTRACTABLE_STEPS } from '@/lib/types';
import { AgenticStepForm } from './agentic-designer/AgenticStepForm';
import { AgenticAIOutput } from './agentic-designer/AgenticAIOutput';
import { AgenticNudgePanel } from './agentic-designer/AgenticNudgePanel';
import type { SlideElement } from '@/lib/types';

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
      await runStep(currentStep, nudgeText || undefined);
      setNudgeText('');
    } finally {
      setRunning(false);
    }
  }, [currentStep, nudgeText, runStep]);

  const handleNextStep = useCallback(() => {
    if (currentStep < 11) {
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
    <div className="w-full h-full flex flex-col bg-background/95 rounded-lg border overflow-hidden">
      {/* Step Navigator */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30 overflow-x-auto flex-shrink-0">
        {AGENTIC_DESIGNER_STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isDone = session?.completedSteps?.includes(step.id);
          return (
            <button
              key={step.id}
              onClick={() => { setCurrentStep(step.id); setNudgeText(''); }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isDone
                  ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title={step.title}
            >
              {isDone && !isActive && <Check className="h-3 w-3" />}
              <span>{step.id}</span>
            </button>
          );
        })}
      </div>

      {/* Step title */}
      <div className="px-3 py-1.5 border-b flex-shrink-0">
        <h3 className="text-sm font-semibold">
          Step {currentStep}: {stepConfig?.title}
        </h3>
        <p className="text-[10px] text-muted-foreground line-clamp-1">{stepConfig?.description}</p>
      </div>

      {/* Main content: form + output */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel: form + nudges */}
        <div className="w-[280px] flex-shrink-0 border-r flex flex-col">
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
              className="w-full h-8 text-xs"
              variant="gradient"
            >
              {isProcessing ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Processing...</>
              ) : aiOutput ? (
                <><Play className="h-3.5 w-3.5 mr-1" /> Update Analysis</>
              ) : (
                <><Play className="h-3.5 w-3.5 mr-1" /> {currentStep === 1 ? 'Kickoff Research' : 'Run AI'}</>
              )}
            </Button>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={handlePrevStep}
                disabled={currentStep <= 1 || isProcessing}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={handleNextStep}
                disabled={currentStep >= 11 || isProcessing}
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right panel: AI output */}
        <div className="flex-1 p-3 min-w-0">
          <AgenticAIOutput
            output={aiOutput}
            isProcessing={isProcessing}
            stepTitle={stepConfig?.title || ''}
          />
        </div>
      </div>
    </div>
  );
}
