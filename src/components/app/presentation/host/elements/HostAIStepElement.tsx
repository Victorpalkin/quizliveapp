'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Play, RefreshCw, BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AgenticStepForm } from './agentic-designer/AgenticStepForm';
import { AgenticNudgePanel } from './agentic-designer/AgenticNudgePanel';
import { AgenticAIOutput } from './agentic-designer/AgenticAIOutput';
import { useWorkflowState, useSlideNudges } from '@/firebase/presentation';
import type { SlideElement, PresentationSlide, AIStepConfig } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface HostAIStepElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
  currentSlide: PresentationSlide;
  allSlides: PresentationSlide[];
  presentationId: string;
}

export function HostAIStepElement({
  element,
  gameId,
  playerCount,
  currentSlide,
  allSlides,
  presentationId,
}: HostAIStepElementProps) {
  const config = element.aiStepConfig;
  const slideId = currentSlide.id;

  const {
    workflowState,
    isLoading,
    runAIStep,
    updateHostInputs,
    isProcessing: globalProcessing,
    processingSlideId,
  } = useWorkflowState(gameId);

  const { nudges, summarizeNudges, clearNudges } = useSlideNudges(gameId, slideId);

  const [nudgeText, setNudgeText] = useState('');
  const [running, setRunning] = useState(false);

  // Current slide's output
  const slideOutput = workflowState.slideOutputs[slideId];
  const aiOutput = slideOutput?.aiOutput ?? null;
  const imageUrl = slideOutput?.imageUrl ?? null;
  const hostInputs = slideOutput?.hostInputs ?? {};
  const isProcessing = globalProcessing && processingSlideId === slideId;
  const hasOutput = !!aiOutput;

  // Find previous ai-step slides that have output (for reference drawer)
  const previousAISteps = useMemo(() => {
    const currentOrder = currentSlide.order;
    return allSlides
      .filter((s) => {
        if (s.order >= currentOrder) return false;
        const aiStepEl = s.elements.find((el) => el.type === 'ai-step');
        if (!aiStepEl) return false;
        return !!workflowState.slideOutputs[s.id]?.aiOutput;
      })
      .sort((a, b) => b.order - a.order);
  }, [allSlides, currentSlide.order, workflowState.slideOutputs]);

  // Fields from config
  const fields = config?.inputFields ?? [];
  const nudgeHints = config?.nudgeHints ?? [];
  const enableNudges = config?.enablePlayerNudges !== false;

  const handleFieldChange = useCallback(
    (id: string, value: string | boolean) => {
      const updated = { ...hostInputs, [id]: value };
      updateHostInputs(slideId, updated);
    },
    [hostInputs, updateHostInputs, slideId]
  );

  const handleRunAI = useCallback(async () => {
    if (!config) return;
    setRunning(true);
    try {
      await runAIStep(
        slideId,
        presentationId,
        nudgeText.trim() || undefined,
        hostInputs
      );
      setNudgeText('');
    } finally {
      setRunning(false);
    }
  }, [config, runAIStep, slideId, presentationId, nudgeText, hostInputs]);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No AI step configuration found.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Step title from the first text on the slide, or a default
  const stepTitle = currentSlide.elements.find((el) => el.type === 'text')?.content || 'AI Step';

  return (
    <div
      className="flex flex-col h-full w-full bg-background"
      data-interactive
    >
      {/* Step header */}
      <div className="flex-shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>Slide {currentSlide.order + 1}</span>
          {hasOutput && (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          )}
        </div>
        {config.outputExpectation && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-3 w-3" />
              Expected output
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded p-2">
              {config.outputExpectation}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Main content: Left panel + Right panel */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: form + nudges */}
        <div className="w-[340px] flex-shrink-0 border-r flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Input fields */}
              {fields.length > 0 && (
                <AgenticStepForm
                  fields={fields}
                  values={hostInputs as Record<string, string | boolean>}
                  onChange={handleFieldChange}
                  disabled={isProcessing || running}
                />
              )}

              {/* Nudge panel */}
              {enableNudges && (
                <AgenticNudgePanel
                  nudges={nudges as any}
                  nudgesOpen={true}
                  nudgeText={nudgeText}
                  nudgeHints={nudgeHints}
                  onNudgeTextChange={setNudgeText}
                  onToggleNudges={() => {}}
                  onSummarize={summarizeNudges}
                  onClearNudges={clearNudges}
                  disabled={isProcessing || running}
                />
              )}
            </div>
          </ScrollArea>

          {/* Action buttons */}
          <div className="flex-shrink-0 border-t p-3 space-y-2">
            <Button
              onClick={handleRunAI}
              disabled={isProcessing || running}
              className="w-full"
              size="sm"
            >
              {isProcessing || running ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : hasOutput ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
            {playerCount > 0 && enableNudges && (
              <p className="text-[10px] text-center text-muted-foreground">
                {nudges.length} nudge{nudges.length !== 1 ? 's' : ''} from {playerCount} player{playerCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Right panel: AI output */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Reference drawer for prior AI steps */}
          {previousAISteps.length > 0 && (
            <div className="flex-shrink-0 border-b px-3 py-1.5">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Reference Prior Steps ({previousAISteps.length})
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[600px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Prior AI Step Outputs</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-3">
                    {previousAISteps.map((slide) => {
                      const output = workflowState.slideOutputs[slide.id]?.aiOutput;
                      const title = slide.elements.find((el) => el.type === 'text')?.content
                        || `Slide ${slide.order + 1}`;
                      return (
                        <Collapsible key={slide.id}>
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="truncate">{title}</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-2 pb-2">
                            <div className="prose prose-sm dark:prose-invert max-w-none text-xs mt-1 bg-muted/30 rounded p-3">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {output || ''}
                              </ReactMarkdown>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Output display */}
          <div className="flex-1 min-h-0 overflow-auto">
            <AgenticAIOutput
              output={aiOutput}
              imageUrl={imageUrl}
              isProcessing={isProcessing || running}
              stepTitle={stepTitle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
