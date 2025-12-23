'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Play, ArrowLeft, Loader2 } from 'lucide-react';
import { Presentation, PresentationSlide, PresentationSlideType } from '@/lib/types';
import { SlideList } from './SlideList';
import { SlideTypeSelector } from './SlideTypeSelector';
import { SlideEditorRenderer } from '../core';
import { createSlide } from '../slide-types';
import { useToast } from '@/hooks/use-toast';

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

  // Local state for editing
  const [title, setTitle] = useState(presentation.title);
  const [description, setDescription] = useState(presentation.description || '');
  const [slides, setSlides] = useState<PresentationSlide[]>(presentation.slides);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(
    presentation.slides[0]?.id || null
  );
  const [showSlideTypeSelector, setShowSlideTypeSelector] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get selected slide
  const selectedSlide = useMemo(
    () => slides.find((s) => s.id === selectedSlideId) || null,
    [slides, selectedSlideId]
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
    (slideId: string) => {
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
    [slides, selectedSlideId, markChanged]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await onSave({
        title,
        description,
        slides,
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
  }, [title, description, slides, onSave, toast]);

  // Handle launch
  const handleLaunch = useCallback(async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    }
    onLaunch();
  }, [hasUnsavedChanges, handleSave, onLaunch]);

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
          <Button onClick={handleLaunch} disabled={slides.length === 0}>
            <Play className="h-4 w-4 mr-2" />
            Present
          </Button>
        </div>
      </header>

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
        <div className="w-72 flex-shrink-0 border-l p-4 bg-muted/20 hidden lg:block">
          <h3 className="font-medium mb-4">Presentation Settings</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="text-sm text-muted-foreground">
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
    </div>
  );
}
