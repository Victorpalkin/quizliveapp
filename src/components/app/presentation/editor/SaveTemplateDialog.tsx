'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/firebase/presentation';
import { Switch } from '@/components/ui/switch';
import { BookmarkPlus } from 'lucide-react';
import type { PresentationSlide, PresentationSettings, PresentationTheme } from '@/lib/types';

interface SaveTemplateDialogProps {
  slides: PresentationSlide[];
  settings: PresentationSettings;
  theme: PresentationTheme;
}

export function SaveTemplateDialog({ slides, settings, theme }: SaveTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { saveTemplate } = useTemplates();

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await saveTemplate(title.trim(), slides, settings, theme, visibility);
      toast({ title: 'Template saved' });
      setOpen(false);
      setTitle('');
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <BookmarkPlus className="h-4 w-4 mr-1.5" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div>
            <Label className="text-sm">Template Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My template"
              className="mt-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Share publicly</Label>
              <p className="text-xs text-muted-foreground">Visible to all users</p>
            </div>
            <Switch
              checked={visibility === 'public'}
              onCheckedChange={(v) => setVisibility(v ? 'public' : 'private')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
