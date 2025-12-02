'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Loader2, Lock, Sparkles, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, updateDoc, Query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import type { QuestionSubmission, CrowdsourceSettings, CrowdsourceState, Game } from '@/lib/types';

interface SubmissionsPanelProps {
  gameId: string;
  game: Game;
  quiz: { crowdsource?: CrowdsourceSettings };
}

export function SubmissionsPanel({ gameId, game, quiz }: SubmissionsPanelProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());

  const crowdsourceSettings = quiz?.crowdsource;
  const crowdsourceState = game?.crowdsourceState;

  // Subscribe to all submissions for this game
  const submissionsQuery = useMemoFirebase(
    () => collection(firestore, 'games', gameId, 'submissions') as Query<QuestionSubmission>,
    [firestore, gameId]
  );
  const { data: submissions, loading: submissionsLoading } = useCollection<QuestionSubmission>(submissionsQuery);

  // Toggle submission expansion
  const toggleExpanded = (submissionId: string) => {
    setExpandedSubmissions(prev => {
      const next = new Set(prev);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });
  };

  // Toggle submission selection
  const toggleSelected = (submissionId: string) => {
    setSelectedSubmissions(prev => {
      const next = new Set(prev);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });
  };

  // Handle "Evaluate with AI" button
  const handleEvaluateWithAI = async () => {
    if (!crowdsourceSettings) return;

    setIsEvaluating(true);

    try {
      // Step 1: Lock submissions
      const gameRef = doc(firestore, 'games', gameId);
      await updateDoc(gameRef, {
        'crowdsourceState.submissionsLocked': true,
      });

      toast({
        title: 'Submissions locked',
        description: 'Waiting 2 seconds for any last-second submissions...',
      });

      // Step 2: Grace period (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Call AI evaluation function
      const functions = getFunctions(undefined, 'europe-west4');
      const evaluateSubmissions = httpsCallable<
        { gameId: string; topicPrompt: string; questionsNeeded: number },
        { success: boolean; evaluatedCount: number; selectedCount: number }
      >(functions, 'evaluateSubmissions');

      const result = await evaluateSubmissions({
        gameId,
        topicPrompt: crowdsourceSettings.topicPrompt,
        questionsNeeded: crowdsourceSettings.questionsNeeded,
      });

      if (result.data.success) {
        // Auto-select the AI-selected submissions
        const selectedSubs = submissions?.filter(s => s.aiSelected) || [];
        setSelectedSubmissions(new Set(selectedSubs.map(s => s.id)));

        toast({
          title: 'AI Evaluation Complete',
          description: `Evaluated ${result.data.evaluatedCount} submissions, selected ${result.data.selectedCount} questions.`,
        });
      }
    } catch (error) {
      console.error('AI evaluation failed:', error);
      toast({
        title: 'Evaluation failed',
        description: 'Could not evaluate submissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Update selection in Firestore when saving
  const handleSaveSelection = async () => {
    if (!submissions) return;

    try {
      // Update each submission's aiSelected field based on current selection
      for (const sub of submissions) {
        const subRef = doc(firestore, 'games', gameId, 'submissions', sub.id);
        await updateDoc(subRef, {
          aiSelected: selectedSubmissions.has(sub.id),
        });
      }

      // Update crowdsource state with selection count
      const gameRef = doc(firestore, 'games', gameId);
      await updateDoc(gameRef, {
        'crowdsourceState.selectedCount': selectedSubmissions.size,
      });

      toast({
        title: 'Selection saved',
        description: `${selectedSubmissions.size} questions will be added to the game.`,
      });
    } catch (error) {
      console.error('Failed to save selection:', error);
      toast({
        title: 'Save failed',
        description: 'Could not save your selection. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!crowdsourceSettings?.enabled) {
    return null;
  }

  // Sort submissions: AI-selected first, then by score
  const sortedSubmissions = [...(submissions || [])].sort((a, b) => {
    // AI-selected first
    if (a.aiSelected && !b.aiSelected) return -1;
    if (!a.aiSelected && b.aiSelected) return 1;
    // Then by score (descending)
    return (b.aiScore || 0) - (a.aiScore || 0);
  });

  const isLocked = crowdsourceState?.submissionsLocked;
  const hasEvaluated = crowdsourceState?.evaluationComplete || sortedSubmissions.some(s => s.aiScore !== undefined);

  return (
    <Card className="border border-card-border shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
      <CardHeader className="flex-row items-center justify-between gap-3 p-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="text-primary h-6 w-6" />
          <div>
            <CardTitle className="text-2xl font-semibold">
              Player Submissions ({submissionsLoading ? '...' : submissions?.length || 0})
            </CardTitle>
            <CardDescription className="mt-1">
              {isLocked
                ? 'Submissions are locked. Review and select questions below.'
                : 'Players can submit questions until you click "Evaluate with AI"'}
            </CardDescription>
          </div>
        </div>
        {isLocked && <Lock className="h-5 w-5 text-amber-500" />}
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        {/* Evaluate button (before evaluation) */}
        {!isLocked && (
          <Button
            onClick={handleEvaluateWithAI}
            disabled={isEvaluating || !submissions?.length}
            className="w-full bg-gradient-to-r from-primary to-accent"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Evaluate with AI ({submissions?.length || 0} submissions)
              </>
            )}
          </Button>
        )}

        {/* Selection summary (after evaluation) */}
        {hasEvaluated && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <span className="font-medium">
              {selectedSubmissions.size} of {crowdsourceSettings.questionsNeeded} questions selected
            </span>
            <Button onClick={handleSaveSelection} size="sm">
              Save Selection
            </Button>
          </div>
        )}

        {/* Submissions list */}
        {submissionsLoading ? (
          <div className="text-center p-8 text-muted-foreground">Loading submissions...</div>
        ) : submissions?.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No submissions yet. Players can submit questions from their devices.
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedSubmissions.map(sub => (
              <li
                key={sub.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  selectedSubmissions.has(sub.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Selection checkbox (only after evaluation) */}
                  {hasEvaluated && (
                    <Checkbox
                      checked={selectedSubmissions.has(sub.id)}
                      onCheckedChange={() => toggleSelected(sub.id)}
                      className="mt-1"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Header with player name and badges */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">{sub.playerName}</span>
                      {sub.aiScore !== undefined && (
                        <Badge variant={sub.aiScore >= 70 ? 'default' : sub.aiScore >= 40 ? 'secondary' : 'outline'}>
                          Score: {sub.aiScore}
                        </Badge>
                      )}
                      {sub.aiSelected && (
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          AI Selected
                        </Badge>
                      )}
                    </div>

                    {/* Question text */}
                    <p className="font-medium text-lg">{sub.questionText}</p>

                    {/* Expandable answers (without showing correct) */}
                    <button
                      onClick={() => toggleExpanded(sub.id)}
                      className="flex items-center gap-1 text-sm text-muted-foreground mt-2 hover:text-foreground"
                    >
                      {expandedSubmissions.has(sub.id) ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide answers
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Show answers ({sub.answers.length})
                        </>
                      )}
                    </button>

                    {expandedSubmissions.has(sub.id) && (
                      <ul className="mt-2 space-y-1">
                        {sub.answers.map((answer, idx) => (
                          <li key={idx} className="text-sm p-2 bg-background rounded">
                            {String.fromCharCode(65 + idx)}. {answer}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* AI reasoning (if available) */}
                    {sub.aiReasoning && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        AI: {sub.aiReasoning}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
