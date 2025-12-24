'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users } from 'lucide-react';
import { SlideHostProps } from '../types';

export function ThoughtsCollectHost({ slide, responseCount, playerCount }: SlideHostProps) {
  const prompt = slide.thoughtsPrompt || 'Share your thoughts...';
  const maxPerPlayer = slide.thoughtsMaxPerPlayer || 3;

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Icon */}
      <motion.div
        className="mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <MessageSquare className="h-10 w-10 text-white" />
        </div>
      </motion.div>

      {/* Prompt Card */}
      <motion.div
        className="w-full max-w-4xl mb-8"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/95 backdrop-blur">
          <CardContent className="p-8 text-center">
            <h1 className="text-4xl font-bold leading-relaxed">{prompt}</h1>
          </CardContent>
        </Card>
      </motion.div>

      {/* Instructions */}
      <motion.p
        className="text-xl text-muted-foreground mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Participants can submit up to {maxPerPlayer} {maxPerPlayer === 1 ? 'thought' : 'thoughts'}
      </motion.p>

      {/* Response Counter */}
      <motion.div
        className="absolute bottom-8 right-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Users className="h-5 w-5 mr-2" />
          {responseCount} / {playerCount} submitted
        </Badge>
      </motion.div>
    </motion.div>
  );
}
