'use client';

import { motion } from 'motion/react';
import { Cloud, Eye } from 'lucide-react';
import { SlidePlayerProps } from '../types';

export function ThoughtsResultsPlayer({ slide, presentation }: SlidePlayerProps) {
  // Find linked source slide for context
  const sourceSlide = presentation.slides.find((s) => s.id === slide.sourceSlideId);
  const prompt = sourceSlide?.thoughtsPrompt || 'Results';

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Icon */}
      <motion.div
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <Cloud className="h-10 w-10 text-white" />
      </motion.div>

      {/* Title */}
      <motion.h2
        className="text-2xl font-semibold mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Viewing Results
      </motion.h2>

      {/* Prompt context */}
      <motion.p
        className="text-muted-foreground max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {prompt}
      </motion.p>

      {/* View indicator */}
      <motion.div
        className="flex items-center gap-2 mt-6 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Eye className="h-4 w-4" />
        <span>Look at the main screen to see the collected thoughts</span>
      </motion.div>
    </motion.div>
  );
}
