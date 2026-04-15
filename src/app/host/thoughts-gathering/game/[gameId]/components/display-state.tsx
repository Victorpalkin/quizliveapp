'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Pencil } from 'lucide-react';
import { ReprocessDialog } from './reprocess-dialog';
import { EditableGroupedView } from './editable-grouped-view';
import { ResultsView } from './results-view';
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
  handleReprocess: (customInstructions?: string) => Promise<void>;
  handleUpdateTopics: (updatedTopics: import('@/lib/types').TopicEntry[]) => Promise<void>;
  isProcessing: boolean;
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
  handleReprocess,
  handleUpdateTopics,
  isProcessing,
  onCreateEvaluation,
}: DisplayStateProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing && topicCloud?.topics) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6">Edit Groups</h2>
            <EditableGroupedView
              topics={topicCloud.topics}
              submissions={submissions || []}
              anonymousMode={activity?.config.anonymousMode}
              onSave={(updatedTopics) => {
                handleUpdateTopics(updatedTopics);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResultsView
        activity={activity}
        players={players}
        submissions={submissions}
        topicCloud={topicCloud}
        handleExportResults={handleExportResults}
        onCreateEvaluation={onCreateEvaluation}
        headerSlot={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8"
              disabled={!topicCloud?.topics?.length}
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
            <ReprocessDialog onReprocess={handleReprocess} isProcessing={isProcessing} />
          </>
        }
      />

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
    </div>
  );
}
