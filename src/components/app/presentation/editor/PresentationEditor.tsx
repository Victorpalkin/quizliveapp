'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { usePresentationMutations } from '@/firebase/presentation';
import { useCreatePresentationGame } from '@/firebase/presentation/use-presentation-game';
import { useCanvasState } from '@/hooks/presentation/use-canvas-state';
import { getCanvas, canvasToSlides } from '@/lib/utils/canvas-migration';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { EditorToolbar } from './EditorToolbar';
import { FramesPanel } from './FramesPanel';
import { SlideCanvas } from './SlideCanvas';
import { InfiniteCanvas } from './InfiniteCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Keyboard, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Presentation } from '@/lib/types';

interface PresentationEditorProps {
  presentation?: Presentation;
  readOnly?: boolean;
}

export function PresentationEditor({ presentation, readOnly }: PresentationEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const { createPresentation, updatePresentation } = usePresentationMutations();
  const { createGame: createPresentationGame } = useCreatePresentationGame();

  const editor = useCanvasState(
    presentation
      ? {
          canvas: getCanvas(presentation),
          title: presentation.title,
          description: presentation.description,
          settings: presentation.settings,
          theme: presentation.theme,
        }
      : undefined
  );

  useUnsavedChangesWarning(!readOnly && editor.isDirty);

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleSave = useCallback(async () => {
    try {
      const slides = canvasToSlides(editor.canvas);
      if (presentation) {
        await updatePresentation(presentation.id, {
          title: editor.title,
          description: editor.description || undefined,
          canvas: editor.canvas,
          slides,
          settings: editor.settings,
          theme: editor.theme,
        });
        editor.markClean();
        toast({ title: 'Saved' });
      } else {
        const id = await createPresentation(editor.title, slides);
        await updatePresentation(id, {
          description: editor.description || undefined,
          canvas: editor.canvas,
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

  useEffect(() => {
    if (readOnly) return;
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
  }, [editor.isDirty, editor.canvas, handleSave, readOnly]);

  const handlePresent = useCallback(async () => {
    if (!presentation || !user) return;
    try {
      if (editor.isDirty) await handleSave();
      const gameId = await createPresentationGame(presentation.id, user.uid, editor.settings, editor.title);
      router.push(`/host/presentation/present/${gameId}`);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not start presentation.' });
      throw new Error('Failed to start presentation');
    }
  }, [presentation, user, editor.isDirty, editor.settings, editor.title, handleSave, createPresentationGame, router, toast]);

  const handleBack = useCallback(() => router.push('/host'), [router]);

  // Clear inline editing when changing frame or leaving edit mode
  useEffect(() => {
    setEditingElementId(null);
  }, [editor.currentFrameId, editor.mode]);

  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'Escape' && editor.mode === 'edit') {
        e.preventDefault();
        editor.exitToOverview();
        return;
      }
      if (editor.mode !== 'edit') return; // element shortcuts only in edit mode

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selectedElementIds.length > 1) {
          e.preventDefault();
          editor.deleteElements(editor.selectedElementIds);
        } else if (editor.selectedElementId) {
          e.preventDefault();
          editor.deleteElement(editor.selectedElementId);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); editor.redo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') { if (editor.selectedElementId) { e.preventDefault(); editor.copyElement(); } }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') { e.preventDefault(); editor.pasteElement(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { if (editor.selectedElementId) { e.preventDefault(); editor.duplicateElement(); } }
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
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setShortcutsOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, handleSave, readOnly]);

  const currentFrameNumber = editor.currentFrame
    ? editor.framesInOrder.findIndex((f) => f.id === editor.currentFrame!.id) + 1
    : 0;

  return (
    <div className="flex flex-col h-screen bg-muted/30">
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
        currentSlideHasInteractive={editor.currentFrameHasInteractive}
        settings={editor.settings}
        onUpdateSettings={editor.updateSettings}
        theme={editor.theme}
        onUpdateTheme={editor.updateTheme}
        slides={editor.slidesView}
        onApplyTemplate={editor.applyTemplate}
        presentationId={presentation?.id}
        onPresent={presentation ? handlePresent : undefined}
        onBack={handleBack}
        description={editor.description}
        onDescriptionChange={editor.setDescription}
        readOnly={readOnly}
      />

      <div className="flex flex-1 overflow-hidden">
        <FramesPanel
          frames={editor.framesInOrder}
          currentFrameId={editor.currentFrameId}
          onSelectFrame={editor.setCurrentFrameId}
          onEnterFrame={editor.enterFrame}
          onAddFrame={editor.addFrame}
          onDuplicateFrame={editor.duplicateFrame}
          onDeleteFrame={editor.deleteFrame}
          onReorder={editor.reorderSequence}
          readOnly={readOnly}
        />

        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize="70" minSize="40" className="flex flex-col">
            {editor.mode === 'edit' && editor.currentSlideView ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                {!readOnly && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-background/60">
                    <Button variant="ghost" size="sm" className="h-7" onClick={editor.exitToOverview}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Overview
                    </Button>
                    <span className="text-xs text-muted-foreground">{editor.currentFrame?.name}</span>
                  </div>
                )}
                <SlideCanvas
                  slide={editor.currentSlideView}
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
                  onStartEditing={setEditingElementId}
                  onStopEditing={() => setEditingElementId(null)}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  onStartDrag={editor.startDrag}
                  onEndDrag={editor.endDrag}
                  readOnly={readOnly}
                />
              </div>
            ) : (
              <InfiniteCanvas
                canvas={editor.canvas}
                className="flex-1"
                selectedFrameId={editor.currentFrameId}
                onFrameSelect={readOnly ? undefined : editor.setCurrentFrameId}
                onFrameActivate={readOnly ? undefined : editor.enterFrame}
                onFrameMove={readOnly ? undefined : editor.moveFrame}
              />
            )}
          </ResizablePanel>

          {!readOnly && editor.mode === 'edit' && <ResizableHandle withHandle />}

          {!readOnly && editor.mode === 'edit' && (
            <ResizablePanel defaultSize="30" minSize="15" maxSize="60">
              <PropertiesPanel
                selectedElement={editor.selectedElement}
                selectedElements={editor.selectedElements}
                slide={editor.currentSlideView}
                slides={editor.slidesView}
                presentationId={presentation?.id}
                onUpdateElement={(updates) => {
                  if (editor.selectedElementIds.length > 1) editor.updateElements(editor.selectedElementIds, updates);
                  else if (editor.selectedElementId) editor.updateElement(editor.selectedElementId, updates);
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
          )}
        </ResizablePanelGroup>
      </div>

      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground glass-subtle">
        <span className="flex items-center gap-2">
          {editor.mode === 'edit' && editor.currentFrame
            ? `Frame ${currentFrameNumber}/${editor.framesInOrder.length} · ${editor.currentFrame.name}`
            : `Overview · ${editor.framesInOrder.length} frames`}
        </span>
        <span className="flex items-center gap-2">
          {!readOnly && (
            <span className="flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${editor.isDirty ? 'bg-orange-400' : 'bg-green-400'}`} />
              {isAutoSaving ? 'Auto-saving...' : editor.isDirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
          )}
          {!readOnly && editor.interactiveElementCount > 0 && <> &middot; {editor.interactiveElementCount} interactive</>}
          <div className="w-px h-3 bg-border/50" />
          {!readOnly && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)">
              <Keyboard className="h-3 w-3" />
            </Button>
          )}
        </span>
      </div>

      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
