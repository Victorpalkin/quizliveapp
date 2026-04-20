'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Play, MessageSquare, Lightbulb, Layers, ToggleRight } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface AIStepPreviewProps {
  element: SlideElement;
}

export function AIStepPreview({ element }: AIStepPreviewProps) {
  const config = element.aiStepConfig;
  if (!config) return null;

  const fields = config.inputFields ?? [];
  const nudgeHints = config.nudgeHints ?? [];
  const enableNudges = config.enablePlayerNudges !== false;
  const contextCount = config.contextSlideIds?.length ?? 0;

  return (
    <div className="flex flex-col h-full w-full bg-background rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-3 py-1.5 flex items-center gap-2">
        {config.outputExpectation ? (
          <p className="text-[10px] text-muted-foreground flex-1 min-w-0 truncate">{config.outputExpectation}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground flex-1 min-w-0 truncate italic">AI Step</p>
        )}
      </div>

      {/* Main content */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
        {/* Left panel: form + nudges */}
        <ResizablePanel defaultSize="30" minSize="20" maxSize="60" className="flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* Input fields */}
            {fields.length > 0 && (
              <div className="space-y-1.5">
                {fields.map((field) => (
                  <div key={field.id}>
                    <Label className="text-[9px]">{field.label}</Label>
                    {field.type === 'checkbox' ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Checkbox disabled className="h-3 w-3" />
                        <span className="text-[9px] text-muted-foreground">{field.placeholder || field.label}</span>
                      </div>
                    ) : field.type === 'textarea' ? (
                      <Textarea
                        disabled
                        placeholder={field.placeholder}
                        rows={1}
                        className="mt-0.5 text-[9px] h-auto min-h-0 py-1 px-1.5"
                      />
                    ) : (
                      <Input
                        disabled
                        placeholder={field.placeholder}
                        className="mt-0.5 text-[9px] h-6 px-1.5"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Nudge section */}
            {enableNudges && (
              <div className="space-y-1.5">
                <div>
                  <Label className="text-[9px]">Guide the AI</Label>
                  <Textarea
                    disabled
                    placeholder={nudgeHints[0] ? `e.g., "${nudgeHints[0]}"` : "Optional: guide the AI's focus..."}
                    rows={1}
                    className="mt-0.5 text-[9px] h-auto min-h-0 py-1 px-1.5"
                  />
                </div>

                <div className="border rounded">
                  <div className="px-2 py-1 border-b flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] font-medium">Audience Suggestions</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                      <ToggleRight className="h-2.5 w-2.5 text-green-500" />
                      <span>Open</span>
                    </div>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Waiting for audience suggestions...</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="flex-shrink-0 border-t p-1.5">
            <Button disabled size="sm" className="w-full h-6 text-[10px]">
              <Play className="h-3 w-3 mr-1" />
              Generate
            </Button>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right panel: context + output */}
        <ResizablePanel defaultSize="70" minSize="40" className="flex flex-col min-w-0">
          {/* Context sources */}
          {contextCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 border-b">
              <Layers className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[9px] font-medium text-muted-foreground">
                Context ({contextCount} source{contextCount !== 1 ? 's' : ''})
              </span>
            </div>
          )}

          {/* Output placeholder */}
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-[10px]">Click &ldquo;Generate&rdquo; to run analysis</p>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
