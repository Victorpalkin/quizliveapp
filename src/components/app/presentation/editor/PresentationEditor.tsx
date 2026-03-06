'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { usePresentationMutations } from '@/firebase/presentation';
import { useCreatePresentationGame } from '@/firebase/presentation/use-presentation-game';
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
  const { user } = useUser();
  const { createPresentation, updatePresentation } = usePresentationMutations();
  const { createGame: createPresentationGame } = useCreatePresentationGame();

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

  // Present handler: auto-save, create game, navigate to lobby
  const handlePresent = useCallback(async () => {
    if (!presentation || !user) return;
    try {
      if (editor.isDirty) {
        await handleSave();
      }
      const gameId = await createPresentationGame(presentation.id, user.uid, editor.settings);
      router.push(`/host/presentation/lobby/${gameId}`);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not start presentation.' });
      throw new Error('Failed to start presentation');
    }
  }, [presentation, user, editor.isDirty, editor.settings, handleSave, createPresentationGame, router, toast]);

  // Inline editing state
  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  const handleStartEditing = useCallback((elementId: string) => {
    setEditingElementId(elementId);
  }, []);

  const handleStopEditing = useCallback(() => {
    setEditingElementId(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs or inline editing
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
      // Copy/Paste/Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (editor.selectedElementId) {
          e.preventDefault();
          editor.copyElement();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        editor.pasteElement();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        if (editor.selectedElementId) {
          e.preventDefault();
          editor.duplicateElement();
        }
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
        slides={editor.slides}
        onApplyTemplate={editor.applyTemplate}
        presentationId={presentation?.id}
        onPresent={presentation ? handlePresent : undefined}
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
          editingElementId={editingElementId}
          onStartEditing={handleStartEditing}
          onStopEditing={handleStopEditing}
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
          onBringToFront={editor.bringToFront}
          onSendToBack={editor.sendToBack}
          onMoveForward={editor.moveForward}
          onMoveBackward={editor.moveBackward}
          onAlignElement={editor.alignElement}
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
