'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Copy, Trash2, MoreHorizontal } from 'lucide-react';
import type { PresentationSlide } from '@/lib/types';

interface SlidePanelProps {
  slides: PresentationSlide[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: (afterIndex?: number) => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
}

const INTERACTIVE_TYPES = ['quiz', 'poll', 'thoughts', 'rating'];

function SlideThumbnail({
  slide,
  index,
  isActive,
}: {
  slide: PresentationSlide;
  index: number;
  isActive: boolean;
}) {
  const hasInteractive = slide.elements.some((el) =>
    INTERACTIVE_TYPES.includes(el.type)
  );

  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.type === 'solid' && slide.background.color) {
      bgStyle.backgroundColor = slide.background.color;
    } else if (slide.background.type === 'gradient' && slide.background.gradient) {
      bgStyle.background = slide.background.gradient;
    } else if (slide.background.type === 'image' && slide.background.imageUrl) {
      bgStyle.backgroundImage = `url(${slide.background.imageUrl})`;
      bgStyle.backgroundSize = 'cover';
    }
  } else {
    bgStyle.backgroundColor = '#ffffff';
  }

  return (
    <div className="flex items-stretch gap-1.5">
      {/* Active indicator */}
      <div
        className={`w-1 rounded-full flex-shrink-0 transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-b from-primary to-accent'
            : 'bg-transparent'
        }`}
      />
      <div
        className={`relative flex-1 aspect-video rounded-md overflow-hidden cursor-pointer transition-all duration-200 ${
          isActive
            ? 'shadow-lg shadow-primary/15 ring-1 ring-primary/30'
            : 'shadow-sm hover:shadow-md hover:scale-[1.02]'
        }`}
        style={bgStyle}
      >
        {/* Mini element indicators */}
        <div className="absolute inset-0 p-1">
          {slide.elements.map((el) => (
            <div
              key={el.id}
              className={`absolute rounded-sm ${
                INTERACTIVE_TYPES.includes(el.type)
                  ? 'bg-primary/30 border border-primary/50'
                  : el.type === 'text'
                  ? 'bg-foreground/10'
                  : el.type === 'image'
                  ? 'bg-blue-500/20'
                  : 'bg-muted-foreground/15'
              }`}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                height: `${el.height}%`,
              }}
            />
          ))}
        </div>

        {/* Slide number */}
        <div className="absolute bottom-0.5 left-1 text-[9px] font-mono text-muted-foreground bg-background/70 px-1 rounded">
          {index + 1}
        </div>

        {/* Interactive badge */}
        {hasInteractive && (
          <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
        )}
      </div>
    </div>
  );
}

export function SlidePanel({
  slides,
  currentSlideIndex,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
}: SlidePanelProps) {
  return (
    <div className="w-[180px] flex-shrink-0 bg-background border-r overflow-y-auto p-2 space-y-1.5">
      {slides.map((slide, index) => (
        <div key={slide.id} className="group relative">
          <div onClick={() => onSelectSlide(index)}>
            <SlideThumbnail
              slide={slide}
              index={index}
              isActive={index === currentSlideIndex}
            />
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-background transition-opacity"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onAddSlide(index)}>
                <Plus className="h-4 w-4 mr-2" />
                Add slide after
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicateSlide(index)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteSlide(index)}
                disabled={slides.length <= 1}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {/* Add slide button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full aspect-video flex items-center justify-center border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
        onClick={() => onAddSlide()}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
