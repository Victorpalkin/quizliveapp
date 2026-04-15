'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, MessageSquare, BarChart3 } from 'lucide-react';
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
    <div className="space-y-6">
      <ResultsView
        activity={activity}
        players={players}
        submissions={submissions}
        topicCloud={topicCloud}
        handleExportResults={handleExportResults}
        onCreateEvaluation={onCreateEvaluation}
        headerTitle="Session Complete!"
        borderColor="border-green-500/20 bg-gradient-to-br from-green-500/5 to-blue-500/5"
      />

      {/* Additional ended-state actions */}
      {topicCloud?.topics && topicCloud.topics.length > 0 && (
        <Card className="border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-orange-500" />
              <div>
                <CardTitle>Continue with Evaluation</CardTitle>
                <CardDescription>
                  Prioritize the collected topics with your audience
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => onCreateEvaluation('topics')}
              size="lg"
              className="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
            >
              <BarChart3 className="mr-2 h-5 w-5" />
              Create Evaluation from Topics
            </Button>
            <Button
              onClick={() => onCreateEvaluation('submissions')}
              variant="outline"
              size="lg"
              className="w-full py-6"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Create from Raw Submissions
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
