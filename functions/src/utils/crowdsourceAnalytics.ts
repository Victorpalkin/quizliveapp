import type { CrowdsourceAnalytics } from '../types';

/** Question submission from crowdsource mode */
export interface QuestionSubmission {
  playerId: string;
  playerName: string;
  questionText: string;
  aiSelected?: boolean;
}

/**
 * Build crowdsource analytics from question submissions
 */
export function buildCrowdsourceStats(submissions: QuestionSubmission[]): CrowdsourceAnalytics {
  const totalSubmissions = submissions.length;
  const submissionsUsed = submissions.filter(s => s.aiSelected).length;

  const playerStats = new Map<string, { submissionCount: number; usedCount: number }>();

  for (const s of submissions) {
    if (!playerStats.has(s.playerName)) {
      playerStats.set(s.playerName, { submissionCount: 0, usedCount: 0 });
    }
    const stats = playerStats.get(s.playerName)!;
    stats.submissionCount++;
    if (s.aiSelected) {
      stats.usedCount++;
    }
  }

  const topContributors = Array.from(playerStats.entries())
    .map(([playerName, stats]) => ({
      playerName,
      submissionCount: stats.submissionCount,
      usedCount: stats.usedCount,
    }))
    .sort((a, b) => {
      if (b.usedCount !== a.usedCount) return b.usedCount - a.usedCount;
      return b.submissionCount - a.submissionCount;
    })
    .slice(0, 10);

  return {
    totalSubmissions,
    submissionsUsed,
    topContributors,
  };
}
