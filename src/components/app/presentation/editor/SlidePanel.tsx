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
  Image as ImageIcon,
  FileQuestion,
  Vote,
  MessageSquare,
  Star,
  Trophy,
  HelpCircle,
  Disc3,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import type { PresentationSlide, SlideElement } from '@/lib/types';
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

// Thumbnail is ~154px wide in 180px panel. Virtual canvas = 960px. Scale ≈ 0.16
const FONT_SCALE = 0.16;

const ELEMENT_ICON_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  quiz: { icon: FileQuestion, color: 'text-purple-500' },
  poll: { icon: Vote, color: 'text-teal-500' },
  thoughts: { icon: MessageSquare, color: 'text-blue-500' },
  rating: { icon: Star, color: 'text-orange-500' },
  evaluation: { icon: ClipboardList, color: 'text-indigo-500' },
  'quiz-results': { icon: BarChart3, color: 'text-purple-500' },
  'poll-results': { icon: BarChart3, color: 'text-teal-500' },
  'thoughts-results': { icon: BarChart3, color: 'text-blue-500' },
  'rating-results': { icon: BarChart3, color: 'text-orange-500' },
  'evaluation-results': { icon: BarChart3, color: 'text-indigo-500' },
  leaderboard: { icon: Trophy, color: 'text-yellow-500' },
  qa: { icon: HelpCircle, color: 'text-green-500' },
  'spin-wheel': { icon: Disc3, color: 'text-pink-500' },
};

function ElementPreview({ element }: { element: SlideElement }) {
  if (element.type === 'text') {
    const fontSize = Math.max(4, (element.fontSize || 24) * FONT_SCALE);
    return (
      <div
        className="w-full h-full overflow-hidden"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: element.fontWeight || 'normal',
          fontStyle: element.fontStyle || 'normal',
          textAlign: element.textAlign || 'left',
          color: element.color || 'inherit',
          lineHeight: element.lineHeight || 1.2,
        }}
      >
        {element.content || ''}
      </div>
    );
  }

  if (element.type === 'image') {
    if (element.imageUrl) {
      return (
        <img
          src={element.imageUrl}
          alt=""
          className="w-full h-full"
          style={{
            objectFit: element.objectFit || 'cover',
            borderRadius: element.borderRadius
              ? `${Math.max(1, element.borderRadius * FONT_SCALE)}px`
              : undefined,
          }}
          draggable={false}
        />
      );
    }
    return (
      <div className="w-full h-full bg-muted/30 flex items-center justify-center">
        <ImageIcon className="h-3 w-3 text-muted-foreground/50" />
      </div>
    );
  }

  if (element.type === 'shape') {
    return (
      <div
        className="w-full h-full"
        style={{
          backgroundColor: element.backgroundColor || 'transparent',
          borderColor: element.borderColor || 'transparent',
          borderWidth: element.borderWidth
            ? `${Math.max(1, element.borderWidth * FONT_SCALE)}px`
            : undefined,
          borderStyle: element.borderWidth ? 'solid' : undefined,
          borderRadius:
            element.shapeType === 'circle'
              ? '50%'
              : element.shapeType === 'rounded-rect'
                ? '4px'
                : undefined,
        }}
      />
    );
  }

  const iconConfig = ELEMENT_ICON_CONFIG[element.type];
  if (iconConfig) {
    const Icon = iconConfig.icon;
    return (
      <div className="w-full h-full rounded-sm bg-muted/30 flex items-center justify-center">
        <Icon className={cn('h-3 w-3', iconConfig.color)} />
      </div>
    );
  }

  return null;
}

function SlideThumbnail({
  slide,
  index,
  isActive,
}: {
  slide: PresentationSlide;
  index: number;
  isActive: boolean;
}) {
  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.type === 'solid' && slide.background.color) {
      bgStyle.backgroundColor = slide.background.color;
    } else if (
      slide.background.type === 'gradient' &&
      slide.background.gradient
    ) {
      bgStyle.background = slide.background.gradient;
    } else if (
      slide.background.type === 'image' &&
      slide.background.imageUrl
    ) {
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
        className={cn(
          'w-1 rounded-full flex-shrink-0 transition-all duration-200',
          isActive
            ? 'bg-gradient-to-b from-primary to-accent'
            : 'bg-transparent'
        )}
      />
      <div
        className={cn(
          'relative flex-1 aspect-video rounded-md overflow-hidden transition-all duration-200',
          isActive
            ? 'shadow-lg shadow-primary/15 ring-1 ring-primary/30'
            : 'shadow-sm'
        )}
        style={bgStyle}
      >
        {/* Rich element previews */}
        <div className="absolute inset-0 pointer-events-none">
          {slide.elements
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => (
              <div
                key={el.id}
                className="absolute overflow-hidden"
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  height: `${el.height}%`,
                  opacity: el.opacity ?? 1,
                  transform: el.rotation
                    ? `rotate(${el.rotation}deg)`
                    : undefined,
                }}
              >
                <ElementPreview element={el} />
              </div>
            ))}
        </div>

        {/* Slide number */}
        <div className="absolute bottom-0.5 left-1 text-[9px] font-mono text-muted-foreground bg-background/70 px-1 rounded">
          {index + 1}
        </div>
      </div>
    </div>
  );
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
