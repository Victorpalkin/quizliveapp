'use client';

import type { SlideElement, PresentationSlide, SlideBackground } from '@/lib/types';
type SlideTransition = PresentationSlide['transition'];
import { TextProperties } from './properties/TextProperties';
import { ImageProperties } from './properties/ImageProperties';
import { ShapeProperties } from './properties/ShapeProperties';
import { QuizProperties } from './properties/QuizProperties';
import { PollProperties } from './properties/PollProperties';
import { ThoughtsProperties } from './properties/ThoughtsProperties';
import { RatingProperties } from './properties/RatingProperties';
import { LeaderboardProperties } from './properties/LeaderboardProperties';
import { QAProperties } from './properties/QAProperties';
import { SpinWheelProperties } from './properties/SpinWheelProperties';
import { ResultsProperties } from './properties/ResultsProperties';
import { SlideProperties } from './properties/SlideProperties';

interface PropertiesPanelProps {
  selectedElement: SlideElement | null;
  slide: PresentationSlide | null;
  slides: PresentationSlide[];
  onUpdateElement: (updates: Partial<SlideElement>) => void;
  onUpdateBackground: (bg: SlideBackground) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateTransition: (transition: SlideTransition) => void;
}

export function PropertiesPanel({
  selectedElement,
  slide,
  slides,
  onUpdateElement,
  onUpdateBackground,
  onUpdateNotes,
  onUpdateTransition,
}: PropertiesPanelProps) {
  if (!slide) return null;

  // If nothing selected, show slide properties
  if (!selectedElement) {
    return (
      <div className="w-[280px] flex-shrink-0 bg-background border-l overflow-y-auto">
        <SlideProperties
          slide={slide}
          onUpdateBackground={onUpdateBackground}
          onUpdateNotes={onUpdateNotes}
          onUpdateTransition={onUpdateTransition}
        />
      </div>
    );
  }

  // Show element-specific properties
  return (
    <div className="w-[280px] flex-shrink-0 bg-background border-l overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium capitalize">{selectedElement.type} Properties</h3>
      </div>

      {selectedElement.type === 'text' && (
        <TextProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'image' && (
        <ImageProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'shape' && (
        <ShapeProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'quiz' && (
        <QuizProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'poll' && (
        <PollProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'thoughts' && (
        <ThoughtsProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'rating' && (
        <RatingProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'leaderboard' && (
        <LeaderboardProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'qa' && (
        <QAProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {selectedElement.type === 'spin-wheel' && (
        <SpinWheelProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {['quiz-results', 'poll-results', 'thoughts-results', 'rating-results'].includes(selectedElement.type) && (
        <ResultsProperties element={selectedElement} slides={slides} onUpdate={onUpdateElement} />
      )}
    </div>
  );
}
