'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { MatureAgentsCard } from './mature-agents-card';
import { SessionSummaryCard } from './session-summary-card';
import type { ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';

interface ResultsViewProps {
  activity: ThoughtsGatheringActivity | null;
  submissions: ThoughtSubmission[] | null;
  topicCloud: TopicCloudResult | null;
  headerSlot?: React.ReactNode;
  headerTitle?: string;
  borderColor?: string;
}

export function ResultsView({
  activity,
  submissions,
  topicCloud,
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
            {headerSlot && (
              <div className="flex items-center gap-2">
                {headerSlot}
              </div>
            )}
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
    </>
  );
}
