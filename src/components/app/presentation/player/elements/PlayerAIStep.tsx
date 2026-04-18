'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { useWorkflowStatePlayer } from '@/firebase/presentation';
import type { SlideElement, PresentationSlide } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PlayerAIStepProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  currentSlide: PresentationSlide;
  onSubmitted: () => void;
}

const MAX_NUDGE_LENGTH = 300;

export function PlayerAIStep({
  element,
  gameId,
  playerId,
  playerName,
  currentSlide,
}: PlayerAIStepProps) {
  const config = element.aiStepConfig;
  const slideId = currentSlide.id;

  const { slideOutput, isLoading, myNudges, nudgesOpen, submitNudge } =
    useWorkflowStatePlayer(gameId, slideId, playerId);

  const [nudgeText, setNudgeText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const enableNudges = config?.enablePlayerNudges !== false;
  const nudgeHints = config?.nudgeHints ?? [];
  const aiOutput = slideOutput?.aiOutput ?? null;
  const imageUrl = slideOutput?.imageUrl ?? null;
  const isProcessing = !slideOutput && !isLoading;

  // Step title from slide text content
  const stepTitle =
    currentSlide.elements.find((el) => el.type === 'text')?.content || 'AI Step';

  const handleSubmitNudge = useCallback(async () => {
    if (!nudgeText.trim()) return;
    setSubmitting(true);
    try {
      await submitNudge(nudgeText.trim(), playerName);
      setNudgeText('');
    } finally {
      setSubmitting(false);
    }
  }, [nudgeText, submitNudge, playerName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmitNudge();
      }
    },
    [handleSubmitNudge]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-4 space-y-4 overflow-y-auto">
      {/* Step header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <p className="text-xs text-muted-foreground">
          Slide {currentSlide.order + 1}
        </p>
        <h3 className="text-lg font-semibold">{stepTitle}</h3>
        {config?.outputExpectation && (
          <p className="text-xs text-muted-foreground">
            {config.outputExpectation}
          </p>
        )}
      </motion.div>

      {/* AI output area */}
      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 text-muted-foreground"
          >
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm font-medium">Generating analysis...</p>
            <p className="text-xs mt-1">This may take a moment</p>
          </motion.div>
        ) : aiOutput ? (
          <motion.div
            key="output"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {aiOutput}
              </ReactMarkdown>
            </div>
            {imageUrl && (
              <div className="mt-4">
                <img
                  src={imageUrl}
                  alt="AI generated visualization"
                  className="w-full rounded-lg border"
                />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 text-muted-foreground"
          >
            <Sparkles className="h-8 w-8 mb-3 opacity-50" />
            <p className="text-sm">Waiting for host to run analysis...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nudge input section */}
      {enableNudges && nudgesOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-shrink-0 space-y-2 border-t pt-3"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Share your suggestions with the host
          </p>

          {/* Suggestion chips */}
          {nudgeHints.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {nudgeHints.map((hint, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="cursor-pointer text-[10px] hover:bg-primary/10"
                  onClick={() => setNudgeText(hint)}
                >
                  {hint.length > 40 ? hint.slice(0, 40) + '...' : hint}
                </Badge>
              ))}
            </div>
          )}

          {/* Input + send */}
          <div className="flex gap-2">
            <Input
              value={nudgeText}
              onChange={(e) =>
                setNudgeText(e.target.value.slice(0, MAX_NUDGE_LENGTH))
              }
              onKeyDown={handleKeyDown}
              placeholder="Type your suggestion..."
              disabled={submitting}
              className="text-sm"
            />
            <Button
              size="icon"
              onClick={handleSubmitNudge}
              disabled={!nudgeText.trim() || submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            {nudgeText.length}/{MAX_NUDGE_LENGTH}
          </p>

          {/* My submitted nudges */}
          {myNudges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {myNudges.map((n) => (
                <Badge
                  key={n.id}
                  variant="secondary"
                  className="text-[10px]"
                >
                  {n.text.length > 50 ? n.text.slice(0, 50) + '...' : n.text}
                </Badge>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
