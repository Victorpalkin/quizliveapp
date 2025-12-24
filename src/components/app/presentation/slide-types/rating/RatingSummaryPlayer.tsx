'use client';

import { motion } from 'motion/react';
import { BarChart3, Eye } from 'lucide-react';
import { SlidePlayerProps } from '../types';

/**
 * RatingSummaryPlayer - Player view of the rating summary
 * Players just watch the host present the summary, no interaction needed
 */
export function RatingSummaryPlayer({ slide }: SlidePlayerProps) {
  const title = slide.summaryTitle || 'Rating Summary';

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <motion.div
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <BarChart3 className="h-10 w-10 text-white" />
      </motion.div>

      <h2 className="text-2xl font-bold mb-2">{title}</h2>

      <motion.div
        className="flex items-center gap-2 text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Eye className="h-5 w-5" />
        <p>Watch the screen for results</p>
      </motion.div>

      <motion.p
        className="text-sm text-muted-foreground mt-4 max-w-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        The host is presenting the rating summary with rankings and visualizations
      </motion.p>
    </motion.div>
  );
}
