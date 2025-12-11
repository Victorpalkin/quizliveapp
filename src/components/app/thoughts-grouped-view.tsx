'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Users, MessageSquare } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { TopicEntry, ThoughtSubmission } from '@/lib/types';

interface ThoughtsGroupedViewProps {
  topics: TopicEntry[];
  submissions: ThoughtSubmission[];
  className?: string;
}

// Color palette for group headers (matching word cloud colors)
const COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-600 dark:text-violet-400' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-600 dark:text-pink-400' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-600 dark:text-cyan-400' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400' },
  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-600 dark:text-indigo-400' },
];

export function ThoughtsGroupedView({ topics, submissions, className = '' }: ThoughtsGroupedViewProps) {
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Create a map for O(1) submission lookup
  const submissionMap = useMemo(() => {
    const map = new Map<string, ThoughtSubmission>();
    submissions.forEach(sub => map.set(sub.id, sub));
    return map;
  }, [submissions]);

  // Sort topics by count (descending)
  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => b.count - a.count);
  }, [topics]);

  const toggleGroup = (topic: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  if (!topics.length) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <p className="text-muted-foreground">No topics to display</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {sortedTopics.map((topic, index) => {
        const isExpanded = expandedGroups.has(topic.topic);
        const colorScheme = COLORS[index % COLORS.length];

        // Get submissions for this topic
        const topicSubmissions = topic.submissionIds
          .map(id => submissionMap.get(id))
          .filter((sub): sub is ThoughtSubmission => sub !== undefined);

        return (
          <Collapsible
            key={topic.topic}
            open={isExpanded}
            onOpenChange={() => toggleGroup(topic.topic)}
          >
            <div className={`rounded-lg border ${colorScheme.border} ${colorScheme.bg} overflow-hidden`}>
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className={`h-5 w-5 ${colorScheme.text}`} />
                    ) : (
                      <ChevronRight className={`h-5 w-5 ${colorScheme.text}`} />
                    )}
                    <span className={`font-semibold text-lg ${colorScheme.text}`}>
                      {topic.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border}`}>
                      {topic.count} {topic.count === 1 ? 'mention' : 'mentions'}
                    </span>
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border/50 bg-background/50">
                  <div className="p-4 space-y-2">
                    {topicSubmissions.length > 0 ? (
                      topicSubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm">{sub.playerName}</span>
                            <p className="text-sm text-muted-foreground mt-0.5">{sub.rawText}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 p-3 text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm">Original submissions not available</span>
                      </div>
                    )}
                    {topic.variations.length > 1 && (
                      <div className="pt-2 border-t border-border/30 mt-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Variations:</span>{' '}
                          {topic.variations.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
