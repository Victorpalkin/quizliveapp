'use client';

import { PresentationSlide, Presentation } from '@/lib/types';
import { getSlideType, SlideEditorProps } from '../slide-types';

interface SlideEditorRendererProps {
  slide: PresentationSlide;
  presentation: Presentation;
  onSlideChange: (updatedSlide: PresentationSlide) => void;
  isSelected: boolean;
}

/**
 * Dispatches to the correct editor component based on slide type
 */
export function SlideEditorRenderer({
  slide,
  presentation,
  onSlideChange,
  isSelected,
}: SlideEditorRendererProps) {
  const slideType = getSlideType(slide.type);
  const EditorComponent = slideType.EditorComponent;

  const props: SlideEditorProps = {
    slide,
    presentation,
    onSlideChange,
    isSelected,
  };

  return <EditorComponent {...props} />;
}
