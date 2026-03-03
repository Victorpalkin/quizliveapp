'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, MessageSquare, BarChart3, Download } from 'lucide-react';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { MatureAgentsCard } from './mature-agents-card';
import type { ThoughtSubmission, TopicCloudResult } from '@/lib/types';

interface EndedStateProps {
  submissions: ThoughtSubmission[] | null;
  topicCloud: TopicCloudResult | null;
  handleReturnToDashboard: () => void;
  handleExportResults: () => void;
  onCreateEvaluation: (source: string) => void;
}

export function EndedState({
  submissions,
  topicCloud,
  handleReturnToDashboard,
  handleExportResults,
  onCreateEvaluation,
}: EndedStateProps) {
  return (
    <div className="space-y-6">
      {/* Final Results */}
      <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-blue-500/5">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Session Complete!</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportResults}
              className="h-8"
              disabled={!topicCloud?.topics?.length}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </div>
          {topicCloud?.topics && topicCloud.topics.length > 0 ? (
            <ThoughtsGroupedView
              topics={topicCloud.topics}
              submissions={submissions || []}
              agentMatches={topicCloud.agentMatches}
            />
          ) : (
            <p className="text-center text-muted-foreground py-12">No groups collected</p>
          )}
        </CardContent>
      </Card>

      <MatureAgentsCard agents={topicCloud?.topMatureAgents} />

      {/* Create Evaluation from Results */}
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
