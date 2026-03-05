'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Copy,
  Trash2,
  MoreHorizontal,
  GripVertical,
} from 'lucide-react';
import type { PresentationSlide } from '@/lib/types';
import { SlideThumbnail } from '../shared/SlideThumbnail';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SlidePanelProps {
  slides: PresentationSlide[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: (afterIndex?: number) => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
}

function SortableSlideItem({
  slide,
  index,
  isActive,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  totalSlides,
}: {
  slide: PresentationSlide;
  index: number;
  isActive: boolean;
  onSelectSlide: (index: number) => void;
  onAddSlide: (afterIndex: number) => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  totalSlides: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group relative', isDragging && 'opacity-40 z-50')}
    >
      {/* Drag handle - appears on hover over indicator area */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-4 h-6 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing rounded-sm',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'bg-background/80 hover:bg-background',
          isDragging && 'cursor-grabbing'
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>

      <div
        className="cursor-pointer"
        onClick={() => onSelectSlide(index)}
      >
        <SlideThumbnail slide={slide} index={index} isActive={isActive} />
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
            disabled={totalSlides <= 1}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
  onReorderSlides,
}: SlidePanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = slides.findIndex((s) => s.id === active.id);
    const toIndex = slides.findIndex((s) => s.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorderSlides(fromIndex, toIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeSlide = activeId
    ? slides.find((s) => s.id === activeId)
    : null;
  const activeSlideIndex = activeId
    ? slides.findIndex((s) => s.id === activeId)
    : -1;

  return (
    <div className="w-[180px] flex-shrink-0 bg-background border-r overflow-y-auto p-2 space-y-1.5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={slides.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {slides.map((slide, index) => (
            <SortableSlideItem
              key={slide.id}
              slide={slide}
              index={index}
              isActive={index === currentSlideIndex}
              onSelectSlide={onSelectSlide}
              onAddSlide={onAddSlide}
              onDuplicateSlide={onDuplicateSlide}
              onDeleteSlide={onDeleteSlide}
              totalSlides={slides.length}
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeSlide && (
            <div className="opacity-90 shadow-xl rounded-md">
              <SlideThumbnail
                slide={activeSlide}
                index={activeSlideIndex}
                isActive={false}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
