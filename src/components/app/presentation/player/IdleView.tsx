'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Radio, CheckCircle2 } from 'lucide-react';
import type { PresentationSlide } from '@/lib/types';

interface IdleViewProps {
  currentSlide: PresentationSlide | null;
  responded: boolean;
}

export function IdleView({ responded }: IdleViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="relative w-20 h-20 mb-6">
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full bg-primary/15 animate-pulse-ring" />
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-ring [animation-delay:0.5s]" />
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse-ring [animation-delay:1s]" />
        <motion.div
          className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait">
            {responded ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </motion.div>
            ) : (
              <motion.div
                key="radio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Radio className="h-8 w-8 text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {responded ? (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="text-lg font-semibold mb-1">Answer submitted!</h2>
            <p className="text-sm text-muted-foreground">Waiting for the next slide...</p>
          </motion.div>
        ) : (
          <motion.div
            key="listening"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="text-lg font-semibold mb-1">Listening...</h2>
            <p className="text-sm text-muted-foreground">
              The presenter is showing content. React using the emojis below!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
