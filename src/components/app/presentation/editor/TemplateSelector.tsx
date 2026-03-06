'use client';

import { useState } from 'react';
import { useTemplates } from '@/firebase/presentation';
import { Button } from '@/components/ui/button';
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
import { LayoutTemplate, Trash2 } from 'lucide-react';
import { SlideThumbnail } from '../shared/SlideThumbnail';
import type { PresentationSlide, PresentationSettings, PresentationTheme } from '@/lib/types';

interface TemplateSelectorProps {
  onApply: (data: {
    slides: PresentationSlide[];
    settings: PresentationSettings;
    theme: PresentationTheme;
  }) => void;
}

export function TemplateSelector({ onApply }: TemplateSelectorProps) {
  const { templates, loading, deleteTemplate } = useTemplates();
  const [pendingTemplate, setPendingTemplate] = useState<{
    slides: PresentationSlide[];
    settings: PresentationSettings;
    theme: PresentationTheme;
  } | null>(null);

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

          <div className="py-2 max-h-[400px] overflow-y-auto">
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            )}

            {!loading && templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates yet. Save your current presentation as a template.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
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
                    <p className="text-xs font-medium truncate">{template.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {template.slides.length} slide{template.slides.length !== 1 ? 's' : ''}
                    </p>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
