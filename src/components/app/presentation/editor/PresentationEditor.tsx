'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ref, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Save, Play, ArrowLeft, Loader2, Users, MoreVertical, Copy } from 'lucide-react';
import { Presentation, PresentationSlide, PresentationSlideType } from '@/lib/types';
import { SlideList } from './SlideList';
import { SlideTypeSelector } from './SlideTypeSelector';
import { SlideEditorRenderer } from '../core';
import { createSlide } from '../slide-types';
import { BatchImageGenerator } from './BatchImageGenerator';
import { useToast } from '@/hooks/use-toast';
import { INTERACTIVE_SLIDE_TYPES } from '@/hooks/presentation/use-pacing-status';
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
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Pacing settings
  const [defaultPacingMode, setDefaultPacingMode] = useState<'none' | 'threshold' | 'all'>(
    presentation.defaultPacingMode || 'none'
  );
  const [defaultPacingThreshold, setDefaultPacingThreshold] = useState<number>(
    presentation.defaultPacingThreshold ?? 80
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
          console.error('Failed to delete slide image:', error);
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

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await onSave({
        title,
        description,
        slides,
        defaultPacingMode,
        defaultPacingThreshold,
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
  }, [title, description, slides, defaultPacingMode, defaultPacingThreshold, onSave, toast]);

  // Handle launch
  const handleLaunch = useCallback(async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    }
    onLaunch();
  }, [hasUnsavedChanges, handleSave, onLaunch]);

  // Handle save as template
  const handleOpenSaveTemplateDialog = useCallback(() => {
    setTemplateName(title || 'My Template');
    setTemplateDescription('');
    setShowSaveTemplateDialog(true);
  }, [title]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a template name.',
      });
      return;
    }

    if (slides.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot save an empty presentation as a template.',
      });
      return;
    }

    setIsSavingTemplate(true);
    try {
      await saveAsTemplate(templateName.trim(), templateDescription.trim(), slides);
      setShowSaveTemplateDialog(false);
      toast({
        title: 'Template Saved',
        description: 'Your presentation has been saved as a template.',
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save template.',
      });
    } finally {
      setIsSavingTemplate(false);
    }
  }, [templateName, templateDescription, slides, saveAsTemplate, toast]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/host')}
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
                onClick={handleOpenSaveTemplateDialog}
                disabled={slides.length === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                Save as Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

        {/* Properties Panel (optional) */}
        <div className="w-72 flex-shrink-0 border-l p-4 bg-muted/20 hidden lg:block overflow-y-auto">
          <h3 className="font-medium mb-4">Presentation Settings</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            {/* Audience Pacing Settings */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Audience Pacing</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Control when you can advance past interactive slides
                {interactiveSlideCount > 0 && (
                  <span className="font-medium"> ({interactiveSlideCount} interactive slide{interactiveSlideCount !== 1 ? 's' : ''})</span>
                )}
              </p>

              <div className="space-y-2">
                <Label className="text-xs">Default Pacing Mode</Label>
                <Select
                  value={defaultPacingMode}
                  onValueChange={handleDefaultPacingModeChange}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex flex-col items-start">
                        <span>No requirement</span>
                        <span className="text-xs text-muted-foreground">Advance anytime</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="threshold">
                      <div className="flex flex-col items-start">
                        <span>Wait for percentage</span>
                        <span className="text-xs text-muted-foreground">Wait for X% to respond</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="all">
                      <div className="flex flex-col items-start">
                        <span>Wait for all</span>
                        <span className="text-xs text-muted-foreground">Wait for 100% response</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {defaultPacingMode === 'threshold' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Response Threshold</Label>
                    <span className="text-sm font-medium">{defaultPacingThreshold}%</span>
                  </div>
                  <Slider
                    value={[defaultPacingThreshold]}
                    onValueChange={handleDefaultPacingThresholdChange}
                    min={10}
                    max={100}
                    step={5}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can advance when {defaultPacingThreshold}% of players have responded
                  </p>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground pt-2 border-t">
              {slides.length} slide{slides.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Type Selector Modal */}
      <SlideTypeSelector
        open={showSlideTypeSelector}
        onOpenChange={setShowSlideTypeSelector}
        onSelect={handleAddSlide}
      />

      {/* Save as Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this presentation as a reusable template for future use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="My Template"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (optional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This template will include {slides.length} slide{slides.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveTemplateDialog(false)}
              disabled={isSavingTemplate}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={isSavingTemplate}>
              {isSavingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
