'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import type { ThoughtSubmission } from '@/lib/types';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'must', 'need',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
  'they', 'them', 'their', 'this', 'that', 'these', 'those', 'what',
  'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'not', 'no',
  'so', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'more',
  'also', 'like', 'as', 'up', 'out', 'all', 'some', 'any', 'each',
  'into', 'over', 'after', 'before', 'between', 'through', 'during',
  'its', 'us', 'am', 'get', 'got', 'go', 'going', 'make', 'use',
  'using', 'want', 'think', 'know', 'see', 'look', 'really', 'well',
]);

const BAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
];

interface LiveWordFrequencyProps {
  submissions: ThoughtSubmission[] | null;
}

export function LiveWordFrequency({ submissions }: LiveWordFrequencyProps) {
  const [isOpen, setIsOpen] = useState(true);

  const wordFrequencies = useMemo(() => {
    if (!submissions || submissions.length === 0) return [];

    const counts = new Map<string, number>();

    for (const sub of submissions) {
      if (sub.hidden) continue;
      const words = sub.rawText
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w));

      for (const word of words) {
        counts.set(word, (counts.get(word) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [submissions]);

  if (!submissions || submissions.length < 2 || wordFrequencies.length === 0) {
    return null;
  }

  const maxCount = wordFrequencies[0]?.[1] || 1;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-card-border">
        <CollapsibleTrigger asChild>
          <button className="w-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-lg">Word Trends</CardTitle>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {wordFrequencies.map(([word, count], index) => {
                const percentage = (count / maxCount) * 100;
                const color = BAR_COLORS[index % BAR_COLORS.length];

                return (
                  <div key={word} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 text-right truncate">
                      {word}
                    </span>
                    <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-sm transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
