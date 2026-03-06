'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Lock,
  Unlock,
} from 'lucide-react';
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
import { EvaluationProperties } from './properties/EvaluationProperties';
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
  onBringToFront: () => void;
  onSendToBack: () => void;
  onMoveForward: () => void;
  onMoveBackward: () => void;
  onAlignElement: (alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
}

export function PropertiesPanel({
  selectedElement,
  slide,
  slides,
  onUpdateElement,
  onUpdateBackground,
  onUpdateNotes,
  onUpdateTransition,
  onBringToFront,
  onSendToBack,
  onMoveForward,
  onMoveBackward,
  onAlignElement,
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
      {/* Element header with lock toggle */}
      <div className="p-4 border-b flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h3 className="text-sm font-medium capitalize flex-1">{selectedElement.type} Properties</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdateElement({ locked: !selectedElement.locked })}
          title={selectedElement.locked ? 'Unlock element' : 'Lock element'}
        >
          {selectedElement.locked ? (
            <Lock className="h-3.5 w-3.5 text-orange-500" />
          ) : (
            <Unlock className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Z-order controls */}
      <div className="px-4 pt-3 pb-1">
        <Label className="text-xs">Layer Order</Label>
        <div className="flex gap-1 mt-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onSendToBack} title="Send to back">
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onMoveBackward} title="Move backward">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onMoveForward} title="Move forward">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onBringToFront} title="Bring to front">
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Alignment controls */}
      <div className="px-4 pt-2 pb-1">
        <Label className="text-xs">Align</Label>
        <div className="flex gap-1 mt-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onAlignElement('left')} title="Align left">
            <AlignStartVertical className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onAlignElement('center-h')} title="Center horizontally">
            <AlignCenterVertical className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onAlignElement('right')} title="Align right">
            <AlignEndVertical className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px bg-border mx-0.5" />
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onAlignElement('top')} title="Align top">
            <AlignStartHorizontal className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onAlignElement('center-v')} title="Center vertically">
            <AlignCenterHorizontal className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onAlignElement('bottom')} title="Align bottom">
            <AlignEndHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Element-specific properties */}
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
      {selectedElement.type === 'evaluation' && (
        <EvaluationProperties element={selectedElement} onUpdate={onUpdateElement} />
      )}
      {['quiz-results', 'poll-results', 'thoughts-results', 'rating-results', 'evaluation-results'].includes(selectedElement.type) && (
        <ResultsProperties element={selectedElement} slides={slides} onUpdate={onUpdateElement} />
      )}

      {/* Universal Transform section (rotation + opacity) */}
      <div className="p-4 border-t space-y-3">
        <Label className="text-xs font-medium">Transform</Label>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Rotation</Label>
            <span className="text-xs text-muted-foreground">{selectedElement.rotation || 0}°</span>
          </div>
          <Slider
            value={[selectedElement.rotation || 0]}
            onValueChange={([v]) => onUpdateElement({ rotation: v })}
            min={0}
            max={360}
            step={1}
            className="mt-1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Opacity</Label>
            <span className="text-xs text-muted-foreground">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
          </div>
          <Slider
            value={[selectedElement.opacity ?? 1]}
            onValueChange={([v]) => onUpdateElement({ opacity: v })}
            min={0}
            max={1}
            step={0.05}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
