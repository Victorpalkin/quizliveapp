'use client';

import { useState, useMemo } from 'react';
import { useTemplates } from '@/firebase/presentation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LayoutTemplate, Trash2, Globe, Lock } from 'lucide-react';
import { SlideThumbnail } from '../shared/SlideThumbnail';
import type { PresentationSlide, PresentationSettings, PresentationTheme, PresentationTemplateCategory } from '@/lib/types';

type TabFilter = 'all' | 'mine' | 'built-in';

const CATEGORY_LABELS: Record<PresentationTemplateCategory, string> = {
  workshop: 'Workshop',
  training: 'Training',
  feedback: 'Feedback',
  meeting: 'Meeting',
  strategy: 'Strategy',
  brainstorming: 'Brainstorming',
  innovation: 'Innovation',
  custom: 'Custom',
};

interface TemplateSelectorProps {
  onApply: (data: {
    slides: PresentationSlide[];
    settings: PresentationSettings;
    theme: PresentationTheme;
  }) => void;
}

export function TemplateSelector({ onApply }: TemplateSelectorProps) {
  const { templates, loading, deleteTemplate } = useTemplates();
  const { user } = useUser();
  const [tab, setTab] = useState<TabFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<PresentationTemplateCategory | 'all'>('all');
  const [pendingTemplate, setPendingTemplate] = useState<{
    slides: PresentationSlide[];
    settings: PresentationSettings;
    theme: PresentationTheme;
  } | null>(null);

  // Available categories from current templates
  const categories = useMemo(() => {
    const cats = new Set<PresentationTemplateCategory>();
    templates.forEach((t) => cats.add(t.category));
    return Array.from(cats).sort();
  }, [templates]);

  // Filter templates
  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (tab === 'mine' && t.createdBy !== user?.uid) return false;
      if (tab === 'built-in' && !t.isBuiltIn) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      return true;
    });
  }, [templates, tab, categoryFilter, user?.uid]);

  const isOwner = (createdBy?: string) => createdBy === user?.uid;

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <LayoutTemplate className="h-4 w-4 mr-1.5" />
            Templates
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 border-b pb-2">
            {(['all', 'mine', 'built-in'] as TabFilter[]).map((t) => (
              <Button
                key={t}
                variant={tab === t ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs capitalize"
                onClick={() => setTab(t)}
              >
                {t === 'mine' ? 'My Templates' : t === 'built-in' ? 'Built-in' : 'All'}
              </Button>
            ))}
            {categories.length > 1 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as PresentationTemplateCategory | 'all')}
                className="ml-auto h-7 text-xs bg-transparent border rounded px-1.5"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            )}
          </div>

          <div className="py-2 max-h-[400px] overflow-y-auto">
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            )}

            {!loading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {tab === 'mine'
                  ? 'No templates yet. Save your current presentation as a template.'
                  : 'No templates found.'}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {filtered.map((template) => (
                <div
                  key={template.id}
                  className="group border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all"
                >
                  {/* Thumbnail preview of first slide */}
                  {template.slides[0] && (
                    <div className="pointer-events-none">
                      <SlideThumbnail
                        slide={template.slides[0]}
                        index={0}
                        isActive={false}
                      />
                    </div>
                  )}
                  <div className="p-2">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium truncate flex-1">{template.title}</p>
                      {template.visibility === 'public' ? (
                        <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-[10px] text-muted-foreground">
                        {template.slides.length} slide{template.slides.length !== 1 ? 's' : ''}
                      </p>
                      {template.isBuiltIn && (
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1">Built-in</Badge>
                      )}
                      <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                        {CATEGORY_LABELS[template.category]}
                      </Badge>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs flex-1"
                        onClick={() => setPendingTemplate({
                          slides: template.slides,
                          settings: template.settings,
                          theme: template.theme,
                        })}
                      >
                        Use
                      </Button>
                      {isOwner(template.createdBy) && !template.isBuiltIn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template apply confirmation */}
      <AlertDialog open={!!pendingTemplate} onOpenChange={(open) => { if (!open) setPendingTemplate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current slides with the template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingTemplate) {
                onApply(pendingTemplate);
                setPendingTemplate(null);
              }
            }}>
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
