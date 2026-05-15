'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Copy,
  Check,
  ChevronRight,
  Download,
  Sparkles,
  Star,
  MessageCircle,
  BarChart3,
  ClipboardList,
  HelpCircle,
  Layers,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ANSWER_COLORS } from '@/lib/constants';
import { AGENTIC_DESIGNER_STEPS } from '@/lib/agentic-designer-steps';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { EvaluationResultsDisplay } from '@/components/app/evaluation-results-display';
import type { PresentationAnalytics, ElementStats } from '../hooks/use-analytics';
import type { SlideAggregates } from '../hooks/use-slide-aggregates';
import type { SlideOutput, PresentationSlide, SlideElement } from '@/lib/types';
import type { AgenticDesignerSession } from '@/lib/types/agentic-designer';

interface SlidesTabProps {
  analytics: PresentationAnalytics;
  slideOutputs?: Record<string, SlideOutput>;
  slides?: PresentationSlide[];
  aggregates: SlideAggregates;
  gameId: string;
}

const INTERACTIVE_TYPES = [
  'quiz', 'poll', 'thoughts', 'rating', 'evaluation', 'agentic-designer', 'ai-step',
];
const RESULTS_TYPES = [
  'quiz-results', 'poll-results', 'thoughts-results', 'rating-results',
  'evaluation-results', 'agentic-designer-results',
];
const ELEMENT_TYPE_LABELS: Record<string, string> = {
  'quiz': 'Quiz',
  'quiz-results': 'Quiz Results',
  'poll': 'Poll',
  'poll-results': 'Poll Results',
  'thoughts': 'Thoughts',
  'thoughts-results': 'Thoughts Results',
  'rating': 'Rating',
  'rating-results': 'Rating Results',
  'evaluation': 'Evaluation',
  'evaluation-results': 'Evaluation Results',
  'agentic-designer': 'Agentic Designer',
  'agentic-designer-results': 'Agentic Designer Results',
  'ai-step': 'AI Step',
};

function resolveSource(
  element: SlideElement,
  slides: PresentationSlide[]
): SlideElement | undefined {
  if (!element.sourceSlideId || !element.sourceElementId) return undefined;
  const slide = slides.find((s) => s.id === element.sourceSlideId);
  return slide?.elements.find((el) => el.id === element.sourceElementId);
}

// ─── AI Step Card ───────────────────────────────────────────────────────────

function AIStepCard({ output, title }: { output: SlideOutput; title: string }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output.aiOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([output.aiOutput], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-0">
          <CollapsibleTrigger className="w-full">
            <CardTitle className="text-base flex items-center gap-2">
              <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="flex-1 text-left truncate">{title}</span>
              <span className="text-sm font-normal text-muted-foreground">AI Step</span>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-3">
            <div className="flex items-center justify-end gap-1 pb-2">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
                {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 text-xs">
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{output.aiOutput}</ReactMarkdown>
            </div>
            {output.imageUrl && (
              <div className="mt-4 rounded-lg overflow-hidden border">
                <img src={output.imageUrl} alt={`${title} infographic`} className="w-full h-auto" />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─── Quiz Card ──────────────────────────────────────────────────────────────

function QuizCard({ stat, config }: {
  stat: ElementStats | undefined;
  config: SlideElement['quizConfig'];
}) {
  if (!config) return <GenericCard stat={stat} />;

  const distribution = config.answers.map((_, i) => {
    return stat?.answerDistribution?.[String(i)] ?? 0;
  });
  const total = distribution.reduce((s, n) => s + n, 0);
  const maxCount = Math.max(...distribution, 1);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            {config.question}
          </span>
          <span className="text-sm font-normal text-muted-foreground">Quiz</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stat?.correctRate !== undefined && (
          <p className="text-sm text-muted-foreground mb-3">
            <span className="text-green-600 font-bold">{stat.correctRate}%</span> correct
            ({stat.correctCount ?? 0}/{total})
          </p>
        )}
        <div className="space-y-2">
          {config.answers.map((answer, i) => {
            const pct = total > 0 ? (distribution[i] / total) * 100 : 0;
            const isCorrect = i === config.correctAnswerIndex;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className={cn('text-sm w-28 text-right truncate', isCorrect && 'text-green-600 font-bold')}>
                  {isCorrect ? '✓ ' : ''}{answer.text}
                </span>
                <div className="flex-1 h-7 bg-muted/50 rounded overflow-hidden">
                  <motion.div
                    className="h-full rounded"
                    style={{
                      backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length],
                      opacity: isCorrect ? 1 : 0.6,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(distribution[i] / maxCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs font-mono w-16 text-right">{distribution[i]} ({pct.toFixed(0)}%)</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{total} response{total !== 1 ? 's' : ''}</p>
      </CardContent>
    </Card>
  );
}

// ─── Poll Card ──────────────────────────────────────────────────────────────

function PollCard({ stat, config }: {
  stat: ElementStats | undefined;
  config: SlideElement['pollConfig'];
}) {
  if (!config) return <GenericCard stat={stat} />;

  const distribution = config.options.map((_, i) => {
    return stat?.answerDistribution?.[String(i)] ?? 0;
  });
  const total = distribution.reduce((s, n) => s + n, 0);
  const maxCount = Math.max(...distribution, 1);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            {config.question}
          </span>
          <span className="text-sm font-normal text-muted-foreground">Poll</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {config.options.map((opt, i) => {
            const pct = total > 0 ? (distribution[i] / total) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm w-28 text-right truncate">{opt.text}</span>
                <div className="flex-1 h-7 bg-muted/50 rounded overflow-hidden">
                  <motion.div
                    className="h-full rounded"
                    style={{ backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(distribution[i] / maxCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs font-mono w-16 text-right">{distribution[i]} ({pct.toFixed(0)}%)</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{total} vote{total !== 1 ? 's' : ''}</p>
      </CardContent>
    </Card>
  );
}

// ─── Thoughts Card ──────────────────────────────────────────────────────────

function ThoughtsCard({ config, submissions, topics }: {
  config: SlideElement['thoughtsConfig'];
  submissions: { id: string; playerName: string; rawText: string }[];
  topics: { topic: string; description: string; count: number; variations: string[]; submissionIds: string[] }[];
}) {
  if (!config) return null;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-500" />
            {config.prompt}
          </span>
          <span className="text-sm font-normal text-muted-foreground">Thoughts</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topics.length > 0 ? (
          <ThoughtsGroupedView topics={topics} submissions={submissions as any} hideSubmissions={false} />
        ) : submissions.length > 0 ? (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-start gap-2 p-2 bg-muted/40 rounded-lg">
                <MessageCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-primary">{s.playerName}</span>
                  <p className="text-sm break-words">{s.rawText}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No submissions</p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          {submissions.length} thought{submissions.length !== 1 ? 's' : ''}
          {topics.length > 0 && ` · ${topics.length} group${topics.length !== 1 ? 's' : ''}`}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Evaluation Card ────────────────────────────────────────────────────────

function EvaluationCard({ stat, config }: {
  stat: ElementStats | undefined;
  config: SlideElement['evaluationConfig'];
}) {
  if (!config) return <GenericCard stat={stat} />;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-500" />
            {config.title}
          </span>
          <span className="text-sm font-normal text-muted-foreground">Evaluation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {config.description && (
          <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
        )}
        <div className="flex gap-2 flex-wrap mb-3">
          {config.metrics.map((m) => (
            <span key={m.id} className="px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded text-xs font-medium">
              {m.name}
            </span>
          ))}
        </div>
        <div className="space-y-1">
          {config.items.map((item) => (
            <div key={item.id} className="text-sm p-2 bg-muted/30 rounded">
              <span className="font-medium">{item.text}</span>
              {item.description && <span className="text-muted-foreground"> - {item.description}</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {stat?.totalResponses ?? 0} response{(stat?.totalResponses ?? 0) !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Evaluation Results Card ────────────────────────────────────────────────

function EvaluationResultsCard({ results, metrics, title }: {
  results: import('@/lib/types').EvaluationResults | undefined;
  metrics: import('@/lib/types').EvaluationMetric[];
  title: string;
}) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            {title} - Results
          </span>
          <span className="text-sm font-normal text-muted-foreground">Evaluation Results</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EvaluationResultsDisplay
          results={results ?? null}
          metrics={metrics}
        />
      </CardContent>
    </Card>
  );
}

// ─── Rating Card ────────────────────────────────────────────────────────────

function RatingCard({ stat, config }: {
  stat: ElementStats | undefined;
  config: SlideElement['ratingConfig'];
}) {
  if (!config) return <GenericCard stat={stat} />;

  const hasItemRatings = stat?.itemRatings && Object.keys(stat.itemRatings).length > 0;
  const items = config.items ?? [];

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            {config.question || config.itemTitle}
          </span>
          <span className="text-sm font-normal text-muted-foreground">Rating</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasItemRatings && items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => {
              const avg = stat?.itemRatings?.[item.id];
              return (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                  <span className="flex-1 text-sm font-medium truncate">{item.text}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {config.metricType === 'stars' && (
                      <Star className={cn('h-4 w-4', avg != null ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30')} />
                    )}
                    <span className="font-bold text-lg min-w-[2.5rem] text-right">
                      {avg != null ? avg.toFixed(1) : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-1">
              {stat?.avgRating != null ? stat.avgRating.toFixed(1) : '-'}
            </div>
            {config.metricType === 'stars' && stat?.avgRating != null && (
              <div className="flex justify-center gap-1 mb-2">
                {Array.from({ length: config.max }, (_, i) => (
                  <Star
                    key={i}
                    className={cn('h-6 w-6', i < Math.round(stat.avgRating!) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30')}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          {stat?.totalResponses ?? 0} rating{(stat?.totalResponses ?? 0) !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Agentic Designer Card ──────────────────────────────────────────────────

function AgenticDesignerCard({ session, target }: {
  session: AgenticDesignerSession | undefined;
  target: string;
}) {
  const [open, setOpen] = useState(true);

  const latestOutput = (() => {
    if (!session?.aiOutputs) return null;
    const finalReport = session.aiOutputs[11];
    if (finalReport) return { step: 11, output: finalReport };
    const completedSteps = Object.keys(session.aiOutputs)
      .map(Number)
      .filter((s) => session.aiOutputs[s])
      .sort((a, b) => b - a);
    if (completedSteps.length === 0) return null;
    const latest = completedSteps[0];
    return { step: latest, output: session.aiOutputs[latest] };
  })();

  if (!latestOutput) {
    return (
      <Card className="glass">
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">No agentic designer results available</p>
        </CardContent>
      </Card>
    );
  }

  const stepConfig = AGENTIC_DESIGNER_STEPS[latestOutput.step - 1];
  const title = latestOutput.step === 11
    ? 'Final Report'
    : `${stepConfig?.title || `Step ${latestOutput.step}`} Results`;

  return (
    <Card className="glass">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-0">
          <CollapsibleTrigger className="w-full">
            <CardTitle className="text-base flex items-center gap-2">
              <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
              <Layers className="h-4 w-4 text-purple-500" />
              <span className="flex-1 text-left truncate">{title}</span>
              <span className="text-sm font-normal text-muted-foreground">Agentic Designer</span>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-3">
            {target && <p className="text-sm text-muted-foreground mb-2">Target: {target}</p>}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{latestOutput.output}</ReactMarkdown>
            </div>
            {session?.imageUrls?.[10] && (
              <div className="mt-4 rounded-lg overflow-hidden border">
                <img src={session.imageUrls[10]} alt="AI Data Foundation Map" className="w-full h-auto" />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─── Generic Fallback Card ──────────────────────────────────────────────────

function GenericCard({ stat }: { stat: ElementStats | undefined }) {
  if (!stat) return null;
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="capitalize">{stat.elementType}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {stat.totalResponses} response{stat.totalResponses !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {stat.correctRate !== undefined && (
            <div>
              <p className="text-muted-foreground">Correct</p>
              <p className="text-lg font-bold text-green-600">{stat.correctRate.toFixed(0)}%</p>
            </div>
          )}
          {stat.avgRating !== undefined && (
            <div>
              <p className="text-muted-foreground">Avg Rating</p>
              <p className="text-lg font-bold">{stat.avgRating.toFixed(1)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main SlidesTab ─────────────────────────────────────────────────────────

export function SlidesTab({ analytics, slideOutputs, slides, aggregates, gameId }: SlidesTabProps) {
  if (!slides || slides.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No slide data available.</p>
    );
  }

  const { elementStats } = analytics;
  const statsByElementId = new Map(elementStats.map((s) => [s.elementId, s]));

  // Collect all interactive + results elements across slides
  const displayElements: {
    element: SlideElement;
    slide: PresentationSlide;
    slideIndex: number;
    stat: ElementStats | undefined;
  }[] = [];

  slides.forEach((slide, slideIndex) => {
    for (const element of slide.elements) {
      if (
        INTERACTIVE_TYPES.includes(element.type) ||
        RESULTS_TYPES.includes(element.type)
      ) {
        displayElements.push({
          element,
          slide,
          slideIndex,
          stat: statsByElementId.get(element.id),
        });
      }
    }
  });

  if (displayElements.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No interactive element data available.</p>
    );
  }

  return (
    <div className="space-y-4">
      {displayElements.map(({ element, slide, slideIndex, stat }, i) => {
        const sourceElement = RESULTS_TYPES.includes(element.type)
          ? resolveSource(element, slides)
          : undefined;
        const effectiveElementId = element.sourceElementId || element.id;

        let card: React.ReactNode;

        switch (element.type) {
          case 'ai-step': {
            const output = slideOutputs?.[slide.id];
            if (output) {
              const aiElement = slide.elements.find((el) => el.type === 'ai-step');
              const title = aiElement?.aiStepConfig?.outputExpectation
                || slide.elements.find((el) => el.type === 'text')?.content
                || 'AI Step';
              card = <AIStepCard output={output} title={title} />;
            } else {
              card = <GenericCard stat={stat} />;
            }
            break;
          }
          case 'quiz':
            card = <QuizCard stat={stat} config={element.quizConfig} />;
            break;
          case 'quiz-results':
            card = <QuizCard
              stat={stat ?? (sourceElement ? statsByElementId.get(sourceElement.id) : undefined)}
              config={sourceElement?.quizConfig}
            />;
            break;
          case 'poll':
            card = <PollCard stat={stat} config={element.pollConfig} />;
            break;
          case 'poll-results':
            card = <PollCard
              stat={stat ?? (sourceElement ? statsByElementId.get(sourceElement.id) : undefined)}
              config={sourceElement?.pollConfig}
            />;
            break;
          case 'thoughts':
            card = <ThoughtsCard
              config={element.thoughtsConfig}
              submissions={aggregates.thoughtsResponsesMap[element.id] ?? []}
              topics={aggregates.topicsMap[element.id] ?? []}
            />;
            break;
          case 'thoughts-results':
            card = <ThoughtsCard
              config={sourceElement?.thoughtsConfig}
              submissions={aggregates.thoughtsResponsesMap[effectiveElementId] ?? []}
              topics={aggregates.topicsMap[effectiveElementId] ?? []}
            />;
            break;
          case 'evaluation':
            card = <EvaluationCard stat={stat} config={element.evaluationConfig} />;
            break;
          case 'evaluation-results':
            card = <EvaluationResultsCard
              results={aggregates.evaluationResultsMap[effectiveElementId]}
              metrics={aggregates.evaluationMetricsMap[effectiveElementId] ?? []}
              title={sourceElement?.evaluationConfig?.title ?? 'Evaluation'}
            />;
            break;
          case 'rating':
            card = <RatingCard stat={stat} config={element.ratingConfig} />;
            break;
          case 'rating-results':
            card = <RatingCard
              stat={stat ?? (sourceElement ? statsByElementId.get(sourceElement.id) : undefined)}
              config={sourceElement?.ratingConfig}
            />;
            break;
          case 'agentic-designer': {
            const session = aggregates.agenticSessionsMap[element.id];
            const target = element.agenticDesignerConfig?.target ?? '';
            card = <AgenticDesignerCard session={session} target={target} />;
            break;
          }
          case 'agentic-designer-results': {
            const session = aggregates.agenticSessionsMap[effectiveElementId];
            const target = sourceElement?.agenticDesignerConfig?.target ?? '';
            card = <AgenticDesignerCard session={session} target={target} />;
            break;
          }
          default:
            card = <GenericCard stat={stat} />;
        }

        return (
          <motion.div
            key={element.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="text-xs text-muted-foreground mb-1 ml-1">
              Slide {slideIndex + 1}
            </div>
            {card}
          </motion.div>
        );
      })}
    </div>
  );
}
