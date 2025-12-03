/**
 * Shared types for player game page and hooks
 */

export type AnswerResult = {
  selected: number;
  correct: number[];
  points: number;
  wasTimeout: boolean;
  isPartiallyCorrect?: boolean;
};

export type RankInfo = {
  rank: number;
  totalPlayers: number;
};

/**
 * Player session data stored in localStorage
 */
export type PlayerSession = {
  playerId: string;
  gameDocId: string;
  gamePin: string;
  nickname: string;
};
