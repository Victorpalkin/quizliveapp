'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, BarChart3, Download } from 'lucide-react';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { MatureAgentsCard } from './mature-agents-card';
import type { ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';

interface DisplayStateProps {
  gameId: string;
  activityId: string | undefined;
  activity: ThoughtsGatheringActivity | null;
  players: { id: string; name: string }[] | null;
  submissions: ThoughtSubmission[] | null;
  topicCloud: TopicCloudResult | null;
  handleCollectMore: () => void;
  handleEndSession: () => void;
  handleExportResults: () => void;
  onCreateEvaluation: (source: string) => void;
}

export function DisplayState({
  activity,
  players,
  submissions,
  topicCloud,
  handleCollectMore,
  handleEndSession,
  handleExportResults,
  onCreateEvaluation,
}: DisplayStateProps) {
  return (
    <div className="space-y-6">
      {/* Results Display */}
      <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Grouped Submissions</h2>
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
            <p className="text-center text-muted-foreground py-12">
              No groups extracted
            </p>
          )}
        </CardContent>
      </Card>

      <MatureAgentsCard agents={topicCloud?.topMatureAgents} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{players?.length || 0}</p>
            <p className="text-muted-foreground">Participants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{submissions?.length || 0}</p>
            <p className="text-muted-foreground">Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{topicCloud?.topics?.length || 0}</p>
            <p className="text-muted-foreground">Groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {activity?.config.allowMultipleRounds && (
          <Button
            onClick={handleCollectMore}
            variant="outline"
            size="lg"
            className="flex-1 py-6"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Collect More
          </Button>
        )}
        <Button
          onClick={handleEndSession}
          size="lg"
          className="flex-1 py-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
        >
          End Session
        </Button>
      </div>

      {/* Create Evaluation from Topics */}
      {topicCloud?.topics && topicCloud.topics.length > 0 && (
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
    </div>
  );
}
