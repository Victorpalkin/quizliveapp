'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { usePresentationMutations } from '@/firebase/presentation';
import { useEditorState } from '@/hooks/presentation/use-editor-state';
import { EditorToolbar } from './EditorToolbar';
import { SlidePanel } from './SlidePanel';
import { SlideCanvas } from './SlideCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import type { Presentation } from '@/lib/types';

interface PresentationEditorProps {
  /** Existing presentation to edit, or undefined for new */
  presentation?: Presentation;
}

export function PresentationEditor({ presentation }: PresentationEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createPresentation, updatePresentation } = usePresentationMutations();

  const editor = useEditorState(
    presentation
      ? {
          slides: presentation.slides,
          title: presentation.title,
          description: presentation.description,
          settings: presentation.settings,
          theme: presentation.theme,
        }
      : undefined
  );

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      if (presentation) {
        await updatePresentation(presentation.id, {
          title: editor.title,
          description: editor.description || undefined,
          slides: editor.slides,
          settings: editor.settings,
          theme: editor.theme,
        });
        editor.markClean();
        toast({ title: 'Saved' });
      } else {
        const id = await createPresentation(editor.title, editor.slides);
        await updatePresentation(id, {
          description: editor.description || undefined,
          settings: editor.settings,
          theme: editor.theme,
        });
        editor.markClean();
        toast({ title: 'Presentation created' });
        router.replace(`/host/presentation/edit/${id}`);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save' });
    }
  }, [presentation, editor, createPresentation, updatePresentation, router, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selectedElementId) {
          e.preventDefault();
          editor.deleteElement(editor.selectedElementId);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        editor.redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Arrow key nudge
      if (editor.selectedElementId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        const updates: Record<string, number> = {};
        if (e.key === 'ArrowUp') updates.y = (editor.selectedElement?.y ?? 0) - delta;
        if (e.key === 'ArrowDown') updates.y = (editor.selectedElement?.y ?? 0) + delta;
        if (e.key === 'ArrowLeft') updates.x = (editor.selectedElement?.x ?? 0) - delta;
        if (e.key === 'ArrowRight') updates.x = (editor.selectedElement?.x ?? 0) + delta;
        editor.updateElement(editor.selectedElementId, updates);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, handleSave]);

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Top toolbar */}
      <EditorToolbar
        title={editor.title}
        onTitleChange={editor.setTitle}
        onSave={handleSave}
        onUndo={editor.undo}
        onRedo={editor.redo}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        isDirty={editor.isDirty}
        onAddElement={editor.addElement}
        currentSlideHasInteractive={editor.currentSlideHasInteractive}
        settings={editor.settings}
        onUpdateSettings={editor.updateSettings}
        theme={editor.theme}
        onUpdateTheme={editor.updateTheme}
        presentationId={presentation?.id}
      />

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Slide thumbnails */}
        <SlidePanel
          slides={editor.slides}
          currentSlideIndex={editor.currentSlideIndex}
          onSelectSlide={editor.setCurrentSlideIndex}
          onAddSlide={editor.addSlide}
          onDuplicateSlide={editor.duplicateSlide}
          onDeleteSlide={editor.deleteSlide}
          onReorderSlides={editor.reorderSlides}
        />

        {/* Center: Canvas */}
        <SlideCanvas
          slide={editor.currentSlide}
          selectedElementId={editor.selectedElementId}
          onSelectElement={editor.selectElement}
          onUpdateElement={editor.updateElement}
          onDeleteElement={editor.deleteElement}
          theme={editor.theme}
        />

        {/* Right: Properties panel */}
        <PropertiesPanel
          selectedElement={editor.selectedElement}
          slide={editor.currentSlide}
          slides={editor.slides}
          onUpdateElement={(updates) => {
            if (editor.selectedElementId) {
              editor.updateElement(editor.selectedElementId, updates);
            }
          }}
          onUpdateBackground={editor.updateSlideBackground}
          onUpdateNotes={editor.updateSlideNotes}
          onUpdateTransition={editor.updateSlideTransition}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground glass-subtle">
        <span>
          Slide {editor.currentSlideIndex + 1}/{editor.slides.length}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${editor.isDirty ? 'bg-orange-400' : 'bg-green-400'}`} />
          {editor.isDirty ? 'Unsaved changes' : 'All changes saved'}
          {editor.interactiveElementCount > 0 && (
            <> &middot; {editor.interactiveElementCount} interactive</>
          )}
        </span>
      </div>
    </div>
  );
}
