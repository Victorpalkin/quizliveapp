'use client';

import { FileQuestion, Vote, MessageSquare, Star, Trophy, HelpCircle, Disc3, ClipboardList } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface InteractiveElementProps {
  element: SlideElement;
}

const CONFIG = {
  quiz: { icon: FileQuestion, label: 'Quiz', color: 'bg-purple-500/10 border-purple-500/30', textColor: 'text-purple-600' },
  poll: { icon: Vote, label: 'Poll', color: 'bg-teal-500/10 border-teal-500/30', textColor: 'text-teal-600' },
  thoughts: { icon: MessageSquare, label: 'Thoughts', color: 'bg-blue-500/10 border-blue-500/30', textColor: 'text-blue-600' },
  rating: { icon: Star, label: 'Rating', color: 'bg-orange-500/10 border-orange-500/30', textColor: 'text-orange-600' },
  leaderboard: { icon: Trophy, label: 'Leaderboard', color: 'bg-yellow-500/10 border-yellow-500/30', textColor: 'text-yellow-600' },
  qa: { icon: HelpCircle, label: 'Q&A', color: 'bg-green-500/10 border-green-500/30', textColor: 'text-green-600' },
  'spin-wheel': { icon: Disc3, label: 'Spin Wheel', color: 'bg-pink-500/10 border-pink-500/30', textColor: 'text-pink-600' },
  evaluation: { icon: ClipboardList, label: 'Evaluation', color: 'bg-indigo-500/10 border-indigo-500/30', textColor: 'text-indigo-600' },
};

export function InteractiveElement({ element }: InteractiveElementProps) {
  const config = CONFIG[element.type as keyof typeof CONFIG];
  if (!config) return null;

  const Icon = config.icon;

  // Get the display text based on element config
  const displayText = (() => {
    if (element.type === 'quiz' && element.quizConfig) return element.quizConfig.question;
    if (element.type === 'poll' && element.pollConfig) return element.pollConfig.question;
    if (element.type === 'thoughts' && element.thoughtsConfig) return element.thoughtsConfig.prompt;
    if (element.type === 'rating' && element.ratingConfig) return element.ratingConfig.itemTitle;
    if (element.type === 'evaluation' && element.evaluationConfig) return element.evaluationConfig.title;
    if (element.type === 'leaderboard') return 'Leaderboard';
    if (element.type === 'qa') return element.qaConfig?.topic || 'Q&A';
    if (element.type === 'spin-wheel') return 'Spin the Wheel';
    return config.label;
  })();

  return (
    <div className={`w-full h-full rounded-lg border-2 ${config.color} flex flex-col items-center justify-center p-3 gap-2`}>
      <Icon className={`h-6 w-6 ${config.textColor}`} />
      <span className={`text-xs font-medium ${config.textColor} uppercase tracking-wider`}>
        {config.label}
      </span>
      <p className="text-sm text-center text-foreground/80 line-clamp-2 max-w-[90%]">
        {displayText}
      </p>

      {/* Quiz answer previews */}
      {element.type === 'quiz' && element.quizConfig && (
        <div className="grid grid-cols-2 gap-1 w-full mt-1">
          {element.quizConfig.answers.slice(0, 4).map((answer, i) => (
            <div
              key={i}
              className={`text-[10px] px-2 py-1 rounded text-center truncate ${
                i === element.quizConfig!.correctAnswerIndex
                  ? 'bg-green-500/20 text-green-700'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {answer.text}
            </div>
          ))}
        </div>
      )}

      {/* Poll option previews */}
      {element.type === 'poll' && element.pollConfig && (
        <div className="space-y-0.5 w-full mt-1">
          {element.pollConfig.options.slice(0, 3).map((opt, i) => (
            <div key={i} className="text-[10px] px-2 py-0.5 bg-muted rounded truncate text-muted-foreground">
              {opt.text}
            </div>
          ))}
        </div>
      )}

      {/* Evaluation items preview */}
      {element.type === 'evaluation' && element.evaluationConfig && (
        <div className="space-y-0.5 w-full mt-1">
          {element.evaluationConfig.items.slice(0, 3).map((item, i) => (
            <div key={i} className="text-[10px] px-2 py-0.5 bg-muted rounded truncate text-muted-foreground">
              {item.text}
            </div>
          ))}
          {element.evaluationConfig.items.length > 3 && (
            <div className="text-[10px] px-2 text-muted-foreground/60">
              +{element.evaluationConfig.items.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
