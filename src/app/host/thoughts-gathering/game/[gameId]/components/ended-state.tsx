'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, MessageSquare, BarChart3, Download, Sparkles } from 'lucide-react';
import { ResultsView } from './results-view';
import { AIStudioPromptDialog } from './ai-studio-prompt-dialog';
import type { ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult, TopicEntry } from '@/lib/types';

interface EndedStateProps {
  activity: ThoughtsGatheringActivity | null;
  players: { id: string; name: string }[] | null;
  submissions: ThoughtSubmission[] | null;
  topicCloud: TopicCloudResult | null;
  handleReturnToDashboard: () => void;
  handleExportResults: () => void;
  onCreateEvaluation: (source: string) => void;
}

export function EndedState({
  activity,
  players,
  submissions,
  topicCloud,
  handleReturnToDashboard,
  handleExportResults,
  onCreateEvaluation,
}: EndedStateProps) {
  const renderGroupActions = useCallback((topic: TopicEntry) => {
    if (!activity || !submissions) return null;
    return (
      <AIStudioPromptDialog
        topic={topic}
        activity={activity}
        submissions={submissions}
        playerCount={players?.length || 0}
      >
        <Button
          variant="outline"
          size="sm"
          className="border-teal-500/30 hover:bg-teal-500/10"
        >
          <Sparkles className="mr-2 h-4 w-4 text-teal-500" />
          Generate AI Studio Prompt
        </Button>
      </AIStudioPromptDialog>
    );
  }, [activity, submissions, players]);

  return (
    <div className="space-y-4">
      <ResultsView
        activity={activity}
        submissions={submissions}
        topicCloud={topicCloud}
        renderGroupActions={renderGroupActions}
        headerTitle="Session Complete!"
        borderColor="border-green-500/20 bg-gradient-to-br from-green-500/5 to-blue-500/5"
      />

      {/* Next Steps — consolidated */}
      {topicCloud?.topics && topicCloud.topics.length > 0 && (
        <Card className="border border-card-border">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Next Steps</p>
            <Button
              onClick={() => onCreateEvaluation('topics')}
              variant="outline"
              className="w-full justify-start"
            >
              <BarChart3 className="mr-2 h-4 w-4 text-orange-500" />
              Create Evaluation from Topics
            </Button>
            <Button
              onClick={() => onCreateEvaluation('submissions')}
              variant="outline"
              className="w-full justify-start"
            >
              <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
              Create from Raw Submissions
            </Button>
            <Button
              onClick={handleExportResults}
              variant="outline"
              className="w-full justify-start"
            >
              <Download className="mr-2 h-4 w-4 text-muted-foreground" />
              Export to Markdown
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Return Button */}
      <Button
        onClick={handleReturnToDashboard}
        size="lg"
        variant="outline"
        className="w-full py-6 text-lg"
      >
        <Home className="mr-2 h-5 w-5" />
        Return to Dashboard
      </Button>
    </div>
  );
}
