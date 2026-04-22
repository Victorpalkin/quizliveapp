'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RefreshCw, Loader2 } from 'lucide-react';

interface ReprocessDialogProps {
  onReprocess: (customInstructions?: string) => Promise<void>;
  isProcessing: boolean;
}

export function ReprocessDialog({ onReprocess, isProcessing }: ReprocessDialogProps) {
  const [instructions, setInstructions] = useState('');
  const [open, setOpen] = useState(false);

  const handleReprocess = async () => {
    await onReprocess(instructions.trim() || undefined);
    setOpen(false);
    setInstructions('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refine
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refine Analysis</DialogTitle>
          <DialogDescription>
            Re-run the AI analysis with custom instructions. The current results will be replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructions">Custom Instructions (optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Create no more than 5 groups, focus on technical topics, separate frontend and backend topics..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to re-analyze with default settings
            </p>
          </div>

          <Button
            onClick={handleReprocess}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Re-analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-Analyze Submissions
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
