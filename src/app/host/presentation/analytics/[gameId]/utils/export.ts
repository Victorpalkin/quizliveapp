import type { PresentationAnalytics, ElementStats } from '../hooks/use-analytics';
import type { SlideAggregates } from '../hooks/use-slide-aggregates';
import type { PresentationSlide, SlideOutput, PresentationQuestion } from '@/lib/types';

interface ExportData {
  analytics: PresentationAnalytics;
  slides?: PresentationSlide[];
  slideOutputs?: Record<string, SlideOutput>;
  aggregates: SlideAggregates;
  questions: PresentationQuestion[];
  presentationTitle?: string;
}

export function exportAnalyticsReport(data: ExportData) {
  const { analytics, slides, slideOutputs, aggregates, questions, presentationTitle } = data;
  const lines: string[] = [];

  lines.push(`# ${presentationTitle || 'Presentation'} - Analytics Report`);
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Players | ${analytics.totalPlayers} |`);
  lines.push(`| Total Responses | ${analytics.totalResponses} |`);
  lines.push(`| Total Reactions | ${analytics.totalReactions} |`);
  lines.push(`| Total Questions | ${analytics.totalQuestions} |`);
  lines.push(`| Average Score | ${Math.round(analytics.averageScore)} |`);
  lines.push('');

  // Per-element results
  if (slides && slides.length > 0) {
    lines.push('## Slide Results');
    lines.push('');

    const statsByElementId = new Map(analytics.elementStats.map((s) => [s.elementId, s]));

    slides.forEach((slide, slideIndex) => {
      for (const element of slide.elements) {
        const stat = statsByElementId.get(element.id);

        switch (element.type) {
          case 'quiz': {
            const config = element.quizConfig;
            if (!config) break;
            lines.push(`### Slide ${slideIndex + 1}: Quiz - ${config.question}`);
            lines.push('');
            if (stat?.correctRate !== undefined) {
              lines.push(`**${stat.correctRate}% correct** (${stat.correctCount ?? 0}/${stat.totalResponses})`);
              lines.push('');
            }
            lines.push(`| Answer | Votes | % |`);
            lines.push(`|--------|-------|---|`);
            config.answers.forEach((a, i) => {
              const count = stat?.answerDistribution?.[String(i)] ?? 0;
              const total = stat?.totalResponses ?? 0;
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              const marker = i === config.correctAnswerIndex ? ' ✓' : '';
              lines.push(`| ${a.text}${marker} | ${count} | ${pct}% |`);
            });
            lines.push('');
            break;
          }
          case 'poll': {
            const config = element.pollConfig;
            if (!config) break;
            lines.push(`### Slide ${slideIndex + 1}: Poll - ${config.question}`);
            lines.push('');
            lines.push(`| Option | Votes | % |`);
            lines.push(`|--------|-------|---|`);
            const total = stat?.totalResponses ?? 0;
            config.options.forEach((o, i) => {
              const count = stat?.answerDistribution?.[String(i)] ?? 0;
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              lines.push(`| ${o.text} | ${count} | ${pct}% |`);
            });
            lines.push('');
            break;
          }
          case 'thoughts': {
            const config = element.thoughtsConfig;
            if (!config) break;
            const submissions = aggregates.thoughtsResponsesMap[element.id] ?? [];
            const topics = aggregates.topicsMap[element.id] ?? [];
            lines.push(`### Slide ${slideIndex + 1}: Thoughts - ${config.prompt}`);
            lines.push('');
            if (topics.length > 0) {
              lines.push('**Grouped Topics:**');
              lines.push('');
              topics.forEach((t) => {
                lines.push(`- **${t.topic}** (${t.count} submissions): ${t.description}`);
              });
              lines.push('');
            }
            if (submissions.length > 0) {
              lines.push('**Raw Submissions:**');
              lines.push('');
              submissions.forEach((s) => {
                lines.push(`- ${s.playerName}: ${s.rawText}`);
              });
              lines.push('');
            }
            break;
          }
          case 'evaluation': {
            const config = element.evaluationConfig;
            if (!config) break;
            lines.push(`### Slide ${slideIndex + 1}: Evaluation - ${config.title}`);
            lines.push('');
            lines.push(`Items: ${config.items.map((i) => i.text).join(', ')}`);
            lines.push(`Metrics: ${config.metrics.map((m) => m.name).join(', ')}`);
            lines.push(`Responses: ${stat?.totalResponses ?? 0}`);
            lines.push('');
            break;
          }
          case 'evaluation-results': {
            const results = aggregates.evaluationResultsMap[element.sourceElementId || ''];
            if (results?.items) {
              lines.push(`### Slide ${slideIndex + 1}: Evaluation Results`);
              lines.push('');
              lines.push(`| Rank | Item | Score | Consensus |`);
              lines.push(`|------|------|-------|-----------|`);
              results.items.forEach((item) => {
                lines.push(`| ${item.rank} | ${item.itemText} | ${(item.overallScore * 100).toFixed(0)}% | ${item.consensusLevel} |`);
              });
              lines.push('');
            }
            break;
          }
          case 'rating': {
            const config = element.ratingConfig;
            if (!config) break;
            lines.push(`### Slide ${slideIndex + 1}: Rating - ${config.question || config.itemTitle}`);
            lines.push('');
            if (stat?.itemRatings && Object.keys(stat.itemRatings).length > 0 && config.items) {
              lines.push(`| Item | Average |`);
              lines.push(`|------|---------|`);
              config.items.forEach((item) => {
                const avg = stat.itemRatings?.[item.id];
                lines.push(`| ${item.text} | ${avg != null ? avg.toFixed(1) : '-'} |`);
              });
            } else if (stat?.avgRating !== undefined) {
              lines.push(`Average: **${stat.avgRating.toFixed(1)}** / ${config.max}`);
            }
            lines.push(`Responses: ${stat?.totalResponses ?? 0}`);
            lines.push('');
            break;
          }
          case 'ai-step': {
            const output = slideOutputs?.[slide.id];
            if (output) {
              const aiElement = slide.elements.find((el) => el.type === 'ai-step');
              const title = aiElement?.aiStepConfig?.outputExpectation
                || slide.elements.find((el) => el.type === 'text')?.content
                || 'AI Step';
              lines.push(`### Slide ${slideIndex + 1}: AI Step - ${title}`);
              lines.push('');
              lines.push(output.aiOutput);
              lines.push('');
            }
            break;
          }
        }
      }
    });
  }

  // Q&A
  if (questions.length > 0) {
    lines.push('## Audience Questions');
    lines.push('');
    const sorted = [...questions].sort((a, b) => b.upvotes - a.upvotes);
    sorted.forEach((q) => {
      const badges = [
        q.pinned ? '📌' : '',
        q.answered ? '✅' : '',
      ].filter(Boolean).join(' ');
      lines.push(`- **${q.playerName}**: ${q.text} (${q.upvotes} upvotes) ${badges}`);
    });
    lines.push('');
  }

  // Leaderboard
  if (analytics.playerEngagement.length > 0) {
    lines.push('## Leaderboard');
    lines.push('');
    lines.push(`| Rank | Player | Score |`);
    lines.push(`|------|--------|-------|`);
    const sorted = [...analytics.playerEngagement].sort((a, b) => b.score - a.score);
    sorted.forEach((p, i) => {
      lines.push(`| ${i + 1} | ${p.playerName} | ${p.score} |`);
    });
    lines.push('');
  }

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(presentationTitle || 'presentation').toLowerCase().replace(/\s+/g, '-')}-analytics.md`;
  a.click();
  URL.revokeObjectURL(url);
}
