'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Pencil, Download, BarChart3 } from 'lucide-react';
import { ReprocessDialog } from './reprocess-dialog';
import { EditableGroupedView } from './editable-grouped-view';
import { ResultsView } from './results-view';
import { AIStudioPromptDialog } from './ai-studio-prompt-dialog';
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
    <div className="space-y-4">
      {/* Compact Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{players?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Participants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{submissions?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{topicCloud?.topics?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Groups</p>
          </CardContent>
        </Card>
      </div>

      <ResultsView
        activity={activity}
        players={players}
        submissions={submissions}
        topicCloud={topicCloud}
        handleExportResults={handleExportResults}
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

      {/* Next Steps — consolidated CTAs */}
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
            <AIStudioPromptDialog
              activity={activity}
              submissions={submissions}
              topicCloud={topicCloud}
              playerCount={players?.length || 0}
            />
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
