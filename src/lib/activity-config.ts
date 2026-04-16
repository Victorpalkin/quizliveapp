import { FileQuestion, Vote, Cloud, BarChart3, Presentation } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityType } from './types';

export interface ActivityTypeConfig {
  icon: LucideIcon;
  color: string;
  label: string;
  gradient: string;
  badgeClass: string;
  lobbyPath: (gameId: string) => string;
  gamePath: (gameId: string) => string;
  detailPath: (activityId: string) => string;
  editPath: (activityId: string) => string;
  analyticsPath: ((gameId: string) => string) | null;
}

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  quiz: {
    icon: FileQuestion,
    color: 'text-purple-500',
    label: 'Quiz',
    gradient: 'from-primary to-accent',
    badgeClass: 'bg-purple-500/20 text-purple-500',
    lobbyPath: (id) => `/host/quiz/lobby/${id}`,
    gamePath: (id) => `/host/quiz/game/${id}`,
    detailPath: (id) => `/host/quiz/${id}`,
    editPath: (id) => `/host/quiz/${id}`,
    analyticsPath: (id) => `/host/quiz/analytics/${id}`,
  },
  poll: {
    icon: Vote,
    color: 'text-teal-500',
    label: 'Poll',
    gradient: 'from-teal-500 to-cyan-500',
    badgeClass: 'bg-teal-500/20 text-teal-500',
    lobbyPath: (id) => `/host/poll/lobby/${id}`,
    gamePath: (id) => `/host/poll/game/${id}`,
    detailPath: (id) => `/host/poll/${id}`,
    editPath: (id) => `/host/poll/edit/${id}`,
    analyticsPath: (id) => `/host/poll/analytics/${id}`,
  },
  'thoughts-gathering': {
    icon: Cloud,
    color: 'text-blue-500',
    label: 'Thoughts Gathering',
    gradient: 'from-blue-500 to-purple-500',
    badgeClass: 'bg-blue-500/20 text-blue-500',
    lobbyPath: (id) => `/host/thoughts-gathering/game/${id}`,
    gamePath: (id) => `/host/thoughts-gathering/game/${id}`,
    detailPath: (id) => `/host/thoughts-gathering/${id}`,
    editPath: (id) => `/host/thoughts-gathering/edit/${id}`,
    analyticsPath: null,
  },
  evaluation: {
    icon: BarChart3,
    color: 'text-orange-500',
    label: 'Evaluation',
    gradient: 'from-orange-500 to-red-500',
    badgeClass: 'bg-orange-500/20 text-orange-500',
    lobbyPath: (id) => `/host/evaluation/game/${id}`,
    gamePath: (id) => `/host/evaluation/game/${id}`,
    detailPath: (id) => `/host/evaluation/${id}`,
    editPath: (id) => `/host/evaluation/edit/${id}`,
    analyticsPath: null,
  },
  presentation: {
    icon: Presentation,
    color: 'text-indigo-500',
    label: 'Presentation',
    gradient: 'from-indigo-500 to-purple-500',
    badgeClass: 'bg-pink-500/20 text-pink-500',
    lobbyPath: (id) => `/host/presentation/lobby/${id}`,
    gamePath: (id) => `/host/presentation/present/${id}`,
    detailPath: (id) => `/host/presentation/edit/${id}`,
    editPath: (id) => `/host/presentation/edit/${id}`,
    analyticsPath: (id) => `/host/presentation/analytics/${id}`,
  },
};

/**
 * Get the appropriate route path for a game based on its activity type and state.
 */
export function getGameRoutePath(activityType: ActivityType | undefined, gameState: string, gameId: string): string {
  const type = activityType || 'quiz';
  const config = ACTIVITY_CONFIG[type];
  return gameState === 'lobby' ? config.lobbyPath(gameId) : config.gamePath(gameId);
}
