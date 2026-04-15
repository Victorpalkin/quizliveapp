'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SettingToggle } from '@/components/app/setting-toggle';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb, Eye, Bot, EyeOff, Shield } from 'lucide-react';
import { FeatureTooltip } from '@/components/ui/feature-tooltip';
import type { ThoughtsGatheringConfig } from '@/lib/types';

const EXAMPLE_PROMPTS = [
  { label: 'Team interests', prompt: 'What topics interest you most?' },
  { label: 'Workshop topics', prompt: 'What would you like to learn more about?' },
  { label: 'Icebreaker', prompt: 'Share a hobby or passion of yours!' },
  { label: 'Brainstorming', prompt: 'What ideas do you have for our next project?' },
  { label: 'Feedback', prompt: 'What should we focus on improving?' },
  { label: 'Expectations', prompt: 'What do you hope to get out of this session?' },
];

export interface ActivityFormValues {
  title: string;
  description: string;
  config: ThoughtsGatheringConfig;
}

interface ActivityFormProps {
  initialValues: ActivityFormValues;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
  submitLabel: string;
  submitIcon: React.ReactNode;
  loadingLabel: string;
  showExamplePrompts?: boolean;
  showPreview?: boolean;
}

export function ActivityForm({
  initialValues,
  onSubmit,
  submitLabel,
  submitIcon,
  loadingLabel,
  showExamplePrompts = false,
  showPreview = false,
}: ActivityFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [prompt, setPrompt] = useState(initialValues.config.prompt);
  const [maxSubmissions, setMaxSubmissions] = useState(initialValues.config.maxSubmissionsPerPlayer);
  const [allowMultipleRounds, setAllowMultipleRounds] = useState(initialValues.config.allowMultipleRounds);
  const [agenticUseCasesCollection, setAgenticUseCasesCollection] = useState(initialValues.config.agenticUseCasesCollection || false);
  const [anonymousMode, setAnonymousMode] = useState(initialValues.config.anonymousMode || false);
  const [enableModeration, setEnableModeration] = useState(initialValues.config.enableModeration || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !prompt.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        config: {
          prompt: prompt.trim(),
          maxSubmissionsPerPlayer: maxSubmissions,
          allowMultipleRounds,
          agenticUseCasesCollection,
          anonymousMode,
          enableModeration,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUnsavedChanges = title !== initialValues.title ||
    description !== initialValues.description ||
    prompt !== initialValues.config.prompt;

  return (
    <Card className="shadow-lg rounded-2xl border border-card-border">
      <CardHeader>
        <CardTitle>Activity Details</CardTitle>
        <CardDescription>
          Configure your Thoughts Gathering session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Team Interests, Workshop Topics"
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this activity..."
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="prompt">Prompt for Participants *</Label>
            <FeatureTooltip
              content="This is the question your audience will see. Make it clear and engaging!"
              icon="tip"
            />
          </div>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What would you like participants to share?"
            rows={3}
            className="text-lg"
          />
          <p className="text-sm text-muted-foreground">
            This is what participants will see when submitting their interests
          </p>

          {showExamplePrompts && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Need inspiration? Try these:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map(({ label, prompt: examplePrompt }) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setPrompt(examplePrompt)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxSubmissions">Max Submissions per Person</Label>
          <Input
            id="maxSubmissions"
            type="number"
            min={1}
            max={10}
            value={maxSubmissions}
            onChange={(e) => setMaxSubmissions(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-32"
          />
          <p className="text-sm text-muted-foreground">
            How many topics can each participant submit (1-10)
          </p>
        </div>

        <SettingToggle
          id="multipleRounds"
          label="Allow Multiple Rounds"
          description="Let participants submit more after viewing results"
          checked={allowMultipleRounds}
          onCheckedChange={setAllowMultipleRounds}
          tooltip="When enabled, participants can add more responses after seeing the initial word cloud. Great for iterative brainstorming!"
        />

        <SettingToggle
          id="agenticUseCases"
          label="Agentic Use Cases Collection"
          description="Match topics with AI agents from the tracker database"
          checked={agenticUseCasesCollection}
          onCheckedChange={setAgenticUseCasesCollection}
          icon={<Bot className="h-4 w-4 text-violet-500" />}
          tooltip="When enabled, collected topics will be matched with AI agents from the tracker database. Shows related AI use cases for each topic group."
          className="border-violet-500/30 bg-violet-500/5"
        />

        <SettingToggle
          id="anonymousMode"
          label="Anonymous Mode"
          description="Hide participant names in results and exports"
          checked={anonymousMode}
          onCheckedChange={setAnonymousMode}
          icon={<EyeOff className="h-4 w-4 text-slate-500" />}
          tooltip="When enabled, participant names are hidden from the host view, grouped results, and exports. Encourages candid responses for sensitive topics."
        />

        <SettingToggle
          id="enableModeration"
          label="Submission Moderation"
          description="Review and hide submissions before AI analysis"
          checked={enableModeration}
          onCheckedChange={setEnableModeration}
          icon={<Shield className="h-4 w-4 text-amber-500" />}
          tooltip="When enabled, you can hide off-topic or inappropriate submissions before running AI analysis. Hidden submissions are excluded from grouping."
        />

        {showPreview && (
          <Card className="bg-muted/30 border-dashed">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Participant Preview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-background border p-4 space-y-3">
                <p className="text-lg font-medium">{prompt || 'Your prompt will appear here...'}</p>
                <div className="space-y-2">
                  {Array.from({ length: Math.min(maxSubmissions, 3) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </div>
                      <div className="flex-1 h-10 rounded-md border border-dashed bg-muted/50" />
                    </div>
                  ))}
                  {maxSubmissions > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      + {maxSubmissions - 3} more fields
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !prompt.trim()}
            className="w-full py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {loadingLabel}
              </>
            ) : (
              <>
                {submitIcon} {submitLabel}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
