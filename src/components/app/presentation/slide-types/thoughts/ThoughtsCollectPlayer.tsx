'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Send, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlidePlayerProps } from '../types';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const MAX_THOUGHT_LENGTH = 500;

export function ThoughtsCollectPlayer({ slide, game, playerId, playerName, hasResponded, onSubmit }: SlidePlayerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [currentThought, setCurrentThought] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompt = slide.thoughtsPrompt || 'Share your thoughts...';
  const maxThoughts = slide.thoughtsMaxPerPlayer || 3;
  const canAddMore = thoughts.length < maxThoughts;

  const handleAddThought = useCallback(() => {
    const trimmed = currentThought.trim();
    if (!trimmed || !canAddMore) return;

    // Validate length
    if (trimmed.length > MAX_THOUGHT_LENGTH) {
      setError(`Thought must be ${MAX_THOUGHT_LENGTH} characters or less`);
      return;
    }

    setError(null);
    setThoughts((prev) => [...prev, trimmed]);
    setCurrentThought('');
  }, [currentThought, canAddMore]);

  const handleRemoveThought = useCallback((index: number) => {
    setThoughts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (thoughts.length === 0 || isSubmitting || !game.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Write to submissions collection (unified with standalone thoughts-gathering)
      // Each thought is a separate document with rawText field
      // Use batch write for atomicity - all thoughts succeed or all fail
      const submissionsRef = collection(firestore, 'games', game.id, 'submissions');
      const batch = writeBatch(firestore);

      for (const thought of thoughts) {
        const docRef = doc(submissionsRef);
        batch.set(docRef, {
          playerId,
          playerName,
          rawText: thought, // Match standalone format
          slideId: slide.id, // For filtering by slide in presentations
          submittedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      // Also call onSubmit to mark as responded (for hasResponded tracking)
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        thoughts: thoughts,
      });
    } catch (err) {
      console.error('Failed to submit thoughts:', err);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit your thoughts. Please try again.',
      });
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [firestore, game.id, slide.id, thoughts, playerId, playerName, isSubmitting, onSubmit, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddThought();
    }
  }, [handleAddThought]);

  // Already submitted view
  if (hasResponded) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Check className="h-10 w-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-semibold">Thoughts submitted!</h2>
        <p className="text-muted-foreground mt-2">Thank you for sharing</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col p-4 gap-4 max-w-2xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Prompt */}
      <div className="text-center mb-4">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <MessageSquare className="h-7 w-7 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">{prompt}</h1>
        <p className="text-muted-foreground mt-2">
          {thoughts.length} / {maxThoughts} thoughts added
        </p>
      </div>

      {/* Added thoughts */}
      <AnimatePresence mode="popLayout">
        {thoughts.map((thought, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            layout
          >
            <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-900">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                  {index + 1}
                </div>
                <p className="flex-1 text-sm">{thought}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveThought(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Remove
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Input for new thought */}
      {canAddMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="relative">
            <Textarea
              value={currentThought}
              onChange={(e) => {
                setCurrentThought(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type your thought here..."
              className={cn(
                "min-h-[80px] text-lg pr-16",
                currentThought.length > MAX_THOUGHT_LENGTH && "border-destructive focus-visible:ring-destructive"
              )}
              disabled={isSubmitting}
              maxLength={MAX_THOUGHT_LENGTH + 50} // Allow slight overflow for UX
            />
            <span className={cn(
              "absolute bottom-2 right-2 text-xs",
              currentThought.length > MAX_THOUGHT_LENGTH ? "text-destructive" : "text-muted-foreground"
            )}>
              {currentThought.length}/{MAX_THOUGHT_LENGTH}
            </span>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <Button
            onClick={handleAddThought}
            disabled={!currentThought.trim() || currentThought.length > MAX_THOUGHT_LENGTH}
            variant="outline"
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Add thought ({thoughts.length + 1} / {maxThoughts})
          </Button>
        </motion.div>
      )}

      {/* Submit button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4"
      >
        <Button
          onClick={handleSubmit}
          disabled={thoughts.length === 0 || isSubmitting}
          className={cn(
            'w-full h-14 text-lg',
            thoughts.length > 0 && 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
          )}
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit {thoughts.length} {thoughts.length === 1 ? 'thought' : 'thoughts'}
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
