import type { SlideElement } from '@/lib/types';
import { INTERACTIVE_ELEMENT_TYPES } from '@/lib/types';
import { TextElement } from './TextElement';
import { ImageElement } from './ImageElement';
import { ShapeElement } from './ShapeElement';
import { ConnectorElement } from './ConnectorElement';
import { InteractiveElement } from './InteractiveElement';
import { AIStepPreview } from './AIStepPreview';
import { ResultsElement } from './ResultsElement';

export const RESULTS_TYPES = [
  'quiz-results',
  'poll-results',
  'thoughts-results',
  'rating-results',
  'evaluation-results',
  'agentic-designer-results',
  'ai-step-results',
];
export const SPECIAL_TYPES = ['leaderboard', 'qa', 'spin-wheel'];

interface ElementRendererProps {
  element: SlideElement;
  isSelected: boolean;
  onSelect?: () => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  onUpdateContent?: (content: string) => void;
  onUploadImage?: () => void;
}

export function ElementRenderer({
  element,
  isSelected,
  isEditing,
  onStartEditing,
  onStopEditing,
  onUpdateContent,
  onUploadImage,
}: ElementRendererProps) {
  if (element.type === 'text') {
    return (
      <TextElement
        element={element}
        isSelected={isSelected}
        isEditing={isEditing}
        onStartEditing={onStartEditing}
        onStopEditing={onStopEditing}
        onUpdateContent={onUpdateContent}
      />
    );
  }
  if (element.type === 'image') {
    return <ImageElement element={element} onUpload={onUploadImage} />;
  }
  if (element.type === 'shape') {
    return <ShapeElement element={element} />;
  }
  if (element.type === 'connector') {
    return <ConnectorElement element={element} />;
  }
  if (element.type === 'ai-step') {
    return <AIStepPreview element={element} />;
  }
  if (INTERACTIVE_ELEMENT_TYPES.includes(element.type) || SPECIAL_TYPES.includes(element.type)) {
    return <InteractiveElement element={element} />;
  }
  if (RESULTS_TYPES.includes(element.type)) {
    return <ResultsElement element={element} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
      {element.type}
    </div>
  );
}
