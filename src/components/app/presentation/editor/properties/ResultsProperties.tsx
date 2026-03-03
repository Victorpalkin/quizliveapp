'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INTERACTIVE_ELEMENT_TYPES } from '@/lib/types';
import type { SlideElement, PresentationSlide } from '@/lib/types';

interface ResultsPropertiesProps {
  element: SlideElement;
  slides: PresentationSlide[];
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function ResultsProperties({ element, slides, onUpdate }: ResultsPropertiesProps) {
  // Collect all interactive elements across all slides
  const interactiveElements: { slideId: string; slideIndex: number; element: SlideElement }[] = [];
  slides.forEach((slide, idx) => {
    slide.elements.forEach((el) => {
      if (INTERACTIVE_ELEMENT_TYPES.includes(el.type)) {
        interactiveElements.push({ slideId: slide.id, slideIndex: idx, element: el });
      }
    });
  });

  const selectedKey = element.sourceElementId && element.sourceSlideId
    ? `${element.sourceSlideId}__${element.sourceElementId}`
    : '';

  const handleSelect = (key: string) => {
    if (!key) {
      onUpdate({ sourceElementId: undefined, sourceSlideId: undefined });
      return;
    }
    const [slideId, elementId] = key.split('__');
    onUpdate({ sourceElementId: elementId, sourceSlideId: slideId });
  };

  const getLabel = (item: typeof interactiveElements[0]) => {
    const config = item.element.quizConfig || item.element.pollConfig || item.element.thoughtsConfig || item.element.ratingConfig;
    const question = (config && 'question' in config) ? config.question : (config && 'prompt' in config) ? config.prompt : (config && 'itemTitle' in config) ? config.itemTitle : '';
    const preview = question ? ` - ${question.slice(0, 30)}${question.length > 30 ? '...' : ''}` : '';
    return `Slide ${item.slideIndex + 1}: ${item.element.type}${preview}`;
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Source Element</Label>
        <p className="text-[10px] text-muted-foreground mb-2">
          Select which interactive element&apos;s results to display
        </p>
        <Select value={selectedKey} onValueChange={handleSelect}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select source..." />
          </SelectTrigger>
          <SelectContent>
            {interactiveElements.length === 0 ? (
              <SelectItem value="none" disabled>No interactive elements found</SelectItem>
            ) : (
              interactiveElements.map((item) => (
                <SelectItem
                  key={`${item.slideId}__${item.element.id}`}
                  value={`${item.slideId}__${item.element.id}`}
                >
                  {getLabel(item)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {element.sourceElementId && (
        <p className="text-[10px] text-muted-foreground">
          This element will display results from the linked interactive element during presentation.
        </p>
      )}
    </div>
  );
}
