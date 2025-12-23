'use client';

import { motion } from 'motion/react';
import { Presentation } from 'lucide-react';

interface WaitingScreenProps {
  presentationTitle?: string;
  message?: string;
}

export function WaitingScreen({
  presentationTitle,
  message = 'Waiting for the next activity...',
}: WaitingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
      <motion.div
        className="text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated presentation icon */}
        <motion.div
          className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Presentation className="h-10 w-10 text-primary" />
        </motion.div>

        {/* Title */}
        {presentationTitle && (
          <h1 className="text-xl font-semibold text-foreground">
            {presentationTitle}
          </h1>
        )}

        {/* Message */}
        <p className="text-muted-foreground text-lg">{message}</p>

        {/* Animated dots */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-primary/60"
              animate={{
                y: [-4, 4, -4],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
