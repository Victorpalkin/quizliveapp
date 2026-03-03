'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Clock, Users } from 'lucide-react';
import type { EvaluationActivity } from '@/lib/types';

interface CollectingScreenProps {
  activity: EvaluationActivity;
  playersCount: number;
  submittedItemCount: number;
  newItemText: string;
  setNewItemText: (value: string) => void;
  newItemDescription: string;
  setNewItemDescription: (value: string) => void;
  isSubmitting: boolean;
  handleSubmitItem: () => void;
}

export function CollectingScreen({
  activity,
  playersCount,
  submittedItemCount,
  newItemText,
  setNewItemText,
  newItemDescription,
  setNewItemDescription,
  isSubmitting,
  handleSubmitItem,
}: CollectingScreenProps) {
  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Waiting for Host
          </CardTitle>
          <CardDescription>
            The host is setting up items to rank
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{playersCount} participants joined</span>
          </div>
        </CardContent>
      </Card>

      {activity.config.allowParticipantItems && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Suggest Items</CardTitle>
            <CardDescription>
              {submittedItemCount} / {activity.config.maxItemsPerParticipant} submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="e.g., Feature idea, Topic"
                disabled={submittedItemCount >= activity.config.maxItemsPerParticipant}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder="Additional details..."
                rows={2}
                disabled={submittedItemCount >= activity.config.maxItemsPerParticipant}
              />
            </div>
            <Button
              onClick={handleSubmitItem}
              disabled={
                !newItemText.trim() ||
                isSubmitting ||
                submittedItemCount >= activity.config.maxItemsPerParticipant
              }
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Submit Item
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
