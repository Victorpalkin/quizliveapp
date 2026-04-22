'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileJson, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore, useUser, trackEvent } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { validateImport, getImportSummary, getCollectionForType } from '@/lib/export-import';
import { ACTIVITY_CONFIG } from '@/lib/activity-config';
import type { ExportEnvelope } from '@/lib/export-import';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [envelope, setEnvelope] = useState<ExportEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const resetState = useCallback(() => {
    setEnvelope(null);
    setError(null);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setEnvelope(null);

    if (!file.name.endsWith('.json')) {
      setError('Please select a .json file');
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = validateImport(parsed);

      if (!result.valid) {
        setError(result.error);
      } else {
        setEnvelope(result.envelope);
      }
    } catch {
      setError('Failed to parse file. Make sure it is valid JSON.');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!envelope || !user || !firestore) return;

    setImporting(true);
    try {
      const collectionName = getCollectionForType(envelope.type);
      const docData: Record<string, unknown> = {
        ...envelope.content,
        hostId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (envelope.type !== 'quiz') {
        docData.type = envelope.type;
      }

      const docRef = await addDoc(collection(firestore, collectionName), docData);

      trackEvent('activity_imported', { type: envelope.type });

      toast({
        title: 'Imported successfully',
        description: `"${envelope.title}" has been added to your content`,
      });

      onOpenChange(false);
      resetState();

      const config = ACTIVITY_CONFIG[envelope.type];
      router.push(config.editPath(docRef.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Import failed: ${message}`);
    } finally {
      setImporting(false);
    }
  }, [envelope, user, firestore, toast, router, onOpenChange, resetState]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Import Activity</DialogTitle>
          <DialogDescription>
            Import a previously exported Zivo activity (.json file)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to select a file or drag and drop
            </p>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Preview */}
          {envelope && (
            <div className="flex items-start gap-3 p-4 bg-muted rounded-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileJson className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <p className="font-medium truncate">{envelope.title}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {ACTIVITY_CONFIG[envelope.type].label} &middot; {getImportSummary(envelope)}
                </p>
              </div>
            </div>
          )}

          {/* Import button */}
          {envelope && (
            <Button
              onClick={handleImport}
              disabled={importing}
              className="w-full"
              variant="gradient"
            >
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import {ACTIVITY_CONFIG[envelope.type].label}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
