'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Lightbulb } from 'lucide-react';
import { useAgenticSessionPlayer } from '@/firebase/presentation';
import { AGENTIC_DESIGNER_STEPS } from '@/lib/agentic-designer-steps';
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
      {/* Step header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs text-muted-foreground">
          Step {currentStep} of 11
        </p>
        <h2 className="text-lg font-bold">{stepConfig?.title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{config.target}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          {stepConfig?.description}
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
            <p className="text-sm">Generating analysis...</p>
          </div>
        ) : currentStepOutput ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentStepOutput}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Waiting for host to run analysis...</p>
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
            <Lightbulb className="h-4 w-4" />
            <span className="text-sm font-medium">The host is accepting input!</span>
          </div>
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
              className="bg-background/50"
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

          {myNudges.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Your suggestions:</p>
              {myNudges.map((n) => (
                <div key={n.id} className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1 inline-block mr-1">
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
