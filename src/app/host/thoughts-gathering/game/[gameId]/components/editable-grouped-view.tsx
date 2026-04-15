'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Users, MessageSquare, Trash2, Merge, Save, X, Pencil, Check, ArrowRight } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { TopicEntry, ThoughtSubmission } from '@/lib/types';

// Color palette matching thoughts-grouped-view.tsx
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

interface EditableGroupedViewProps {
  topics: TopicEntry[];
  submissions: ThoughtSubmission[];
  anonymousMode?: boolean;
  onSave: (updatedTopics: TopicEntry[]) => void;
  onCancel: () => void;
}

export function EditableGroupedView({
  topics: initialTopics,
  submissions,
  anonymousMode,
  onSave,
  onCancel,
}: EditableGroupedViewProps) {
  const [topics, setTopics] = useState<TopicEntry[]>(() => [...initialTopics].sort((a, b) => b.count - a.count));
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState<number | null>(null);
  const [mergeSource, setMergeSource] = useState<number | null>(null);

  const submissionMap = useMemo(() => {
    const map = new Map<string, ThoughtSubmission>();
    submissions.forEach(sub => map.set(sub.id, sub));
    return map;
  }, [submissions]);

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleRenameTitle = useCallback((index: number, newTitle: string) => {
    setTopics(prev => prev.map((t, i) => i === index ? { ...t, topic: newTitle } : t));
    setEditingTitle(null);
  }, []);

  const handleUpdateDescription = useCallback((index: number, newDescription: string) => {
    setTopics(prev => prev.map((t, i) => i === index ? { ...t, description: newDescription } : t));
    setEditingDescription(null);
  }, []);

  const handleDeleteGroup = useCallback((index: number) => {
    setTopics(prev => prev.filter((_, i) => i !== index));
    setExpandedGroups(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  }, []);

  const handleMergeGroups = useCallback((sourceIndex: number, targetIndex: number) => {
    setTopics(prev => {
      const source = prev[sourceIndex];
      const target = prev[targetIndex];
      const merged: TopicEntry = {
        ...target,
        count: target.count + source.count,
        submissionIds: [...new Set([...target.submissionIds, ...source.submissionIds])],
        variations: [...new Set([...target.variations, ...source.variations])].slice(0, 5),
      };
      merged.count = merged.submissionIds.length;

      return prev
        .map((t, i) => i === targetIndex ? merged : t)
        .filter((_, i) => i !== sourceIndex);
    });
    setMergeSource(null);
  }, []);

  const handleMoveSubmission = useCallback((submissionId: string, fromIndex: number, toIndex: number) => {
    setTopics(prev => prev.map((t, i) => {
      if (i === fromIndex) {
        const newIds = t.submissionIds.filter(id => id !== submissionId);
        return { ...t, submissionIds: newIds, count: newIds.length };
      }
      if (i === toIndex) {
        if (t.submissionIds.includes(submissionId)) return t;
        const newIds = [...t.submissionIds, submissionId];
        return { ...t, submissionIds: newIds, count: newIds.length };
      }
      return t;
    }).filter(t => t.submissionIds.length > 0));
  }, []);

  const handleSave = () => {
    onSave(topics);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Editing {topics.length} groups
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      {topics.map((topic, index) => {
        const isExpanded = expandedGroups.has(index);
        const colorScheme = COLORS[index % COLORS.length];
        const topicSubmissions = topic.submissionIds
          .map(id => submissionMap.get(id))
          .filter((sub): sub is ThoughtSubmission => sub !== undefined);

        return (
          <Collapsible
            key={`${topic.topic}-${index}`}
            open={isExpanded}
            onOpenChange={() => toggleGroup(index)}
          >
            <div className={`rounded-lg border ${colorScheme.border} ${colorScheme.bg} overflow-hidden`}>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CollapsibleTrigger asChild>
                      <button className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className={`h-5 w-5 ${colorScheme.text}`} />
                        ) : (
                          <ChevronRight className={`h-5 w-5 ${colorScheme.text}`} />
                        )}
                      </button>
                    </CollapsibleTrigger>

                    {editingTitle === index ? (
                      <Input
                        defaultValue={topic.topic}
                        autoFocus
                        className="h-8 text-sm font-semibold"
                        onBlur={(e) => handleRenameTitle(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameTitle(index, (e.target as HTMLInputElement).value);
                          if (e.key === 'Escape') setEditingTitle(null);
                        }}
                      />
                    ) : (
                      <button
                        className={`font-semibold text-left ${colorScheme.text} hover:underline`}
                        onClick={() => setEditingTitle(index)}
                        title="Click to rename"
                      >
                        {topic.topic}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border}`}>
                      {topic.count}
                    </span>
                    <button
                      onClick={() => setEditingTitle(index)}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {mergeSource === null ? (
                      <button
                        onClick={() => setMergeSource(index)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                        title="Merge with another group"
                      >
                        <Merge className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ) : mergeSource === index ? (
                      <button
                        onClick={() => setMergeSource(null)}
                        className="p-1 rounded bg-amber-500/10"
                        title="Cancel merge"
                      >
                        <X className="h-3.5 w-3.5 text-amber-500" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMergeGroups(mergeSource, index)}
                        className="p-1 rounded bg-green-500/10"
                        title={`Merge "${topics[mergeSource]?.topic}" into this group`}
                      >
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteGroup(index)}
                      className="p-1 rounded hover:bg-red-500/10"
                      title="Delete group"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Editable description */}
                {editingDescription === index ? (
                  <Textarea
                    defaultValue={topic.description}
                    autoFocus
                    className="mt-2 ml-7 text-sm"
                    rows={2}
                    onBlur={(e) => handleUpdateDescription(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingDescription(null);
                    }}
                  />
                ) : topic.description ? (
                  <p
                    className="mt-2 ml-7 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setEditingDescription(index)}
                    title="Click to edit description"
                  >
                    {topic.description}
                  </p>
                ) : null}
              </div>

              <CollapsibleContent>
                <div className="border-t border-border/50 bg-background/50 p-4 space-y-2">
                  {topicSubmissions.length > 0 ? (
                    topicSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg group"
                      >
                        <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">
                            {anonymousMode ? 'Participant' : sub.playerName}
                          </span>
                          <p className="text-sm text-muted-foreground mt-0.5">{sub.rawText}</p>
                        </div>
                        {topics.length > 1 && (
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Select
                              onValueChange={(targetIdx) => handleMoveSubmission(sub.id, index, parseInt(targetIdx))}
                            >
                              <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent">
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                              </SelectTrigger>
                              <SelectContent>
                                {topics.map((t, i) => i !== index ? (
                                  <SelectItem key={i} value={String(i)}>
                                    {t.topic}
                                  </SelectItem>
                                ) : null)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 p-3 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">No submissions in this group</span>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {mergeSource !== null && (
        <p className="text-sm text-amber-600 dark:text-amber-400 text-center py-2">
          Select a target group to merge &quot;{topics[mergeSource]?.topic}&quot; into
        </p>
      )}
    </div>
  );
}
