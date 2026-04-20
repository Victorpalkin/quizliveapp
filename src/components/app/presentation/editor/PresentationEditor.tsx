'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { usePresentationMutations } from '@/firebase/presentation';
import { useCreatePresentationGame } from '@/firebase/presentation/use-presentation-game';
import { useEditorState } from '@/hooks/presentation/use-editor-state';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { EditorToolbar } from './EditorToolbar';
import { SlidePanel } from './SlidePanel';
import { SlideCanvas } from './SlideCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Keyboard, Minus, Plus, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // --- Phase 1: Unsaved changes warning ---
  useUnsavedChangesWarning(editor.isDirty);

  // --- Auto-save state ---
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Zoom state ---
  const [zoom, setZoom] = useState(1);

  // --- Keyboard shortcuts dialog ---
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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

  // --- Phase 1: Auto-save with 30-second debounce ---
  useEffect(() => {
    if (editor.isDirty) {
      autoSaveTimerRef.current = setTimeout(async () => {
        setIsAutoSaving(true);
        try {
          await handleSave();
        } finally {
          setIsAutoSaving(false);
        }
      }, 30000);
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [editor.isDirty, editor.slides, handleSave]);

  // Present handler: auto-save, create game, navigate to lobby
  const handlePresent = useCallback(async () => {
    if (!presentation || !user) return;
    try {
      if (editor.isDirty) {
        await handleSave();
      }
      const gameId = await createPresentationGame(presentation.id, user.uid, editor.settings);
      router.push(`/host/presentation/present/${gameId}`);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not start presentation.' });
      throw new Error('Failed to start presentation');
    }
  }, [presentation, user, editor.isDirty, editor.settings, handleSave, createPresentationGame, router, toast]);

  // Back navigation handler
  const handleBack = useCallback(() => {
    router.push('/host');
  }, [router]);

  // Inline editing state
  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  // Clear inline editing when switching slides
  useEffect(() => {
    setEditingElementId(null);
  }, [editor.currentSlideIndex]);

  const handleStartEditing = useCallback((elementId: string) => {
    setEditingElementId(elementId);
  }, []);

  const handleStopEditing = useCallback(() => {
    setEditingElementId(null);
  }, []);

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2, z + 0.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.25, z - 0.25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
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
        if (editor.selectedElementIds.length > 1) {
          e.preventDefault();
          editor.deleteElements(editor.selectedElementIds);
        } else if (editor.selectedElementId) {
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
      // Zoom shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
      // ? for keyboard shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, handleSave, handleZoomReset]);

  // Selected element type label for status bar
  const selectedTypeLabel = editor.selectedElementIds.length > 1
    ? `${editor.selectedElementIds.length} elements selected`
    : editor.selectedElement
      ? `${editor.selectedElement.type} selected`
      : null;

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
        onBack={handleBack}
        description={editor.description}
        onDescriptionChange={editor.setDescription}
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

        {/* Center + Right: Canvas and Properties (resizable) */}
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize="70" minSize="40">
            <SlideCanvas
              slide={editor.currentSlide}
              selectedElementId={editor.selectedElementId}
              selectedElementIds={editor.selectedElementIds}
              onSelectElement={editor.selectElement}
              onToggleSelectElement={editor.toggleSelectElement}
              onUpdateElement={editor.updateElement}
              onDeleteElement={editor.deleteElement}
              onAddElement={editor.addElement}
              onBringToFront={editor.bringToFront}
              onSendToBack={editor.sendToBack}
              onCopyElement={editor.copyElement}
              onPasteElement={editor.pasteElement}
              onDuplicateElement={editor.duplicateElement}
              theme={editor.theme}
              editingElementId={editingElementId}
              onStartEditing={handleStartEditing}
              onStopEditing={handleStopEditing}
              zoom={zoom}
              onZoomChange={setZoom}
              onStartDrag={editor.startDrag}
              onEndDrag={editor.endDrag}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="30" minSize="15" maxSize="60">
            <PropertiesPanel
              selectedElement={editor.selectedElement}
              selectedElements={editor.selectedElements}
              slide={editor.currentSlide}
              slides={editor.slides}
              onUpdateElement={(updates) => {
                if (editor.selectedElementIds.length > 1) {
                  editor.updateElements(editor.selectedElementIds, updates);
                } else if (editor.selectedElementId) {
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground glass-subtle">
        <span className="flex items-center gap-2">
          Slide {editor.currentSlideIndex + 1}/{editor.slides.length}
          {selectedTypeLabel && (
            <> &middot; <span className="capitalize">{selectedTypeLabel}</span></>
          )}
          {editor.selectedElement && (
            <span className="text-muted-foreground/70">
              x:{Math.round(editor.selectedElement.x)}% y:{Math.round(editor.selectedElement.y)}%
              w:{Math.round(editor.selectedElement.width)}% h:{Math.round(editor.selectedElement.height)}%
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {/* Zoom controls */}
          <span className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleZoomOut}>
              <Minus className="h-3 w-3" />
            </Button>
            <button
              className="text-xs hover:text-foreground transition-colors min-w-[3rem] text-center"
              onClick={handleZoomReset}
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleZoomIn}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setZoom(1)} title="Fit to view">
              <Maximize className="h-3 w-3" />
            </Button>
          </span>

          <div className="w-px h-3 bg-border/50" />

          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${editor.isDirty ? 'bg-orange-400' : 'bg-green-400'}`} />
            {isAutoSaving ? 'Auto-saving...' : editor.isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          {editor.interactiveElementCount > 0 && (
            <> &middot; {editor.interactiveElementCount} interactive</>
          )}

          <div className="w-px h-3 bg-border/50" />

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-3 w-3" />
          </Button>
        </span>
      </div>

      {/* Keyboard shortcuts dialog */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
