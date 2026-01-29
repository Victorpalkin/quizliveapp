'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Users, MessageSquare, Bot, ExternalLink, Star } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import type { TopicEntry, ThoughtSubmission, TopicAgentMatch, MatchingAgent } from '@/lib/types';

interface ThoughtsGroupedViewProps {
  topics: TopicEntry[];
  submissions: ThoughtSubmission[];
  agentMatches?: TopicAgentMatch[];
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

export function ThoughtsGroupedView({ topics, submissions, agentMatches, className = '' }: ThoughtsGroupedViewProps) {
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Create a map for O(1) submission lookup
  const submissionMap = useMemo(() => {
    const map = new Map<string, ThoughtSubmission>();
    submissions.forEach(sub => map.set(sub.id, sub));
    return map;
  }, [submissions]);

  // Create a map for O(1) agent match lookup by topic name
  const agentMatchMap = useMemo(() => {
    const map = new Map<string, MatchingAgent[]>();
    if (agentMatches) {
      agentMatches.forEach(match => map.set(match.topicName, match.matchingAgents));
    }
    return map;
  }, [agentMatches]);

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

        // Get matching agents for this topic
        const matchingAgents = agentMatchMap.get(topic.topic) || [];

        return (
          <Collapsible
            key={topic.topic}
            open={isExpanded}
            onOpenChange={() => toggleGroup(topic.topic)}
          >
            <div className={`rounded-lg border ${colorScheme.border} ${colorScheme.bg} overflow-hidden`}>
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex flex-col items-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className={`h-5 w-5 ${colorScheme.text} flex-shrink-0`} />
                      ) : (
                        <ChevronRight className={`h-5 w-5 ${colorScheme.text} flex-shrink-0`} />
                      )}
                      <span className={`font-semibold text-lg ${colorScheme.text}`}>
                        {topic.topic}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border}`}>
                        {topic.count} {topic.count === 1 ? 'submission' : 'submissions'}
                      </span>
                    </div>
                  </div>
                  {topic.description && (
                    <p className="mt-2 ml-8 text-sm text-muted-foreground line-clamp-2">
                      {topic.description}
                    </p>
                  )}
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
                    {topic.variations && topic.variations.length > 0 && (
                      <div className="pt-2 border-t border-border/30 mt-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Key themes:</span>{' '}
                          {topic.variations.slice(0, 3).map((v, i) => (
                            <span key={i}>
                              "{v}"{i < Math.min(topic.variations.length, 3) - 1 ? ', ' : ''}
                            </span>
                          ))}
                          {topic.variations.length > 3 && <span> +{topic.variations.length - 3} more</span>}
                        </p>
                      </div>
                    )}
                    {matchingAgents.length > 0 && (
                      <div className="pt-3 border-t border-border/30 mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-4 w-4 text-violet-500" />
                          <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                            Related AI Agents
                          </span>
                        </div>
                        <div className="space-y-2">
                          {matchingAgents.map((agent) => (
                            <div
                              key={agent.uniqueId}
                              className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {agent.referenceLink ? (
                                      <a
                                        href={agent.referenceLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-sm text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                                      >
                                        {agent.agentName}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="font-medium text-sm text-violet-600 dark:text-violet-400">
                                        {agent.agentName}
                                      </span>
                                    )}
                                    <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-600">
                                      <Star className="h-3 w-3 mr-1" />
                                      Maturity: {agent.maturity}
                                    </Badge>
                                  </div>
                                  {agent.summary && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {agent.summary}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {agent.functionalArea && (
                                      <span className="text-xs text-muted-foreground">
                                        {agent.functionalArea}
                                      </span>
                                    )}
                                    {agent.industry && (
                                      <span className="text-xs text-muted-foreground">
                                        • {agent.industry}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
