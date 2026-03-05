import { Timestamp } from 'firebase/firestore';

import type { PollQuestion } from './quiz';
import type { TopicEntry } from './thoughts-gathering';

// ==========================================
// Poll Activity Types
// ==========================================

/**
 * Configuration for Poll activity
 */
export interface PollConfig {
  allowAnonymous: boolean;           // Default: false - players can join without name
  defaultShowLiveResults: boolean;   // Default: true - show results updating in real-time
}

/**
 * Poll activity stored in /activities/{activityId}
 */
export interface PollActivity {
  id: string;
  type: 'poll';
  title: string;
  description?: string;
  hostId: string;
  questions: PollQuestion[];
  config: PollConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Free text response stored in /games/{gameId}/responses/{responseId}
 */
export interface PollFreeTextResponse {
  id: string;
  questionIndex: number;
  playerId: string;
  playerName?: string;        // Empty if anonymous
  text: string;
  submittedAt: Timestamp;
}

/**
 * Aggregated results for poll questions stored in /games/{gameId}/aggregates/question_{index}
 */
export interface PollQuestionResult {
  questionIndex: number;
  totalResponses: number;
  // For choice questions
  answerCounts?: number[];           // Count per answer option
  // For free text questions (grouped by AI)
  textGroups?: TopicEntry[];         // Reuse TopicEntry from thoughts gathering
  processedAt: Timestamp;
}
