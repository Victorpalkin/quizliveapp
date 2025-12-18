import type { TopicEntry, ThoughtSubmission } from './types';

/**
 * Formats thoughts gathering results as a Markdown string
 */
export function exportThoughtsToMarkdown(
  activityTitle: string,
  topics: TopicEntry[],
  submissions: ThoughtSubmission[],
  playerCount: number,
  processedAt?: Date
): string {
  const date = processedAt || new Date();
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Create submission lookup map
  const submissionMap = new Map<string, ThoughtSubmission>();
  submissions.forEach(sub => submissionMap.set(sub.id, sub));

  // Sort topics by count (descending)
  const sortedTopics = [...topics].sort((a, b) => b.count - a.count);

  let md = `# Thoughts Gathering Results

**Session:** ${activityTitle}
**Date:** ${formattedDate}
**Participants:** ${playerCount} | **Submissions:** ${submissions.length} | **Topics:** ${topics.length}

---

## Extracted Topics

`;

  // Add each topic
  sortedTopics.forEach((topic, index) => {
    md += `### ${index + 1}. ${topic.topic} (${topic.count} ${topic.count === 1 ? 'mention' : 'mentions'})\n\n`;

    // Add variations if more than one
    if (topic.variations.length > 1) {
      md += `**Variations:** ${topic.variations.join(', ')}\n\n`;
    }

    // Add linked submissions
    const linkedSubmissions = topic.submissionIds
      .map(id => submissionMap.get(id))
      .filter((sub): sub is ThoughtSubmission => sub !== undefined);

    if (linkedSubmissions.length > 0) {
      md += `**Submissions:**\n`;
      linkedSubmissions.forEach(sub => {
        md += `- **${sub.playerName}:** "${sub.rawText}"\n`;
      });
      md += '\n';
    }
  });

  // Add raw submissions table
  md += `---

## Raw Submissions

| # | Player | Submission | Time |
|---|--------|------------|------|
`;

  submissions.forEach((sub, index) => {
    const time = sub.submittedAt?.toDate?.()
      ? sub.submittedAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '';
    // Escape pipe characters in submission text for markdown table
    const escapedText = sub.rawText.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md += `| ${index + 1} | ${sub.playerName} | ${escapedText} | ${time} |\n`;
  });

  return md;
}

/**
 * Triggers a browser download of the markdown content
 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename for the export
 */
export function generateExportFilename(activityTitle: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitizedTitle = activityTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${sanitizedTitle}-thoughts-${date}.md`;
}
