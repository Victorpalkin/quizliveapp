'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Play, RefreshCw, ChevronRight, CheckCircle2, Layers, Minus, Plus } from 'lucide-react';
import { AgenticStepForm } from './agentic-designer/AgenticStepForm';
import { AgenticNudgePanel } from './agentic-designer/AgenticNudgePanel';
import { AgenticAIOutput } from './agentic-designer/AgenticAIOutput';
import { useWorkflowState, useSlideNudges } from '@/firebase/presentation';
import type { SlideElement, PresentationSlide, AIStepConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

const FONT_SIZES = [
  { label: 'S', scale: 0.875 },
  { label: 'M', scale: 1 },
  { label: 'L', scale: 1.125 },
  { label: 'XL', scale: 1.25 },
] as const;

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
  const [fontSizeIndex, setFontSizeIndex] = useState(1);

  // Current slide's output
  const slideOutput = workflowState.slideOutputs[slideId];
  const aiOutput = slideOutput?.aiOutput ?? null;
  const imageUrl = slideOutput?.imageUrl ?? null;
  const hostInputs = slideOutput?.hostInputs ?? {};
  const isProcessing = globalProcessing && processingSlideId === slideId;
  const hasOutput = !!aiOutput;

  // Context sources for this AI step
  const contextSources = useMemo(() => {
    const currentOrder = currentSlide.order;
    const contextIds = config?.contextSlideIds;

    return allSlides
      .filter((s) => {
        if (s.order >= currentOrder) return false;
        if (!s.elements.some((el) => el.type === 'ai-step')) return false;
        if (contextIds && contextIds.length > 0) return contextIds.includes(s.id);
        return true;
      })
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        slideId: s.id,
        slideNumber: s.order + 1,
        title: s.elements.find((el) => el.type === 'text')?.content || `Slide ${s.order + 1}`,
        output: workflowState.slideOutputs[s.id]?.aiOutput,
      }));
  }, [allSlides, currentSlide.order, config?.contextSlideIds, workflowState.slideOutputs]);

  const interactionSources = useMemo(() => {
    const currentOrder = currentSlide.order;
    const interactiveTypes = ['poll', 'quiz', 'thoughts', 'evaluation', 'rating'];
    const results: { type: string; label: string }[] = [];

    allSlides.forEach((s) => {
      if (s.order >= currentOrder) return;
      s.elements.forEach((el) => {
        if (interactiveTypes.includes(el.type)) {
          const label = el.pollConfig?.question || el.quizConfig?.question
            || el.thoughtsConfig?.prompt || el.evaluationConfig?.title
            || el.ratingConfig?.itemTitle || el.type;
          results.push({ type: el.type, label });
        }
      });
    });
    return results;
  }, [allSlides, currentSlide.order]);

  const [contextOpen, setContextOpen] = useState(!hasOutput);

  // Auto-collapse context sources when output is first generated
  useEffect(() => {
    if (hasOutput) setContextOpen(false);
  }, [hasOutput]);

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
      <div className="flex-shrink-0 border-b px-4 py-2.5 flex items-center gap-3">
        {config.outputExpectation ? (
          <p className="text-sm text-muted-foreground flex-1 min-w-0">{config.outputExpectation}</p>
        ) : (
          <div className="flex-1" />
        )}
        {hasOutput && (
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
        )}
        <div className="flex items-center gap-0.5 border rounded-md px-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFontSizeIndex((i) => Math.max(0, i - 1))}
            disabled={fontSizeIndex === 0}
            className="h-6 w-6 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-6 text-center">{FONT_SIZES[fontSizeIndex].label}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFontSizeIndex((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
            disabled={fontSizeIndex === FONT_SIZES.length - 1}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main content: Left panel + Right panel */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0" style={{ zoom: FONT_SIZES[fontSizeIndex].scale }}>
        {/* Left panel: form + nudges */}
        <ResizablePanel defaultSize="30" minSize="20" maxSize="60" className="flex flex-col">
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
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: AI output */}
        <ResizablePanel defaultSize="70" minSize="40" className="flex flex-col min-w-0">
          {/* Context sources */}
          {contextSources.length > 0 && (
            <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 bg-muted/30 border-b text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Layers className="h-3.5 w-3.5" />
                <span className="font-medium">Context ({contextSources.length} source{contextSources.length !== 1 ? 's' : ''})</span>
                {interactionSources.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/70">+ {interactionSources.length} interaction{interactionSources.length !== 1 ? 's' : ''}</span>
                )}
                <ChevronRight className={cn("h-3 w-3 ml-auto transition-transform", contextOpen && "rotate-90")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-[50vh] overflow-y-auto border-b">
                  <div className="p-3 space-y-2">
                    {contextSources.map((src) => (
                      <div key={src.slideId} className="text-xs">
                        {src.output ? (
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left">
                              <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform data-[state=open]:rotate-90 flex-shrink-0" />
                              <span className="font-medium text-foreground">Slide {src.slideNumber}</span>
                              <span className="text-muted-foreground truncate">{src.title}</span>
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0 ml-auto" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-[18px] mt-1 prose prose-sm dark:prose-invert max-w-none text-xs bg-muted/30 rounded p-3">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{src.output}</ReactMarkdown>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 flex-shrink-0" />
                            <span className="font-medium text-foreground">Slide {src.slideNumber}</span>
                            <span className="text-muted-foreground truncate">{src.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 rounded ml-auto flex-shrink-0">Pending</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {interactionSources.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t">
                        {interactionSources.map((src, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                            <span className="capitalize">{src.type}</span>
                            <span className="truncate max-w-[120px]">{src.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
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
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
