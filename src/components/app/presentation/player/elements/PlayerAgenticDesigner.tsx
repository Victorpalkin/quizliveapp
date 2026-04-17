'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Lightbulb } from 'lucide-react';
import { useAgenticSessionPlayer } from '@/firebase/presentation';
import { AGENTIC_DESIGNER_STEPS, AGENTIC_PHASES } from '@/lib/agentic-designer-steps';
import type { SlideElement } from '@/lib/types';

interface PlayerAgenticDesignerProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  onSubmitted: () => void;
}

export function PlayerAgenticDesigner({ element, gameId, playerId, playerName, onSubmitted }: PlayerAgenticDesignerProps) {
  const config = element.agenticDesignerConfig;
  const {
    session,
    isLoading,
    currentStepOutput,
    nudgesOpen,
    myNudges,
    submitNudge,
  } = useAgenticSessionPlayer(gameId, element.id, playerId);

  const [nudgeText, setNudgeText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!config || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentStep = session?.currentStep || 1;
  const stepConfig = AGENTIC_DESIGNER_STEPS[currentStep - 1];
  const isProcessing = session?.isProcessing;

  const handleSubmitNudge = async () => {
    if (!nudgeText.trim()) return;
    setSubmitting(true);
    try {
      await submitNudge(nudgeText.trim(), playerName);
      setNudgeText('');
    } finally {
      setSubmitting(false);
    }
  };

  // Note: We do NOT call onSubmitted() here because the agentic designer
  // is a long-running element — player stays as long as the slide is active

  return (
    <div className="space-y-4">
      {/* Step header with dot stepper */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {/* Dot stepper */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          {AGENTIC_DESIGNER_STEPS.map((step) => {
            const isDone = session?.completedSteps?.includes(step.id);
            const isActive = step.id === currentStep;
            return (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  isActive
                    ? 'bg-primary animate-pulse'
                    : isDone
                    ? 'bg-green-500'
                    : 'bg-muted'
                }`}
              />
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of {AGENTIC_DESIGNER_STEPS.length}
        </p>
        <h2 className="text-xl font-bold">{stepConfig?.title}</h2>
        {/* Phase context */}
        {(() => {
          const phase = AGENTIC_PHASES.find((p) => p.steps.includes(currentStep));
          return phase ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              Phase: {phase.label}
            </p>
          ) : null;
        })()}
        <p className="text-sm text-muted-foreground mt-0.5">{config.target}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          {stepConfig?.shortDescription || stepConfig?.description}
        </p>
      </motion.div>

      {/* AI Output or status */}
      <motion.div
        key={`output-${currentStep}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border bg-card p-4 max-h-[50vh] overflow-y-auto"
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-base">Generating analysis...</p>
          </div>
        ) : currentStepOutput ? (
          <div className="prose prose-base dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentStepOutput}</ReactMarkdown>
            {(session?.imageUrls?.[currentStep] || (currentStep === 11 && session?.imageUrls?.[10])) && (
              <div className="mt-4 rounded-lg overflow-hidden border not-prose">
                <img
                  src={session?.imageUrls?.[currentStep] || session?.imageUrls?.[10]}
                  alt="AI Data Foundation Map"
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <p className="text-base">Waiting for host to run analysis...</p>
            {stepConfig?.outputExpectation && (
              <p className="text-sm text-muted-foreground/70 max-w-md text-center">
                Expected: {stepConfig.outputExpectation}
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Nudge input (when open) */}
      {nudgesOpen && config.enablePlayerNudges !== false && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-1.5 text-primary">
            <Lightbulb className="h-5 w-5" />
            <span className="text-base font-medium">The host is listening — share your ideas!</span>
          </div>
          {/* Suggestion chips */}
          {stepConfig?.nudgeHints && stepConfig.nudgeHints.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stepConfig.nudgeHints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => setNudgeText(hint)}
                  className="text-sm px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-left"
                  disabled={submitting}
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={nudgeText}
              onChange={(e) => setNudgeText(e.target.value)}
              placeholder={stepConfig?.nudgeHints?.[0] ? `e.g., "${stepConfig.nudgeHints[0]}"` : "Your suggestion..."}
              maxLength={300}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitNudge();
                }
              }}
              disabled={submitting}
              className="bg-background/50 text-sm"
            />
            <Button
              variant="gradient"
              size="icon"
              onClick={handleSubmitNudge}
              disabled={!nudgeText.trim() || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-right">{nudgeText.length}/300</p>

          {myNudges.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Your suggestions:</p>
              {myNudges.map((n) => (
                <div key={n.id} className="text-sm bg-primary/10 text-primary rounded-full px-3 py-1.5 inline-block mr-1">
                  {n.text}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
