'use client';

import { cn } from '@/lib/utils';
import { Lightbulb, ArrowRight, CheckCircle, Users, Clock, Cloud, BarChart3, Star } from 'lucide-react';

// Quiz states
type QuizState = 'lobby' | 'preparing' | 'question' | 'leaderboard' | 'ended';
// Thoughts Gathering states
type ThoughtsGatheringState = 'lobby' | 'collecting' | 'processing' | 'display' | 'ended';
// Evaluation states
type EvaluationState = 'collecting' | 'rating' | 'analyzing' | 'results' | 'ended';

type GameState = QuizState | ThoughtsGatheringState | EvaluationState;
type ActivityType = 'quiz' | 'thoughts-gathering' | 'evaluation';

interface HostActionHintProps {
  /** Current game state */
  gameState: GameState;
  /** Activity type to determine appropriate hints */
  activityType?: ActivityType;
  /** Number of players who have answered (for question state) */
  answeredCount?: number;
  /** Total number of players */
  totalPlayers?: number;
  /** Whether this is the last question */
  isLastQuestion?: boolean;
  /** Whether crowdsourcing is enabled (for lobby state) */
  hasCrowdsourcing?: boolean;
  /** Number of submissions received (for thoughts-gathering) */
  submissionsCount?: number;
  /** Number of items (for evaluation) */
  itemsCount?: number;
  /** Number of ratings completed (for evaluation) */
  ratingsCount?: number;
  /** Whether multiple rounds are allowed (for thoughts-gathering) */
  allowMultipleRounds?: boolean;
  /** Optional className */
  className?: string;
}

interface HintConfig {
  icon: React.ReactNode;
  text: string;
  subtext?: string;
  actionKey?: string;
}

/**
 * HostActionHint - Contextual guidance for the host
 *
 * Shows what action the host should take next based on game state and activity type
 */
export function HostActionHint({
  gameState,
  activityType = 'quiz',
  answeredCount = 0,
  totalPlayers = 0,
  isLastQuestion = false,
  hasCrowdsourcing = false,
  submissionsCount = 0,
  itemsCount = 0,
  ratingsCount = 0,
  allowMultipleRounds = false,
  className,
}: HostActionHintProps) {
  const getQuizHint = (): HintConfig => {
    switch (gameState) {
      case 'lobby':
        if (totalPlayers === 0) {
          return {
            icon: <Users className="h-5 w-5" />,
            text: 'Waiting for players to join...',
            subtext: 'Share the PIN or scan the QR code',
          };
        }
        if (hasCrowdsourcing) {
          return {
            icon: <Lightbulb className="h-5 w-5" />,
            text: 'Review crowdsourced questions, then start the game',
            subtext: `${totalPlayers} player${totalPlayers !== 1 ? 's' : ''} joined`,
            actionKey: 'Start Game',
          };
        }
        return {
          icon: <ArrowRight className="h-5 w-5" />,
          text: 'Click "Start Game" when ready',
          subtext: `${totalPlayers} player${totalPlayers !== 1 ? 's' : ''} joined`,
          actionKey: 'Start Game',
        };

      case 'preparing':
        return {
          icon: <Clock className="h-5 w-5 animate-spin" />,
          text: 'Get ready...',
          subtext: 'Question starting shortly',
        };

      case 'question':
        const allAnswered = answeredCount >= totalPlayers && totalPlayers > 0;
        if (allAnswered) {
          return {
            icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            text: 'All players answered! Finish the question.',
            actionKey: 'Space',
          };
        }
        return {
          icon: <Clock className="h-5 w-5" />,
          text: 'Click "Finish Question" when time is up or all have answered',
          subtext: `${answeredCount}/${totalPlayers} answered`,
          actionKey: 'Space',
        };

      case 'leaderboard':
        return {
          icon: <ArrowRight className="h-5 w-5" />,
          text: isLastQuestion ? 'Click to end the game and show final results' : 'Click "Next Question" to continue',
          actionKey: 'Space',
        };

      case 'ended':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          text: 'Game complete! View analytics or return to dashboard.',
        };

      default:
        return {
          icon: <Lightbulb className="h-5 w-5" />,
          text: 'Ready to go!',
        };
    }
  };

  const getThoughtsGatheringHint = (): HintConfig => {
    switch (gameState) {
      case 'collecting':
        if (totalPlayers === 0) {
          return {
            icon: <Users className="h-5 w-5" />,
            text: 'Waiting for participants to join...',
            subtext: 'Share the PIN to get started',
          };
        }
        if (submissionsCount === 0) {
          return {
            icon: <Cloud className="h-5 w-5" />,
            text: 'Waiting for submissions...',
            subtext: `${totalPlayers} participant${totalPlayers !== 1 ? 's' : ''} joined`,
          };
        }
        return {
          icon: <ArrowRight className="h-5 w-5" />,
          text: 'Click "Show Results" when you have enough responses',
          subtext: `${submissionsCount} submission${submissionsCount !== 1 ? 's' : ''} from ${totalPlayers} participant${totalPlayers !== 1 ? 's' : ''}`,
          actionKey: 'Enter',
        };

      case 'processing':
        return {
          icon: <Clock className="h-5 w-5 animate-spin" />,
          text: 'Analyzing submissions...',
          subtext: 'Please wait while we generate the word cloud',
        };

      case 'display':
        if (allowMultipleRounds) {
          return {
            icon: <Cloud className="h-5 w-5" />,
            text: 'Viewing results. Click "Continue Collecting" for more rounds, or "End Session"',
            subtext: `${submissionsCount} total submission${submissionsCount !== 1 ? 's' : ''}`,
            actionKey: 'Space',
          };
        }
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          text: 'Results displayed! Click "End Session" when done',
          subtext: `${submissionsCount} submission${submissionsCount !== 1 ? 's' : ''} collected`,
          actionKey: 'Enter',
        };

      case 'lobby':
        if (totalPlayers === 0) {
          return {
            icon: <Users className="h-5 w-5" />,
            text: 'Waiting for participants to join...',
            subtext: 'Share the PIN to get started',
          };
        }
        return {
          icon: <ArrowRight className="h-5 w-5" />,
          text: 'Click "Start" when ready to begin collecting',
          subtext: `${totalPlayers} participant${totalPlayers !== 1 ? 's' : ''} joined`,
          actionKey: 'Start',
        };

      case 'ended':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          text: 'Session complete! View the word cloud or return to dashboard.',
        };

      default:
        return {
          icon: <Lightbulb className="h-5 w-5" />,
          text: 'Ready to collect thoughts!',
        };
    }
  };

  const getEvaluationHint = (): HintConfig => {
    switch (gameState) {
      case 'collecting':
        if (totalPlayers === 0) {
          return {
            icon: <Users className="h-5 w-5" />,
            text: 'Waiting for participants to join...',
            subtext: 'Share the PIN to get started',
          };
        }
        if (itemsCount === 0) {
          return {
            icon: <BarChart3 className="h-5 w-5" />,
            text: 'Add items for participants to rate',
            subtext: `${totalPlayers} participant${totalPlayers !== 1 ? 's' : ''} joined`,
          };
        }
        return {
          icon: <ArrowRight className="h-5 w-5" />,
          text: 'Click "Start Rating" when ready',
          subtext: `${itemsCount} item${itemsCount !== 1 ? 's' : ''} to rate, ${totalPlayers} participant${totalPlayers !== 1 ? 's' : ''}`,
          actionKey: 'Enter',
        };

      case 'rating':
        const allRated = ratingsCount >= totalPlayers && totalPlayers > 0;
        if (allRated) {
          return {
            icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            text: 'All participants have rated! Click "Show Results"',
            actionKey: 'Enter',
          };
        }
        return {
          icon: <Star className="h-5 w-5" />,
          text: 'Participants are rating items...',
          subtext: `${ratingsCount}/${totalPlayers} completed`,
          actionKey: 'Enter',
        };

      case 'analyzing':
        return {
          icon: <Clock className="h-5 w-5 animate-spin" />,
          text: 'Analyzing results...',
          subtext: 'Please wait while we calculate the rankings',
        };

      case 'results':
        return {
          icon: <BarChart3 className="h-5 w-5" />,
          text: 'Results ready! Review rankings or end the session',
          subtext: 'Switch between visualization views below',
          actionKey: 'Enter',
        };

      case 'ended':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          text: 'Evaluation complete! View results or return to dashboard.',
        };

      default:
        return {
          icon: <Lightbulb className="h-5 w-5" />,
          text: 'Ready to evaluate!',
        };
    }
  };

  const getHintConfig = (): HintConfig => {
    switch (activityType) {
      case 'thoughts-gathering':
        return getThoughtsGatheringHint();
      case 'evaluation':
        return getEvaluationHint();
      case 'quiz':
      default:
        return getQuizHint();
    }
  };

  const hint = getHintConfig();

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border border-muted",
      className,
    )}>
      <div className="flex-shrink-0 text-primary">
        {hint.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{hint.text}</p>
        {hint.subtext && (
          <p className="text-xs text-muted-foreground">{hint.subtext}</p>
        )}
      </div>
      {hint.actionKey && (
        <kbd className="hidden sm:inline-flex items-center px-2 py-1 bg-background border rounded text-xs font-mono text-muted-foreground">
          {hint.actionKey}
        </kbd>
      )}
    </div>
  );
}

/**
 * ReadinessChecklist - Shows checklist of requirements before starting
 */
interface ReadinessChecklistProps {
  items: {
    label: string;
    isReady: boolean;
    detail?: string;
  }[];
  className?: string;
}

export function ReadinessChecklist({ items, className }: ReadinessChecklistProps) {
  const allReady = items.every(item => item.isReady);

  return (
    <div className={cn(
      "space-y-2 p-4 rounded-lg border",
      allReady ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" : "border-muted bg-muted/30",
      className,
    )}>
      <h4 className="text-sm font-medium flex items-center gap-2">
        {allReady ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-green-700 dark:text-green-400">Ready to start!</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Getting ready...</span>
          </>
        )}
      </h4>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            {item.isReady ? (
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
            )}
            <span className={item.isReady ? "text-foreground" : "text-muted-foreground"}>
              {item.label}
            </span>
            {item.detail && (
              <span className="text-xs text-muted-foreground">({item.detail})</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * TipBanner - Simple tip/hint banner
 */
interface TipBannerProps {
  children: React.ReactNode;
  className?: string;
}

export function TipBanner({ children, className }: TipBannerProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300",
      className,
    )}>
      <Lightbulb className="h-4 w-4 flex-shrink-0" />
      <p className="text-sm">{children}</p>
    </div>
  );
}
