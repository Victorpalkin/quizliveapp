import { Timestamp } from 'firebase/firestore';

// ==========================================
// Thoughts Gathering Activity Types
// ==========================================

/**
 * Configuration for Thoughts Gathering activity
 */
export interface ThoughtsGatheringConfig {
  prompt: string;                    // e.g., "What topics interest you most?"
  maxSubmissionsPerPlayer: number;   // Default: 3
  allowMultipleRounds: boolean;      // Can host reopen for more submissions
  agenticUseCasesCollection?: boolean;  // Enable AI agent matching for collected topics
  anonymousMode?: boolean;           // Hide participant names in host view and exports
  enableModeration?: boolean;        // Allow host to hide/flag submissions before analysis
}

/**
 * Thoughts Gathering activity stored in /activities/{activityId}
 */
export interface ThoughtsGatheringActivity {
  id: string;
  type: 'thoughts-gathering';
  title: string;
  description?: string;
  hostId: string;
  config: ThoughtsGatheringConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Player thought submission stored in /games/{gameId}/submissions/{submissionId}
 */
export interface ThoughtSubmission {
  id: string;
  playerId: string;
  playerName: string;
  rawText: string;              // Free-form text about thoughts/ideas
  submittedAt: Timestamp;
  extractedTopics?: string[];   // Filled by AI after processing
  hidden?: boolean;             // Host can hide submissions from AI analysis
}

/**
 * A single topic group in the aggregated results
 */
export interface TopicEntry {
  topic: string;                // Short title for the group (e.g., "State Management Approaches")
  description: string;          // Summary paragraph explaining what the grouped thoughts have in common
  count: number;                // How many submissions are in this group
  variations: string[];         // Representative excerpts from grouped submissions
  submissionIds: string[];      // Which submissions are in this group
}

/**
 * A matching AI agent from the tracker database
 */
export interface MatchingAgent {
  uniqueId: string;
  agentName: string;
  summary: string;
  referenceLink: string;
  maturity: number;
  score: number;
  functionalArea: string;
  industry: string;
}

/**
 * Matched agents for a specific topic group
 */
export interface TopicAgentMatch {
  topicName: string;
  matchingAgents: MatchingAgent[];
}

/**
 * Aggregated topic cloud result stored in /games/{gameId}/aggregates/topics
 */
export interface TopicCloudResult {
  topics: TopicEntry[];
  totalSubmissions: number;
  processedAt: Timestamp;
  summary?: string;                  // AI-generated executive summary of findings
  agentMatches?: TopicAgentMatch[];  // Populated when agenticUseCasesCollection=true
  topMatureAgents?: MatchingAgent[];  // Top 5 most mature agents across all matches
}
