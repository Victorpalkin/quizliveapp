'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Copy, Trash2, MoreHorizontal, GripVertical } from 'lucide-react';
import type { Frame } from '@/lib/types/canvas';
import type { PresentationSlide } from '@/lib/types';
import { SlideThumbnail } from '../shared/SlideThumbnail';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

/** A frame rendered through the existing slide thumbnail. */
function frameAsSlide(frame: Frame, order: number): PresentationSlide {
  return {
    id: frame.id,
    order,
    elements: frame.elements,
    background: frame.background,
    notes: frame.notes,
    transition: frame.transition,
  };
}

interface FramesPanelProps {
  frames: Frame[];
  currentFrameId: string | null;
  onSelectFrame: (frameId: string) => void;
  onEnterFrame: (frameId: string) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (frameId: string) => void;
  onDeleteFrame: (frameId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  readOnly?: boolean;
}

function SortableFrameItem({
  frame,
  index,
  isActive,
  onSelectFrame,
  onEnterFrame,
  onDuplicateFrame,
  onDeleteFrame,
  totalFrames,
}: {
  frame: Frame;
  index: number;
  isActive: boolean;
  onSelectFrame: (frameId: string) => void;
  onEnterFrame: (frameId: string) => void;
  onDuplicateFrame: (frameId: string) => void;
  onDeleteFrame: (frameId: string) => void;
  totalFrames: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn('group relative', isDragging && 'opacity-40 z-50')}>
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-4 h-6 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing rounded-sm',
          'opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background'
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>

      <div
        className="cursor-pointer"
        onClick={() => onSelectFrame(frame.id)}
        onDoubleClick={() => onEnterFrame(frame.id)}
        title={`${frame.name} — double-click to edit`}
      >
        <SlideThumbnail slide={frameAsSlide(frame, index)} index={index} isActive={isActive} />
      </div>

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
          <DropdownMenuItem onClick={() => onDuplicateFrame(frame.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDeleteFrame(frame.id)}
            disabled={totalFrames <= 1}
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

export function FramesPanel({
  frames,
  currentFrameId,
  onSelectFrame,
  onEnterFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onReorder,
  readOnly,
}: FramesPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = frames.findIndex((f) => f.id === active.id);
    const toIndex = frames.findIndex((f) => f.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) onReorder(fromIndex, toIndex);
  };

  return (
    <div className="flex-shrink-0 w-[180px] bg-background border-r overflow-y-auto p-2 space-y-1.5">
      {readOnly ? (
        frames.map((frame, index) => (
          <div key={frame.id} className="cursor-pointer" onClick={() => onSelectFrame(frame.id)}>
            <SlideThumbnail slide={frameAsSlide(frame, index)} index={index} isActive={frame.id === currentFrameId} />
          </div>
        ))
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={frames.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {frames.map((frame, index) => (
                <SortableFrameItem
                  key={frame.id}
                  frame={frame}
                  index={index}
                  isActive={frame.id === currentFrameId}
                  onSelectFrame={onSelectFrame}
                  onEnterFrame={onEnterFrame}
                  onDuplicateFrame={onDuplicateFrame}
                  onDeleteFrame={onDeleteFrame}
                  totalFrames={frames.length}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            className="w-full aspect-video flex items-center justify-center border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
            onClick={onAddFrame}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
