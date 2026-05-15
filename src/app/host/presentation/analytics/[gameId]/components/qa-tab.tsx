'use client';

import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, ThumbsUp, Pin, CheckCircle2 } from 'lucide-react';
import type { PresentationQuestion } from '@/lib/types';

interface QATabProps {
  questions: PresentationQuestion[];
}

export function QATab({ questions }: QATabProps) {
  if (questions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No questions were asked during this presentation.
      </p>
    );
  }

  const sorted = [...questions].sort((a, b) => b.upvotes - a.upvotes);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-purple-500" />
            Audience Questions
            <Badge variant="secondary" className="ml-auto">{questions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sorted.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
                  <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono font-bold">{q.upvotes}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm">{q.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {q.playerName}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {q.pinned && (
                    <Pin className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {q.answered && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
