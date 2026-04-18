'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Sparkles, Lightbulb, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import type { AgenticDesignerNudge } from '@/lib/types';

interface AgenticNudgePanelProps {
  nudges: AgenticDesignerNudge[];
  nudgesOpen: boolean;
  nudgeText: string;
  nudgeHints: string[];
  onNudgeTextChange: (text: string) => void;
  onToggleNudges: () => void;
  onSummarize: () => Promise<string>;
  onClearNudges: () => void;
  disabled?: boolean;
}

export function AgenticNudgePanel({
  nudges,
  nudgesOpen,
  nudgeText,
  nudgeHints,
  onNudgeTextChange,
  onToggleNudges,
  onSummarize,
  onClearNudges,
  disabled,
}: AgenticNudgePanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [summarizing, setSummarizing] = useState(false);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const summary = await onSummarize();
      if (summary) onNudgeTextChange(summary);
    } finally {
      setSummarizing(false);
    }
  };

  const handleUseSelected = () => {
    const selected = nudges.filter((n) => selectedIds.has(n.id));
    const combined = selected.map((n) => n.text).join('. ');
    onNudgeTextChange(combined);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-3">
      {/* Host nudge textarea */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm">Guide the AI</Label>
          {nudgeHints.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-sm">
                  <Lightbulb className="h-4 w-4 mr-1" />
                  Suggestions
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[300px] p-3">
                <p className="text-sm font-medium mb-2">Try nudges like:</p>
                <div className="flex flex-wrap gap-1.5">
                  {nudgeHints.map((hint, i) => (
                    <button
                      key={i}
                      onClick={() => onNudgeTextChange(hint)}
                      className="text-sm px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-left"
                      disabled={disabled}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <Textarea
          value={nudgeText}
          onChange={(e) => onNudgeTextChange(e.target.value)}
          placeholder={nudgeHints[0] ? `e.g., "${nudgeHints[0]}"` : "Optional: guide the AI's focus..."}
          rows={2}
          className="text-sm"
          disabled={disabled}
        />
      </div>

      {/* Player nudges — inline */}
      <div className="border rounded-md">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Audience Suggestions</span>
            {nudges.length > 0 && (
              <Badge variant="secondary" className="text-sm h-5 px-1.5">
                {nudges.length}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggleNudges}>
            {nudgesOpen ? (
              <><ToggleRight className="h-3.5 w-3.5 mr-1 text-green-500" /> Open</>
            ) : (
              <><ToggleLeft className="h-3.5 w-3.5 mr-1" /> Closed</>
            )}
          </Button>
        </div>

        {nudges.length > 0 ? (
          <div className="p-2 space-y-2">
            <div className="max-h-48 overflow-y-auto space-y-1">
              {nudges.map((nudge) => (
                <label
                  key={nudge.id}
                  className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(nudge.id)}
                    onCheckedChange={() => toggleSelected(nudge.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{nudge.text}</p>
                    <p className="text-sm text-muted-foreground">{nudge.playerName}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-1 pt-1 border-t">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm flex-1"
                onClick={handleSummarize}
                disabled={summarizing || nudges.length === 0}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {summarizing ? 'Summarizing...' : 'AI Summary'}
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-sm"
                  onClick={handleUseSelected}
                >
                  Use Selected ({selectedIds.size})
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onClearNudges}
                title="Clear all nudges"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {nudgesOpen ? 'Waiting for audience suggestions...' : 'Audience suggestions are currently closed.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
