'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Save, Play, ArrowLeft, Loader2, MoreVertical, Copy, Settings } from 'lucide-react';
import { Presentation, PresentationSlide, PresentationSlideType, PresentationStyle } from '@/lib/types';
import { SlideList } from './SlideList';
import { SlideTypeSelector } from './SlideTypeSelector';
import { SlideEditorRenderer } from '../core';
import { createSlide } from '../slide-types';
import { BatchImageGenerator } from './BatchImageGenerator';
import { PresentationSettingsPanel } from './PresentationSettingsPanel';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/error-logging';
import { INTERACTIVE_SLIDE_TYPES } from '@/lib/constants';
import { useTemplateMutations } from '@/firebase/presentation';
import { useStorage } from '@/firebase';

interface PresentationEditorProps {
  presentation: Presentation;
  onSave: (data: Partial<Presentation>) => Promise<void>;
  onLaunch: () => void;
  isSaving: boolean;
}

export function PresentationEditor({
  presentation,
  onSave,
  onLaunch,
  isSaving,
}: PresentationEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { saveAsTemplate } = useTemplateMutations();
  const storage = useStorage();

  // Local state for editing
  const [title, setTitle] = useState(presentation.title);
  const [description, setDescription] = useState(presentation.description || '');
  const [slides, setSlides] = useState<PresentationSlide[]>(presentation.slides);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(
    presentation.slides[0]?.id || null
  );
  const [showSlideTypeSelector, setShowSlideTypeSelector] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Save as Template state
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

  // Pacing settings
  const [defaultPacingMode, setDefaultPacingMode] = useState<'none' | 'threshold' | 'all'>(
    presentation.defaultPacingMode || 'none'
  );
  const [defaultPacingThreshold, setDefaultPacingThreshold] = useState<number>(
    presentation.defaultPacingThreshold ?? 80
  );

  // Presentation style
  const [style, setStyle] = useState<PresentationStyle>(
    presentation.style || {}
  );

  // Get selected slide
  const selectedSlide = useMemo(
    () => slides.find((s) => s.id === selectedSlideId) || null,
    [slides, selectedSlideId]
  );

  // Count interactive slides
  const interactiveSlideCount = useMemo(
    () => slides.filter((s) => INTERACTIVE_SLIDE_TYPES.includes(s.type)).length,
    [slides]
  );

  // Mark as changed
  const markChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Warn on browser close/refresh with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle back navigation with unsaved changes check
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    router.push('/host');
  }, [hasUnsavedChanges, router]);

  // Handle title change
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      markChanged();
    },
    [markChanged]
  );

  // Handle description change
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value);
      markChanged();
    },
    [markChanged]
  );

  // Handle slide reorder
  const handleReorderSlides = useCallback(
    (reorderedSlides: PresentationSlide[]) => {
      setSlides(reorderedSlides);
      markChanged();
    },
    [markChanged]
  );

  // Handle slide change
  const handleSlideChange = useCallback(
    (updatedSlide: PresentationSlide) => {
      setSlides((prev) =>
        prev.map((s) => (s.id === updatedSlide.id ? updatedSlide : s))
      );
      markChanged();
    },
    [markChanged]
  );

  // Handle batch image generation update
  const handleBatchImageUpdate = useCallback(
    (slideId: string, imageUrl: string) => {
      setSlides((prev) =>
        prev.map((s) =>
          s.id === slideId ? { ...s, imageUrl } : s
        )
      );
      markChanged();
    },
    [markChanged]
  );

  // Handle add slide
  const handleAddSlide = useCallback(
    (type: PresentationSlideType) => {
      const newSlideOrSlides = createSlide(type, slides.length);

      if (Array.isArray(newSlideOrSlides)) {
        setSlides((prev) => [...prev, ...newSlideOrSlides]);
        setSelectedSlideId(newSlideOrSlides[0].id);
      } else {
        setSlides((prev) => [...prev, newSlideOrSlides]);
        setSelectedSlideId(newSlideOrSlides.id);
      }

      markChanged();
    },
    [slides.length, markChanged]
  );

  // Handle delete slide
  const handleDeleteSlide = useCallback(
    async (slideId: string) => {
      // Find the slide to delete
      const slideToDelete = slides.find((s) => s.id === slideId);

      // Delete image from storage if exists
      if (slideToDelete?.imageUrl?.includes('firebasestorage.googleapis.com') && storage) {
        try {
          const imageRef = ref(storage, slideToDelete.imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), { context: 'PresentationEditor.deleteSlideImage' });
          // Continue with slide deletion even if image cleanup fails
        }
      }

      setSlides((prev) => {
        const newSlides = prev.filter((s) => s.id !== slideId);

        // Update order
        return newSlides.map((s, i) => ({ ...s, order: i }));
      });

      // Select adjacent slide
      if (selectedSlideId === slideId) {
        const index = slides.findIndex((s) => s.id === slideId);
        const newSelectedId =
          slides[index + 1]?.id || slides[index - 1]?.id || null;
        setSelectedSlideId(newSelectedId);
      }

      markChanged();
    },
    [slides, selectedSlideId, markChanged, storage]
  );

  // Handle duplicate slide
  const handleDuplicateSlide = useCallback(
    (slideId: string) => {
      const slideToDuplicate = slides.find((s) => s.id === slideId);
      if (!slideToDuplicate) return;

      const newId = Math.random().toString(36).substring(2, 15);
      const insertIndex = slides.findIndex((s) => s.id === slideId) + 1;

      const duplicatedSlide: PresentationSlide = {
        ...slideToDuplicate,
        id: newId,
        order: insertIndex,
      };

      setSlides((prev) => {
        const newSlides = [...prev];
        newSlides.splice(insertIndex, 0, duplicatedSlide);
        return newSlides.map((s, i) => ({ ...s, order: i }));
      });

      setSelectedSlideId(newId);
      markChanged();
    },
    [slides, markChanged]
  );

  // Handle pacing mode change
  const handleDefaultPacingModeChange = useCallback(
    (value: string) => {
      setDefaultPacingMode(value as 'none' | 'threshold' | 'all');
      markChanged();
    },
    [markChanged]
  );

  // Handle pacing threshold change
  const handleDefaultPacingThresholdChange = useCallback(
    (value: number[]) => {
      setDefaultPacingThreshold(value[0]);
      markChanged();
    },
    [markChanged]
  );

  // Handle style changes
  const handleStyleChange = useCallback(
    (field: keyof PresentationStyle, value: string) => {
      setStyle((prev) => ({ ...prev, [field]: value || undefined }));
      markChanged();
    },
    [markChanged]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await onSave({
        title,
        description,
        slides,
        defaultPacingMode,
        defaultPacingThreshold,
        style,
      });
      setHasUnsavedChanges(false);
      toast({
        title: 'Saved',
        description: 'Presentation saved successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save presentation.',
      });
    }
  }, [title, description, slides, defaultPacingMode, defaultPacingThreshold, style, onSave, toast]);

  // Handle launch
  const handleLaunch = useCallback(async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    }
    onLaunch();
  }, [hasUnsavedChanges, handleSave, onLaunch]);

  // Handle save as template
  const handleSaveTemplate = useCallback(async (name: string, description: string) => {
    await saveAsTemplate(name, description, slides);
    toast({
      title: 'Template Saved',
      description: 'Your presentation has been saved as a template.',
    });
  }, [slides, saveAsTemplate, toast]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="Presentation title"
              className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowSaveTemplateDialog(true)}
                disabled={slides.length === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                Save as Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile settings button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Presentation Settings</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <PresentationSettingsPanel
                  description={description}
                  onDescriptionChange={handleDescriptionChange}
                  interactiveSlideCount={interactiveSlideCount}
                  slideCount={slides.length}
                  defaultPacingMode={defaultPacingMode}
                  onDefaultPacingModeChange={handleDefaultPacingModeChange}
                  defaultPacingThreshold={defaultPacingThreshold}
                  onDefaultPacingThresholdChange={handleDefaultPacingThresholdChange}
                  style={style}
                  onStyleChange={handleStyleChange}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Button onClick={handleLaunch} disabled={slides.length === 0}>
            <Play className="h-4 w-4 mr-2" />
            Present
          </Button>
        </div>
      </header>

      {/* Batch Image Generator Banner */}
      <BatchImageGenerator
        presentationId={presentation.id}
        slides={slides}
        onSlideUpdate={handleBatchImageUpdate}
        imageStyle={style?.imageStyle}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide List Sidebar */}
        <div className="w-64 flex-shrink-0">
          <SlideList
            slides={slides}
            selectedSlideId={selectedSlideId}
            onSelectSlide={setSelectedSlideId}
            onReorderSlides={handleReorderSlides}
            onDeleteSlide={handleDeleteSlide}
            onDuplicateSlide={handleDuplicateSlide}
            onAddSlide={() => setShowSlideTypeSelector(true)}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedSlide ? (
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="text-lg">
                  Edit {selectedSlide.type.replace('-', ' ')} Slide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SlideEditorRenderer
                  slide={selectedSlide}
                  presentation={{
                    ...presentation,
                    title,
                    description,
                    slides,
                    style,
                  }}
                  onSlideChange={handleSlideChange}
                  isSelected={true}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-lg">No slide selected</p>
              <p className="text-sm">Add a slide to get started</p>
              <Button
                className="mt-4"
                onClick={() => setShowSlideTypeSelector(true)}
              >
                Add Slide
              </Button>
            </div>
          )}
        </div>

        {/* Properties Panel - desktop */}
        <div className="w-72 flex-shrink-0 border-l p-4 bg-muted/20 hidden lg:block overflow-y-auto">
          <h3 className="font-medium mb-4">Presentation Settings</h3>
          <PresentationSettingsPanel
            description={description}
            onDescriptionChange={handleDescriptionChange}
            interactiveSlideCount={interactiveSlideCount}
            slideCount={slides.length}
            defaultPacingMode={defaultPacingMode}
            onDefaultPacingModeChange={handleDefaultPacingModeChange}
            defaultPacingThreshold={defaultPacingThreshold}
            onDefaultPacingThresholdChange={handleDefaultPacingThresholdChange}
            style={style}
            onStyleChange={handleStyleChange}
          />
        </div>
      </div>

      {/* Slide Type Selector Modal */}
      <SlideTypeSelector
        open={showSlideTypeSelector}
        onOpenChange={setShowSlideTypeSelector}
        onSelect={handleAddSlide}
      />

      {/* Save as Template Dialog */}
      <SaveTemplateDialog
        open={showSaveTemplateDialog}
        onOpenChange={setShowSaveTemplateDialog}
        slideCount={slides.length}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
