'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuestions } from '@/firebase/presentation';
import { ThumbsUp, Send, Pin, CheckCircle } from 'lucide-react';

interface PlayerQAProps {
  gameId: string;
  playerId: string;
  playerName: string;
}

export function PlayerQA({ gameId, playerId, playerName }: PlayerQAProps) {
  const { questions, submitQuestion, upvoteQuestion } = useQuestions(gameId);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sort: pinned first, then by upvotes descending
  const sorted = [...questions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.upvotes - a.upvotes;
  });

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitQuestion(playerId, playerName, text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-bold text-center"
      >
        Ask a Question
      </motion.h2>

      {/* Submit form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your question..."
          maxLength={280}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={submitting}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          size="icon"
          variant="gradient"
        >
          <Send className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Questions list */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            No questions yet. Be the first to ask!
          </p>
        )}
        {sorted.map((q, i) => {
          const hasUpvoted = q.upvotedBy.includes(playerId);
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                q.pinned ? 'bg-primary/5 border-primary/20' : 'bg-background'
              } ${q.answered ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => !hasUpvoted && upvoteQuestion(q.id, playerId)}
                disabled={hasUpvoted}
                className={`flex flex-col items-center gap-0.5 pt-0.5 transition-colors ${
                  hasUpvoted ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${hasUpvoted ? 'fill-current' : ''}`} />
                <span className="text-xs font-mono">{q.upvotes}</span>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{q.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{q.playerName}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {q.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                {q.answered && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
