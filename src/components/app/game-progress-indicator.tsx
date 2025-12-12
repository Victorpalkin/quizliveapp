'use client';

import { cn } from '@/lib/utils';
import { CheckCircle, Circle, PlayCircle, Trophy, HelpCircle } from 'lucide-react';

type GameState = 'lobby' | 'preparing' | 'question' | 'leaderboard' | 'ended';

interface GameProgressIndicatorProps {
  /** Current game state */
  currentState: GameState;
  /** Current question index (0-based) */
  currentQuestionIndex: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Optional className */
  className?: string;
}

interface StepIndicatorProps {
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  icon: React.ReactNode;
}

function StepIndicator({ label, isActive, isCompleted, icon }: StepIndicatorProps) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 transition-all duration-300",
      isActive && "scale-110",
      isCompleted && "opacity-60",
    )}>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
        isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
        isCompleted && "bg-muted text-muted-foreground",
        !isActive && !isCompleted && "bg-muted/50 text-muted-foreground/50",
      )}>
        {isCompleted ? <CheckCircle className="h-5 w-5" /> : icon}
      </div>
      <span className={cn(
        "text-xs font-medium",
        isActive && "text-foreground",
        !isActive && "text-muted-foreground",
      )}>
        {label}
      </span>
    </div>
  );
}

function StepConnector({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div className={cn(
      "flex-1 h-0.5 transition-all duration-500",
      isCompleted ? "bg-primary" : "bg-muted",
    )} />
  );
}

/**
 * GameProgressIndicator - Shows the current state in the game flow
 *
 * Displays: Lobby → Question X/Y → Leaderboard → ... → Final
 */
export function GameProgressIndicator({
  currentState,
  currentQuestionIndex,
  totalQuestions,
  className,
}: GameProgressIndicatorProps) {
  const isLobby = currentState === 'lobby';
  const isPreparing = currentState === 'preparing';
  const isQuestion = currentState === 'question';
  const isLeaderboard = currentState === 'leaderboard';
  const isEnded = currentState === 'ended';

  const lobbyCompleted = !isLobby;
  const questionActive = isQuestion || isPreparing;
  const leaderboardActive = isLeaderboard;

  return (
    <div className={cn("flex items-center gap-2 px-4 py-3 bg-muted/30 rounded-lg", className)}>
      {/* Lobby Step */}
      <StepIndicator
        label="Lobby"
        isActive={isLobby}
        isCompleted={lobbyCompleted}
        icon={<PlayCircle className="h-5 w-5" />}
      />

      <StepConnector isCompleted={lobbyCompleted} />

      {/* Question Step */}
      <StepIndicator
        label={`Q${currentQuestionIndex + 1}/${totalQuestions}`}
        isActive={questionActive}
        isCompleted={isLeaderboard || isEnded}
        icon={<HelpCircle className="h-5 w-5" />}
      />

      <StepConnector isCompleted={isLeaderboard || isEnded} />

      {/* Leaderboard/Results Step */}
      <StepIndicator
        label={isEnded ? "Final" : "Results"}
        isActive={leaderboardActive || isEnded}
        isCompleted={false}
        icon={<Trophy className="h-5 w-5" />}
      />
    </div>
  );
}

/**
 * QuestionProgress - Simple X/Y progress indicator
 */
interface QuestionProgressProps {
  current: number;
  total: number;
  className?: string;
}

export function QuestionProgress({ current, total, className }: QuestionProgressProps) {
  const percentage = (current / total) * 100;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {current} / {total}
      </span>
    </div>
  );
}

/**
 * GameStateIndicator - Shows just the current state as a badge
 */
interface GameStateIndicatorProps {
  state: GameState;
  className?: string;
}

const stateLabels: Record<GameState, { label: string; color: string }> = {
  lobby: { label: 'Waiting in Lobby', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  preparing: { label: 'Get Ready...', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  question: { label: 'Question Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  leaderboard: { label: 'Showing Results', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  ended: { label: 'Game Over', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
};

export function GameStateIndicator({ state, className }: GameStateIndicatorProps) {
  const config = stateLabels[state];

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
      config.color,
      className,
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {config.label}
    </span>
  );
}
