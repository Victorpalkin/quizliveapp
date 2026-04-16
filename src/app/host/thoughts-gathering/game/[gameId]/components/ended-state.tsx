'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, MessageSquare, BarChart3, Download } from 'lucide-react';
import { ResultsView } from './results-view';
import type { ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';

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
  return (
    <div className="space-y-4">
      <ResultsView
        activity={activity}
        submissions={submissions}
        topicCloud={topicCloud}
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
