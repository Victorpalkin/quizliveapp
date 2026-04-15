'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, BarChart3, MessageSquare } from 'lucide-react';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { MatureAgentsCard } from './mature-agents-card';
import { SessionSummaryCard } from './session-summary-card';
import { AIStudioPromptDialog } from './ai-studio-prompt-dialog';
import type { ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';

interface ResultsViewProps {
  activity: ThoughtsGatheringActivity | null;
  players: { id: string; name: string }[] | null;
  submissions: ThoughtSubmission[] | null;
  topicCloud: TopicCloudResult | null;
  handleExportResults: () => void;
  onCreateEvaluation?: (source: string) => void;
  headerSlot?: React.ReactNode;
  headerTitle?: string;
  borderColor?: string;
}

export function ResultsView({
  activity,
  players,
  submissions,
  topicCloud,
  handleExportResults,
  onCreateEvaluation,
  headerSlot,
  headerTitle = 'Grouped Submissions',
  borderColor = 'border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5',
}: ResultsViewProps) {
  return (
    <>
      {/* Session Summary */}
      <SessionSummaryCard summary={topicCloud?.summary} />

      {/* Results Display */}
      <Card className={`border-2 ${borderColor}`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{headerTitle}</h2>
            <div className="flex items-center gap-2">
              {headerSlot}
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
          </div>
          {topicCloud?.topics && topicCloud.topics.length > 0 ? (
            <ThoughtsGroupedView
              topics={topicCloud.topics}
              submissions={submissions || []}
              agentMatches={topicCloud.agentMatches}
              anonymousMode={activity?.config.anonymousMode}
            />
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No groups extracted
            </p>
          )}
        </CardContent>
      </Card>

      <MatureAgentsCard agents={topicCloud?.topMatureAgents} />

      {/* Create Evaluation */}
      {topicCloud?.topics && topicCloud.topics.length > 0 && onCreateEvaluation && (
        <Card className="border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-orange-500" />
                <div>
                  <h3 className="font-semibold">Create Evaluation</h3>
                  <p className="text-sm text-muted-foreground">
                    Turn these topics into a prioritization session
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onCreateEvaluation('topics')}
                variant="outline"
                className="border-orange-500/30 hover:bg-orange-500/10"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate AI Studio Prompt */}
      {topicCloud?.topics && topicCloud.topics.length > 0 && (
        <Card className="border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
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
    </>
  );
}
