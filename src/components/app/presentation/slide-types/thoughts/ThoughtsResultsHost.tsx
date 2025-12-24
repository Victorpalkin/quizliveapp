'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TILE_COLORS } from '@/lib/colors';
import { SlideHostProps } from '../types';
import { useSlideResponses, useSlideTopics } from '@/firebase/presentation';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { TopicEntry, ThoughtSubmission } from '@/lib/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import { useFirebaseApp } from '@/firebase';

interface ThoughtItem {
  text: string;
  playerName: string;
  colorIndex: number;
}

export function ThoughtsResultsHost({ slide, presentation, game }: SlideHostProps) {
  const app = useFirebaseApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find linked source slide
  const sourceSlide = presentation.slides.find((s) => s.id === slide.sourceSlideId);
  const prompt = sourceSlide?.thoughtsPrompt || 'Collected thoughts';
  const sourceSlideId = slide.sourceSlideId || slide.id;

  // Fetch responses for the source slide
  const { responses, loading: responsesLoading } = useSlideResponses(game.id, sourceSlideId);

  // Fetch processed topics
  const { topics, loading: topicsLoading, processedAt } = useSlideTopics(game.id, sourceSlideId);

  // Convert submissions to ThoughtItem format for display
  // Now responses are StoredSubmission[] with rawText field (one doc per thought)
  const allThoughts = useMemo(() => {
    return responses.map((response, index) => ({
      text: response.rawText,
      playerName: response.playerName || 'Anonymous',
      colorIndex: index % TILE_COLORS.length,
    })).sort((a, b) => a.text.localeCompare(b.text));
  }, [responses]);

  // Convert responses to ThoughtSubmission format for ThoughtsGroupedView
  const submissions: ThoughtSubmission[] = useMemo(() => {
    return responses.map((response) => ({
      id: response.id,
      playerId: response.playerId,
      playerName: response.playerName || 'Anonymous',
      rawText: response.rawText,
      // Convert Date to Timestamp
      submittedAt: Timestamp.fromDate(response.submittedAt),
    }));
  }, [responses]);

  // Process topics with AI (using unified extractTopics function)
  const handleProcessTopics = async () => {
    if (!app || !game.id) return;

    setIsProcessing(true);
    setError(null);

    try {
      const functions = getFunctions(app, 'europe-west4');
      // Use unified extractTopics function with slideId parameter
      const extractTopics = httpsCallable(functions, 'extractTopics');
      await extractTopics({
        gameId: game.id,
        slideId: sourceSlideId, // Filter by slide for presentations
      });
    } catch (err) {
      console.error('Failed to process topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to process topics');
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine if we have processed topics to show
  const hasTopics = topics && topics.length > 0;

  if (responsesLoading) {
    return (
      <motion.div
        className="w-full h-full flex flex-col items-center justify-center p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading responses...</p>
      </motion.div>
    );
  }

  if (allThoughts.length === 0) {
    return (
      <motion.div
        className="w-full h-full flex flex-col items-center justify-center p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
          <Cloud className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-muted-foreground">No thoughts yet</h2>
        <p className="text-muted-foreground mt-2">Waiting for submissions...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-start p-8 overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <motion.div
        className="w-full max-w-6xl mb-8"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
      >
        <Card className="bg-card/95 backdrop-blur">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{prompt}</h1>
                <p className="text-muted-foreground">
                  {allThoughts.length} {allThoughts.length === 1 ? 'thought' : 'thoughts'} collected
                  {hasTopics && ` • ${topics.length} topics`}
                </p>
              </div>
            </div>

            {/* Process Topics Button */}
            <Button
              onClick={handleProcessTopics}
              disabled={isProcessing || allThoughts.length === 0}
              variant={hasTopics ? 'outline' : 'default'}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {hasTopics ? 'Reprocess' : 'Group with AI'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          className="w-full max-w-6xl mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
            {error}
          </div>
        </motion.div>
      )}

      {/* Show grouped view if topics are available, otherwise show grid */}
      {hasTopics ? (
        <motion.div
          className="w-full max-w-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ThoughtsGroupedView
            topics={topics as TopicEntry[]}
            submissions={submissions}
          />
        </motion.div>
      ) : (
        /* Thoughts Grid (fallback when not grouped) */
        <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allThoughts.map((thought, index) => {
            const colors = TILE_COLORS[thought.colorIndex];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
              >
                <Card
                  className={cn(
                    'h-full border',
                    `bg-gradient-to-br ${colors.bg}`,
                    colors.border,
                  )}
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
                    <p className="text-sm font-medium leading-relaxed">{thought.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">— {thought.playerName}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
