/**
 * Fuzzy string matching utilities for free-response questions
 * Uses Levenshtein distance for typo tolerance
 */

/**
 * Calculate Levenshtein distance between two strings
 * This is the minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one string into the other
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array to store distances
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 * 1 means identical, 0 means completely different
 */
export function similarityRatio(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  return 1 - (distance / maxLength);
}

/**
 * Normalize a string for comparison
 * - Trim whitespace
 * - Optionally convert to lowercase
 * - Normalize unicode characters
 * - Remove extra spaces
 */
export function normalizeString(str: string, caseSensitive: boolean = false): string {
  let normalized = str
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' '); // Normalize whitespace

  if (!caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

/**
 * Check if a player's answer matches any of the correct answers
 *
 * @param playerAnswer - The answer submitted by the player
 * @param correctAnswer - The primary correct answer
 * @param alternativeAnswers - Optional alternative accepted answers
 * @param caseSensitive - Whether to require exact case matching (default: false)
 * @param allowTypos - Whether to allow fuzzy matching for typos (default: true)
 * @returns Object with isCorrect flag and similarity score
 */
export function checkFreeResponseAnswer(
  playerAnswer: string,
  correctAnswer: string,
  alternativeAnswers: string[] = [],
  caseSensitive: boolean = false,
  allowTypos: boolean = true
): { isCorrect: boolean; similarity: number; matchedAnswer?: string } {
  // Normalize inputs
  const normalizedPlayer = normalizeString(playerAnswer, caseSensitive);

  // Empty answer is always wrong
  if (!normalizedPlayer) {
    return { isCorrect: false, similarity: 0 };
  }

  // All possible correct answers
  const allCorrectAnswers = [correctAnswer, ...alternativeAnswers];

  let bestSimilarity = 0;
  let matchedAnswer: string | undefined;

  for (const correct of allCorrectAnswers) {
    const normalizedCorrect = normalizeString(correct, caseSensitive);

    // Exact match
    if (normalizedPlayer === normalizedCorrect) {
      return { isCorrect: true, similarity: 1, matchedAnswer: correct };
    }

    // Calculate similarity
    const similarity = similarityRatio(normalizedPlayer, normalizedCorrect);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      matchedAnswer = correct;
    }
  }

  // If typos are allowed, accept answers with high similarity
  // Threshold: 85% similarity for short answers, 90% for longer ones
  // This allows 1-2 typos in typical answers
  if (allowTypos) {
    const shortestCorrect = Math.min(...allCorrectAnswers.map(a => a.length));
    const threshold = shortestCorrect <= 5 ? 0.80 : shortestCorrect <= 10 ? 0.85 : 0.90;

    if (bestSimilarity >= threshold) {
      return { isCorrect: true, similarity: bestSimilarity, matchedAnswer };
    }
  }

  return { isCorrect: false, similarity: bestSimilarity, matchedAnswer };
}
