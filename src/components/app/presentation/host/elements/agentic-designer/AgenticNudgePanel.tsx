'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Sparkles, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
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
        <Label className="text-xs">Refinement / Nudge</Label>
        {nudgeHints.length > 0 && (
          <div className="mt-1 mb-1.5">
            <p className="text-[10px] text-muted-foreground mb-1">Try nudges like:</p>
            <div className="flex flex-wrap gap-1">
              {nudgeHints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => onNudgeTextChange(hint)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-left"
                  title="Click to use this nudge"
                  disabled={disabled}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
        <Textarea
          value={nudgeText}
          onChange={(e) => onNudgeTextChange(e.target.value)}
          placeholder={nudgeHints[0] ? `e.g., "${nudgeHints[0]}"` : "Optional: guide the AI's focus..."}
          rows={2}
          className="mt-1 text-xs"
          disabled={disabled}
        />
      </div>

      {/* Player nudges section */}
      <div className="border rounded-lg p-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Player Nudges ({nudges.length})</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onToggleNudges}>
            {nudgesOpen ? (
              <><ToggleRight className="h-3.5 w-3.5 mr-1 text-green-500" /> Open</>
            ) : (
              <><ToggleLeft className="h-3.5 w-3.5 mr-1" /> Closed</>
            )}
          </Button>
        </div>

        {nudges.length > 0 && (
          <>
            <div className="max-h-32 overflow-y-auto space-y-1">
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
                    <p className="text-xs truncate">{nudge.text}</p>
                    <p className="text-[10px] text-muted-foreground">{nudge.playerName}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] flex-1"
                onClick={handleSummarize}
                disabled={summarizing || nudges.length === 0}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {summarizing ? 'Summarizing...' : 'Summarize w/ AI'}
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={handleUseSelected}
                >
                  Use Selected ({selectedIds.size})
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClearNudges}
                title="Clear all nudges"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}

        {nudges.length === 0 && nudgesOpen && (
          <p className="text-[10px] text-muted-foreground text-center py-1">
            Waiting for player suggestions...
          </p>
        )}
      </div>
    </div>
  );
}
