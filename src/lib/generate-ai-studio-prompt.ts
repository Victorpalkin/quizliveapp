import type { TopicEntry, ThoughtSubmission } from './types';

export interface AIStudioPromptOptions {
  appType?: 'web' | 'mobile' | 'api' | 'dashboard';
  techStack?: string;
  additionalContext?: string;
  anonymousMode?: boolean;
}

const APP_TYPE_LABELS: Record<string, string> = {
  web: 'Web Application',
  mobile: 'Mobile Application',
  api: 'REST API / Backend Service',
  dashboard: 'Analytics Dashboard',
};

/**
 * Generates a structured prompt for Google AI Studio to build a demo app
 * based on collected thoughts gathering results.
 */
export function generateAIStudioPrompt(
  activityTitle: string,
  originalPrompt: string,
  topics: TopicEntry[],
  submissions: ThoughtSubmission[],
  playerCount: number,
  options?: AIStudioPromptOptions
): string {
  const sortedTopics = [...topics].sort((a, b) => b.count - a.count);
  const appType = options?.appType ? APP_TYPE_LABELS[options.appType] || options.appType : 'Web Application';
  const anonymize = options?.anonymousMode ?? false;

  let prompt = `# Build a Demo Application

## Session Context

This prompt is based on a collaborative requirements gathering session titled "${activityTitle}".
${playerCount} participants were asked: "${originalPrompt}"
Their responses were analyzed and grouped into ${topics.length} distinct categories from ${submissions.length} total submissions.

## Application Type

Build a **${appType}**${options?.techStack ? ` using **${options.techStack}**` : ''}.

## Key Requirements (by priority)

The following requirements are ordered by how many participants expressed interest (highest first). Prioritize accordingly.

`;

  sortedTopics.forEach((topic, index) => {
    prompt += `### ${index + 1}. ${topic.topic} (${topic.count} ${topic.count === 1 ? 'vote' : 'votes'})\n\n`;
    prompt += `**Description:** ${topic.description}\n\n`;

    if (topic.variations && topic.variations.length > 0) {
      prompt += `**Specific ideas mentioned:**\n`;
      topic.variations.forEach(v => {
        prompt += `- ${v}\n`;
      });
      prompt += '\n';
    }

    // Include the actual submissions for this topic
    const topicSubmissions = topic.submissionIds
      .map(id => submissions.find(s => s.id === id))
      .filter((s): s is ThoughtSubmission => s !== undefined);

    if (topicSubmissions.length > 0) {
      prompt += `**Raw participant inputs:**\n`;
      topicSubmissions.forEach(sub => {
        const name = anonymize ? 'Participant' : sub.playerName;
        prompt += `- ${name}: "${sub.rawText}"\n`;
      });
      prompt += '\n';
    }
  });

  // Add ungrouped submissions (if any submission isn't in any topic)
  const groupedIds = new Set(sortedTopics.flatMap(t => t.submissionIds));
  const ungrouped = submissions.filter(s => !groupedIds.has(s.id));

  if (ungrouped.length > 0) {
    prompt += `## Additional Inputs (uncategorized)\n\n`;
    prompt += `These submissions didn't fit neatly into the main categories but may contain useful ideas:\n\n`;
    ungrouped.forEach(sub => {
      const name = anonymize ? 'Participant' : sub.playerName;
      prompt += `- ${name}: "${sub.rawText}"\n`;
    });
    prompt += '\n';
  }

  if (options?.additionalContext) {
    prompt += `## Additional Context\n\n${options.additionalContext}\n\n`;
  }

  prompt += `## Instructions

1. Build a functional demo application that addresses the top requirements listed above
2. Focus on the highest-priority categories (most votes) first
3. Include the specific features and ideas mentioned by participants where feasible
4. Create a clean, modern UI with good UX
5. Include sample/mock data that demonstrates each feature
6. Add brief comments explaining key architectural decisions
7. Make the app self-contained and runnable

Start by outlining the application architecture, then implement each feature module.`;

  return prompt;
}
