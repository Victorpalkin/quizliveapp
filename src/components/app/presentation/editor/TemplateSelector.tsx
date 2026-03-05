'use client';

import { useTemplates } from '@/firebase/presentation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LayoutTemplate, Trash2 } from 'lucide-react';
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

  return (
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

        <div className="space-y-2 py-2 max-h-[400px] overflow-y-auto">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          )}

          {!loading && templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No templates yet. Save your current presentation as a template.
            </p>
          )}

          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{template.title}</p>
                <p className="text-xs text-muted-foreground">
                  {template.slides.length} slide{template.slides.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApply({
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
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteTemplate(template.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
