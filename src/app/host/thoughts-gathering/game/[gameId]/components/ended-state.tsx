'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, MessageSquare, BarChart3, Download } from 'lucide-react';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { MatureAgentsCard } from './mature-agents-card';
import { SessionSummaryCard } from './session-summary-card';
import { AIStudioPromptDialog } from './ai-studio-prompt-dialog';
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
      {/* Session Summary */}
      <SessionSummaryCard summary={topicCloud?.summary} />

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
              anonymousMode={activity?.config.anonymousMode}
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

      {/* Generate AI Studio Prompt */}
      {topicCloud?.topics && topicCloud.topics.length > 0 && (
        <Card className="border-2 border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div>
                  <h3 className="font-semibold">Generate AI Studio Prompt</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a prompt to build a demo app from these requirements
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <AIStudioPromptDialog
                  activity={activity}
                  submissions={submissions}
                  topicCloud={topicCloud}
                  playerCount={players?.length || 0}
                />
              </div>
            </div>
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
