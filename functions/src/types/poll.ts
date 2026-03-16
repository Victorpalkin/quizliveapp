import * as admin from 'firebase-admin';

/**
 * Pre-computed analytics for a completed poll.
 * Stored at: games/{gameId}/aggregates/poll-analytics
 */
export interface PollAnalytics {
  gameId: string;
  activityId: string;
  pollTitle: string;
  totalQuestions: number;
  totalParticipants: number;
  computedAt: admin.firestore.FieldValue;

  questionStats: PollQuestionStats[];
  summary: PollAnalyticsSummary;
}

export interface PollAnalyticsSummary {
  avgResponseRate: number;      // Average percentage of participants who answered each question
  totalResponses: number;       // Sum of all responses across all questions
}

export interface PollQuestionStats {
  questionIndex: number;
  questionText: string;
  questionType: 'poll-single' | 'poll-multiple' | 'poll-free-text';

  totalResponded: number;
  responseRate: number;         // Percentage of participants who answered

  // For single/multiple choice questions
  answerDistribution?: {
    label: string;
    count: number;
    percentage: number;
  }[];

  // For free text questions (grouped responses)
  textGroups?: {
    text: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * Request interface for computePollAnalytics Cloud Function
 */
export interface ComputePollAnalyticsRequest {
  gameId: string;
}

/**
 * Result returned from computePollAnalytics function
 */
export interface ComputePollAnalyticsResult {
  success: boolean;
  message: string;
  analytics?: {
    totalParticipants: number;
    totalQuestions: number;
  };
}

/**
 * Poll question type union
 * Note: These don't require scoring - responses are just recorded
 */
export type PollQuestionType = 'poll-single' | 'poll-multiple' | 'poll-free-text';

/**
 * Request interface for submitPollAnswer Cloud Function
 * Separate from submitAnswer to keep quiz answer submission fast
 */
export interface SubmitPollAnswerRequest {
  gameId: string;
  playerId: string;
  questionIndex: number;
  questionType: PollQuestionType;

  // Answer data (one will be used based on question type)
  answerIndex?: number;        // For poll-single
  answerIndices?: number[];    // For poll-multiple
  textAnswer?: string;         // For poll-free-text
}

/**
 * Result returned from submitPollAnswer function
 */
export interface SubmitPollAnswerResult {
  success: boolean;
}

/**
 * Poll player answer stored in Firestore
 */
export interface PollPlayerAnswer {
  questionIndex: number;
  questionType: PollQuestionType;
  timestamp: admin.firestore.FieldValue;
  answerIndex?: number;
  answerIndices?: number[];
  textAnswer?: string;
}
