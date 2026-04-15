'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Download, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { generateAIStudioPrompt, type AIStudioPromptOptions } from '@/lib/generate-ai-studio-prompt';
import { downloadMarkdown } from '@/lib/export-thoughts';
import type { ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';

interface AIStudioPromptDialogProps {
  activity: ThoughtsGatheringActivity | null;
  submissions: ThoughtSubmission[] | null;
  topicCloud: TopicCloudResult | null;
  playerCount: number;
}

export function AIStudioPromptDialog({
  activity,
  submissions,
  topicCloud,
  playerCount,
}: AIStudioPromptDialogProps) {
  const [appType, setAppType] = useState<string>('web');
  const [techStack, setTechStack] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatedPrompt = useMemo(() => {
    if (!topicCloud?.topics || !submissions || !activity) return '';

    const options: AIStudioPromptOptions = {
      appType: appType as AIStudioPromptOptions['appType'],
      techStack: techStack.trim() || undefined,
      additionalContext: additionalContext.trim() || undefined,
      anonymousMode: activity.config.anonymousMode,
    };

    return generateAIStudioPrompt(
      activity.title,
      activity.config.prompt,
      topicCloud.topics,
      submissions,
      playerCount,
      options
    );
  }, [topicCloud?.topics, submissions, activity, playerCount, appType, techStack, additionalContext]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const sanitizedTitle = (activity?.title || 'thoughts')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const date = new Date().toISOString().split('T')[0];
    downloadMarkdown(generatedPrompt, `${sanitizedTitle}-ai-studio-prompt-${date}.txt`);
  };

  const isDisabled = !topicCloud?.topics?.length || !submissions?.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full border-teal-500/30 hover:bg-teal-500/10"
          disabled={isDisabled}
        >
          <Sparkles className="mr-2 h-4 w-4 text-teal-500" />
          Generate AI Studio Prompt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-500" />
            AI Studio Prompt Generator
          </DialogTitle>
          <DialogDescription>
            Generate a prompt to paste into Google AI Studio for building a demo app based on collected requirements
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Configuration */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                {configOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Customize prompt options
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appType">Application Type</Label>
                  <Select value={appType} onValueChange={setAppType}>
                    <SelectTrigger id="appType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Application</SelectItem>
                      <SelectItem value="mobile">Mobile Application</SelectItem>
                      <SelectItem value="api">REST API / Backend</SelectItem>
                      <SelectItem value="dashboard">Analytics Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="techStack">Tech Stack (optional)</Label>
                  <Input
                    id="techStack"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    placeholder="e.g., React, Python Flask"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalContext">Additional Context (optional)</Label>
                <Textarea
                  id="additionalContext"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Any extra requirements or constraints..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Generated Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Generated Prompt</Label>
              <span className="text-xs text-muted-foreground">
                {generatedPrompt.length.toLocaleString()} characters
              </span>
            </div>
            <Textarea
              value={generatedPrompt}
              readOnly
              className="font-mono text-sm min-h-[300px] resize-y bg-muted/30"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleCopy} className="flex-1" variant="default">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download .txt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
