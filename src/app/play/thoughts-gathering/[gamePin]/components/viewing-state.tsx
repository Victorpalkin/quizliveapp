'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import type { ThoughtSubmission, TopicCloudResult } from '@/lib/types';

interface ViewingStateProps {
  topicCloud: TopicCloudResult | null;
  allSubmissions: ThoughtSubmission[] | null;
}

export function ViewingState({ topicCloud, allSubmissions }: ViewingStateProps) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      {topicCloud?.summary && (
        <Card className="shadow-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Session Summary</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {topicCloud.summary}
            </p>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-2xl">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold mb-6">Grouped Submissions</h2>
          {topicCloud?.topics && topicCloud.topics.length > 0 ? (
            <ThoughtsGroupedView
              topics={topicCloud.topics}
              submissions={allSubmissions || []}
            />
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Results will appear here...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
