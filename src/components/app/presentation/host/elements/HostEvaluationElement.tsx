'use client';

import { motion } from 'motion/react';
import { useResponseCount } from '@/firebase/presentation';
import { ClipboardList } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface HostEvaluationElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostEvaluationElement({ element, gameId, playerCount }: HostEvaluationElementProps) {
  const config = element.evaluationConfig;
  const count = useResponseCount(gameId, element.id);

  if (!config) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-center mb-2"
      >
        {config.title}
      </motion.h2>
      {config.description && (
        <p className="text-muted-foreground text-center mb-4">{config.description}</p>
      )}

      {/* Items list */}
      <div className="w-full max-w-lg space-y-2 mb-6">
        {config.items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg"
          >
            <ClipboardList className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{item.text}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Metrics info */}
      <div className="flex gap-2 flex-wrap justify-center mb-4">
        {config.metrics.map((metric) => (
          <span
            key={metric.id}
            className="px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded text-xs font-medium"
          >
            {metric.name}
          </span>
        ))}
      </div>

      {/* Response counter */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-muted-foreground"
      >
        {count} / {playerCount} responded
      </motion.p>
    </div>
  );
}
