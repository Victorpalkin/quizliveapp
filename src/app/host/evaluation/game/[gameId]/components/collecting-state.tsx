'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Check, X, Loader2, Play, Clock } from 'lucide-react';
import type { EvaluationItem, EvaluationActivity } from '@/lib/types';

interface CollectingStateProps {
  approvedItems: EvaluationItem[];
  pendingItems: EvaluationItem[];
  playersCount: number;
  itemsLoading: boolean;
  isTransitioning: boolean;
  isAddingItem: boolean;
  newItemText: string;
  setNewItemText: (value: string) => void;
  newItemDescription: string;
  setNewItemDescription: (value: string) => void;
  activity: EvaluationActivity;
  handleAddItem: () => void;
  handleDeleteItem: (itemId: string) => void;
  handleApproveItem: (itemId: string, approved: boolean) => void;
  handleStartRating: () => void;
}

export function CollectingState({
  approvedItems,
  pendingItems,
  playersCount,
  itemsLoading,
  isTransitioning,
  isAddingItem,
  newItemText,
  setNewItemText,
  newItemDescription,
  setNewItemDescription,
  activity,
  handleAddItem,
  handleDeleteItem,
  handleApproveItem,
  handleStartRating,
}: CollectingStateProps) {
  return (
    <>
      {/* Add Item Form */}
      <Card className="border border-card-border shadow-sm">
        <CardHeader>
          <CardTitle>Add Items to Rank</CardTitle>
          <CardDescription>
            Add items that participants will rate on your metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemText">Item Name *</Label>
            <Input
              id="itemText"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="e.g., Feature A, Project X"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddItem()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="itemDesc">Description (optional)</Label>
            <Textarea
              id="itemDesc"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="Additional context..."
              rows={2}
            />
          </div>
          <Button
            onClick={handleAddItem}
            disabled={!newItemText.trim() || isAddingItem}
          >
            {isAddingItem ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card className="border border-card-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Items ({approvedItems.length})</CardTitle>
              <CardDescription>Items that will be ranked</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : approvedItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No items yet. Add items above to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {approvedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono text-sm">
                      {index + 1}.
                    </span>
                    <div>
                      <p className="font-medium">{item.text}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {item.submittedBy && (
                        <p className="text-xs text-muted-foreground">
                          Submitted by {item.submittedBy}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Submissions */}
      {activity.config.allowParticipantItems && pendingItems.length > 0 && (
        <Card className="border border-yellow-500/30 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Submissions ({pendingItems.length})
            </CardTitle>
            <CardDescription>Review participant suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.text}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted by {item.submittedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApproveItem(item.id, true)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Rating Button */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
          <div>
            <CardTitle className="text-xl mb-2">Ready to Start Rating?</CardTitle>
            <CardDescription>
              {approvedItems.length} items • {playersCount} participants
            </CardDescription>
          </div>
          <Button
            onClick={handleStartRating}
            disabled={approvedItems.length === 0 || isTransitioning}
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
          >
            {isTransitioning ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Play className="h-5 w-5 mr-2" />
            )}
            Start Rating
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
