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
import { Copy, Check, ChevronRight, Download, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { PresentationAnalytics } from '../hooks/use-analytics';
import type { SlideOutput, PresentationSlide } from '@/lib/types';

interface SlidesTabProps {
  analytics: PresentationAnalytics;
  slideOutputs?: Record<string, SlideOutput>;
  slides?: PresentationSlide[];
}

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
              <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
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
                <img
                  src={output.imageUrl}
                  alt={`${title} infographic`}
                  className="w-full h-auto"
                />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function SlidesTab({ analytics, slideOutputs, slides }: SlidesTabProps) {
  const { elementStats } = analytics;

  if (elementStats.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No interactive element data available.</p>
    );
  }

  return (
    <div className="space-y-4">
      {elementStats.map((stat, i) => {
        const isAIStep = stat.elementType === 'ai-step';
        const slide = isAIStep && slides && stat.slideIndex != null ? slides[stat.slideIndex] : undefined;
        const slideId = slide?.id;
        const output = isAIStep && slideId && slideOutputs ? slideOutputs[slideId] : undefined;

        if (isAIStep && output) {
          const aiElement = slide?.elements.find((el) => el.type === 'ai-step');
          const title = aiElement?.aiStepConfig?.outputExpectation
            || slide?.elements.find((el) => el.type === 'text')?.content
            || 'AI Step';

          return (
            <motion.div
              key={stat.elementId || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <AIStepCard output={output} title={title} />
            </motion.div>
          );
        }

        return (
          <motion.div
            key={stat.elementId || i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="capitalize">{stat.elementType}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {stat.totalResponses} responses
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {stat.correctPercentage !== undefined && (
                    <div>
                      <p className="text-muted-foreground">Correct</p>
                      <p className="text-lg font-bold text-green-600 drop-shadow-[0_0_8px_rgba(22,163,74,0.2)]">
                        {stat.correctPercentage.toFixed(0)}%
                      </p>
                    </div>
                  )}
                  {stat.averageRating !== undefined && (
                    <div>
                      <p className="text-muted-foreground">Avg Rating</p>
                      <p className="text-lg font-bold">{stat.averageRating.toFixed(1)}</p>
                    </div>
                  )}
                  {stat.averageTimeRemaining !== undefined && (
                    <div>
                      <p className="text-muted-foreground">Avg Time Left</p>
                      <p className="text-lg font-bold">{stat.averageTimeRemaining.toFixed(1)}s</p>
                    </div>
                  )}
                </div>

                {stat.distribution && stat.distribution.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {stat.distribution.map((count, j) => {
                      const max = Math.max(...stat.distribution!, 1);
                      const pct = (count / max) * 100;
                      return (
                        <div key={j} className="flex items-center gap-2">
                          <span className="text-xs w-20 text-right text-muted-foreground">Option {j + 1}</span>
                          <div className="flex-1 h-6 bg-muted/50 rounded overflow-hidden">
                            <motion.div
                              className="h-full rounded bg-gradient-to-r from-primary/70 to-primary/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: j * 0.08, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="text-xs w-8 font-mono">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
